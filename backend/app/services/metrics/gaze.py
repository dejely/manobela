import logging
from typing import Optional

from app.services.metrics.base_metric import BaseMetric, MetricOutputBase
from app.services.metrics.frame_context import FrameContext
from app.services.metrics.utils.eye_gaze_ratio import (
    left_eye_gaze_ratio,
    right_eye_gaze_ratio,
)
from app.services.metrics.utils.math import in_range

logger = logging.getLogger(__name__)


class GazeMetricOutput(MetricOutputBase):
    gaze_on_road: Optional[bool]


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

    def __init__(
        self,
        horizontal_range: tuple[float, float] = DEFAULT_HORIZONTAL_RANGE,
        vertical_range: tuple[float, float] = DEFAULT_VERTICAL_RANGE,
    ) -> None:
        self.horizontal_range = horizontal_range
        self.vertical_range = vertical_range

    def update(self, context: FrameContext) -> GazeMetricOutput:
        landmarks = context.face_landmarks
        if not landmarks:
            return {
                "gaze_on_road": None,
            }

        try:
            left_ratio = left_eye_gaze_ratio(landmarks)
            right_ratio = right_eye_gaze_ratio(landmarks)
        except (IndexError, ZeroDivisionError) as exc:
            logger.debug(f"Gaze computation failed: {exc}")
            return {
                "gaze_on_road": None,
            }

        # Occlusion handling for missing eye data
        if left_ratio is None and right_ratio is None:
            return {
                "gaze_on_road": False,
            }

        left_on_h = in_range(
            left_ratio[0] if left_ratio else None, self.horizontal_range
        )
        left_on_v = in_range(left_ratio[1] if left_ratio else None, self.vertical_range)

        right_on_h = in_range(
            right_ratio[0] if right_ratio else None, self.horizontal_range
        )
        right_on_v = in_range(
            right_ratio[1] if right_ratio else None, self.vertical_range
        )

        horizontal_ok = all(v is True for v in (left_on_h, right_on_h) if v is not None)
        vertical_ok = all(v is True for v in (left_on_v, right_on_v) if v is not None)

        gaze_on_road = horizontal_ok and vertical_ok

        return {
            "gaze_on_road": gaze_on_road,
        }

    def reset(self) -> None:
        pass
