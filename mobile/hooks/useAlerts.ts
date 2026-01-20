import { useEffect, useRef } from 'react';
import { AlertManager } from '@/services/alerts/alert-manager';
import { MetricsOutput } from '@/types/metrics';

interface UseAlertsProps {
  metrics: MetricsOutput | null;
  enabled: boolean;
}

/**
 * Hook to manage audio alerts based on monitoring metrics.
 *
 * @param metrics - Current metrics output from inference
 * @param enabled - Whether alerts are enabled (typically tied to session state)
 */
export function useAlerts({ metrics, enabled }: UseAlertsProps) {
  const alertManagerRef = useRef<AlertManager | null>(null);

  // Initialize alert manager
  useEffect(() => {
    alertManagerRef.current = new AlertManager();

    return () => {
      // Cleanup on unmount
      alertManagerRef.current?.stop();
      alertManagerRef.current = null;
    };
  }, []);

  // Process metrics when they update
  useEffect(() => {
    if (!enabled || !alertManagerRef.current || !metrics) {
      return;
    }

    alertManagerRef.current.processMetrics(metrics);
  }, [metrics, enabled]);

  // Start/stop alerts when enabled changes
  useEffect(() => {
    if (!alertManagerRef.current) return;

    if (enabled) {
      alertManagerRef.current.start();
    } else {
      alertManagerRef.current.stop();
    }
  }, [enabled]);
}
