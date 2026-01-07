import { Job, JobsOptions } from 'bullmq';
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
  QUEUE_NAMES,
} from '../jobs/queue';
import { log } from '../utils/logger';

/**
 * Job status interface
 */
export interface JobStatus {
  id: string;
  state: string;
  progress?: number;
  attemptsMade: number;
  failedReason?: string;
  finishedOn?: number;
  processedOn?: number;
  data: unknown;
}

/**
 * Service for managing background jobs across all queues
 */
class JobService {
  /**
   * Add an email job to the queue
   */
  async addEmailJob(data: EmailJobData, options?: JobsOptions): Promise<Job<EmailJobData>> {
    try {
      const job = await emailQueue.add('send-email', data, {
        ...options,
        // Override priority for critical emails (e.g., OTP, password reset)
        priority: data.type === 'otp' || data.type === 'password-reset' ? 1 : 2,
      });

      log.info(`[JOB_SERVICE] Email job added: ${job.id}`, {
        to: data.to,
        type: data.type,
      });

      return job;
    } catch (error) {
      log.error('[JOB_SERVICE] Failed to add email job:', error);
      throw error;
    }
  }

  /**
   * Add a notification job to the queue
   */
  async addNotificationJob(
    data: NotificationJobData,
    options?: JobsOptions
  ): Promise<Job<NotificationJobData>> {
    try {
      const job = await notificationQueue.add('create-notification', data, options);

      log.info(`[JOB_SERVICE] Notification job added: ${job.id}`, {
        userId: data.userId,
        type: data.type,
      });

      return job;
    } catch (error) {
      log.error('[JOB_SERVICE] Failed to add notification job:', error);
      throw error;
    }
  }

  /**
   * Add a report generation job to the queue
   */
  async addReportJob(data: ReportJobData, options?: JobsOptions): Promise<Job<ReportJobData>> {
    try {
      const job = await reportQueue.add('generate-report', data, options) as Job<ReportJobData>;

      log.info(`[JOB_SERVICE] Report job added: ${job.id}`, {
        reportType: data.reportType,
        format: data.format,
      });

      return job;
    } catch (error) {
      log.error('[JOB_SERVICE] Failed to add report job:', error);
      throw error;
    }
  }

  /**
   * Add a cleanup job to the queue
   */
  async addCleanupJob(data: CleanupJobData, options?: JobsOptions): Promise<Job<CleanupJobData>> {
    try {
      const job = await cleanupQueue.add('cleanup-data', data, options) as Job<CleanupJobData>;

      log.info(`[JOB_SERVICE] Cleanup job added: ${job.id}`, {
        type: data.type,
      });

      return job;
    } catch (error) {
      log.error('[JOB_SERVICE] Failed to add cleanup job:', error);
      throw error;
    }
  }

  /**
   * Schedule a recurring cleanup job using cron syntax
   * @param type - Type of cleanup to perform
   * @param cron - Cron expression (e.g., '0 2 * * *' for daily at 2 AM)
   * @param data - Additional cleanup data
   */
  async scheduleCleanup(
    type: CleanupJobData['type'],
    cron: string,
    data?: Partial<CleanupJobData>
  ): Promise<void> {
    try {
      await cleanupQueue.add(
        `cleanup-${type}` as string,
        {
          type,
          ...data,
        } as CleanupJobData,
        {
          repeat: {
            pattern: cron,
          },
        }
      );

      log.info(`[JOB_SERVICE] Scheduled cleanup job:`, {
        type,
        cron,
      });
    } catch (error) {
      log.error('[JOB_SERVICE] Failed to schedule cleanup:', error);
      throw error;
    }
  }

  /**
   * Add a backup job to the queue
   */
  async addBackupJob(data: BackupJobData, options?: JobsOptions): Promise<Job<BackupJobData>> {
    try {
      const job = await backupQueue.add('create-backup', data, options) as Job<BackupJobData>;

      log.info(`[JOB_SERVICE] Backup job added: ${job.id}`, {
        type: data.type,
        createdBy: data.createdBy,
      });

      return job;
    } catch (error) {
      log.error('[JOB_SERVICE] Failed to add backup job:', error);
      throw error;
    }
  }

