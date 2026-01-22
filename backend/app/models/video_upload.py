from typing import Optional

from pydantic import BaseModel

from app.models.inference import InferenceData


class VideoFrameResult(InferenceData):
    """
    Inference output for a specific frame in the uploaded video.
    """

    frame_index: int
    time_offset_sec: float


class VideoMetadata(BaseModel):
    """
    Metadata describing the processed video.
    """

    filename: Optional[str] = None
    content_type: Optional[str] = None
    size_bytes: int
    fps: Optional[float] = None
    target_fps: int
    duration_seconds: Optional[float] = None
    total_frames: Optional[int] = None
    width: Optional[int] = None
    height: Optional[int] = None
    processed_frames: int
    max_width: int


class VideoProcessingResponse(BaseModel):
    """
    Response schema for video processing requests.
    """

    video_metadata: VideoMetadata
    frames: list[VideoFrameResult]
