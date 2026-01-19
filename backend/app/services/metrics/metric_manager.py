import logging

from typing_extensions import TypedDict

from app.services.metrics.base_metric import BaseMetric
from app.services.metrics.eye_closure import EyeClosureMetric, EyeClosureMetricOutput
from app.services.metrics.frame_context import FrameContext
from app.services.metrics.gaze import GazeMetric, GazeMetricOutput
from app.services.metrics.head_pose import HeadPoseMetric, HeadPoseMetricOutput
from app.services.metrics.yawn import YawnMetric, YawnMetricOutput
from app.services.phone_usage import PhoneUsageMetric, PhoneUsageMetricOutput

logger = logging.getLogger(__name__)


class MetricsOutput(TypedDict, total=False):
    """
    Union of all metric outputs.
    """

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
        self.metrics: dict[str, BaseMetric] = {
            "eye_closure": EyeClosureMetric(),
            "head_pose": HeadPoseMetric(),
            "yawn": YawnMetric(),
            "gaze": GazeMetric(),
            "phone_usage": PhoneUsageMetric(),
        }

    def update(self, context: FrameContext) -> MetricsOutput:
        """
        Update all metrics with the current frame and return combined results.
        """
        results: MetricsOutput = {}

        for metric_id, metric in self.metrics.items():
            try:
                res = metric.update(context)
                if res:
                    results[metric_id] = res
            except Exception as e:
                logger.error("Metric '%s' update failed: %s", metric_id, e)

        return results

    def reset(self) -> None:
        """Reset all metrics."""
        for metric in self.metrics.values():
            metric.reset()
