from typing import Optional
from pydantic import BaseModel, ConfigDict

from app.models.inference import InferenceData


class VideoFrameResult(InferenceData):
    """
    Inference output for a specific frame in the uploaded video.
    Inherits fields from InferenceData.
    """
    model_config = ConfigDict(frozen=True)

    frame_index: int
    time_offset_sec: float

    @classmethod
    def from_inference(
        cls,
        inference: InferenceData,
        frame_index: int,
        time_offset_sec: float,
    ) -> "VideoFrameResult":
        """
        Production-safe: preserves declared fields + extras without converting nested models.
        Avoids redundant validation by using model_construct().
        """
        # Start with internal validated storage (keeps nested models as objects)
        payload = dict(inference.__dict__)  # safe copy of main fields

        # Include extra fields if InferenceData allows them (common in Pydantic v2)
        extra = getattr(inference, "__pydantic_extra__", None)
        if isinstance(extra, dict) and extra:
            payload.update(extra)

        # Prevent collisions if base ever adds these fields
        payload.pop("frame_index", None)
        payload.pop("time_offset_sec", None)

        return cls.model_construct(
            **payload,
            frame_index=frame_index,
            time_offset_sec=time_offset_sec,
        )

class VideoMetadata(BaseModel):
    """Metadata describing the processed video."""
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
    """Response schema for video processing requests."""
    model_config = ConfigDict(frozen=True)
    video_metadata: VideoMetadata
    frames: list[VideoFrameResult]
