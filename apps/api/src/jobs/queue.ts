import { Queue, QueueOptions } from 'bullmq';
import { log } from '../utils/logger';

// Redis connection configuration
const redisConnection = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379', 10),
  password: process.env.REDIS_PASSWORD,
  db: parseInt(process.env.REDIS_DB || '0', 10),
};

// Parse REDIS_URL if provided (overrides individual settings)
if (process.env.REDIS_URL) {
  try {
    const url = new URL(process.env.REDIS_URL);
    redisConnection.host = url.hostname;
    redisConnection.port = parseInt(url.port || '6379', 10);
    if (url.password) {
      redisConnection.password = url.password;
    }
    // Extract db from pathname (e.g., /0, /1)
    if (url.pathname && url.pathname.length > 1) {
      const dbNum = parseInt(url.pathname.slice(1), 10);
      if (!isNaN(dbNum)) {
        redisConnection.db = dbNum;
      }
    }
  } catch (error) {
    log.error('[QUEUE] Failed to parse REDIS_URL:', error);
  }
}

// Default queue options with retry logic
const defaultQueueOptions: QueueOptions = {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000, // Start with 2 seconds
    },
    removeOnComplete: {
      age: 24 * 3600, // Keep completed jobs for 24 hours
      count: 1000, // Keep last 1000 completed jobs
    },
    removeOnFail: {
      age: 7 * 24 * 3600, // Keep failed jobs for 7 days
      count: 5000, // Keep last 5000 failed jobs
    },
  },
};

// Email job data interface
export interface EmailJobData {
  to: string;
  subject: string;
  html: string;
  text?: string;
  organizationId?: string;
  type: 'password-reset' | 'invitation' | 'welcome' | 'otp' | 'custom';
  metadata?: Record<string, unknown>;
}

// Notification job data interface
export interface NotificationJobData {
  userId: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  link?: string;
  organizationId?: string;
  metadata?: Record<string, unknown>;
}

// Report job data interface
export interface ReportJobData {
  reportType: 'user-activity' | 'audit-log' | 'system-health' | 'custom';
  userId?: string;
  organizationId?: string;
  dateRange: {
    from: Date;
    to: Date;
  };
  filters?: Record<string, unknown>;
  format: 'pdf' | 'csv' | 'xlsx';
  recipientEmail?: string;
  metadata?: Record<string, unknown>;
}

// Cleanup job data interface
export interface CleanupJobData {
  type: 'expired-tokens' | 'old-sessions' | 'temp-files' | 'old-notifications' | 'stale-telehealth-sessions';
  olderThan?: Date;
  batchSize?: number;
  maxDurationMinutes?: number; // For telehealth sessions
  metadata?: Record<string, unknown>;
}

// Backup job data interface
export interface BackupJobData {
  type: 'DATABASE' | 'FILES' | 'FULL';
  createdBy?: string;
  metadata?: Record<string, unknown>;
}

// Phase 4: Alert notification job data interface
export interface AlertNotificationJobData {
  alertId: string;
  patientId: string;
  patientName: string;
  organizationId: string;
  severity: 'CRITICAL' | 'SIGNIFICANT' | 'INFORMATIONAL';
  message: string;
  vitalType?: string;
  values?: Record<string, number>;
  recipientUserIds: string[];
}

// Phase 4: SMS job data interface
export interface SmsJobData {
  userId: string;
  alertId?: string;
  patientName?: string;
  severity?: 'CRITICAL' | 'SIGNIFICANT' | 'INFORMATIONAL';
  message: string;
  organizationId: string;
  type: 'alert' | 'verification' | 'test';
}

// Phase 4: Escalation job data interface
export interface EscalationJobData {
  type: 'process-pending' | 'single-alert';
  alertId?: string;
  reason?: 'TIME_EXCEEDED' | 'MANUAL_ESCALATION' | 'SEVERITY_UPGRADE' | 'RULE_BASED';
  notes?: string;
  organizationId?: string;
}

// Phase 4: Digest job data interface
export interface DigestJobData {
  type: 'send-daily' | 'send-weekly' | 'send-user-digest';
  userId?: string;
  organizationId?: string;
  frequency?: 'DAILY' | 'WEEKLY';
}

// Initialize queues
export const emailQueue = new Queue<EmailJobData>('email', {
  ...defaultQueueOptions,
  defaultJobOptions: {
    ...defaultQueueOptions.defaultJobOptions,
    priority: 2, // Higher priority for emails
  },
});

export const notificationQueue = new Queue<NotificationJobData>('notification', {
  ...defaultQueueOptions,
  defaultJobOptions: {
    ...defaultQueueOptions.defaultJobOptions,
    priority: 1, // Highest priority for real-time notifications
  },
});

