import logging
import threading
from datetime import datetime, timezone
from typing import Optional

import cv2

from app.models.video_upload import VideoProcessingResponse, VideoFrameResult, VideoMetadata
from app.services.video_processor import process_video_frame, MAX_WIDTH
from app.services.metrics.metric_manager import MetricManager
from app.services.smoother import SequenceSmoother
from app.services.face_landmarker import FaceLandmarker
from app.services.object_detector import ObjectDetector

logger = logging.getLogger(__name__)

class InvalidVideoFormatError(Exception):
    """Raised when uploaded file is not a supported video."""


class VideoProcessingFailedError(Exception):
    """Raised when video processing fails unexpectedly."""


class FileTooLargeError(Exception):
    """Raised when the upload exceeds the allowed size limit during streaming."""


class VideoDurationTooLongError(Exception):
    """Raised when the video duration exceeds the allowed max."""


class NoFramesProcessedError(Exception):
    """Raised when no frames could be processed from the video."""


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
    cancel_event: Optional[threading.Event] = None,
) -> VideoProcessingResponse:
    cap = cv2.VideoCapture(video_path)
    if not cap.isOpened():
        raise InvalidVideoFormatError("Unable to open video file.")

    try:
        reported_fps = float(cap.get(cv2.CAP_PROP_FPS) or 0.0)
        total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT) or 0)
        width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH) or 0)
        height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT) or 0)

        # Use a sane fallback when metadata is missing/broken.
        effective_fps = reported_fps if reported_fps > 0 else 30.0

        metric_manager = MetricManager()
        smoother = SequenceSmoother(alpha=0.8, max_missing=5)
        frames: list[VideoFrameResult] = []

        if target_fps <= 0:
            raise VideoProcessingFailedError("target_fps must be > 0")
        target_interval = 1.0 / float(target_fps)

        # Sample index determines the "ideal" next sample timestamp.
        sample_idx = 0

        grabbed_frame_idx = 0
        consecutive_retrieve_failures = 0
        MAX_RETRIEVE_FAILURES = 5

        while True:
            # Cooperative cancellation (prevents zombie threads after timeout).
            if cancel_event and cancel_event.is_set():
                raise VideoProcessingFailedError("Processing cancelled due to timeout.")

            # Demux-only step (fast). No decode yet.
            if not cap.grab():
                break

            grabbed_frame_idx += 1

            # Deterministic timebase for gating: stable even if POS_MSEC jitters.
            computed_time = (grabbed_frame_idx - 1) / effective_fps

            # Optional nicer reporting: container timestamp when available.
            pos_msec = float(cap.get(cv2.CAP_PROP_POS_MSEC) or 0.0)
            report_time = (pos_msec / 1000.0) if pos_msec > 0.0 else computed_time

            # Gate decoding based on computed_time to avoid POS_MSEC weirdness.
            next_sample_time = sample_idx * target_interval
            if computed_time + 1e-4 < next_sample_time:
                continue

            # Decode only when we accept a sample.
            ok, frame = cap.retrieve()
            if not ok or frame is None:
                consecutive_retrieve_failures += 1

                if consecutive_retrieve_failures >= MAX_RETRIEVE_FAILURES:
                    # One last attempt: fall back to read() before giving up.
                    ok2, frame2 = cap.read()
                    if ok2 and frame2 is not None:
                        frame = frame2
                        consecutive_retrieve_failures = 0
                    else:
                        logger.warning(
                            "Too many decode failures (%d) in %s; stopping.",
                            consecutive_retrieve_failures,
                            filename,
                        )
                        break
                else:
                    # Skip glitchy frame and keep going.
                    continue

            consecutive_retrieve_failures = 0

            # Optional: check cancel again right before heavy inference.
            if cancel_event and cancel_event.is_set():
                raise VideoProcessingFailedError("Processing cancelled due to timeout.")

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
                    frame_index=grabbed_frame_idx,  # source index
                    time_offset_sec=report_time,     # nicer time when available
                )
            )

            # Advance sample index (monotonic) based on time crossed.
            # - computed_idx catches leaps (dropped frames / seeky timestamps)
            # - sample_idx + 1 ensures progress even if computed_time jitters backward
            computed_idx = int(computed_time / target_interval) + 1
            sample_idx = max(sample_idx + 1, computed_idx)

        if not frames:
            raise InvalidVideoFormatError("No frames found in video.")

        metadata = _build_video_metadata(
            filename=filename,
            content_type=content_type,
            file_size_bytes=file_size_bytes,
            fps=reported_fps,
            total_frames=total_frames,
            width=width,
            height=height,
            target_fps=target_fps,
            processed_frames=len(frames),
        )

        return VideoProcessingResponse(video_metadata=metadata, frames=frames)

    except (InvalidVideoFormatError, VideoDurationTooLongError, NoFramesProcessedError):
        raise
    except Exception as exc:
        raise VideoProcessingFailedError("Video processing failed") from exc
    finally:
        cap.release()
