from typing import List, Optional

from pydantic import BaseModel


class Resolution(BaseModel):
    width: int
    height: int


class InferenceData(BaseModel):
    """
    Data returned per video frame inference.

    Attributes:
        timestamp: ISO 8601 timestamp when frame was processed.
        resolution: Resolution of the processed video frame.
        face_landmarks: Flat array of facial landmarks [x1, y1, x2, y2, ...]
                        or None if no face detected.
                        Coordinates are normalized (0-1 range).
    """

    timestamp: str
    resolution: Resolution
    face_landmarks: Optional[List[float]] = None
