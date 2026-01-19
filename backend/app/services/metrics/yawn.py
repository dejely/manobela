from typing import Optional, Sequence

from app.services.metrics.base_metric import BaseMetric, MetricOutputBase
from app.services.metrics.frame_context import FrameContext
from app.services.metrics.utils.mar import compute_mar
from app.services.smoother import Smoother

Point2D = Sequence
Landmarks = Sequence[Point2D]


class YawnMetricOutput(MetricOutputBase):
    mar: Optional[float]
    yawning: bool
    yawn_progress: float
    yawn_count: int


class YawnMetric(BaseMetric):
    """
    Yawn detection metric using Mouth Aspect Ratio (MAR).
    Tracks sustained mouth opening to infer yawns.

    Thresholds:
      - open_threshold  (mar_threshold): when MAR >= this, we count "mouth open" frames.
      - close_threshold (mar_close_threshold): when MAR <= this, we reset and mark closed.

    Hysteresis band: (close_threshold, open_threshold)
      - If MAR is inside the band, we HOLD state (no counter increment / no reset).
        This prevents rapid toggling when MAR hovers around the threshold.
    """

    DEFAULT_MAR_THRESHOLD = 0.6
    DEFAULT_HYSTERESIS_RATIO = 0.9
    DEFAULT_MIN_DURATION_FRAMES = 15
    DEFAULT_SMOOTHING_ALPHA = 0.3

    def __init__(
        self,
        mar_threshold: float = DEFAULT_MAR_THRESHOLD,
        mar_close_threshold: Optional[float] = None,
        hysteresis_ratio: float = DEFAULT_HYSTERESIS_RATIO,
        min_duration_frames: int = DEFAULT_MIN_DURATION_FRAMES,
        smoothing_alpha: float = DEFAULT_SMOOTHING_ALPHA,
    ):
        """
        Args:
            mar_threshold: MAR value above which mouth is considered open.
            mar_close_threshold: MAR value below which the mouth is considered closed.
                If None, hysteresis_ratio is used to compute this value.
            hysteresis_ratio: Ratio of close_threshold to open_threshold (0.0-1.0).
                Default 0.9 means close_threshold = 0.9 * open_threshold.
            min_duration_frames: Frames MAR must stay high to count as yawn.
            smoothing_alpha: EMA smoothing for MAR.
        """

        if mar_threshold <= 0:
            raise ValueError("mar_threshold must be positive.")

        if min_duration_frames <= 0:
            raise ValueError("min_duration_frames must be positive.")

        if not (0.0 <= smoothing_alpha <= 1.0):
            raise ValueError(
                f"smoothing_alpha must be between 0 and 1, got {smoothing_alpha}"
            )

        if mar_close_threshold is None:
            if not (0.0 < hysteresis_ratio < 1.0):
                raise ValueError(
                    f"hysteresis_ratio must be between (0, 1) when mar_close threshold is None got {hysteresis_ratio}"
                )
            effective_close_threshold = mar_threshold * hysteresis_ratio
        else:
            effective_close_threshold = mar_close_threshold

        if effective_close_threshold <= 0:
            raise ValueError(
                f"mar_close_threshold must be positive, got {mar_close_threshold}"
            )

        if effective_close_threshold >= mar_threshold:
            raise ValueError("mar_close_threshold must be less than mar_threshold")

        self._mar_threshold = mar_threshold
        self._mar_close_threshold = effective_close_threshold
        self._min_duration_frames = min_duration_frames
        self._smoother = Smoother(alpha=smoothing_alpha)

        self._open_counter = 0
        self._yawn_active = False
        self._yawn_count = 0

    def update(self, context: FrameContext) -> YawnMetricOutput:
        landmarks = context.face_landmarks
        if not landmarks:
            return {
                "mar": None,
                "yawning": self._yawn_active,  # Preserved state
                "yawn_progress": min(
                    self._open_counter / self._min_duration_frames,
                    1.0,
                ),
                "yawn_count": self._yawn_count,
            }

        mar = compute_mar(landmarks)
        smoothed = self._smoother.update(None if mar is None else [mar])

        if smoothed is None:
            return {
                "mar": None,
                "yawning": self._yawn_active,
                "yawn_progress": min(
                    self._open_counter / self._min_duration_frames,
                    1.0,
                ),
                "yawn_count": self._yawn_count,
            }

        mar_value = smoothed[0]

        if mar_value > self._mar_threshold:
            self._open_counter += 1
        elif mar_value < self._mar_close_threshold:
            if self._yawn_active:
                self._yawn_count += 1
            self._open_counter = 0
            self._yawn_active = False

        if self._open_counter >= self._min_duration_frames:
            self._yawn_active = True

        return {
            "mar": mar_value,
            "yawning": self._yawn_active,
            "yawn_progress": min(
                self._open_counter / self._min_duration_frames,
                1.0,
            ),
            "yawn_count": self._yawn_count,
        }

    def reset(self):
        pass
