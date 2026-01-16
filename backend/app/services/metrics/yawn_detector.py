import logging
import math
from typing import Any, Dict, Optional, Sequence

from app.services.metrics.base_metric import BaseMetric
from app.services.smoother import Smoother

logger = logging.getLogger(__name__)


def _dist(p1: Sequence[float], p2: Sequence[float]) -> float:
    return math.hypot(p1[0] - p2[0], p1[1] - p2[1])


class YawnMetric(BaseMetric):
    """
    Yawn detection metric using Mouth Aspect Ratio (MAR).
    Tracks sustained mouth opening to infer yawns.
    """

    DEFAULT_MAR_THRESHOLD = 0.6
    DEFAULT_MIN_DURATION_FRAMES = 15
    DEFAULT_SMOOTHING_ALPHA = 0.3

    REQUIRED_INDICES = (13, 14, 61, 291)

    def __init__(
        self,
        mar_threshold: float = DEFAULT_MAR_THRESHOLD,
        min_duration_frames: int = DEFAULT_MIN_DURATION_FRAMES,
        smoothing_alpha: float = DEFAULT_SMOOTHING_ALPHA,
    ):
        """
        Args:
            mar_threshold: MAR value above which mouth is considered open.
            min_duration_frames: Frames MAR must stay high to count as yawn.
            smoothing_alpha: EMA smoothing for MAR.
        """
        self.mar_threshold = mar_threshold
        self.min_duration_frames = min_duration_frames
        self.smoother = Smoother(alpha=smoothing_alpha)
        self._open_counter = 0
        self._yawn_active = False


    # May Integrate mar.py in utils
    def _compute_mar(
        self, landmarks: Sequence[Sequence[float]]
    ) -> Optional[float]:
        try:
            top = landmarks[13]
            bottom = landmarks[14]
            left = landmarks[61]
            right = landmarks[291]
        except IndexError as e:
            logger.debug("Yawn metric landmark extraction failed: %s", e)
            return None

        horizontal = _dist(left, right)
        if horizontal == 0:
            return None

        vertical = _dist(top, bottom)
        return vertical / horizontal

    def update(self, frame_data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        landmarks = frame_data.get("landmarks")
        if not landmarks:
            self.reset()
            return None

        mar = self._compute_mar(landmarks)
        smoothed = self.smoother.update([mar] if mar is not None else None)

        if smoothed is None:
            return {
                "mar": None,
                "yawning": False,
                "yawn_progress": 0.0,
            }

        mar_value = smoothed[0]

        if mar_value > self.mar_threshold:
            self._open_counter += 1
        else:
            self._open_counter = 0
            self._yawn_active = False

        if self._open_counter >= self.min_duration_frames:
            self._yawn_active = True

        progress = min(
            self._open_counter / self.min_duration_frames,
            1.0,
        )

        return {
            "mar": mar_value,
            "yawning": self._yawn_active,
            "yawn_progress": progress,
        }

    def reset(self):
        self.smoother.reset()
        self._open_counter = 0
        self._yawn_active = False
