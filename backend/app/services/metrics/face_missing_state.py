from __future__ import annotations

from app.core.config import settings
from app.services.metrics.frame_context import FrameContext


class FaceMissingState:
    """
    Standalone face detection state.

    Outputs a single boolean:
      - face_missing: True if face has been missing for >= min_missing_duration, False otherwise
    """

    DEFAULT_MIN_MISSING_DURATION_SEC = 0.5

    def __init__(self, min_missing_duration_sec: float = DEFAULT_MIN_MISSING_DURATION_SEC):
        if min_missing_duration_sec <= 0:
            raise ValueError("min_missing_duration_sec must be positive")

        self._min_missing_frames = max(
            1, int(min_missing_duration_sec * settings.target_fps)
        )
        self._missing_frames = 0
        self._face_missing = False

    def update(self, context: FrameContext) -> bool:
        detected = context.face_landmarks is not None and len(context.face_landmarks) > 0

        if not detected:
            self._missing_frames += 1
        else:
            self._missing_frames = 0
            self._face_missing = False

        if self._missing_frames >= self._min_missing_frames:
            self._face_missing = True

        return self._face_missing

    def reset(self):
        self._missing_frames = 0
        self._face_missing = False
