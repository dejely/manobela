import asyncio
import functools
import logging
import os
import tempfile
import threading
from contextlib import suppress
from datetime import datetime, timezone

import cv2
from fastapi import APIRouter, File, HTTPException, Query, UploadFile, status

from app.core.dependencies import FaceLandmarkerDep, ObjectDetectorDep
from app.models.video_upload import VideoFrameResult, VideoMetadata, VideoProcessingResponse
from app.services.face_landmarker import FaceLandmarker
from app.services.metrics.metric_manager import MetricManager
from app.services.object_detector import ObjectDetector
from app.services.smoother import SequenceSmoother
from app.services.video_processor import MAX_WIDTH, process_video_frame

logger = logging.getLogger(__name__)

router = APIRouter(tags=["driver_monitoring"])

MAX_UPLOAD_BYTES = 50 * 1024 * 1024
PROCESSING_TIMEOUT_SEC = 30
CANCEL_GRACE_SEC = 2

# allowlist extensions to reduce attack surface
ALLOWED_SUFFIXES = {".mp4", ".mov", ".mkv", ".avi", ".webm"}


class InvalidVideoFormatError(Exception):
    """Raised when uploaded file is not a supported video."""


class VideoProcessingFailedError(Exception):
    """Raised when video processing fails unexpectedly."""


class FileTooLargeError(Exception):
    """Raised when the upload exceeds the allowed size limit during streaming."""


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


def _process_video_upload(
    video_path: str,
    target_fps: int,
    filename: str,
    content_type: str,
    file_size_bytes: int,
    face_landmarker: FaceLandmarker,
    object_detector: ObjectDetector,
    cancel_event: threading.Event | None = None,
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
            if cancel_event and cancel_event.is_set():
                # keep cancellation reason intact
                raise VideoProcessingFailedError("Processing cancelled due to timeout.")

            success, frame = cap.read()
            if not success:
                break

            frame_index += 1
            time_offset_sec = (cap.get(cv2.CAP_PROP_POS_MSEC) or 0) / 1000

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
                VideoFrameResult.from_inference(
                    inference=inference,
                    frame_index=frame_index,
                    time_offset_sec=time_offset_sec,
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
    except VideoProcessingFailedError:
        #  do not re-wrap; preserve message for caller/logging
        raise
    except Exception as exc:
        raise VideoProcessingFailedError("Video processing failed") from exc
    finally:
        cap.release()


async def _cleanup_tmp_when_done(task, path: str) -> None:
    with suppress(Exception):
        await task
    with suppress(FileNotFoundError, PermissionError):
        os.remove(path)


def _secure_copy_to_disk(upload_file: UploadFile, dest_path: str, limit: int) -> int:
    current_size = 0
    chunk_size = 1024 * 1024

    with open(dest_path, "wb") as out:
        while True:
            chunk = upload_file.file.read(chunk_size)
            if not chunk:
                break

            current_size += len(chunk)
            if current_size > limit:
                raise FileTooLargeError()

            out.write(chunk)

    return current_size


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
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid video format.")

    suffix = (os.path.splitext(video.filename or "")[1] or ".mp4").lower()
    if suffix not in ALLOWED_SUFFIXES:
        suffix = ".mp4"

    tmp_path: str | None = None
    cleanup_scheduled = False
    cancel_event = threading.Event()
    process_task = None

    filename = video.filename or "unknown"
    content_type = video.content_type or "application/octet-stream"

    try:
        with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp_file:
            tmp_path = tmp_file.name

        await video.seek(0)

        try:
            size_bytes = await asyncio.to_thread(_secure_copy_to_disk, video, tmp_path, MAX_UPLOAD_BYTES)
        except FileTooLargeError:
            raise HTTPException(
                status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                detail=f"Uploaded video exceeds the limit of {MAX_UPLOAD_BYTES // (1024 * 1024)}MB.",
            )

        loop = asyncio.get_running_loop()
        process_task = loop.run_in_executor(
            None,
            functools.partial(
                _process_video_upload,
                tmp_path,
                target_fps,
                filename,
                content_type,
                size_bytes,
                face_landmarker,
                object_detector,
                cancel_event,
            ),
        )

        return await asyncio.wait_for(process_task, timeout=PROCESSING_TIMEOUT_SEC)

    except asyncio.TimeoutError as exc:
        logger.warning("Video processing timeout for %s", filename)
        cancel_event.set()

        if tmp_path and process_task:
            cleanup_scheduled = True
            asyncio.create_task(_cleanup_tmp_when_done(process_task, tmp_path))

        with suppress(asyncio.TimeoutError, Exception):
            if process_task:
                await asyncio.wait_for(process_task, timeout=CANCEL_GRACE_SEC)

        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Video processing timed out.",
        ) from exc

    except InvalidVideoFormatError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid video format.") from exc

    except VideoProcessingFailedError as exc:
        # map cancellation to 503, keep other failures 422
        if "cancelled" in str(exc).lower():
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Video processing timed out.",
            ) from exc

        logger.exception("Video processing failed for %s", filename)
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Video processing failed.") from exc

    finally:
        if tmp_path and not cleanup_scheduled:
            with suppress(FileNotFoundError, PermissionError):
                os.remove(tmp_path)
