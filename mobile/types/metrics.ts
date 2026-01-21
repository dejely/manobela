/**
 * Metrics output
 */
export interface MetricsOutput {
  face_missing: boolean;
  eye_closure: EyeClosureMetricOutput;
  yawn: YawnMetricOutput;
  head_pose: HeadPoseMetricOutput;
  gaze: GazeMetricOutput;
  phone_usage: PhoneUsageMetricOutput;
}

export interface EyeClosureMetricOutput {
  ear: number | null;
  eye_closed: boolean;
  eye_closed_sustained: number;
  perclos: number | null;
  perclos_alert: boolean;
}

export interface YawnMetricOutput {
  mar: number | null;
  yawning: boolean;
  yawn_sustained: number;
  yawn_count: number;
}

export interface HeadPoseMetricOutput {
  yaw_alert: boolean;
  pitch_alert: boolean;
  roll_alert: boolean;
  yaw: number | null;
  pitch: number | null;
  roll: number | null;
  head_pose_sustained: number;
}

export interface GazeMetricOutput {
  gaze_alert: boolean;
  gaze_sustained: number;
}

export interface PhoneUsageMetricOutput {
  phone_usage: boolean;
  phone_usage_sustained: number;
}

/** ID of a metric */
export type MetricId = 'eye_closure' | 'yawn' | 'head_pose' | 'gaze' | 'phone_usage';
