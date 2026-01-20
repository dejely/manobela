import { MetricsOutput } from '@/types/metrics';
import { AlertConfig } from '@/types/alerts';

/**
 * Evaluates metrics and determines which alerts should be triggered.
 */
export function evaluateAlertConditions(
  metrics: MetricsOutput,
  configs: AlertConfig[]
): AlertConfig[] {
  return configs.filter((config) => config.condition(metrics));
}
