import { Job } from 'bullmq';
import { ReportJobData } from '../queue';
import { prisma } from '../../utils/prisma';
import { log } from '../../utils/logger';

/**
 * Process report generation jobs from the queue
 * Generates async reports and optionally emails them to recipients
 */
export async function processReportJob(job: Job<ReportJobData>): Promise<void> {
  const { data } = job;

  log.info(`[REPORT_PROCESSOR] Processing job ${job.id}:`, {
    reportType: data.reportType,
    format: data.format,
    dateRange: data.dateRange,
  });

  try {
    let reportData: unknown;

    // Generate report based on type
    switch (data.reportType) {
      case 'user-activity':
        reportData = await generateUserActivityReport(data);
        break;

      case 'audit-log':
        reportData = await generateAuditLogReport(data);
        break;

      case 'system-health':
        reportData = await generateSystemHealthReport(data);
        break;

      case 'custom':
        reportData = await generateCustomReport(data);
        break;

      default:
        throw new Error(`Unknown report type: ${data.reportType}`);
    }

    log.info(`[REPORT_PROCESSOR] Generated report data for job ${job.id}`);

    // TODO: Convert report data to requested format (PDF, CSV, XLSX)
    // This requires additional libraries like pdfkit, csv-writer, exceljs
    // const reportFile = await convertToFormat(reportData, data.format);

    // TODO: If recipient email provided, send the report
    // if (data.recipientEmail) {
    //   await emailService.sendEmail({
    //     to: data.recipientEmail,
    //     subject: `Report: ${data.reportType}`,
    //     html: `<p>Your report is attached.</p>`,
    //   });
    // }

    log.info(`[REPORT_PROCESSOR] Job ${job.id} completed successfully`);
  } catch (error) {
    log.error(`[REPORT_PROCESSOR] Job ${job.id} failed:`, error);

    // Log the error with job metadata for debugging
    log.error('[REPORT_PROCESSOR] Job details:', undefined, {
      id: job.id,
      attempt: job.attemptsMade,
      maxAttempts: job.opts.attempts,
      reportType: data.reportType,
      format: data.format,
      metadata: data.metadata,
    });

    throw error; // Re-throw to trigger retry mechanism
  }
}

/**
 * Generate user activity report
 */
async function generateUserActivityReport(data: ReportJobData): Promise<unknown> {
  // Filter users by organization if specified
  const whereClause: Record<string, unknown> = {
    createdAt: {
      gte: data.dateRange.from,
      lte: data.dateRange.to,
    },
  };

  // Add organization filter if ID provided
  if (data.organizationId) {
    whereClause.organizations = {
      some: {
        organizationId: data.organizationId,
      },
    };
  }

  const users = await prisma.user.findMany({
    where: whereClause,
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      createdAt: true,
      lastLoginAt: true,
    },
  });

  return {
    reportType: 'user-activity',
    generatedAt: new Date(),
    dateRange: data.dateRange,
    totalUsers: users.length,
    users,
  };
}

/**
 * Generate audit log report
 */
async function generateAuditLogReport(data: ReportJobData): Promise<unknown> {
  const whereClause: Record<string, unknown> = {
    createdAt: {
      gte: data.dateRange.from,
      lte: data.dateRange.to,
    },
  };

  if (data.organizationId) {
    whereClause.organizationId = data.organizationId;
  }

  const auditLogs = await prisma.auditLog.findMany({
    where: whereClause,
    select: {
      id: true,
      action: true,
      entity: true,
      entityId: true,
      metadata: true,
      ipAddress: true,
      userAgent: true,
      createdAt: true,
      userId: true,
      organizationId: true,
    },
    orderBy: {
      createdAt: 'desc',
    },
  });

  return {
    reportType: 'audit-log',
    generatedAt: new Date(),
    dateRange: data.dateRange,
    totalLogs: auditLogs.length,
    logs: auditLogs,
  };
}

/**
 * Generate system health report
 */
async function generateSystemHealthReport(data: ReportJobData): Promise<unknown> {
  // Get system metrics
  let totalUsers = 0;

  if (data.organizationId) {
    totalUsers = await prisma.user.count({
      where: {
        organizations: {
          some: {
            organizationId: data.organizationId,
          },
        },
      },
    });
  } else {
    totalUsers = await prisma.user.count();
  }

  const totalOrganizations = await prisma.organization.count();

  // Count recent logins (last 24 hours)
  const recentLogins = await prisma.user.count({
    where: {
      lastLoginAt: {
        gte: new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
      },
    },
  });

  return {
    reportType: 'system-health',
    generatedAt: new Date(),
    metrics: {
      totalUsers,
      totalOrganizations,
      recentLogins,
      uptime: process.uptime(),
      memoryUsage: process.memoryUsage(),
    },
  };
}

/**
 * Generate custom report
 */
async function generateCustomReport(data: ReportJobData): Promise<unknown> {
  // Custom report generation logic based on filters
  return {
    reportType: 'custom',
    generatedAt: new Date(),
    filters: data.filters,
    message: 'Custom report generation not yet implemented',
  };
}

/**
 * Handle failed report jobs (after all retries exhausted)
 */
export async function handleFailedReportJob(job: Job<ReportJobData>, error: Error): Promise<void> {
  log.error(`[REPORT_PROCESSOR] Job ${job.id} permanently failed after ${job.attemptsMade} attempts:`, undefined, {
      reportType: job.data.reportType,
      format: job.data.format,
      error: error.message,
      metadata: job.data.metadata,
    });

  // TODO: Implement additional failure handling:
  // - Notify user that report generation failed
  // - Store failure information in database
  // - Send alert to administrators
}