export const reportQueue = new Queue<ReportJobData>('report', {
  ...defaultQueueOptions,
  defaultJobOptions: {
    ...defaultQueueOptions.defaultJobOptions,
    priority: 5, // Lower priority for reports (background task)
  },
});

export const cleanupQueue = new Queue<CleanupJobData>('cleanup', {
  ...defaultQueueOptions,
  defaultJobOptions: {
    ...defaultQueueOptions.defaultJobOptions,
    priority: 10, // Lowest priority for cleanup tasks
  },
});

export const backupQueue = new Queue<BackupJobData>('backup', {
  ...defaultQueueOptions,
  defaultJobOptions: {
    ...defaultQueueOptions.defaultJobOptions,
    priority: 3, // High priority for backups
    attempts: 2, // Only retry once for backups
  },
});

// Phase 4: Alert notification queue (high priority)
export const alertNotificationQueue = new Queue<AlertNotificationJobData>('alert-notification', {
  ...defaultQueueOptions,
  defaultJobOptions: {
    ...defaultQueueOptions.defaultJobOptions,
    priority: 1, // Highest priority for alerts
    attempts: 3,
  },
});

// Phase 4: SMS queue
export const smsQueue = new Queue<SmsJobData>('sms', {
  ...defaultQueueOptions,
  defaultJobOptions: {
    ...defaultQueueOptions.defaultJobOptions,
    priority: 1, // High priority for SMS
    attempts: 2,
    backoff: {
      type: 'exponential',
      delay: 5000, // Start with 5 seconds for SMS
    },
  },
});

// Phase 4: Escalation queue
export const escalationQueue = new Queue<EscalationJobData>('escalation', {
  ...defaultQueueOptions,
  defaultJobOptions: {
    ...defaultQueueOptions.defaultJobOptions,
    priority: 1, // High priority for escalations
    attempts: 3,
  },
});

// Phase 4: Digest queue (low priority)
export const digestQueue = new Queue<DigestJobData>('digest', {
  ...defaultQueueOptions,
  defaultJobOptions: {
    ...defaultQueueOptions.defaultJobOptions,
    priority: 8, // Lower priority for digests
    attempts: 2,
  },
});

// Queue event logging (disabled to avoid type errors - events handled in worker)
const setupQueueLogging = (_queue: Queue, _queueName: string) => {
  // Queue event logging is handled in the worker process
  // to avoid type compatibility issues with BullMQ queue events
};

// Setup logging for all queues
setupQueueLogging(emailQueue, 'EMAIL');
setupQueueLogging(notificationQueue, 'NOTIFICATION');
setupQueueLogging(reportQueue, 'REPORT');
setupQueueLogging(cleanupQueue, 'CLEANUP');
setupQueueLogging(backupQueue, 'BACKUP');
setupQueueLogging(alertNotificationQueue, 'ALERT_NOTIFICATION');
setupQueueLogging(smsQueue, 'SMS');
setupQueueLogging(escalationQueue, 'ESCALATION');
setupQueueLogging(digestQueue, 'DIGEST');

// Health check function
export async function checkQueuesHealth(): Promise<{
  healthy: boolean;
  queues: Record<string, { connected: boolean; error?: string }>;
}> {
  const queues = {
    email: emailQueue,
    notification: notificationQueue,
    report: reportQueue,
    cleanup: cleanupQueue,
    backup: backupQueue,
    alertNotification: alertNotificationQueue,
    sms: smsQueue,
    escalation: escalationQueue,
    digest: digestQueue,
  };

  const results: Record<string, { connected: boolean; error?: string }> = {};
  let allHealthy = true;

  for (const [name, queue] of Object.entries(queues)) {
    try {
      const client = await queue.client;
      await client.ping();
      results[name] = { connected: true };
    } catch (error) {
      results[name] = {
        connected: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
      allHealthy = false;
    }
  }

  return { healthy: allHealthy, queues: results };
}

// Graceful shutdown
export async function closeQueues(): Promise<void> {
  log.info('[QUEUE] Closing all queues...');
  await Promise.all([
    emailQueue.close(),
    notificationQueue.close(),
    reportQueue.close(),
    cleanupQueue.close(),
    backupQueue.close(),
    alertNotificationQueue.close(),
    smsQueue.close(),
    escalationQueue.close(),
    digestQueue.close(),
  ]);
  log.info('[QUEUE] All queues closed successfully');
}

// Export queue names for reference
export const QUEUE_NAMES = {
  EMAIL: 'email',
  NOTIFICATION: 'notification',
  REPORT: 'report',
  CLEANUP: 'cleanup',
  BACKUP: 'backup',
  ALERT_NOTIFICATION: 'alert-notification',
  SMS: 'sms',
  ESCALATION: 'escalation',
  DIGEST: 'digest',
} as const;
