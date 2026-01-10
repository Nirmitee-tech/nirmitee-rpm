/**
 * Analytics & Reporting Service
 * Population health dashboards, cohort analysis, and report generation
 */

import { prisma } from '../utils/prisma';
import {
  ReportTemplate,
  ReportType,
  ExportFormat,
  ChartType,
  ScheduledReport,
  ReportFrequency,
  ReportExecution,
  ExecutionStatus,
  CohortDefinition,
  CohortOutcome,
  PopulationHealthMetric,
  MetricType,
  DeliveryMethod,
  Prisma,
} from '@prisma/client';
import { auditService } from './audit-service';

interface CreateReportTemplateInput {
  organizationId: string;
  name: string;
  description?: string;
  reportType: ReportType;
  category?: string;
  dataSource: string;
  filters?: Record<string, unknown>;
  columns: Record<string, unknown>;
  groupBy?: string[];
  sortBy?: Record<string, unknown>;
  chartType?: ChartType;
  chartConfig?: Record<string, unknown>;
}

interface ScheduleReportInput {
  templateId: string;
  name: string;
  frequency: ReportFrequency;
  dayOfWeek?: number;
  dayOfMonth?: number;
  hour?: number;
  timezone?: string;
  filters?: Record<string, unknown>;
  dateRange?: string;
  deliveryMethod: DeliveryMethod[];
  format: ExportFormat;
  recipients: string[];
}

interface CohortCriteria {
  conditions?: string[];
  ageRange?: { min?: number; max?: number };
  enrolledAfter?: Date;
  enrolledBefore?: Date;
  minReadings?: number;
  vitalTypes?: string[];
  riskLevel?: string;
}

interface PopulationMetrics {
  totalPatients: number;
  activePatients: number;
  avgReadingsPerDay: number;
  alertRate: number;
  criticalAlertRate: number;
}

class AnalyticsService {
  // ==========================================
  // REPORT TEMPLATES
  // ==========================================

  /**
   * Create report template
   */
  async createReportTemplate(
    input: CreateReportTemplateInput,
    userId: string
  ): Promise<ReportTemplate> {
    const template = await prisma.reportTemplate.create({
      data: {
        organizationId: input.organizationId,
        name: input.name,
        description: input.description,
        reportType: input.reportType,
        category: input.category,
        dataSource: input.dataSource,
        filters: (input.filters || {}) as Prisma.InputJsonValue,
        columns: input.columns as Prisma.InputJsonValue,
        groupBy: input.groupBy || [],
        sortBy: (input.sortBy || {}) as Prisma.InputJsonValue,
        chartType: input.chartType,
        chartConfig: (input.chartConfig || {}) as Prisma.InputJsonValue,
        createdById: userId,
        isPublic: false,
      },
    });

    await auditService.log({
      action: 'report_template.created',
      entity: 'report_template',
      entityId: template.id,
      organizationId: input.organizationId,
      userId,
      newValues: { name: template.name, reportType: template.reportType },
    });

    return template;
  }

