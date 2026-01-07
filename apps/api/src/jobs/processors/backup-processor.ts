import { Job } from 'bullmq';
import { BackupJobData } from '../queue';
import { backupService } from '../../services/backup-service';
import { log } from '../../utils/logger';

/**
 * Process backup jobs from the queue
 * Handles automated backup tasks
 */
export async function processBackupJob(job: Job<BackupJobData>): Promise<void> {
  const { data } = job;

  log.info(`[BACKUP_PROCESSOR] Processing job ${job.id}:`, {
    type: data.type,
    createdBy: data.createdBy,
  });

  try {
    let result;

    // Execute backup based on type
    switch (data.type) {
      case 'DATABASE':
        log.info('[BACKUP_PROCESSOR] Executing database backup');
        result = await backupService.backupDatabase(data.createdBy);
        break;

      case 'FILES':
        log.info('[BACKUP_PROCESSOR] Executing file backup');
        result = await backupService.backupFiles(data.createdBy);
        break;

      case 'FULL':
        log.info('[BACKUP_PROCESSOR] Executing full backup');
        result = await backupService.backupFull(data.createdBy);
        break;

      default:
        throw new Error(`Unknown backup type: ${data.type}`);
    }

    log.info(`[BACKUP_PROCESSOR] Job ${job.id} completed successfully:`, {
      backupId: result.id,
      type: result.type,
      status: result.status,
      size: result.size?.toString(),
    });

    // Update job progress
    await job.updateProgress(100);
  } catch (error) {
    log.error(`[BACKUP_PROCESSOR] Job ${job.id} failed:`, error);

    // Log the error with job metadata for debugging
    log.error('[BACKUP_PROCESSOR] Job details:', undefined, {
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
 * Handle failed backup jobs (after all retries exhausted)
 */
export async function handleFailedBackupJob(
  job: Job<BackupJobData>,
  error: Error
): Promise<void> {
  log.error(
    `[BACKUP_PROCESSOR] Job ${job.id} permanently failed after ${job.attemptsMade} attempts:`,
    undefined,
    {
      type: job.data.type,
      error: error.message,
      metadata: job.data.metadata,
    }
  );

  // TODO: Implement additional failure handling:
  // - Send alert to administrators
  // - Create notification for system admins
  // - Track backup failure metrics
  // - Trigger backup retry with different strategy
}

/**
 * Schedule recurring backup jobs
 * Should be called during application startup
 */
export async function scheduleRecurringBackups(): Promise<void> {
  const { backupQueue } = await import('../queue');

  try {
    // Daily database backup at 2 AM
    await backupQueue.add(
      'daily-database-backup',
      {
        type: 'DATABASE',
        createdBy: 'system',
        metadata: { scheduled: true, recurring: true },
      },
      {
        repeat: {
          pattern: '0 2 * * *', // Daily at 2 AM
        },
        jobId: 'recurring-daily-database-backup',
      }
    );

    log.info('[BACKUP_PROCESSOR] Scheduled daily database backup at 2 AM');

    // Weekly full backup at 3 AM on Sunday
    await backupQueue.add(
      'weekly-full-backup',
      {
        type: 'FULL',
        createdBy: 'system',
        metadata: { scheduled: true, recurring: true },
      },
      {
        repeat: {
          pattern: '0 3 * * 0', // Sunday at 3 AM
        },
        jobId: 'recurring-weekly-full-backup',
      }
    );

    log.info('[BACKUP_PROCESSOR] Scheduled weekly full backup at 3 AM on Sunday');

    // Monthly file backup at 4 AM on 1st day of month
    await backupQueue.add(
      'monthly-file-backup',
      {
        type: 'FILES',
        createdBy: 'system',
        metadata: { scheduled: true, recurring: true },
      },
      {
        repeat: {
          pattern: '0 4 1 * *', // 1st day of month at 4 AM
        },
        jobId: 'recurring-monthly-file-backup',
      }
    );

    log.info('[BACKUP_PROCESSOR] Scheduled monthly file backup at 4 AM on 1st');

    log.info('[BACKUP_PROCESSOR] All recurring backup jobs scheduled successfully');
  } catch (error) {
    log.error('[BACKUP_PROCESSOR] Failed to schedule recurring backups:', error);
    throw error;
  }
}
