import { db } from '@/db/client';
import { sessions, metrics } from '@/db/schema';
import uuid from 'react-native-uuid';
import { InferenceData } from '@/types/inference';
import { eq } from 'drizzle-orm';

type NewMetric = typeof metrics.$inferInsert;
type NewSession = typeof sessions.$inferInsert;

/**
 * Read-only flag
 */
let readOnly = false;

/**
 * In-memory buffer
 */
const metricBuffer: NewMetric[] = [];

/**
 * Flush timer handle
 */
let flushTimer: ReturnType<typeof setTimeout> | null = null;

/**
 * Session state
 */
let currentSessionId: string | null = null;
let lastLoggedAt = 0;

/**
 * Controls
 */
const LOG_INTERVAL_MS = 3_000; // throttle logging for n seconds
const FLUSH_INTERVAL_MS = 6_000; // flush every n seconds
const MAX_BUFFER_SIZE = 20; // flush when buffer is full

/**
 * Flush buffer to database in a transaction
 */
const flushBuffer = async () => {
  if (readOnly) return; // <-- BLOCK WRITES
  if (metricBuffer.length === 0) return;

  const batch = metricBuffer.splice(0, metricBuffer.length);

  try {
    await db.transaction(async (tx) => {
      await tx.insert(metrics).values(batch);
    });
  } catch (error) {
    console.error('Failed to flush metrics buffer:', error);
  } finally {
    if (flushTimer) {
      clearTimeout(flushTimer);
      flushTimer = null;
    }
  }
};

export const sessionLogger = {
  /** Enable/disable read-only mode */
  setReadOnly: (value: boolean) => {
    readOnly = value;
  },

  /**
   * Log metrics for the current session
   */
  logMetrics: (data: InferenceData | null) => {
    if (readOnly) return; // blocks writes
    if (!currentSessionId || !data?.metrics) return;

    const now = Date.now();
    if (now - lastLoggedAt < LOG_INTERVAL_MS) return;
    lastLoggedAt = now;

    const m = data.metrics;
    const id = uuid.v4();

    metricBuffer.push({
      id,
      sessionId: currentSessionId,
      timestamp: now,

      faceMissing: m.face_missing,

      ear: m.eye_closure.ear,
      eyeClosed: m.eye_closure.eye_closed,
      eyeClosedSustained: m.eye_closure.eye_closed_sustained,
      perclos: m.eye_closure.perclos,
      perclosAlert: m.eye_closure.perclos_alert,

      mar: m.yawn.mar,
      yawning: m.yawn.yawning,
      yawnSustained: m.yawn.yawn_sustained,
      yawnCount: m.yawn.yawn_count,

      yaw: m.head_pose.yaw,
      pitch: m.head_pose.pitch,
      roll: m.head_pose.roll,
      yawAlert: m.head_pose.yaw_alert,
      pitchAlert: m.head_pose.pitch_alert,
      rollAlert: m.head_pose.roll_alert,
      headPoseSustained: m.head_pose.head_pose_sustained,

      gazeAlert: m.gaze.gaze_alert,
      gazeSustained: m.gaze.gaze_sustained,

      phoneUsage: m.phone_usage.phone_usage,
      phoneUsageSustained: m.phone_usage.phone_usage_sustained,
    } as NewMetric);

    if (!flushTimer) {
      flushTimer = setTimeout(() => {
        void flushBuffer();
      }, FLUSH_INTERVAL_MS);
    }

    if (metricBuffer.length >= MAX_BUFFER_SIZE) {
      void flushBuffer();
    }
  },

  /**
   * Start a new session
   */
  startSession: async (clientId: string | null) => {
    if (readOnly) return null; // blocks writes

    const id = uuid.v4();

    await db.insert(sessions).values({
      id,
      clientId: clientId ?? 'unknown',
      startedAt: Date.now(),
    } as NewSession);

    currentSessionId = id;
    lastLoggedAt = 0;

    return id;
  },

  /**
   * End the current session
   */
  endSession: async () => {
    if (readOnly) return; // block writes

    if (!currentSessionId) return;

    await flushBuffer();

    const endedAt = Date.now();

    const sessionRows = await db
      .select({ startedAt: sessions.startedAt })
      .from(sessions)
      .where(eq(sessions.id, currentSessionId));

    if (sessionRows.length === 0) {
      console.error('Session not found for ID:', currentSessionId);
      currentSessionId = null;
      return;
    }

    const startedAt = sessionRows[0]?.startedAt ?? endedAt;
    const durationMs = endedAt - startedAt;

    await db
      .update(sessions)
      .set({
        endedAt,
        durationMs,
      })
      .where(eq(sessions.id, currentSessionId));

    currentSessionId = null;
  },

  /**
   * Hard reset logger state (used before destructive DB ops)
   */
  reset: async () => {
    currentSessionId = null;
    lastLoggedAt = 0;
    metricBuffer.length = 0;

    if (flushTimer) {
      clearTimeout(flushTimer);
      flushTimer = null;
    }
  },

  /** Get the current session ID */
  getCurrentSessionId: () => currentSessionId,
};
