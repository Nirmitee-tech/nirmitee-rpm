import { Worker } from 'bullmq';
import {
  emailQueue,
  notificationQueue,
  reportQueue,
  cleanupQueue,
  backupQueue,
  EmailJobData,
  NotificationJobData,
  ReportJobData,
  CleanupJobData,
  BackupJobData,
  closeQueues,
} from './queue';
import { log } from '../utils/logger';
import {
  processEmailJob,
  handleFailedEmailJob,
} from './processors/email-processor';
import {
  processNotificationJob,
  handleFailedNotificationJob,
} from './processors/notification-processor';
import {
  processReportJob,
  handleFailedReportJob,
} from './processors/report-processor';
import {
  processCleanupJob,
  handleFailedCleanupJob,
} from './processors/cleanup-processor';
import {
  processBackupJob,
  handleFailedBackupJob,
  scheduleRecurringBackups,
} from './processors/backup-processor';

// Redis connection configuration (shared with queues)
const redisConnection = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379', 10),
  password: process.env.REDIS_PASSWORD,
  db: parseInt(process.env.REDIS_DB || '0', 10),
};

// Parse REDIS_URL if provided
if (process.env.REDIS_URL) {
  try {
    const url = new URL(process.env.REDIS_URL);
    redisConnection.host = url.hostname;
    redisConnection.port = parseInt(url.port || '6379', 10);
    if (url.password) {
      redisConnection.password = url.password;
    }
    if (url.pathname && url.pathname.length > 1) {
      const dbNum = parseInt(url.pathname.slice(1), 10);
      if (!isNaN(dbNum)) {
        redisConnection.db = dbNum;
      }
    }
  } catch (error) {
    log.error('[WORKER] Failed to parse REDIS_URL:', error);
  }
}

// Worker instances
let emailWorker: Worker<EmailJobData>;
let notificationWorker: Worker<NotificationJobData>;
let reportWorker: Worker<ReportJobData>;
let cleanupWorker: Worker<CleanupJobData>;
let backupWorker: Worker<BackupJobData>;

/**
 * Initialize and start all workers
 */
