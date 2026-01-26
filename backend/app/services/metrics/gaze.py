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


class GazeMetricOutput(MetricOutputBase):
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

    Calibrates a neutral gaze baseline so alerts are relative to the driver's
    forward-looking posture rather than the phone camera perspective.
    """

    DEFAULT_HORIZONTAL_RANGE = (0.35, 0.65)
    DEFAULT_VERTICAL_RANGE = (0.35, 0.65)
    DEFAULT_MIN_SUSTAINED_SEC = 0.5
    DEFAULT_CALIBRATION_SEC = 1.0
    DEFAULT_POST_CALIBRATION_HOLD_SEC = 0.5
    DEFAULT_MISSING_RESET_SEC = 3.0
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
        calibration_sec: float = DEFAULT_CALIBRATION_SEC,
        post_calibration_hold_sec: float = DEFAULT_POST_CALIBRATION_HOLD_SEC,
        missing_reset_sec: float = DEFAULT_MISSING_RESET_SEC,
        smoother_alpha: float = DEFAULT_SMOOTHER_ALPHA,
        eye_closed_ear_threshold: float = DEFAULT_EYE_CLOSED_EAR_THRESHOLD,
    ) -> None:
        """
        Args:
            horizontal_range: Range of horizontal gaze deviation (0-1, 0-1).
            vertical_range: Range of vertical gaze deviation (0-1, 0-1).
            min_sustained_sec: Minimum duration in seconds to count as gaze (0-inf).
            calibration_sec: Seconds of neutral-looking frames to average for baseline.
            post_calibration_hold_sec: Seconds to wait after calibration before building baseline.
            missing_reset_sec: Seconds without a face before forcing recalibration.
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
        if calibration_sec <= 0:
            raise ValueError("calibration_sec must be positive.")
        if post_calibration_hold_sec < 0:
            raise ValueError("post_calibration_hold_sec must be non-negative.")
        if missing_reset_sec <= 0:
            raise ValueError("missing_reset_sec must be positive.")
        if eye_closed_ear_threshold < 0 or eye_closed_ear_threshold > 1:
            raise ValueError("eye_closed_ear_threshold must be between (0, 1).")

        self.horizontal_range = horizontal_range
        self.vertical_range = vertical_range
        self.eye_closed_ear_threshold = eye_closed_ear_threshold

        fps = getattr(settings, "target_fps", 15)
        self.min_sustained_frames = max(1, int(min_sustained_sec * fps))
        self.calibration_frames = max(1, int(calibration_sec * fps))
        self.post_calibration_hold_frames = max(0, int(post_calibration_hold_sec * fps))
        self.missing_reset_frames = max(1, int(missing_reset_sec * fps))

        self._horizontal_offsets = self._range_offsets(horizontal_range)
        self._vertical_offsets = self._range_offsets(vertical_range)

        self._sustained_out_of_range_frames = 0
        self._gaze_alert_state = False
        self._missing_frames = 0
        self._calibration_hold_frames = 0
        self._calibration_suspended = False

        self._baseline_left: tuple[float, float] | None = None
        self._baseline_right: tuple[float, float] | None = None
        self._baseline_left_sum = [0.0, 0.0]
        self._baseline_right_sum = [0.0, 0.0]
        self._baseline_left_count = 0
        self._baseline_right_count = 0

        self.left_smoother = SequenceSmoother(alpha=smoother_alpha, max_missing=3)
        self.right_smoother = SequenceSmoother(alpha=smoother_alpha, max_missing=3)

    def update(self, context: FrameContext) -> GazeMetricOutput:
        landmarks = context.face_landmarks
        if not landmarks:
            self._missing_frames += 1
            if self._missing_frames >= self.missing_reset_frames:
                self.reset_baseline()
            return self._build_output()

        self._missing_frames = 0

        if self._calibration_suspended:
            self._reset_alert_state()
            return self._build_output()

        if self._calibration_hold_frames > 0:
            self._calibration_hold_frames -= 1
            self._reset_alert_state()
            return self._build_output()

        if self._eyes_closed(landmarks):
            self._reset_alert_state()
            return self._build_output()

        try:
            left_ratio_raw = left_eye_gaze_ratio(landmarks)
            right_ratio_raw = right_eye_gaze_ratio(landmarks)

            left_ratio = (
                self.left_smoother.update(left_ratio_raw)
                if left_ratio_raw
                else None
            )
            right_ratio = (
                self.right_smoother.update(right_ratio_raw)
                if right_ratio_raw
                else None
            )

        except (IndexError, ZeroDivisionError) as exc:
            logger.debug(f"Gaze computation failed: {exc}")
            return self._build_output()

        if left_ratio is None and right_ratio is None:
            self._reset_alert_state()
            return self._build_output()

        self._accumulate_baseline(left_ratio, right_ratio)
        if not self._baseline_ready():
            self._reset_alert_state()
            return self._build_output()

        left_on_h = self._in_baseline_range(
            left_ratio, self._baseline_left, axis=0, offsets=self._horizontal_offsets
        )
        left_on_v = self._in_baseline_range(
            left_ratio, self._baseline_left, axis=1, offsets=self._vertical_offsets
        )

        right_on_h = self._in_baseline_range(
            right_ratio, self._baseline_right, axis=0, offsets=self._horizontal_offsets
        )
        right_on_v = self._in_baseline_range(
            right_ratio, self._baseline_right, axis=1, offsets=self._vertical_offsets
        )

        if all(v is None for v in (left_on_h, right_on_h, left_on_v, right_on_v)):
            self._reset_alert_state()
            return self._build_output()

        horizontal_ok = all(v is True for v in (left_on_h, right_on_h) if v is not None)
        vertical_ok = all(v is True for v in (left_on_v, right_on_v) if v is not None)

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
        self._calibration_hold_frames = 0
        self._calibration_suspended = False
        self.reset_baseline()

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

    @staticmethod
    def _range_offsets(rng: tuple[float, float]) -> tuple[float, float]:
        center = (rng[0] + rng[1]) / 2.0
        return (rng[0] - center, rng[1] - center)

    @staticmethod
    def _apply_offsets(center: float, offsets: tuple[float, float]) -> tuple[float, float]:
        return (center + offsets[0], center + offsets[1])

    def _baseline_ready(self) -> bool:
        return self._baseline_left is not None or self._baseline_right is not None

    def _accumulate_baseline(
        self,
        left_ratio: tuple[float, float] | None,
        right_ratio: tuple[float, float] | None,
    ) -> None:
        if left_ratio is not None and self._baseline_left is None:
            self._baseline_left_sum[0] += left_ratio[0]
            self._baseline_left_sum[1] += left_ratio[1]
            self._baseline_left_count += 1
            if self._baseline_left_count >= self.calibration_frames:
                self._baseline_left = (
                    self._baseline_left_sum[0] / self._baseline_left_count,
                    self._baseline_left_sum[1] / self._baseline_left_count,
                )

        if right_ratio is not None and self._baseline_right is None:
            self._baseline_right_sum[0] += right_ratio[0]
            self._baseline_right_sum[1] += right_ratio[1]
            self._baseline_right_count += 1
            if self._baseline_right_count >= self.calibration_frames:
                self._baseline_right = (
                    self._baseline_right_sum[0] / self._baseline_right_count,
                    self._baseline_right_sum[1] / self._baseline_right_count,
                )

    def _in_baseline_range(
        self,
        ratio: tuple[float, float] | None,
        baseline: tuple[float, float] | None,
        axis: int,
        offsets: tuple[float, float],
    ) -> bool | None:
        if ratio is None or baseline is None:
            return None
        rng = self._apply_offsets(baseline[axis], offsets)
        return in_range(ratio[axis], rng)

    def reset_baseline(self) -> None:
        self._baseline_left = None
        self._baseline_right = None
        self._baseline_left_sum = [0.0, 0.0]
        self._baseline_right_sum = [0.0, 0.0]
        self._baseline_left_count = 0
        self._baseline_right_count = 0
        self._missing_frames = 0
        self._reset_alert_state()

    def suspend_calibration(self) -> None:
        self._calibration_suspended = True

    def resume_after_calibration(self) -> None:
        self._calibration_suspended = False
        self._calibration_hold_frames = self.post_calibration_hold_frames
