/** Alert priority levels. */
import { MetricsOutput } from '@/types/metrics';
export enum AlertPriority {
  LOW = 1,
  MEDIUM = 2,
  HIGH = 3,
  CRITICAL = 4,
}

/** Condition function for an alert. */
export type AlertCondition = (metrics: MetricsOutput) => boolean;

/** Alert configuration for a specific condition. */
export interface AlertConfig {
  id: string;
  message: string;
  priority: AlertPriority;
  cooldownMs: number;
  condition: AlertCondition;
}

/** State tracking for an alert. */
export interface AlertState {
  lastTriggeredAt: number;
  isSpeaking: boolean;
}
