import asyncio
import functools
import logging
import os
import tempfile
import threading
from contextlib import suppress
from datetime import datetime, timezone
from app.core.config import settings


import cv2
from fastapi import APIRouter, File, HTTPException, Query, UploadFile, status

from app.models.video_upload import VideoProcessingResponse
from app.services.uploaded_video_processor import (
    FileTooLargeError,
    InvalidVideoFormatError,
    NoFramesProcessedError,
    VideoDurationTooLongError,
    VideoProcessingFailedError,
    _process_video_upload,
)
from app.core.dependencies import FaceLandmarkerDep, ObjectDetectorDep
from app.models.video_upload import VideoFrameResult, VideoMetadata, VideoProcessingResponse
from app.services.face_landmarker import FaceLandmarker
from app.services.metrics.metric_manager import MetricManager
from app.services.object_detector import ObjectDetector
from app.services.smoother import SequenceSmoother
from app.services.video_processor import MAX_WIDTH, process_video_frame

logger = logging.getLogger(__name__)

router = APIRouter(tags=["driver_monitoring"])



@router.post(
    "/driver-monitoring/process-video",
    response_model=VideoProcessingResponse,
    status_code=status.HTTP_200_OK,
)
async def process_video(
    face_landmarker: FaceLandmarkerDep,
    object_detector: ObjectDetectorDep,
    video: UploadFile = File(...),
    target_fps: int = Query(settings.target_fps, ge=1, le=60),
):
    if video.content_type and not video.content_type.startswith("video/"):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid video format.")


    try:
        return await asyncio.wait_for(
        _process_video_upload(
            upload_file=video,
            target_fps=target_fps,
            face_landmarker=face_landmarker,
            object_detector=object_detector,
        ),
        timeout=settings.max_processing_time_seconds,
    )



    except asyncio.TimeoutError as exc:
        logger.warning("Video processing timeout for %s", video.filename)

        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Video processing timed out.",
        ) from exc

    except InvalidVideoFormatError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid video format.") from exc

    except FileTooLargeError as exc:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=(
                "Uploaded video exceeds the limit of "
                f"{settings.max_upload_size_bytes // (1024 * 1024)}MB."
            ),
        ) from exc

    except VideoDurationTooLongError as exc:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=(
                "Uploaded video exceeds the duration limit of "
                f"{settings.max_upload_duration_seconds} seconds."
            ),
        ) from exc

    except NoFramesProcessedError as exc:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="No frames processed.") from exc

    except VideoProcessingFailedError as exc:
        logger.exception("Video processing failed for %s", video.filename)
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Video processing failed.") from exc