  /**
   * Get job status by ID and queue name
   */
  async getJobStatus(jobId: string, queueName: string): Promise<JobStatus | null> {
    try {
      let job: Job | undefined;

      // Get job from appropriate queue
      switch (queueName) {
        case QUEUE_NAMES.EMAIL:
          job = await emailQueue.getJob(jobId);
          break;
        case QUEUE_NAMES.NOTIFICATION:
          job = await notificationQueue.getJob(jobId);
          break;
        case QUEUE_NAMES.REPORT:
          job = await reportQueue.getJob(jobId);
          break;
        case QUEUE_NAMES.CLEANUP:
          job = await cleanupQueue.getJob(jobId);
          break;
        case QUEUE_NAMES.BACKUP:
          job = await backupQueue.getJob(jobId);
          break;
        default:
          throw new Error(`Unknown queue: ${queueName}`);
      }

      if (!job) {
        return null;
      }

      // Get job state
      const state = await job.getState();

      return {
        id: job.id!,
        state,
        progress: job.progress as number | undefined,
        attemptsMade: job.attemptsMade,
        failedReason: job.failedReason,
        finishedOn: job.finishedOn || undefined,
        processedOn: job.processedOn || undefined,
        data: job.data,
      };
    } catch (error) {
      log.error('[JOB_SERVICE] Failed to get job status:', error);
      throw error;
    }
  }

  /**
   * Remove a job by ID
   */
  async removeJob(jobId: string, queueName: string): Promise<boolean> {
    try {
      let job: Job | undefined;

      // Get job from appropriate queue
      switch (queueName) {
        case QUEUE_NAMES.EMAIL:
          job = await emailQueue.getJob(jobId);
          break;
        case QUEUE_NAMES.NOTIFICATION:
          job = await notificationQueue.getJob(jobId);
          break;
        case QUEUE_NAMES.REPORT:
          job = await reportQueue.getJob(jobId);
          break;
        case QUEUE_NAMES.CLEANUP:
          job = await cleanupQueue.getJob(jobId);
          break;
        case QUEUE_NAMES.BACKUP:
          job = await backupQueue.getJob(jobId);
          break;
        default:
          throw new Error(`Unknown queue: ${queueName}`);
      }

      if (!job) {
        return false;
      }

      await job.remove();
      log.info(`[JOB_SERVICE] Removed job ${jobId} from ${queueName}`);
      return true;
    } catch (error) {
      log.error('[JOB_SERVICE] Failed to remove job:', error);
      throw error;
    }
  }

  /**
   * Get queue statistics
   */
  async getQueueStats(queueName: string): Promise<{
    waiting: number;
    active: number;
    completed: number;
    failed: number;
    delayed: number;
  }> {
    let queue;

    switch (queueName) {
      case QUEUE_NAMES.EMAIL:
        queue = emailQueue;
        break;
      case QUEUE_NAMES.NOTIFICATION:
        queue = notificationQueue;
        break;
      case QUEUE_NAMES.REPORT:
        queue = reportQueue;
        break;
      case QUEUE_NAMES.CLEANUP:
        queue = cleanupQueue;
        break;
      case QUEUE_NAMES.BACKUP:
        queue = backupQueue;
        break;
      default:
        throw new Error(`Unknown queue: ${queueName}`);
    }

    const [waiting, active, completed, failed, delayed] = await Promise.all([
      queue.getWaitingCount(),
      queue.getActiveCount(),
      queue.getCompletedCount(),
      queue.getFailedCount(),
      queue.getDelayedCount(),
    ]);

    return { waiting, active, completed, failed, delayed };
  }

  /**
   * Retry a failed job
   */
  async retryJob(jobId: string, queueName: string): Promise<boolean> {
    try {
      let job: Job | undefined;

      // Get job from appropriate queue
      switch (queueName) {
        case QUEUE_NAMES.EMAIL:
          job = await emailQueue.getJob(jobId);
          break;
        case QUEUE_NAMES.NOTIFICATION:
          job = await notificationQueue.getJob(jobId);
          break;
        case QUEUE_NAMES.REPORT:
          job = await reportQueue.getJob(jobId);
          break;
        case QUEUE_NAMES.CLEANUP:
          job = await cleanupQueue.getJob(jobId);
          break;
        case QUEUE_NAMES.BACKUP:
          job = await backupQueue.getJob(jobId);
          break;
        default:
          throw new Error(`Unknown queue: ${queueName}`);
      }

      if (!job) {
        return false;
      }

      await job.retry();
      log.info(`[JOB_SERVICE] Retrying job ${jobId} in ${queueName}`);
      return true;
    } catch (error) {
      log.error('[JOB_SERVICE] Failed to retry job:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const jobService = new JobService();