  /**
   * Get report templates
   */
  async getReportTemplates(
    organizationId: string,
    options?: { reportType?: ReportType; category?: string }
  ): Promise<ReportTemplate[]> {
    const where: Prisma.ReportTemplateWhereInput = { organizationId };

    if (options?.reportType) {
      where.reportType = options.reportType;
    }
    if (options?.category) {
      where.category = options.category;
    }

    return prisma.reportTemplate.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Get a single report template
   */
  async getReportTemplate(
    templateId: string,
    organizationId: string
  ): Promise<ReportTemplate | null> {
    return prisma.reportTemplate.findFirst({
      where: { id: templateId, organizationId },
    });
  }

  /**
   * Execute a report
   */
  async executeReport(
    templateId: string,
    organizationId: string,
    parameters?: Record<string, unknown>,
    triggeredBy?: string
  ): Promise<ReportExecution> {
    const template = await this.getReportTemplate(templateId, organizationId);
    if (!template) {
      throw new Error('Report template not found');
    }

    // Create execution record
    const execution = await prisma.reportExecution.create({
      data: {
        organizationId,
        templateId,
        reportName: template.name,
        status: ExecutionStatus.PENDING,
        parameters: (parameters || {}) as Prisma.InputJsonValue,
        triggeredBy: triggeredBy || 'manual',
      },
    });

    // Run the report asynchronously
    this.runReport(execution.id, template, parameters).catch(console.error);

    return execution;
  }

  /**
   * Run report and generate results
   */
  private async runReport(
    executionId: string,
    template: ReportTemplate,
    parameters?: Record<string, unknown>
  ): Promise<void> {
    try {
      await prisma.reportExecution.update({
        where: { id: executionId },
        data: { status: ExecutionStatus.RUNNING },
      });

      // Get data based on report type
      const data = await this.getReportData(template, parameters);

      // Update execution with results
      await prisma.reportExecution.update({
        where: { id: executionId },
        data: {
          status: ExecutionStatus.COMPLETED,
          completedAt: new Date(),
          recordCount: Array.isArray(data) ? data.length : 1,
          durationMs: Date.now() - new Date().getTime(),
        },
      });
    } catch (error) {
      await prisma.reportExecution.update({
        where: { id: executionId },
        data: {
          status: ExecutionStatus.FAILED,
          errorMessage: error instanceof Error ? error.message : 'Unknown error',
          completedAt: new Date(),
        },
      });
    }
  }

  /**
   * Get report data based on type
   */
  private async getReportData(
    template: ReportTemplate,
    parameters?: Record<string, unknown>
  ): Promise<unknown[]> {
    const orgId = template.organizationId;

    switch (template.reportType) {
      case ReportType.PATIENT_LIST:
        return this.getPatientListData(orgId, parameters);
      case ReportType.VITAL_SUMMARY:
        return this.getVitalSummaryData(orgId, parameters);
      case ReportType.ALERT_ANALYSIS:
        return this.getAlertAnalysisData(orgId, parameters);
      case ReportType.BILLING_SUMMARY:
        return this.getBillingSummaryData(orgId, parameters);
      case ReportType.DEVICE_UTILIZATION:
        return this.getDeviceUtilizationData(orgId, parameters);
      default:
        return [];
    }
  }

  private async getPatientListData(
    organizationId: string,
    _parameters?: Record<string, unknown>
  ): Promise<unknown[]> {
    const patients = await prisma.patient.findMany({
      where: { organizationId, deletedAt: null },
      include: {
        user: { select: { firstName: true, lastName: true, email: true } },
        devices: { select: { id: true, type: true, status: true } },
        _count: { select: { vitalReadings: true, alerts: true } },
      },
    });

    return patients.map((p) => ({
      id: p.id,
      name: `${p.user.firstName} ${p.user.lastName}`,
      email: p.user.email,
      enrollmentStatus: p.enrollmentStatus,
      enrollmentDate: p.enrollmentDate,
      deviceCount: p.devices.length,
      readingCount: p._count.vitalReadings,
      alertCount: p._count.alerts,
    }));
  }

  private async getVitalSummaryData(
    organizationId: string,
    parameters?: Record<string, unknown>
  ): Promise<unknown[]> {
    const startDate = parameters?.startDate
      ? new Date(parameters.startDate as string)
      : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const readings = await prisma.vitalReading.findMany({
      where: {
        organizationId,
        recordedAt: { gte: startDate },
      },
      include: {
        patient: {
          include: { user: { select: { firstName: true, lastName: true } } },
        },
      },
      orderBy: { recordedAt: 'desc' },
      take: 1000,
    });

    return readings.map((r) => ({
      id: r.id,
      patientName: `${r.patient.user.firstName} ${r.patient.user.lastName}`,
      type: r.type,
      values: r.values,
      unit: r.unit,
      source: r.source,
      recordedAt: r.recordedAt,
    }));
  }

  private async getAlertAnalysisData(
    organizationId: string,
    parameters?: Record<string, unknown>
  ): Promise<unknown[]> {
    const startDate = parameters?.startDate
      ? new Date(parameters.startDate as string)
      : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const alerts = await prisma.alert.findMany({
      where: {
        organizationId,
        createdAt: { gte: startDate },
      },
      include: {
        patient: {
          include: { user: { select: { firstName: true, lastName: true } } },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return alerts.map((a) => ({
      id: a.id,
      patientName: `${a.patient.user.firstName} ${a.patient.user.lastName}`,
      type: a.type,
      severity: a.severity,
      status: a.status,
      message: a.message,
      createdAt: a.createdAt,
      acknowledgedAt: a.acknowledgedAt,
      resolvedAt: a.resolvedAt,
    }));
  }

  private async getBillingSummaryData(
    organizationId: string,
    parameters?: Record<string, unknown>
  ): Promise<unknown[]> {
    const startDate = parameters?.startDate
      ? new Date(parameters.startDate as string)
      : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const records = await prisma.billingRecord.findMany({
      where: {
        organizationId,
        periodStart: { gte: startDate },
      },
      include: {
        patient: {
          include: { user: { select: { firstName: true, lastName: true } } },
        },
      },
      orderBy: { periodStart: 'desc' },
    });

    return records.map((r) => ({
      id: r.id,
      patientName: `${r.patient.user.firstName} ${r.patient.user.lastName}`,
      amount: r.amount,
      status: r.status,
      periodStart: r.periodStart,
      periodEnd: r.periodEnd,
      claimSubmittedAt: r.claimSubmittedAt,
      dataTransmissionDays: r.dataTransmissionDays,
      interactionMinutes: r.interactionMinutes,
    }));
  }

  private async getDeviceUtilizationData(
    organizationId: string,
    _parameters?: Record<string, unknown>
  ): Promise<unknown[]> {
    const devices = await prisma.device.findMany({
      where: { organizationId },
      include: {
        patient: {
          include: { user: { select: { firstName: true, lastName: true } } },
        },
      },
    });

    return devices.map((d) => ({
      id: d.id,
      serialNumber: d.serialNumber,
      type: d.type,
      status: d.status,
      patientName: `${d.patient.user.firstName} ${d.patient.user.lastName}`,
      lastSyncAt: d.lastSyncAt,
      assignedAt: d.assignedAt,
    }));
  }

  // ==========================================
  // SCHEDULED REPORTS
  // ==========================================

  /**
   * Schedule a report
   */
  async scheduleReport(
    input: ScheduleReportInput,
    organizationId: string,
    userId: string
  ): Promise<ScheduledReport> {
    const template = await this.getReportTemplate(input.templateId, organizationId);
    if (!template) {
      throw new Error('Report template not found');
    }

    const scheduled = await prisma.scheduledReport.create({
      data: {
        templateId: input.templateId,
        organizationId,
        name: input.name,
        frequency: input.frequency,
        dayOfWeek: input.dayOfWeek,
        dayOfMonth: input.dayOfMonth,
        hour: input.hour || 8,
        timezone: input.timezone || 'America/New_York',
        filters: (input.filters || {}) as Prisma.InputJsonValue,
        dateRange: input.dateRange,
        deliveryMethod: input.deliveryMethod,
        recipients: input.recipients,
        format: input.format,
        isActive: true,
        createdById: userId,
      },
    });

    await auditService.log({
      action: 'report.scheduled',
      entity: 'scheduled_report',
      entityId: scheduled.id,
      organizationId,
      userId,
      newValues: { name: scheduled.name, frequency: scheduled.frequency },
    });

    return scheduled;
  }

  /**
   * Get scheduled reports
   */
  async getScheduledReports(organizationId: string): Promise<ScheduledReport[]> {
    return prisma.scheduledReport.findMany({
      where: { organizationId },
      include: { template: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  // ==========================================
  // COHORT ANALYSIS
  // ==========================================

  /**
   * Create cohort definition
   */
  async createCohort(
    organizationId: string,
    name: string,
    description: string | undefined,
    criteria: CohortCriteria,
    userId: string
  ): Promise<CohortDefinition> {
    const cohort = await prisma.cohortDefinition.create({
      data: {
        organizationId,
        name,
        description,
        criteria: criteria as unknown as Prisma.InputJsonValue,
        isActive: true,
        createdById: userId,
      },
    });

    // Calculate initial patient count
    const patientCount = await this.calculateCohortPatients(organizationId, criteria);
    await prisma.cohortDefinition.update({
      where: { id: cohort.id },
      data: { patientCount, lastCalculatedAt: new Date() },
    });

    await auditService.log({
      action: 'cohort.created',
      entity: 'cohort',
      entityId: cohort.id,
      organizationId,
      userId,
      newValues: { name: cohort.name },
    });

    return cohort;
  }

  /**
   * Calculate patients in cohort
   */
  private async calculateCohortPatients(
    organizationId: string,
    criteria: CohortCriteria
  ): Promise<number> {
    const where: Prisma.PatientWhereInput = {
      organizationId,
      deletedAt: null,
    };

    if (criteria.conditions && criteria.conditions.length > 0) {
      where.conditions = { hasSome: criteria.conditions };
    }

    return prisma.patient.count({ where });
  }

  /**
   * Get cohorts
   */
  async getCohorts(organizationId: string): Promise<CohortDefinition[]> {
    return prisma.cohortDefinition.findMany({
      where: { organizationId },
      include: { outcomes: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Record cohort outcome
   */
  async recordCohortOutcome(
    cohortId: string,
    organizationId: string,
    metricName: string,
    metricType: MetricType,
    currentValue: number,
    periodStart: Date,
    periodEnd: Date,
    targetValue?: number
  ): Promise<CohortOutcome> {
    // Get previous outcome for comparison
    const previousOutcome = await prisma.cohortOutcome.findFirst({
      where: { cohortId, metricName },
      orderBy: { periodEnd: 'desc' },
    });

    const changePercent = previousOutcome?.currentValue
      ? ((currentValue - Number(previousOutcome.currentValue)) / Number(previousOutcome.currentValue)) * 100
      : null;

    let trend: string | null = null;
    if (changePercent !== null) {
      if (changePercent > 5) trend = 'improving';
      else if (changePercent < -5) trend = 'declining';
      else trend = 'stable';
    }

    return prisma.cohortOutcome.create({
      data: {
        cohortId,
        organizationId,
        metricName,
        metricType,
        currentValue,
        previousValue: previousOutcome?.currentValue ?? null,
        targetValue,
        changePercent,
        trend,
        periodStart,
        periodEnd,
      },
    });
  }

  // ==========================================
  // POPULATION HEALTH METRICS
  // ==========================================

  /**
   * Get population metrics for dashboard
   */
  async getPopulationMetrics(organizationId: string): Promise<PopulationMetrics> {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const [totalPatients, activePatients, readingsCount, alertsCount, criticalAlertsCount] =
      await Promise.all([
        prisma.patient.count({
          where: { organizationId, deletedAt: null },
        }),
        prisma.patient.count({
          where: {
            organizationId,
            deletedAt: null,
            enrollmentStatus: 'ACTIVE',
          },
        }),
        prisma.vitalReading.count({
          where: { organizationId, recordedAt: { gte: thirtyDaysAgo } },
        }),
        prisma.alert.count({
          where: { organizationId, createdAt: { gte: thirtyDaysAgo } },
        }),
        prisma.alert.count({
          where: {
            organizationId,
            createdAt: { gte: thirtyDaysAgo },
            severity: 'CRITICAL',
          },
        }),
      ]);

    const avgReadingsPerDay = readingsCount / 30;
    const alertRate = totalPatients > 0 ? (alertsCount / totalPatients) * 100 : 0;
    const criticalAlertRate = totalPatients > 0 ? (criticalAlertsCount / totalPatients) * 100 : 0;

    return {
      totalPatients,
      activePatients,
      avgReadingsPerDay: Math.round(avgReadingsPerDay * 100) / 100,
      alertRate: Math.round(alertRate * 100) / 100,
      criticalAlertRate: Math.round(criticalAlertRate * 100) / 100,
    };
  }

  /**
   * Record population health metric
   */
  async recordPopulationMetric(
    organizationId: string,
    metricCode: string,
    metricName: string,
    category: string,
    numerator: number,
    denominator: number,
    periodType: string,
    periodStart: Date,
    periodEnd: Date,
    targetRate?: number,
    nationalBenchmark?: number
  ): Promise<PopulationHealthMetric> {
    const rate = denominator > 0 ? (numerator / denominator) * 100 : 0;

    return prisma.populationHealthMetric.upsert({
      where: {
        organizationId_metricCode_periodStart: {
          organizationId,
          metricCode,
          periodStart,
        },
      },
      create: {
        organizationId,
        metricCode,
        metricName,
        category,
        numerator,
        denominator,
        rate,
        targetRate,
        nationalBenchmark,
        periodType,
        periodStart,
        periodEnd,
      },
      update: {
        numerator,
        denominator,
        rate,
        targetRate,
        nationalBenchmark,
        calculatedAt: new Date(),
      },
    });
  }

  /**
   * Get population health metrics
   */
  async getPopulationHealthMetrics(
    organizationId: string,
    options?: { category?: string; periodType?: string }
  ): Promise<PopulationHealthMetric[]> {
    const where: Prisma.PopulationHealthMetricWhereInput = { organizationId };

    if (options?.category) {
      where.category = options.category;
    }
    if (options?.periodType) {
      where.periodType = options.periodType;
    }

    return prisma.populationHealthMetric.findMany({
      where,
      orderBy: [{ category: 'asc' }, { periodStart: 'desc' }],
    });
  }

  /**
   * Get report executions
   */
  async getReportExecutions(
    organizationId: string,
    options?: { templateId?: string; status?: ExecutionStatus; limit?: number }
  ): Promise<ReportExecution[]> {
    const where: Prisma.ReportExecutionWhereInput = { organizationId };

    if (options?.templateId) {
      where.templateId = options.templateId;
    }
    if (options?.status) {
      where.status = options.status;
    }

    return prisma.reportExecution.findMany({
      where,
      orderBy: { startedAt: 'desc' },
      take: options?.limit || 50,
    });
  }
}

export const analyticsService = new AnalyticsService();
