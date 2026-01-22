from typing import Optional
from pydantic import BaseModel, ConfigDict

from app.models.inference import InferenceData


class VideoFrameResult(InferenceData):
    """
    Inference output for a specific frame in the uploaded video.
    """
    # OPTIMIZATION: Freeze the model for performance boost (hashing/access speed)
    model_config = ConfigDict(frozen=True)

    frame_index: int
    time_offset_sec: float

    @classmethod
    def from_inference(
        cls,
        inference: InferenceData,
        frame_index: int,
        time_offset_sec: float
    ) -> "VideoFrameResult":
        """
        Efficient factory method to avoid redundant validation.
        Uses model_construct to blindly trust the already-validated inference data.
        """
        # Pydantic V2: model_construct bypasses validation
        return cls.model_construct(
            frame_index=frame_index,
            time_offset_sec=time_offset_sec,
            # Merge fields from the existing validated instance
            **inference.__dict__
        )


class VideoMetadata(BaseModel):
    """
    Metadata describing the processed video.
    """
    model_config = ConfigDict(frozen=True)

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
