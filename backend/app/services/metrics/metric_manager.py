import logging

from typing_extensions import TypedDict

from app.services.metrics.base_metric import BaseMetric
from app.services.metrics.eye_closure import EyeClosureMetric, EyeClosureMetricOutput
from app.services.metrics.face_missing_state import FaceMissingState
from app.services.metrics.frame_context import FrameContext
from app.services.metrics.gaze import GazeMetric, GazeMetricOutput
from app.services.metrics.head_pose import HeadPoseMetric, HeadPoseMetricOutput
from app.services.metrics.phone_usage import (
    PhoneUsageMetric,
    PhoneUsageMetricOutput,
)
from app.services.metrics.yawn import YawnMetric, YawnMetricOutput

logger = logging.getLogger(__name__)


class MetricsOutput(TypedDict, total=False):
    """
    Union of all metric outputs.
    """

    face_missing: bool
    eye_closure: EyeClosureMetricOutput
    yawn: YawnMetricOutput
    head_pose: HeadPoseMetricOutput
    gaze: GazeMetricOutput
    phone_usage: PhoneUsageMetricOutput


class MetricManager:
    """
    Orchestrates multiple driver monitoring metrics per frame.
    """

    def __init__(self):
        # Register metrics here
        self.face_missing_state = FaceMissingState()
        self.metrics: dict[str, BaseMetric] = {
            "eye_closure": EyeClosureMetric(),
            "head_pose": HeadPoseMetric(),
            "yawn": YawnMetric(),
            "gaze": GazeMetric(),
            "phone_usage": PhoneUsageMetric(),
        }
        self._head_pose_calibrating = False

    def update(self, context: FrameContext) -> MetricsOutput:
        """
        Update all metrics with the current frame and return combined results.
        """
        face_missing = self.face_missing_state.update(context)

        results: MetricsOutput = {
            "face_missing": face_missing,
        }

        head_pose_output = None
        gaze_metric: GazeMetric | None = None

        for metric_id, metric in self.metrics.items():
            if metric_id == "gaze":
                if isinstance(metric, GazeMetric):
                    gaze_metric = metric
                continue

            try:
                res = metric.update(context)
                if res:
                    results[metric_id] = res
                if metric_id == "head_pose":
                    head_pose_output = res
            except Exception as e:
                logger.error("Metric '%s' update failed: %s", metric_id, e)

        if gaze_metric:
            head_pose_calibrating = bool(head_pose_output and head_pose_output.get("calibrating"))
            if head_pose_calibrating:
                if not self._head_pose_calibrating:
                    gaze_metric.reset_baseline()
                gaze_metric.suspend_calibration()
            elif self._head_pose_calibrating:
                gaze_metric.reset_baseline()
                gaze_metric.resume_after_calibration()

            self._head_pose_calibrating = head_pose_calibrating

            try:
                res = gaze_metric.update(context)
                if res:
                    results["gaze"] = res
            except Exception as e:
                logger.error("Metric '%s' update failed: %s", "gaze", e)

        return results

    def reset(self) -> None:
        """Reset all metrics."""
        for metric in self.metrics.values():
            metric.reset()
        self._head_pose_calibrating = False

    def reset_head_pose_baseline(self) -> None:
        """Reset head pose baseline calibration without touching other metrics."""
        metric = self.metrics.get("head_pose")
        if isinstance(metric, HeadPoseMetric):
            metric.reset_baseline()

    def reset_gaze_baseline(self) -> None:
        """Reset gaze baseline calibration without touching other metrics."""
        metric = self.metrics.get("gaze")
        if isinstance(metric, GazeMetric):
            metric.reset_baseline()
