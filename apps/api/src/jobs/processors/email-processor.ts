import { Job } from 'bullmq';
import { EmailJobData } from '../queue';
import { emailService } from '../../services/email-service';
import { log } from '../../utils/logger';

/**
 * Process email jobs from the queue
 * Integrates with existing email-service.ts
 */
export async function processEmailJob(job: Job<EmailJobData>): Promise<boolean> {
  const { data } = job;

  log.info(`[EMAIL_PROCESSOR] Processing job ${job.id}:`, {
    to: data.to,
    type: data.type,
    subject: data.subject,
  });

  try {
    // Use existing email service to send email
    const result = await emailService.sendEmail(
      {
        to: data.to,
        subject: data.subject,
        html: data.html,
        text: data.text,
      },
      data.organizationId
    );

    if (!result) {
      throw new Error('Email service returned false - email not sent');
    }

    log.info(`[EMAIL_PROCESSOR] Job ${job.id} completed successfully`);
    return true;
  } catch (error) {
    log.error(`[EMAIL_PROCESSOR] Job ${job.id} failed:`, error);

    // Log the error with job metadata for debugging
    log.error('[EMAIL_PROCESSOR] Job details:', undefined, {
      id: job.id,
      attempt: job.attemptsMade,
      maxAttempts: job.opts.attempts,
      to: data.to,
      type: data.type,
      metadata: data.metadata,
    });

    throw error; // Re-throw to trigger retry mechanism
  }
}

/**
 * Handle failed email jobs (after all retries exhausted)
 */
export async function handleFailedEmailJob(job: Job<EmailJobData>, error: Error): Promise<void> {
  log.error(`[EMAIL_PROCESSOR] Job ${job.id} permanently failed after ${job.attemptsMade} attempts:`, undefined, {
    to: job.data.to,
    type: job.data.type,
    subject: job.data.subject,
    error: error.message,
    metadata: job.data.metadata,
  });

  // TODO: Implement additional failure handling:
  // - Store failed email in database for manual retry
  // - Send alert to administrators
  // - Create notification for monitoring system
}
