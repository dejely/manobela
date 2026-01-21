import { AlertConfig, AlertPriority } from '@/types/alerts';
import { MetricsOutput } from '@/types/metrics';

export const ALERT_CONFIGS: AlertConfig[] = [
  {
    id: 'no_face',
    message: 'No face detected',
    priority: AlertPriority.CRITICAL,
    cooldownMs: 10000,
    condition: (m: MetricsOutput) => !m.face_detected,
  },
  {
    id: 'phone_usage',
    message: 'Put down your phone',
    priority: AlertPriority.CRITICAL,
    cooldownMs: 10000,
    condition: (m: MetricsOutput) => !!m.phone_usage?.phone_usage,
  },
  {
    id: 'eye_closure_perclos',
    message: 'Your eyes are closing frequently',
    priority: AlertPriority.HIGH,
    cooldownMs: 15000,
    condition: (m: MetricsOutput) => !!m.eye_closure?.perclos_alert,
  },
  {
    id: 'yawn_rate',
    message: 'You are yawning frequently',
    priority: AlertPriority.HIGH,
    cooldownMs: 20000,
    condition: (m: MetricsOutput) => !!m.yawn?.yawn_rate_alert,
  },
  {
    id: 'head_pose',
    message: 'Keep your head facing forward',
    priority: AlertPriority.MEDIUM,
    cooldownMs: 12000,
    condition: (m: MetricsOutput) =>
      !!m.head_pose?.yaw_alert || !!m.head_pose?.pitch_alert || !!m.head_pose?.roll_alert,
  },
  {
    id: 'gaze_off_road',
    message: 'Keep your eyes on the road',
    priority: AlertPriority.MEDIUM,
    cooldownMs: 10000,
    condition: (m: MetricsOutput) => !!m.gaze?.gaze_alert,
  },
];
