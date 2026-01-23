import asyncio
import functools
import logging
import os
import shutil
import tempfile
from datetime import datetime, timezone

import cv2
from fastapi import UploadFile

from app.core.config import settings
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

ALLOWED_EXTENSIONS = {".mp4", ".mov", ".avi", ".mkv", ".webm"}
ALLOWED_CODECS = {"avc1", "h264", "mp4v", "xvid", "mjpg", "vp80", "vp90"}


class InvalidVideoFormatError(Exception):
    """Raised when uploaded file is not a supported video."""


class VideoProcessingFailedError(Exception):
    """Raised when video processing fails unexpectedly."""


class NoFramesProcessedError(Exception):
    """Raised when no frames could be processed from the video."""


class VideoProcessingTimeoutError(Exception):
    """Raised when video processing exceeds the configured timeout."""


def _get_file_size(upload_file: UploadFile) -> int:
    upload_file.file.seek(0, os.SEEK_END)
    size_bytes = upload_file.file.tell()
    upload_file.file.seek(0)
    return size_bytes


def _validate_extension(filename: str | None) -> str:
    suffix = os.path.splitext(filename or "")[1].lower()
    if suffix not in ALLOWED_EXTENSIONS:
        raise InvalidVideoFormatError("Unsupported video file extension.")
    return suffix


def _decode_fourcc(value: float) -> str:
    code = int(value)
    chars = [chr((code >> (8 * i)) & 0xFF) for i in range(4)]
    return "".join(chars).strip("\x00").lower()


def _validate_codec(capture: cv2.VideoCapture) -> None:
    fourcc = capture.get(cv2.CAP_PROP_FOURCC) or 0
    codec = _decode_fourcc(fourcc)
    if not codec or codec not in ALLOWED_CODECS:
        raise InvalidVideoFormatError("Unsupported video codec.")


def _validate_duration(fps: float, total_frames: int) -> float:
    if fps <= 0:
        raise InvalidVideoFormatError("Invalid video FPS.")
    duration_seconds = total_frames / fps if total_frames else 0.0
    if duration_seconds > settings.max_video_duration_seconds:
        raise InvalidVideoFormatError("Video exceeds maximum duration.")
    return duration_seconds


def _build_video_metadata(
    upload_file: UploadFile,
    fps: float,
    total_frames: int,
    width: int,
    height: int,
    target_fps: int,
    processed_frames: int,
) -> VideoMetadata:
    duration_seconds = total_frames / fps if fps and total_frames else None

    return VideoMetadata(
        filename=upload_file.filename,
        content_type=upload_file.content_type,
        size_bytes=_get_file_size(upload_file),
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
    upload_file: UploadFile,
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

        _validate_codec(cap)
        _validate_duration(fps, total_frames)

        metric_manager = MetricManager()
        metric_manager.reset()
        smoother = SequenceSmoother(alpha=0.8, max_missing=5)
        frames: list[VideoFrameResult] = []

        if fps > 0:
            frame_step = max(1, round(fps / target_fps))
        else:
            frame_step = 1

        frame_index = 0

        while True:
            success, frame = cap.read()
            if not success:
                break

            frame_index += 1
            if frame_index % frame_step != 0:
                continue

            if frame is None or frame.size == 0:
                logger.warning("Skipping corrupted frame %s", frame_index)
                continue

            time_offset_sec = (cap.get(cv2.CAP_PROP_POS_MSEC) or 0) / 1000

            try:
                inference = process_video_frame(
                    timestamp=datetime.now(timezone.utc).isoformat(),
                    img_bgr=frame,
                    face_landmarker=face_landmarker,
                    object_detector=object_detector,
                    metric_manager=metric_manager,
                    smoother=smoother,
                )
            except Exception:
                logger.exception("Failed to process frame %s", frame_index)
                continue

            frames.append(
                VideoFrameResult(
                    frame_index=frame_index,
                    time_offset_sec=time_offset_sec,
                    **inference.model_dump(),
                )
            )

        if not frames:
            raise NoFramesProcessedError("No frames could be processed.")

        metadata = _build_video_metadata(
            upload_file=upload_file,
            fps=fps,
            total_frames=total_frames,
            width=width,
            height=height,
            target_fps=target_fps,
            processed_frames=len(frames),
        )

        return VideoProcessingResponse(video_metadata=metadata, frames=frames)
    except (InvalidVideoFormatError, NoFramesProcessedError):
        raise
    except Exception as exc:
        raise VideoProcessingFailedError("Video processing failed") from exc
    finally:
        cap.release()


async def process_uploaded_video(
    upload_file: UploadFile,
    target_fps: int,
    face_landmarker: FaceLandmarker,
    object_detector: ObjectDetector,
) -> VideoProcessingResponse:
    if _get_file_size(upload_file) > settings.max_upload_size_bytes:
        raise InvalidVideoFormatError("Uploaded video is too large.")

    suffix = _validate_extension(upload_file.filename)
    tmp_path = None
    try:
        with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp_file:
            tmp_path = tmp_file.name
            upload_file.file.seek(0)
            shutil.copyfileobj(upload_file.file, tmp_file)

        process_task = asyncio.get_running_loop().run_in_executor(
            None,
            functools.partial(
                _process_video_upload,
                tmp_path,
                target_fps,
                upload_file,
                face_landmarker,
                object_detector,
            ),
        )
        return await asyncio.wait_for(
            process_task,
            timeout=settings.max_video_processing_seconds,
        )
    except asyncio.TimeoutError as exc:
        logger.warning("Video processing timeout for %s", upload_file.filename)
        raise VideoProcessingTimeoutError("Video processing timed out.") from exc
    finally:
        if tmp_path and os.path.exists(tmp_path):
            os.remove(tmp_path)
