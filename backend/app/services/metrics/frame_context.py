from dataclasses import dataclass
from typing import Optional, Sequence

from app.services.face_landmarker import FaceLandmark2D
from app.services.object_detector import ObjectDetection


@dataclass(frozen=True)
class FrameContext:
    face_landmarks: Optional[Sequence[FaceLandmark2D]] = None
    object_detections: Optional[Sequence[ObjectDetection]] = None
