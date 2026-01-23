import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core';

/** Sessions table */
export const sessions = sqliteTable('sessions', {
  id: text('id').primaryKey(),
  clientId: text('client_id').notNull(),
  startedAt: integer('started_at').notNull(),
  endedAt: integer('ended_at'),
  durationMs: integer('duration_ms'),
});

/** Metrics table */
export const metrics = sqliteTable('metrics', {
  id: text('id').primaryKey(),
  sessionId: text('session_id').notNull(),
  timestamp: integer('timestamp').notNull(),

  faceMissing: integer('face_missing', { mode: 'boolean' }).notNull(),

  ear: real('ear'),
  eyeClosed: integer('eye_closed', { mode: 'boolean' }).notNull(),
  eyeClosedSustained: integer('eye_closed_sustained').notNull(),
  perclos: real('perclos'),
  perclosAlert: integer('perclos_alert', { mode: 'boolean' }).notNull(),

  mar: real('mar'),
  yawning: integer('yawning', { mode: 'boolean' }).notNull(),
  yawnSustained: real('yawn_sustained').notNull(),
  yawnCount: integer('yawn_count').notNull(),

  yaw: real('yaw'),
  pitch: real('pitch'),
  roll: real('roll'),
  yawAlert: integer('yaw_alert', { mode: 'boolean' }).notNull(),
  pitchAlert: integer('pitch_alert', { mode: 'boolean' }).notNull(),
  rollAlert: integer('roll_alert', { mode: 'boolean' }).notNull(),
  headPoseSustained: real('head_pose_sustained').notNull(),

  gazeAlert: integer('gaze_alert', { mode: 'boolean' }).notNull(),
  gazeSustained: real('gaze_sustained').notNull(),

  phoneUsage: integer('phone_usage', { mode: 'boolean' }).notNull(),
  phoneUsageSustained: real('phone_usage_sustained').notNull(),
});
