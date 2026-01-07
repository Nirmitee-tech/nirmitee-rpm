import { Job } from 'bullmq';
import { NotificationJobData } from '../queue';
import { prisma } from '../../utils/prisma';
import { log } from '../../utils/logger';

/**
 * Process notification jobs from the queue
 * Creates in-app notifications and sends real-time updates via WebSocket
 */
export async function processNotificationJob(job: Job<NotificationJobData>): Promise<void> {
  const { data } = job;

  log.info(`[NOTIFICATION_PROCESSOR] Processing job ${job.id}:`, {
    userId: data.userId,
    type: data.type,
    title: data.title,
  });

  try {
    // Create notification in database
    // Map notification type to match Prisma schema enum (uppercase)
    const notificationType = data.type.toUpperCase() as 'INFO' | 'SUCCESS' | 'WARNING' | 'ERROR';

    const notification = await prisma.notification.create({
      data: {
        userId: data.userId,
        title: data.title,
        message: data.message,
        type: notificationType,
        data: data.link ? { link: data.link } : undefined,
        organizationId: data.organizationId,
      },
    });

    log.info(`[NOTIFICATION_PROCESSOR] Created notification ${notification.id} for user ${data.userId}`);

    // TODO: Send real-time notification via WebSocket
    // This requires access to the WebSocket service instance
    // Consider implementing a pub/sub pattern or event emitter
    // Example: websocketService.sendToUser(data.userId, { type: 'notification', data: notification });

    log.info(`[NOTIFICATION_PROCESSOR] Job ${job.id} completed successfully`);
  } catch (error) {
    log.error(`[NOTIFICATION_PROCESSOR] Job ${job.id} failed:`, error);

    // Log the error with job metadata for debugging
    log.error('[NOTIFICATION_PROCESSOR] Job details:', undefined, {
      id: job.id,
      attempt: job.attemptsMade,
      maxAttempts: job.opts.attempts,
      userId: data.userId,
      type: data.type,
      metadata: data.metadata,
    });

    throw error; // Re-throw to trigger retry mechanism
  }
}

/**
 * Handle failed notification jobs (after all retries exhausted)
 */
export async function handleFailedNotificationJob(
  job: Job<NotificationJobData>,
  error: Error
): Promise<void> {
  log.error(`[NOTIFICATION_PROCESSOR] Job ${job.id} permanently failed after ${job.attemptsMade} attempts:`, undefined, {
      userId: job.data.userId,
      type: job.data.type,
      title: job.data.title,
      error: error.message,
      metadata: job.data.metadata,
    });

  // TODO: Implement additional failure handling:
  // - Store failed notification in database with failure flag
  // - Send alert to administrators
  // - Create fallback notification mechanism (email, SMS)
}
