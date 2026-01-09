import { Job } from 'bullmq';
import { CleanupJobData } from '../queue';
import { prisma } from '../../utils/prisma';
import { log } from '../../utils/logger';
import { telehealthService } from '../../services/telehealth-service';

/**
 * Process cleanup jobs from the queue
 * Handles data cleanup tasks like expired tokens, old sessions, temp files
 */
export async function processCleanupJob(job: Job<CleanupJobData>): Promise<void> {
  const { data } = job;

  log.info(`[CLEANUP_PROCESSOR] Processing job ${job.id}:`, {
    type: data.type,
    olderThan: data.olderThan,
    batchSize: data.batchSize,
  });

  try {
    let deletedCount = 0;

    // Execute cleanup based on type
    switch (data.type) {
      case 'expired-tokens':
        deletedCount = await cleanupExpiredTokens(data);
        break;

      case 'old-sessions':
        deletedCount = await cleanupOldSessions(data);
        break;

      case 'temp-files':
        deletedCount = await cleanupTempFiles(data);
        break;

      case 'old-notifications':
        deletedCount = await cleanupOldNotifications(data);
        break;

      case 'stale-telehealth-sessions':
        deletedCount = await cleanupStaleTelehealthSessions(data);
        break;

      default:
        throw new Error(`Unknown cleanup type: ${data.type}`);
    }

    log.info(`[CLEANUP_PROCESSOR] Job ${job.id} completed: ${deletedCount} records deleted`);
  } catch (error) {
    log.error(`[CLEANUP_PROCESSOR] Job ${job.id} failed:`, error);

    // Log the error with job metadata for debugging
    log.error('[CLEANUP_PROCESSOR] Job details:', undefined, {
      id: job.id,
      attempt: job.attemptsMade,
      maxAttempts: job.opts.attempts,
      type: data.type,
      metadata: data.metadata,
    });

    throw error; // Re-throw to trigger retry mechanism
  }
}

/**
 * Clean up expired refresh tokens
 */
async function cleanupExpiredTokens(data: CleanupJobData): Promise<number> {
  const cutoffDate = data.olderThan || new Date();

  // Check if RefreshToken model exists
  try {
    const result = await prisma.$executeRaw`
      DELETE FROM "RefreshToken"
      WHERE "expiresAt" < ${cutoffDate}
      OR "revoked" = true
      LIMIT ${data.batchSize || 1000}
    `;

    log.info(`[CLEANUP_PROCESSOR] Deleted ${result} expired/revoked tokens`);
    return Number(result);
  } catch (error) {
    log.warn('[CLEANUP_PROCESSOR] RefreshToken table may not exist:', { error: error });
    return 0;
  }
}

/**
 * Clean up old user sessions
 */
async function cleanupOldSessions(data: CleanupJobData): Promise<number> {
  // Default: sessions older than 30 days
  const cutoffDate = data.olderThan || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  // Note: This assumes a Session model exists in Prisma schema
  // If not implemented yet, this will need to be updated
  try {
    const result = await prisma.$executeRaw`
      DELETE FROM sessions
      WHERE last_activity < ${cutoffDate}
      LIMIT ${data.batchSize || 1000}
    `;

    log.info(`[CLEANUP_PROCESSOR] Deleted ${result} old sessions`);
    return Number(result);
  } catch (error) {
    log.warn('[CLEANUP_PROCESSOR] Sessions table may not exist:', { error: error });
    return 0;
  }
}

/**
 * Clean up temporary files
 */
async function cleanupTempFiles(data: CleanupJobData): Promise<number> {
  // TODO: Implement file system cleanup
  // This requires file storage implementation
  // Example:
  // - Clean up uploaded files marked for deletion
  // - Remove temporary export files
  // - Clear cache directories

  log.info('[CLEANUP_PROCESSOR] Temp file cleanup not yet implemented');
  return 0;
}

/**
 * Clean up old read notifications
 */
async function cleanupOldNotifications(data: CleanupJobData): Promise<number> {
  // Default: read notifications older than 90 days
  const cutoffDate = data.olderThan || new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
  const batchSize = data.batchSize || 1000;

  // Use raw query to support both schemas (with/without read field)
  try {
    const result = await prisma.$executeRaw`
      DELETE FROM "Notification"
      WHERE "createdAt" < ${cutoffDate}
      LIMIT ${batchSize}
    `;

    log.info(`[CLEANUP_PROCESSOR] Deleted ${result} old notifications`);
    return Number(result);
  } catch (error) {
    log.warn('[CLEANUP_PROCESSOR] Error cleaning notifications:', { error: error });
    return 0;
  }
}

/**
 * Clean up stale telehealth sessions that exceeded max duration
 */
async function cleanupStaleTelehealthSessions(data: CleanupJobData): Promise<number> {
  // Default: sessions active for more than 60 minutes
  const maxDurationMinutes = data.maxDurationMinutes || 60;

  try {
    const result = await telehealthService.cleanupStaleSessions(maxDurationMinutes);
    log.info(`[CLEANUP_PROCESSOR] Cleaned up ${result.cleaned} stale telehealth sessions`);
    return result.cleaned;
  } catch (error) {
    log.error('[CLEANUP_PROCESSOR] Error cleaning telehealth sessions:', { error });
    throw error;
  }
}

/**
 * Handle failed cleanup jobs (after all retries exhausted)
 */
export async function handleFailedCleanupJob(
  job: Job<CleanupJobData>,
  error: Error
): Promise<void> {
  log.error(`[CLEANUP_PROCESSOR] Job ${job.id} permanently failed after ${job.attemptsMade} attempts:`, undefined, {
      type: job.data.type,
      error: error.message,
      metadata: job.data.metadata,
    });

  // TODO: Implement additional failure handling:
  // - Send alert to administrators
  // - Store failure information for investigation
  // - Schedule manual cleanup if critical
}
