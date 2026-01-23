import logging

from fastapi import APIRouter, File, HTTPException, Query, UploadFile, status

from app.core.dependencies import FaceLandmarkerDep, ObjectDetectorDep
from app.models.video_upload import VideoProcessingResponse
from app.services.uploaded_video_processor import (
    InvalidVideoFormatError,
    NoFramesProcessedError,
    VideoProcessingFailedError,
    VideoProcessingTimeoutError,
    process_uploaded_video,
)

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
    target_fps: int = Query(15, ge=1, le=60),
):
    """
    Upload and process a video file for driver monitoring metrics.
    """
    if video.content_type and not video.content_type.startswith("video/"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid video format.",
        )

    try:
        return await process_uploaded_video(
            upload_file=video,
            target_fps=target_fps,
            face_landmarker=face_landmarker,
            object_detector=object_detector,
        )
    except VideoProcessingTimeoutError as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Video processing timed out.",
        ) from exc
    except InvalidVideoFormatError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid video format.",
        ) from exc
    except NoFramesProcessedError as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="No video frames could be processed.",
        ) from exc
    except VideoProcessingFailedError as exc:
        logger.exception("Video processing failed for %s", video.filename)
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Video processing failed.",
        ) from exc
