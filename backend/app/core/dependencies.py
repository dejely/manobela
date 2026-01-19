from __future__ import annotations

import logging
from typing import Annotated

from fastapi import Depends, Request, WebSocket

from app.services.connection_manager import ConnectionManager
from app.services.face_landmarker import FaceLandmarker
from app.services.object_detector import YoloObjectDetector

logger = logging.getLogger(__name__)


def get_connection_manager(request: Request) -> ConnectionManager:
    return request.app.state.connection_manager


def get_connection_manager_ws(websocket: WebSocket) -> ConnectionManager:
    return websocket.app.state.connection_manager


def get_face_landmarker(request: Request) -> FaceLandmarker:
    return request.app.state.face_landmarker


def get_face_landmarker_ws(websocket: WebSocket) -> FaceLandmarker:
    return websocket.app.state.face_landmarker


def get_object_detector(request: Request) -> YoloObjectDetector:
    return request.app.state.object_detector


def get_object_detector_ws(websocket: WebSocket) -> YoloObjectDetector:
    return websocket.app.state.object_detector


ConnectionManagerDep = Annotated[ConnectionManager, Depends(get_connection_manager)]
ConnectionManagerWsDep = Annotated[
    ConnectionManager, Depends(get_connection_manager_ws)
]
FaceLandmarkerDep = Annotated[FaceLandmarker, Depends(get_face_landmarker)]
FaceLandmarkerDepWs = Annotated[FaceLandmarker, Depends(get_face_landmarker_ws)]
ObjectDetectorDep = Annotated[YoloObjectDetector, Depends(get_object_detector)]
ObjectDetectorDepWs = Annotated[YoloObjectDetector, Depends(get_object_detector_ws)]
