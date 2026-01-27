import { useState, useEffect, useCallback, useRef } from 'react';
import { DataChannelState, useWebRTC } from './useWebRTC';
import { MediaStream } from 'react-native-webrtc';
import { sessionLogger } from '@/services/logging/session-logger';
import { InferenceData } from '@/types/inference';
import { useSessionStore } from '@/stores/sessionStore';

export type SessionState = 'idle' | 'starting' | 'active' | 'paused' | 'stopping';

interface UseMonitoringSessionProps {
  // WebSocket signaling endpoint
  url: string;

  // Local media stream (camera)
  stream: MediaStream | null;
}

interface UseMonitoringSessionReturn {
  sessionState: SessionState;
  // Latest data from the session
  inferenceData: InferenceData | null;
  clientId: string | null;
  sessionDurationMs: number;
  transportStatus: string;
  connectionStatus: string;
  dataChannelState: DataChannelState;
  error: string | null;
  hasCamera: boolean;
  errorDetails: string | null;
  start: () => Promise<void>;
  stop: () => Promise<void>;
  recalibrateHeadPose: () => void;
}

/**
 * Manages the lifecycle of a driver monitoring session.
 * It wraps WebRTC connection and data channel logic for higher-level session handling.
 */
export const useMonitoringSession = ({
  url,
  stream,
}: UseMonitoringSessionProps): UseMonitoringSessionReturn => {
  // Low-level WebRTC management
  const {
    clientId,
    startConnection,
    cleanup,
    transportStatus,
    connectionStatus,
    dataChannelState,
    onDataMessage,
    sendDataMessage,
    setStreamEnabled,
    sendMonitoringControl,
    error,
    errorDetails,
  } = useWebRTC({ url, stream });

  // Tracks session lifecycle
  const [sessionState, setSessionState] = useState<SessionState>('idle');
  const sessionStateRef = useRef<SessionState>('idle');

  // Use a ref to avoid re-rendering on every message
  const latestInferenceRef = useRef<InferenceData | null>(null);

  // Only update state when UI needs it
  const [inferenceData, setInferenceData] = useState<InferenceData | null>(null);
  const [sessionStartedAt, setSessionStartedAt] = useState<number | null>(null);
  const [sessionAccumulatedMs, setSessionAccumulatedMs] = useState(0);
  const [sessionDurationMs, setSessionDurationMs] = useState(0);

  const getActiveDurationMs = useCallback(() => {
    const activeElapsed =
      sessionState === 'active' && sessionStartedAt !== null
        ? Date.now() - sessionStartedAt
        : 0;
    return sessionAccumulatedMs + activeElapsed;
  }, [sessionAccumulatedMs, sessionStartedAt, sessionState]);

  // Sync session state with WebRTC connection
  useEffect(() => {
    const isTerminalConnection =
      connectionStatus === 'failed' ||
      connectionStatus === 'closed' ||
      connectionStatus === 'disconnected';

    if (isTerminalConnection) {
      if (sessionState !== 'idle' && sessionState !== 'stopping') {
        (async () => {
          await sessionLogger.endSession(getActiveDurationMs());
          setSessionState('idle');
          useSessionStore.getState().setActiveSessionId(null);
          setInferenceData(null);
          latestInferenceRef.current = null;
          setSessionAccumulatedMs(0);
        })();
      }
      return;
    }

    if (connectionStatus === 'connected' && sessionState === 'starting') {
      if (!clientId) return;

      (async () => {
        if (!sessionLogger.getCurrentSessionId()) {
          await sessionLogger.startSession(clientId);
        }
        setSessionState('active');
        useSessionStore.getState().setActiveSessionId(sessionLogger.getCurrentSessionId());
      })();
    }
  }, [connectionStatus, sessionState, clientId, getActiveDurationMs]);

  useEffect(() => {
    if (sessionState === 'active') {
      if (sessionStartedAt === null) {
        setSessionStartedAt(Date.now());
      }
      return;
    }

    if (sessionState === 'paused') {
      if (sessionStartedAt !== null) {
        const elapsed = Date.now() - sessionStartedAt;
        const total = sessionAccumulatedMs + elapsed;
        setSessionAccumulatedMs(total);
        setSessionDurationMs(total);
        setSessionStartedAt(null);
      } else {
        setSessionDurationMs(sessionAccumulatedMs);
      }
      return;
    }

    if (sessionState === 'idle') {
      setSessionStartedAt(null);
      setSessionAccumulatedMs(0);
      setSessionDurationMs(0);
    }
  }, [sessionState, sessionStartedAt, sessionAccumulatedMs]);

  useEffect(() => {
    if (sessionState !== 'active' || sessionStartedAt === null) return;

    const tick = () => {
      setSessionDurationMs(sessionAccumulatedMs + (Date.now() - sessionStartedAt));
    };

    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [sessionState, sessionStartedAt, sessionAccumulatedMs]);

  useEffect(() => {
    sessionStateRef.current = sessionState;
  }, [sessionState]);

  // Subscribe to data channel messages
  useEffect(() => {
    const handler = (msg: any) => {
      // Update ref for logging (non-rendering)
      latestInferenceRef.current = msg;

      // Update state only if UI is active and needs it
      if (sessionStateRef.current === 'active') {
        setInferenceData(msg);
      }
    };

    const unsubscribe = onDataMessage(handler);
    return () => {
      unsubscribe();
    };
  }, [onDataMessage]);

  // Log metrics
  useEffect(() => {
    if (sessionState !== 'active') return;

    const interval = setInterval(() => {
      if (!sessionLogger.getCurrentSessionId()) return;
      sessionLogger.logMetrics(latestInferenceRef.current);
    }, 500);

    return () => clearInterval(interval);
  }, [sessionState]);

  const start = useCallback(async () => {
    if (sessionState !== 'idle' && sessionState !== 'paused') return;

    try {
      const canResume =
        connectionStatus === 'connected' && Boolean(clientId) && dataChannelState === 'open';

      if (canResume) {
        setSessionState('starting');
        setStreamEnabled(true);
        sendMonitoringControl('resume');
        return;
      }

      if (connectionStatus === 'connected') {
        cleanup();
      }

      setSessionState('starting');
      setStreamEnabled(true);
      startConnection();
    } catch (err) {
      console.error('Failed to start connection:', err);
      setSessionState('idle');
    }
  }, [
    sessionState,
    connectionStatus,
    clientId,
    dataChannelState,
    setStreamEnabled,
    sendMonitoringControl,
    cleanup,
    startConnection,
  ]);

  // Pauses the monitoring session without ending it.
  const stop = useCallback(async () => {
    if (sessionState !== 'active') return;

    sendMonitoringControl('pause');
    setStreamEnabled(false);
    setSessionState('paused');
  }, [sessionState, sendMonitoringControl, setStreamEnabled]);

  useEffect(() => {
    return () => {
      sendMonitoringControl('pause');
      setStreamEnabled(false);
      cleanup();
      sessionLogger.endSession(getActiveDurationMs()).catch(() => undefined);
      useSessionStore.getState().setActiveSessionId(null);
      setSessionAccumulatedMs(0);
    };
  }, [cleanup, sendMonitoringControl, setStreamEnabled, getActiveDurationMs]);

  const recalibrateHeadPose = useCallback(() => {
    if (dataChannelState === 'open') {
      sendDataMessage({ type: 'head_pose_recalibrate' });
    } else {
      console.warn('Data channel not open for recalibration');
    }
  }, [sendDataMessage, dataChannelState]);

  return {
    sessionState,
    clientId,
    transportStatus,
    connectionStatus,
    dataChannelState,
    hasCamera: stream !== null,
    inferenceData,
    sessionDurationMs,
    error,
    errorDetails,
    start,
    stop,
    recalibrateHeadPose,
  };
};
