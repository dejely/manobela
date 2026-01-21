/**
 * Metrics output
 */
export interface MetricsOutput {
  face_detected: boolean;
  eye_closure: EyeClosureMetricOutput;
  yawn: YawnMetricOutput;
  head_pose: HeadPoseMetricOutput;
  gaze: GazeMetricOutput;
  phone_usage: PhoneUsageMetricOutput;
}

export interface EyeClosureMetricOutput {
  ear_alert: boolean;
  ear: number | null;
  perclos_alert: boolean;
  perclos: number | null;
}

export interface YawnMetricOutput {
  mar: number | null;
  yawning: boolean;
  yawn_progress: number;
  yawn_count: number;
  yawn_rate: number;
  yawn_rate_alert: boolean;
}
export interface HeadPoseMetricOutput {
  yaw_alert: boolean;
  pitch_alert: boolean;
  roll_alert: boolean;
  yaw: number | null;
  pitch: number | null;
  roll: number | null;
  yaw_sustained: number;
  pitch_sustained: number;
  roll_sustained: number;
}

export interface GazeMetricOutput {
  gaze_alert: boolean;
  gaze_rate: number;
}

export interface PhoneUsageMetricOutput {
  phone_usage: boolean;
  phone_usage_rate: number;
}

/** ID of a metric */
export type MetricId = 'eye_closure' | 'yawn' | 'head_pose' | 'gaze' | 'phone_usage';
