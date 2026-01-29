import logging

from app.core.config import settings
from app.services.metrics.base_metric import BaseMetric, MetricOutputBase
from app.services.metrics.eye_closure import EyeClosureMetric
from app.services.metrics.frame_context import FrameContext
from app.services.metrics.utils.ear import average_ear
from app.services.metrics.utils.eye_gaze_ratio import (
    left_eye_gaze_ratio,
    right_eye_gaze_ratio,
)
from app.services.metrics.utils.math import in_range
from app.services.smoother import SequenceSmoother

logger = logging.getLogger(__name__)


class GazeMetricOutput(MetricOutputBase, total=False):
    """
    Attributes:
        gaze_alert: Whether gaze has been outside the configured range for at least min_sustained_sec.
        gaze_sustained: Fraction of time the gaze has been continuous.
    """

    gaze_alert: bool
    gaze_sustained: float


class GazeMetric(BaseMetric):
    """
    Gaze metric using left and right eye gaze ratios.
    """

    DEFAULT_HORIZONTAL_RANGE = (0.35, 0.65)
    DEFAULT_VERTICAL_RANGE = (0.35, 0.65)
    DEFAULT_MIN_SUSTAINED_SEC = 0.5
    DEFAULT_SMOOTHER_ALPHA = 0.4
    DEFAULT_EYE_CLOSED_EAR_THRESHOLD = (
        EyeClosureMetric.DEFAULT_EAR_THRESHOLD
        * EyeClosureMetric.DEFAULT_EAR_HYSTERESIS_RATIO
    )

    def __init__(
        self,
        horizontal_range: tuple[float, float] = DEFAULT_HORIZONTAL_RANGE,
        vertical_range: tuple[float, float] = DEFAULT_VERTICAL_RANGE,
        min_sustained_sec: float = DEFAULT_MIN_SUSTAINED_SEC,
        smoother_alpha: float = DEFAULT_SMOOTHER_ALPHA,
        eye_closed_ear_threshold: float = DEFAULT_EYE_CLOSED_EAR_THRESHOLD,
    ) -> None:
        """
        Args:
            horizontal_range: Range of horizontal gaze deviation (0-1, 0-1).
            vertical_range: Range of vertical gaze deviation (0-1, 0-1).
            min_sustained_sec: Minimum duration in seconds to count as gaze (0-inf).
            smoother_alpha: Smoother alpha for gaze smoothing (0-1).
            eye_closed_ear_threshold: EAR threshold below which gaze alerts are suppressed (0-1).
        """

        # Validate inputs
        if horizontal_range[0] < 0 or horizontal_range[0] > 1:
            raise ValueError("horizontal_range[0] must be between (0, 1).")
        if horizontal_range[1] < 0 or horizontal_range[1] > 1:
            raise ValueError("horizontal_range[1] must be between (0, 1).")
        if vertical_range[0] < 0 or vertical_range[0] > 1:
            raise ValueError("vertical_range[0] must be between (0, 1).")
        if vertical_range[1] < 0 or vertical_range[1] > 1:
            raise ValueError("vertical_range[1] must be between (0, 1).")
        if min_sustained_sec <= 0:
            raise ValueError("min_sustained_sec must be positive.")
        if eye_closed_ear_threshold < 0 or eye_closed_ear_threshold > 1:
            raise ValueError("eye_closed_ear_threshold must be between (0, 1).")

        self.horizontal_range = horizontal_range
        self.vertical_range = vertical_range
        self.eye_closed_ear_threshold = eye_closed_ear_threshold

        fps = getattr(settings, "target_fps", 15)
        self.min_sustained_frames = max(1, int(min_sustained_sec * fps))

        self._sustained_out_of_range_frames = 0
        self._gaze_alert_state = False

        self.left_smoother = SequenceSmoother(alpha=smoother_alpha, max_missing=3)
        self.right_smoother = SequenceSmoother(alpha=smoother_alpha, max_missing=3)

    def update(self, context: FrameContext) -> GazeMetricOutput:
        landmarks = context.face_landmarks
        if not landmarks:
            return self._build_output()

        if self._eyes_closed(landmarks):
            self._reset_alert_state()
            return self._build_output()

        try:
            left_ratio_raw = left_eye_gaze_ratio(landmarks)
            right_ratio_raw = right_eye_gaze_ratio(landmarks)

            left_ratio = (
                self.left_smoother.update(left_ratio_raw) if left_ratio_raw else None
            )
            right_ratio = (
                self.right_smoother.update(right_ratio_raw) if right_ratio_raw else None
            )

        except (IndexError, ZeroDivisionError) as exc:
            logger.debug(f"Gaze computation failed: {exc}")
            return self._build_output()

        if left_ratio is None and right_ratio is None:
            self._reset_alert_state()
            return self._build_output()
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

        if not gaze_on_road:
            self._sustained_out_of_range_frames += 1
        else:
            self._sustained_out_of_range_frames = 0
            self._gaze_alert_state = False

        if self._sustained_out_of_range_frames >= self.min_sustained_frames:
            self._gaze_alert_state = True

        return self._build_output()

    def reset(self) -> None:
        self._reset_alert_state()
        self.left_smoother.reset()
        self.right_smoother.reset()

    def _build_output(self) -> GazeMetricOutput:
        return {
            "gaze_alert": self._gaze_alert_state,
            "gaze_sustained": self._calc_sustained(),
        }

    def _eyes_closed(self, landmarks) -> bool:
        ear_value = average_ear(landmarks)
        return ear_value <= self.eye_closed_ear_threshold

    def _reset_alert_state(self) -> None:
        self._sustained_out_of_range_frames = 0
        self._gaze_alert_state = False

    def _calc_sustained(self) -> float:
        return min(self._sustained_out_of_range_frames / self.min_sustained_frames, 1.0)
