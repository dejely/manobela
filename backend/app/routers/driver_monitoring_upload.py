import asyncio
import functools
import logging
import os
import shutil
import tempfile
from datetime import datetime, timezone

import cv2
from fastapi import APIRouter, File, HTTPException, Query, UploadFile, status

# Assumed dependencies (kept as is)
from app.core.dependencies import FaceLandmarkerDep, ObjectDetectorDep
from app.models.video_upload import (
    VideoFrameResult,
    VideoMetadata,
    VideoProcessingResponse,
)
from app.services.face_landmarker import FaceLandmarker
from app.services.metrics.metric_manager import MetricManager
from app.services.object_detector import ObjectDetector
from app.services.smoother import SequenceSmoother
from app.services.video_processor import MAX_WIDTH, process_video_frame

logger = logging.getLogger(__name__)

router = APIRouter(tags=["driver_monitoring"])

MAX_UPLOAD_BYTES = 50 * 1024 * 1024
PROCESSING_TIMEOUT_SEC = 30


class InvalidVideoFormatError(Exception):
    """Raised when uploaded file is not a supported video."""


class VideoProcessingFailedError(Exception):
    """Raised when video processing fails unexpectedly."""


# FIX: Modified to accept primitive types instead of UploadFile object
def _build_video_metadata(
    filename: str,
    content_type: str,
    file_size_bytes: int,
    fps: float,
    total_frames: int,
    width: int,
    height: int,
    target_fps: int,
    processed_frames: int,
) -> VideoMetadata:
    duration_seconds = None
    if fps and fps > 0 and total_frames:
        duration_seconds = total_frames / fps

    return VideoMetadata(
        filename=filename,
        content_type=content_type,
        size_bytes=file_size_bytes,
        fps=fps if fps > 0 else None,
        target_fps=target_fps,
        duration_seconds=duration_seconds,
        total_frames=total_frames or None,
        width=width or None,
        height=height or None,
        processed_frames=processed_frames,
        max_width=MAX_WIDTH,
    )


# FIX: Removed UploadFile from arguments, added metadata args
def _process_video_upload(
    video_path: str,
    target_fps: int,
    filename: str,          # Passed explicitly
    content_type: str,      # Passed explicitly
    file_size_bytes: int,   # Passed explicitly
    face_landmarker: FaceLandmarker,
    object_detector: ObjectDetector,
) -> VideoProcessingResponse:
    cap = cv2.VideoCapture(video_path)
    if not cap.isOpened():
        raise InvalidVideoFormatError("Unable to open video file.")

    try:
        fps = cap.get(cv2.CAP_PROP_FPS) or 0.0
        total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT) or 0)
        width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH) or 0)
        height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT) or 0)

        metric_manager = MetricManager()
        smoother = SequenceSmoother(alpha=0.8, max_missing=5)
        frames: list[VideoFrameResult] = []

        sample_interval = 1 / target_fps
        next_sample_time = 0.0
        frame_index = 0

        while True:
            success, frame = cap.read()
            if not success:
                break

            frame_index += 1
            time_offset_sec = (cap.get(cv2.CAP_PROP_POS_MSEC) or 0) / 1000

            # Skip frames logic
            if fps > 0 and time_offset_sec + 1e-6 < next_sample_time:
                continue

            next_sample_time += sample_interval

            inference = process_video_frame(
                timestamp=datetime.now(timezone.utc).isoformat(),
                img_bgr=frame,
                face_landmarker=face_landmarker,
                object_detector=object_detector,
                metric_manager=metric_manager,
                smoother=smoother,
            )

            frames.append(
                VideoFrameResult(
                    frame_index=frame_index,
                    time_offset_sec=time_offset_sec,
                    **inference.model_dump(),
                )
            )

        if not frames:
            raise InvalidVideoFormatError("No frames found in video.")

        metadata = _build_video_metadata(
            filename=filename,
            content_type=content_type,
            file_size_bytes=file_size_bytes,
            fps=fps,
            total_frames=total_frames,
            width=width,
            height=height,
            target_fps=target_fps,
            processed_frames=len(frames),
        )

        return VideoProcessingResponse(video_metadata=metadata, frames=frames)
    except InvalidVideoFormatError:
        raise
    except Exception as exc:
        raise VideoProcessingFailedError("Video processing failed") from exc
    finally:
        cap.release()


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
    if video.content_type and not video.content_type.startswith("video/"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid video format.",
        )

    # 1. Check size efficiently without seek if possible, or seek/tell in main thread
    # NOTE: UploadFile.size is not always available, seeking is reliable.
    await video.seek(0, os.SEEK_END)
    size_bytes = await video.tell() # Async method available in Starlette/FastAPI
    await video.seek(0)

    if size_bytes > MAX_UPLOAD_BYTES:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail="Uploaded video is too large.",
        )

    suffix = os.path.splitext(video.filename or "")[1] or ".mp4"
    tmp_path = None

    try:
        # 2. FIX: Use non-blocking read to save file
        with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp_file:
            tmp_path = tmp_file.name

        # Read content asynchronously to avoid blocking event loop
        content = await video.read()

        # Write to disk (run in executor if strict non-blocking is needed,
        # but standard write for 50MB is usually acceptable.
        # For maximum safety, we wrap the write operation).
        await asyncio.to_thread(lambda: open(tmp_path, 'wb').write(content))

        # 3. Extract metadata here in the main thread
        filename = video.filename or "unknown"
        content_type = video.content_type or "application/octet-stream"

        process_task = asyncio.get_running_loop().run_in_executor(
            None,
            functools.partial(
                _process_video_upload,
                tmp_path,
                target_fps,
                filename,       # Pass string
                content_type,   # Pass string
                size_bytes,     # Pass int
                face_landmarker,
                object_detector,
            ),
        )

        response = await asyncio.wait_for(
            process_task,
            timeout=PROCESSING_TIMEOUT_SEC,
        )
        return response

    except asyncio.TimeoutError as exc:
        logger.warning("Video processing timeout for %s", video.filename)
        # Note: The background thread might still be running CV2 logic here.
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Video processing timed out.",
        ) from exc
    except InvalidVideoFormatError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid video format.",
        ) from exc
    except VideoProcessingFailedError as exc:
        logger.exception("Video processing failed for %s", video.filename)
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Video processing failed.",
        ) from exc
    finally:
        if tmp_path and os.path.exists(tmp_path):
            try:
                os.remove(tmp_path)
            except OSError:
                logger.error(f"Failed to remove temp file {tmp_path}")
