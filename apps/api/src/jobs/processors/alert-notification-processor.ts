import { Worker, Job } from 'bullmq';
import { log } from '../../utils/logger';
import { alertNotificationService } from '../../services/alert-notification-service';
import { AlertNotificationJobData, QUEUE_NAMES } from '../queue';

// Redis connection configuration (same as queue.ts)
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
  } catch {
    log.error('[ALERT_NOTIFICATION_PROCESSOR] Failed to parse REDIS_URL');
  }
}

/**
 * Process alert notification job
 */
async function processAlertNotification(job: Job<AlertNotificationJobData>): Promise<{
  success: boolean;
  notificationsSent: number;
  errors: string[];
}> {
  const { alertId, patientId, patientName, organizationId, severity, message, vitalType, values, recipientUserIds } = job.data;

  log.info('[ALERT_NOTIFICATION_PROCESSOR] Processing alert notification', {
    jobId: job.id,
    alertId,
    severity,
    recipientCount: recipientUserIds.length,
  });

  try {
    const results = await alertNotificationService.sendAlertNotifications(
      {
        alertId,
        patientId,
        patientName,
        organizationId,
        severity,
        message,
        vitalType,
        values,
      },
      recipientUserIds
    );

    const successful = results.filter(r => r.success).length;
    const errors = results.filter(r => !r.success).map(r => r.error || 'Unknown error');

    log.info('[ALERT_NOTIFICATION_PROCESSOR] Alert notification processed', {
      jobId: job.id,
      alertId,
      notificationsSent: successful,
      errorCount: errors.length,
    });

    return {
      success: errors.length === 0,
      notificationsSent: successful,
      errors,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    log.error('[ALERT_NOTIFICATION_PROCESSOR] Failed to process alert notification', {
      error: errorMessage,
      jobId: job.id,
      alertId,
    });
    throw error;
  }
}

// Create worker
export const alertNotificationWorker = new Worker<AlertNotificationJobData>(
  QUEUE_NAMES.ALERT_NOTIFICATION,
  processAlertNotification,
  {
    connection: redisConnection,
    concurrency: 5, // Process up to 5 alerts simultaneously
  }
);

// Worker event handlers
alertNotificationWorker.on('completed', (job, result) => {
  log.debug('[ALERT_NOTIFICATION_PROCESSOR] Job completed', {
    jobId: job.id,
    notificationsSent: result.notificationsSent,
  });
});

alertNotificationWorker.on('failed', (job, error) => {
  log.error('[ALERT_NOTIFICATION_PROCESSOR] Job failed', {
    jobId: job?.id,
    error: error.message,
  });
});

alertNotificationWorker.on('error', (error) => {
  log.error('[ALERT_NOTIFICATION_PROCESSOR] Worker error', { error: error.message });
});

export default alertNotificationWorker;
