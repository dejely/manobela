/**
 * Inference data.
 */
export interface InferenceData {
  /** ISO 8601 timestamp when frame was processed */
  timestamp: string;

  /** Resolution of the processed video frame */
  resolution: {
    width: number;
    height: number;
  };

  /**
   * Flat array of facial landmarks [x1, y1, x2, y2, ...] or null if no face detected.
   * Coordinates are normalized (0-1 range)
   */
  face_landmarks: number[] | null;
}
