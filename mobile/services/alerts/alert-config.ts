import { AlertConfig, AlertPriority } from '@/types/alerts';
import { MetricsOutput } from '@/types/metrics';

const getMetric = <K extends keyof MetricsOutput>(
  metrics: MetricsOutput,
  key: K
): MetricsOutput[K] | null => {
  const value = metrics[key];
  if (value === undefined || value === null) {
    console.warn(`Alert system: Expected metric '${key}' is missing or null.`);
    return null;
  }
  return value;
};

export const ALERT_CONFIGS: AlertConfig[] = [
  {
    id: 'face_missing',
    message: 'No face detected. Please reposition yourself.',
    priority: AlertPriority.CRITICAL,
    cooldownMs: 8000,
    condition: (m: MetricsOutput) => !!m.face_missing,
  },
  {
    id: 'eye_closure_perclos',
    message: 'Your eyes are closing frequently. Take a break if needed.',
    priority: AlertPriority.HIGH,
    cooldownMs: 15000,
    condition: (m: MetricsOutput) => !!getMetric(m, 'eye_closure')?.perclos_alert,
  },
  {
    id: 'eye_closure',
    message: 'Please keep your eyes open.',
    priority: AlertPriority.HIGH,
    cooldownMs: 15000,
    condition: (m: MetricsOutput) => !!getMetric(m, 'eye_closure')?.eye_closed_sustained,
  },
  {
    id: 'yawn',
    message: 'You seem sleepy. Consider taking a short break.',
    priority: AlertPriority.LOW,
    cooldownMs: 25000,
    condition: (m: MetricsOutput) => !!getMetric(m, 'yawn')?.yawning,
  },
  {
    id: 'yawn_count',
    message: 'You have been yawning frequently. Consider resting.',
    priority: AlertPriority.LOW,
    cooldownMs: 60000,
    condition: (m: MetricsOutput) => {
      const yawnCount = getMetric(m, 'yawn')?.yawn_count;
      return typeof yawnCount === 'number' && yawnCount > 0 && yawnCount % 3 === 0;
    },
  },
  {
    id: 'head_pose',
    message: 'Please keep your head facing forward.',
    priority: AlertPriority.MEDIUM,
    cooldownMs: 12000,
    condition: (m: MetricsOutput) => {
      const headPose = getMetric(m, 'head_pose');
      return !!headPose?.yaw_alert || !!headPose?.pitch_alert || !!headPose?.roll_alert;
    },
  },
  {
    id: 'gaze_off_road',
    message: 'Keep your eyes on the road.',
    priority: AlertPriority.MEDIUM,
    cooldownMs: 15000,
    condition: (m: MetricsOutput) => !!getMetric(m, 'gaze')?.gaze_alert,
  },
  {
    id: 'phone_usage',
    message: 'Phone usage detected. Please stay focused.',
    priority: AlertPriority.CRITICAL,
    cooldownMs: 10000,
    condition: (m: MetricsOutput) => !!getMetric(m, 'phone_usage')?.phone_usage,
  },
];
