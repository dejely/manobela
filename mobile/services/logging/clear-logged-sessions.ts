import { sessions, metrics } from '@/db/schema';
import { sessionLogger } from '@/services/logging/session-logger';
import { AppDatabase } from '@/db/client';

export async function clearLoggedSessions(db: AppDatabase) {
  // Ensure no dangling session
  await sessionLogger.endSession();

  // Clear metrics first (FK safety, future-proofing)
  await db.delete(metrics);
  await db.delete(sessions);

  // Reset in-memory logger state
  await sessionLogger.reset();
}
