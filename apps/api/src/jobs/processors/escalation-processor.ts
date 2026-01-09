import { Worker, Job } from 'bullmq';
import { log } from '../../utils/logger';
import { escalationService } from '../../services/escalation-service';
import { EscalationJobData, QUEUE_NAMES } from '../queue';
import { EscalationReason } from '@prisma/client';

// Redis connection configuration
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
    log.error('[ESCALATION_PROCESSOR] Failed to parse REDIS_URL');
  }
}

/**
 * Process escalation job
 */
async function processEscalation(job: Job<EscalationJobData>): Promise<{
  success: boolean;
  processedCount?: number;
  alertId?: string;
  error?: string;
}> {
  const { type, alertId, reason, notes } = job.data;

  log.info('[ESCALATION_PROCESSOR] Processing escalation job', {
    jobId: job.id,
    type,
    alertId,
  });

  try {
    switch (type) {
      case 'process-pending':
        // Process all pending escalations
        const processedCount = await escalationService.processPendingEscalations();
        log.info('[ESCALATION_PROCESSOR] Processed pending escalations', {
          jobId: job.id,
          processedCount,
        });
        return { success: true, processedCount };

      case 'single-alert':
        if (!alertId) {
          throw new Error('alertId required for single-alert escalation');
        }
        const escalationReason = reason as EscalationReason || EscalationReason.TIME_EXCEEDED;
        const result = await escalationService.escalateAlert(alertId, escalationReason, notes);

        if (!result.success) {
          log.warn('[ESCALATION_PROCESSOR] Escalation not applied', {
            jobId: job.id,
            alertId,
            reason: result.error,
          });
          return { success: false, alertId, error: result.error };
        }

        log.info('[ESCALATION_PROCESSOR] Alert escalated', {
          jobId: job.id,
          alertId,
          newLevel: result.alert?.escalationLevel,
        });
        return { success: true, alertId };

      default:
        throw new Error(`Unknown escalation type: ${type}`);
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    log.error('[ESCALATION_PROCESSOR] Failed to process escalation', {
      error: errorMessage,
      jobId: job.id,
      type,
      alertId,
    });
    throw error;
  }
}

// Create worker
export const escalationWorker = new Worker<EscalationJobData>(
  QUEUE_NAMES.ESCALATION,
  processEscalation,
  {
    connection: redisConnection,
    concurrency: 2, // Process escalations sequentially to avoid race conditions
  }
);

// Worker event handlers
escalationWorker.on('completed', (job, result) => {
  log.debug('[ESCALATION_PROCESSOR] Job completed', {
    jobId: job.id,
    processedCount: result.processedCount,
    alertId: result.alertId,
  });
});

escalationWorker.on('failed', (job, error) => {
  log.error('[ESCALATION_PROCESSOR] Job failed', {
    jobId: job?.id,
    error: error.message,
  });
});

escalationWorker.on('error', (error) => {
  log.error('[ESCALATION_PROCESSOR] Worker error', { error: error.message });
});

export default escalationWorker;
