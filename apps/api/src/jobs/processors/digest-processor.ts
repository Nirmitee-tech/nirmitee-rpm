import { Worker, Job } from 'bullmq';
import { log } from '../../utils/logger';
import { prisma } from '../../utils/prisma';
import { emailService } from '../../services/email-service';
import { DigestJobData, QUEUE_NAMES } from '../queue';
import { DigestFrequency } from '@prisma/client';

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
    log.error('[DIGEST_PROCESSOR] Failed to parse REDIS_URL');
  }
}

/**
 * Get date range for digest
 */
function getDigestDateRange(frequency: DigestFrequency): { from: Date; to: Date } {
  const now = new Date();
  const to = new Date(now);
  to.setHours(0, 0, 0, 0);

  const from = new Date(to);
  if (frequency === 'DAILY') {
    from.setDate(from.getDate() - 1);
  } else {
    from.setDate(from.getDate() - 7);
  }

  return { from, to };
}

/**
 * Generate digest email content
 */
async function generateDigestContent(
  userId: string,
  organizationId: string,
  frequency: DigestFrequency
): Promise<{
  html: string;
  subject: string;
  hasContent: boolean;
}> {
  const { from, to } = getDigestDateRange(frequency);
  const periodLabel = frequency === 'DAILY' ? 'Daily' : 'Weekly';

  // Get user's assigned patients
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      firstName: true,
      patientsAsPrimaryPhysician: { select: { id: true } },
      patientsAsAssignedStaff: { select: { id: true } },
    },
  });

  if (!user) {
    return { html: '', subject: '', hasContent: false };
  }

  const patientIds = [
    ...user.patientsAsPrimaryPhysician.map(p => p.id),
    ...user.patientsAsAssignedStaff.map(p => p.id),
  ];

  if (patientIds.length === 0) {
    return { html: '', subject: '', hasContent: false };
  }

  // Get alerts summary
  const alerts = await prisma.alert.groupBy({
    by: ['severity'],
    where: {
      organizationId,
      patientId: { in: patientIds },
      createdAt: { gte: from, lt: to },
    },
    _count: { id: true },
  });

  // Get vital readings count
  const vitalReadings = await prisma.vitalReading.count({
    where: {
      organizationId,
      patientId: { in: patientIds },
      createdAt: { gte: from, lt: to },
    },
  });

  // Get unresolved alerts count
  const unresolvedAlerts = await prisma.alert.count({
    where: {
      organizationId,
      patientId: { in: patientIds },
      status: { in: ['NEW', 'ACKNOWLEDGED', 'ESCALATED'] },
    },
  });

  const criticalAlerts = alerts.find(a => a.severity === 'CRITICAL')?._count?.id || 0;
  const warningAlerts = alerts.find(a => a.severity === 'SIGNIFICANT')?._count?.id || 0;
  const totalAlerts = alerts.reduce((sum, a) => sum + (a._count?.id || 0), 0);

  if (totalAlerts === 0 && vitalReadings === 0) {
    return { html: '', subject: '', hasContent: false };
  }

  const dashboardUrl = process.env.FRONTEND_URL || 'http://localhost:3000';

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${periodLabel} Digest</title>
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #745EE1 0%, #5a47b8 100%); padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
          <h1 style="color: #fff; margin: 0; font-size: 24px;">NirmiteeRPM</h1>
          <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0;">${periodLabel} Digest</p>
        </div>
        <div style="background: #fff; padding: 30px; border: 1px solid #e5e5e5; border-top: none; border-radius: 0 0 12px 12px;">
          <p>Hi ${user.firstName},</p>
          <p>Here's your ${periodLabel.toLowerCase()} summary for your patients:</p>

          <div style="display: flex; gap: 15px; margin: 20px 0;">
            <div style="flex: 1; background: #fef2f2; padding: 15px; border-radius: 8px; text-align: center;">
              <p style="margin: 0; font-size: 24px; font-weight: bold; color: #dc2626;">${criticalAlerts}</p>
              <p style="margin: 5px 0 0 0; font-size: 12px; color: #666;">Critical Alerts</p>
            </div>
            <div style="flex: 1; background: #fffbeb; padding: 15px; border-radius: 8px; text-align: center;">
              <p style="margin: 0; font-size: 24px; font-weight: bold; color: #f59e0b;">${warningAlerts}</p>
              <p style="margin: 5px 0 0 0; font-size: 12px; color: #666;">Warnings</p>
            </div>
            <div style="flex: 1; background: #f0fdf4; padding: 15px; border-radius: 8px; text-align: center;">
              <p style="margin: 0; font-size: 24px; font-weight: bold; color: #22c55e;">${vitalReadings}</p>
              <p style="margin: 5px 0 0 0; font-size: 12px; color: #666;">Vital Readings</p>
            </div>
          </div>

          ${unresolvedAlerts > 0 ? `
            <div style="background: #fff7ed; border-left: 4px solid #f97316; padding: 15px; margin: 20px 0; border-radius: 0 8px 8px 0;">
              <p style="margin: 0; font-weight: 600;">
                ⚠️ You have ${unresolvedAlerts} unresolved alert${unresolvedAlerts > 1 ? 's' : ''} requiring attention.
              </p>
            </div>
          ` : ''}

          <div style="text-align: center; margin: 30px 0;">
            <a href="${dashboardUrl}/dashboard" style="display: inline-block; background: #745EE1; color: #fff; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 600;">View Dashboard</a>
          </div>

          <hr style="border: none; border-top: 1px solid #e5e5e5; margin: 30px 0;">
          <p style="color: #999; font-size: 12px; text-align: center;">
            Monitoring ${patientIds.length} patient${patientIds.length > 1 ? 's' : ''}<br>
            Period: ${from.toLocaleDateString()} - ${to.toLocaleDateString()}
          </p>
        </div>
      </body>
    </html>
  `;

  return {
    html,
    subject: `${periodLabel} Digest: ${totalAlerts} alerts, ${vitalReadings} readings - NirmiteeRPM`,
    hasContent: true,
  };
}

/**
 * Process digest job
 */
async function processDigest(job: Job<DigestJobData>): Promise<{
  success: boolean;
  digestsSent?: number;
  error?: string;
}> {
  const { type, userId, organizationId, frequency } = job.data;

  log.info('[DIGEST_PROCESSOR] Processing digest job', {
    jobId: job.id,
    type,
    userId,
    frequency,
  });

  try {
    switch (type) {
      case 'send-user-digest':
        if (!userId || !organizationId || !frequency) {
          throw new Error('userId, organizationId, and frequency required');
        }

        const user = await prisma.user.findUnique({
          where: { id: userId },
          select: { email: true },
        });

        if (!user?.email) {
          return { success: false, error: 'User email not found' };
        }

        const content = await generateDigestContent(userId, organizationId, frequency as DigestFrequency);

        if (!content.hasContent) {
          log.info('[DIGEST_PROCESSOR] No content for digest, skipping', { userId });
          return { success: true, digestsSent: 0 };
        }

        await emailService.sendEmail({
          to: user.email,
          subject: content.subject,
          html: content.html,
        }, organizationId);

        return { success: true, digestsSent: 1 };

      case 'send-daily':
      case 'send-weekly':
        const digestFrequency: DigestFrequency = type === 'send-daily' ? 'DAILY' : 'WEEKLY';

        // Find all users with this digest frequency enabled
        const usersToNotify = await prisma.notificationPreference.findMany({
          where: {
            digestEnabled: true,
            digestFrequency,
          },
          include: {
            user: {
              select: {
                id: true,
                email: true,
                organizations: {
                  where: { status: 'ACTIVE' },
                  select: { organizationId: true },
                },
              },
            },
          },
        });

        let sentCount = 0;
        for (const pref of usersToNotify) {
          if (!pref.user.email) continue;

          for (const org of pref.user.organizations) {
            const digestContent = await generateDigestContent(
              pref.userId,
              org.organizationId,
              digestFrequency
            );

            if (digestContent.hasContent) {
              await emailService.sendEmail({
                to: pref.user.email,
                subject: digestContent.subject,
                html: digestContent.html,
              }, org.organizationId);
              sentCount++;
            }
          }
        }

        log.info('[DIGEST_PROCESSOR] Sent batch digests', {
          jobId: job.id,
          type,
          sentCount,
        });

        return { success: true, digestsSent: sentCount };

      default:
        throw new Error(`Unknown digest type: ${type}`);
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    log.error('[DIGEST_PROCESSOR] Failed to process digest', {
      error: errorMessage,
      jobId: job.id,
      type,
    });
    throw error;
  }
}

// Create worker
export const digestWorker = new Worker<DigestJobData>(
  QUEUE_NAMES.DIGEST,
  processDigest,
  {
    connection: redisConnection,
    concurrency: 2,
  }
);

// Worker event handlers
digestWorker.on('completed', (job, result) => {
  log.debug('[DIGEST_PROCESSOR] Job completed', {
    jobId: job.id,
    digestsSent: result.digestsSent,
  });
});

digestWorker.on('failed', (job, error) => {
  log.error('[DIGEST_PROCESSOR] Job failed', {
    jobId: job?.id,
    error: error.message,
  });
});

digestWorker.on('error', (error) => {
  log.error('[DIGEST_PROCESSOR] Worker error', { error: error.message });
});

export default digestWorker;
