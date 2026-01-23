import { InferenceData } from './inference';

export interface VideoFrameResult extends InferenceData {
  frame_index: number;
  time_offset_sec: number;
}

export interface VideoMetadata {
  filename?: string | null;
  content_type?: string | null;
  size_bytes: number;
  fps?: number | null;
  target_fps: number;
  duration_seconds?: number | null;
  total_frames?: number | null;
  width?: number | null;
  height?: number | null;
  processed_frames: number;
  max_width: number;
}

export interface VideoProcessingResponse {
  video_metadata: VideoMetadata;
  frames: VideoFrameResult[];
}
