from abc import ABC, abstractmethod

from typing_extensions import TypedDict

from app.services.metrics.frame_context import FrameContext


class MetricOutputBase(TypedDict, total=False):
    """
    Base class for metric output.
    """

    pass


class BaseMetric(ABC):
    """
    Abstract base class for all driver monitoring metrics.
    """

    @abstractmethod
    def update(self, context: FrameContext) -> MetricOutputBase:
        """
        Update the metric with the latest frame data.

        Args:
            frame_data: Dictionary containing preprocessed information for this frame
                        e.g., {'landmarks': [...], 'timestamp': 'ISO string'}

        Returns:
            Dictionary of metric results.
        """
        pass

    @abstractmethod
    def reset(self):
        """Reset metric state."""
        pass
