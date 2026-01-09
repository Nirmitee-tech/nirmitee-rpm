import { Worker, Job } from 'bullmq';
import { log } from '../../utils/logger';
import { smsService } from '../../services/sms-service';
import { SmsJobData, QUEUE_NAMES } from '../queue';

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
    log.error('[SMS_PROCESSOR] Failed to parse REDIS_URL');
  }
}

/**
 * Process SMS job
 */
async function processSms(job: Job<SmsJobData>): Promise<{
  success: boolean;
  messageId?: string;
  error?: string;
}> {
  const { userId, alertId, patientName, severity, message, organizationId, type } = job.data;

  log.info('[SMS_PROCESSOR] Processing SMS job', {
    jobId: job.id,
    userId,
    type,
    severity,
  });

  try {
    let result;

    switch (type) {
      case 'alert':
        if (!alertId || !patientName || !severity) {
          throw new Error('Missing required fields for alert SMS');
        }
        result = await smsService.sendAlertSms(userId, {
          alertId,
          patientName,
          severity,
          message,
          organizationId,
        });
        break;

      case 'verification':
        // Extract verification code from message
        const code = message.match(/\d{6}/)?.[0] || message;
        // Get user phone from the job context or fetch it
        const { prisma } = await import('../../utils/prisma');
        const user = await prisma.user.findUnique({
          where: { id: userId },
          select: { phoneNumber: true },
        });
        if (!user?.phoneNumber) {
          throw new Error('User phone number not found');
        }
        result = await smsService.sendVerificationCode(user.phoneNumber, code);
        break;

      case 'test':
        const testUser = await (await import('../../utils/prisma')).prisma.user.findUnique({
          where: { id: userId },
          select: { phoneNumber: true },
        });
        if (!testUser?.phoneNumber) {
          throw new Error('User phone number not found');
        }
        result = await smsService.sendTestSms(testUser.phoneNumber);
        break;

      default:
        throw new Error(`Unknown SMS type: ${type}`);
    }

    log.info('[SMS_PROCESSOR] SMS processed', {
      jobId: job.id,
      success: result.success,
      messageId: result.messageId,
    });

    return result;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    log.error('[SMS_PROCESSOR] Failed to process SMS', {
      error: errorMessage,
      jobId: job.id,
      userId,
    });
    throw error;
  }
}

// Create worker
export const smsWorker = new Worker<SmsJobData>(
  QUEUE_NAMES.SMS,
  processSms,
  {
    connection: redisConnection,
    concurrency: 3, // Limit concurrency to avoid rate limits
    limiter: {
      max: 10, // Max 10 SMS per
      duration: 60000, // per minute
    },
  }
);

// Worker event handlers
smsWorker.on('completed', (job, result) => {
  log.debug('[SMS_PROCESSOR] Job completed', {
    jobId: job.id,
    messageId: result.messageId,
  });
});

smsWorker.on('failed', (job, error) => {
  log.error('[SMS_PROCESSOR] Job failed', {
    jobId: job?.id,
    error: error.message,
  });
});

smsWorker.on('error', (error) => {
  log.error('[SMS_PROCESSOR] Worker error', { error: error.message });
});

export default smsWorker;
