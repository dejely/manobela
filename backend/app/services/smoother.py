from __future__ import annotations

from typing import Optional, Sequence


class _BaseSmoother:
    """
    Shared EMA logic for smoothers.

    Not intended for direct use.
    """

    def __init__(self, alpha: float, max_missing: int):
        if not (0.0 < alpha <= 1.0):
            raise ValueError("alpha must be in the range (0, 1].")
        if max_missing < 0:
            raise ValueError("max_missing must be non-negative.")

        self.alpha = alpha
        self.max_missing = max_missing
        self._missing_count = 0

    def _handle_missing(self, last_value):
        self._missing_count += 1
        if self._missing_count <= self.max_missing:
            return last_value
        self._missing_count = 0
        return None

    def reset(self) -> None:
        self._missing_count = 0


class ScalarSmoother(_BaseSmoother):
    """
    EMA smoother for scalar float values.
    """

    def __init__(self, alpha: float = 0.3, max_missing: int = 5):
        super().__init__(alpha, max_missing)
        self._last_value: Optional[float] = None

    def update(self, new_value: Optional[float]) -> Optional[float]:
        if new_value is None:
            self._last_value = self._handle_missing(self._last_value)
            return self._last_value

        self._missing_count = 0

        if self._last_value is None:
            self._last_value = new_value
            return new_value

        smoothed = self.alpha * new_value + (1 - self.alpha) * self._last_value
        self._last_value = smoothed
        return smoothed

    def reset(self) -> None:
        super().reset()
        self._last_value = None


class SequenceSmoother(_BaseSmoother):
    """
    EMA smoother for fixed-length numeric sequences.
    """

    def __init__(self, alpha: float = 0.3, max_missing: int = 5):
        super().__init__(alpha, max_missing)
        self._last_value: Optional[list[float]] = None

    def update(self, new_value: Optional[Sequence[float]]) -> Optional[list[float]]:
        if new_value is None:
            self._last_value = self._handle_missing(self._last_value)
            return self._last_value

        self._missing_count = 0
        new_list = list(map(float, new_value))

        if self._last_value is None or len(self._last_value) != len(new_list):
            self._last_value = new_list
            return new_list

        smoothed = [
            self.alpha * curr + (1 - self.alpha) * prev
            for curr, prev in zip(new_list, self._last_value)
        ]

        self._last_value = smoothed
        return smoothed

    def reset(self) -> None:
        super().reset()
        self._last_value = None