async function startWorkers(): Promise<void> {
  log.info('[WORKER] Starting background job workers...');

  // Email worker
  emailWorker = new Worker<EmailJobData>(
    'email',
    async (job) => {
      await processEmailJob(job);
    },
    {
      connection: redisConnection,
      concurrency: 5, // Process 5 emails concurrently
    }
  );

  emailWorker.on('completed', (job) => {
    log.info(`[WORKER:EMAIL] Job ${job.id} completed successfully`);
  });

  emailWorker.on('failed', async (job, error) => {
    if (job) {
      log.error(`[WORKER:EMAIL] Job ${job.id} failed`, error, {
        jobId: job.id,
        attemptsMade: job.attemptsMade,
      });

      // Check if all retries exhausted
      if (job.attemptsMade >= (job.opts.attempts || 3)) {
        await handleFailedEmailJob(job, error);
      }
    }
  });

  emailWorker.on('error', (error) => {
    log.error('[WORKER:EMAIL] Worker error:', error);
  });

  // Notification worker
  notificationWorker = new Worker<NotificationJobData>(
    'notification',
    async (job) => {
      await processNotificationJob(job);
    },
    {
      connection: redisConnection,
      concurrency: 10, // Process 10 notifications concurrently
    }
  );

  notificationWorker.on('completed', (job) => {
    log.info(`[WORKER:NOTIFICATION] Job ${job.id} completed successfully`);
  });

  notificationWorker.on('failed', async (job, error) => {
    if (job) {
      log.error(`[WORKER:NOTIFICATION] Job ${job.id} failed`, error, { jobId: job.id });

      if (job.attemptsMade >= (job.opts.attempts || 3)) {
        await handleFailedNotificationJob(job, error);
      }
    }
  });

  notificationWorker.on('error', (error) => {
    log.error('[WORKER:NOTIFICATION] Worker error:', error);
  });

  // Report worker
  reportWorker = new Worker<ReportJobData>(
    'report',
    async (job) => {
      await processReportJob(job);
    },
    {
      connection: redisConnection,
      concurrency: 2, // Process 2 reports concurrently (CPU intensive)
    }
  );

  reportWorker.on('completed', (job) => {
    log.info(`[WORKER:REPORT] Job ${job.id} completed successfully`);
  });

  reportWorker.on('failed', async (job, error) => {
    if (job) {
      log.error(`[WORKER:REPORT] Job ${job.id} failed`, error, { jobId: job.id });

      if (job.attemptsMade >= (job.opts.attempts || 3)) {
        await handleFailedReportJob(job, error);
      }
    }
  });

  reportWorker.on('error', (error) => {
    log.error('[WORKER:REPORT] Worker error:', error);
  });

  // Cleanup worker
  cleanupWorker = new Worker<CleanupJobData>(
    'cleanup',
    async (job) => {
      await processCleanupJob(job);
    },
    {
      connection: redisConnection,
      concurrency: 1, // Process 1 cleanup at a time to avoid DB overload
    }
  );

  cleanupWorker.on('completed', (job) => {
    log.info(`[WORKER:CLEANUP] Job ${job.id} completed successfully`);
  });

  cleanupWorker.on('failed', async (job, error) => {
    if (job) {
      log.error(`[WORKER:CLEANUP] Job ${job.id} failed`, error, { jobId: job.id });

      if (job.attemptsMade >= (job.opts.attempts || 3)) {
        await handleFailedCleanupJob(job, error);
      }
    }
  });

  cleanupWorker.on('error', (error) => {
    log.error('[WORKER:CLEANUP] Worker error:', error);
  });

  // Backup worker
  backupWorker = new Worker<BackupJobData>(
    'backup',
    async (job) => {
      await processBackupJob(job);
    },
    {
      connection: redisConnection,
      concurrency: 1, // Process 1 backup at a time
    }
  );

  backupWorker.on('completed', (job) => {
    log.info(`[WORKER:BACKUP] Job ${job.id} completed successfully`);
  });

  backupWorker.on('failed', async (job, error) => {
    if (job) {
      log.error(`[WORKER:BACKUP] Job ${job.id} failed`, error, { jobId: job.id });

      if (job.attemptsMade >= (job.opts.attempts || 2)) {
        await handleFailedBackupJob(job, error);
      }
    }
  });

  backupWorker.on('error', (error) => {
    log.error('[WORKER:BACKUP] Worker error:', error);
  });

  // Schedule recurring backups
  await scheduleRecurringBackups();

  log.info('[WORKER] All workers started successfully');
  log.info('[WORKER] Workers running:');
  log.info('  - Email Worker (concurrency: 5)');
  log.info('  - Notification Worker (concurrency: 10)');
  log.info('  - Report Worker (concurrency: 2)');
  log.info('  - Cleanup Worker (concurrency: 1)');
  log.info('  - Backup Worker (concurrency: 1)');
}

/**
 * Graceful shutdown handler
 */
async function gracefulShutdown(signal: string): Promise<void> {
  log.info(`\n[WORKER] Received ${signal}. Starting graceful shutdown...`);

  try {
    // Stop accepting new jobs
    log.info('[WORKER] Closing workers...');
    await Promise.all([
      emailWorker?.close(),
      notificationWorker?.close(),
      reportWorker?.close(),
      cleanupWorker?.close(),
      backupWorker?.close(),
    ]);

    log.info('[WORKER] Workers closed successfully');

    // Close queue connections
    await closeQueues();

    log.info('[WORKER] Graceful shutdown completed');
    process.exit(0);
  } catch (error) {
    log.error('[WORKER] Error during shutdown:', error);
    process.exit(1);
  }
}

// Register shutdown handlers
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle uncaught errors
process.on('uncaughtException', (error) => {
  log.error('[WORKER] Uncaught exception:', error);
  gracefulShutdown('uncaughtException');
});

process.on('unhandledRejection', (reason, promise) => {
  log.error('[WORKER] Unhandled rejection', reason, { promise });
  gracefulShutdown('unhandledRejection');
});

// Start workers
startWorkers().catch((error) => {
  log.error('[WORKER] Failed to start workers:', error);
  process.exit(1);
});
