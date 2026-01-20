import logging
from collections import deque

from app.core.config import settings
from app.services.metrics.base_metric import BaseMetric, MetricOutputBase
from app.services.metrics.frame_context import FrameContext
from app.services.metrics.utils.eye_gaze_ratio import (
    left_eye_gaze_ratio,
    right_eye_gaze_ratio,
)
from app.services.metrics.utils.math import in_range

logger = logging.getLogger(__name__)


class GazeMetricOutput(MetricOutputBase):
    gaze_alert: bool
    gaze_rate: float


class GazeMetric(BaseMetric):
    """
    Computes whether the user's gaze is within an acceptable region.

    The metric estimates gaze direction using iris position relative to eye
    corners and eyelids for both eyes. It then checks if the gaze lies within
    the configured horizontal and vertical ranges.

    Coordinate System (used internally):
        - X-axis: 0.0 (left) to 1.0 (right)
        - Y-axis: 0.0 (top) to 1.0 (bottom)
    """

    DEFAULT_HORIZONTAL_RANGE = (0.35, 0.65)
    DEFAULT_VERTICAL_RANGE = (0.35, 0.65)
    DEFAULT_WINDOW_SEC = 3
    DEFAULT_THRESHOLD = 0.5

    def __init__(
        self,
        horizontal_range: tuple[float, float] = DEFAULT_HORIZONTAL_RANGE,
        vertical_range: tuple[float, float] = DEFAULT_VERTICAL_RANGE,
        window_sec: int = DEFAULT_WINDOW_SEC,
        threshold: float = DEFAULT_THRESHOLD,
    ) -> None:
        self.horizontal_range = horizontal_range
        self.vertical_range = vertical_range
        self.threshold = threshold

        # Convert seconds to frames
        self.window_size = max(1, int(window_sec * settings.target_fps))
        self._history = deque(maxlen=self.window_size)

    def update(self, context: FrameContext) -> GazeMetricOutput:
        landmarks = context.face_landmarks

        if not landmarks:
            self._history.append(False)
            return {"gaze_alert": False, "gaze_rate": 0.0}

        try:
            left_ratio = left_eye_gaze_ratio(landmarks)
            right_ratio = right_eye_gaze_ratio(landmarks)
        except (IndexError, ZeroDivisionError) as exc:
            logger.debug(f"Gaze computation failed: {exc}")
            self._history.append(False)
            return {"gaze_alert": False, "gaze_rate": 0.0}

        if left_ratio is None and right_ratio is None:
            gaze_on_road = False
        else:
            left_on_h = in_range(
                left_ratio[0] if left_ratio else None, self.horizontal_range
            )
            left_on_v = in_range(
                left_ratio[1] if left_ratio else None, self.vertical_range
            )

            right_on_h = in_range(
                right_ratio[0] if right_ratio else None, self.horizontal_range
            )
            right_on_v = in_range(
                right_ratio[1] if right_ratio else None, self.vertical_range
            )

            horizontal_ok = all(
                v is True for v in (left_on_h, right_on_h) if v is not None
            )
            vertical_ok = all(
                v is True for v in (left_on_v, right_on_v) if v is not None
            )

            gaze_on_road = horizontal_ok and vertical_ok

        # Convert to alert flag
        gaze_alert_frame = not gaze_on_road
        self._history.append(gaze_alert_frame)

        valid_frames = [v for v in self._history if v is not None]
        ratio = sum(valid_frames) / len(valid_frames) if valid_frames else 0.0
        alert = ratio >= self.threshold

        return {"gaze_alert": alert, "gaze_rate": ratio}

    def reset(self) -> None:
        self._history.clear()
