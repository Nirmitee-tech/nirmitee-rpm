/**
 * Analytics & Reporting Routes
 * Population health, cohort analysis, and report generation
 */

import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { analyticsService } from '../../services/analytics-service';
import {
  ReportType,
  ChartType,
  ReportFrequency,
  ExportFormat,
  DeliveryMethod,
  MetricType,
} from '@prisma/client';
import { prisma } from '../../utils/prisma';

const router = Router();

// ==========================================
// REPORT TEMPLATES
// ==========================================

const createTemplateSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  reportType: z.nativeEnum(ReportType),
  category: z.string().optional(),
  dataSource: z.string(),
  filters: z.record(z.unknown()).optional(),
  columns: z.record(z.unknown()),
  groupBy: z.array(z.string()).optional(),
  sortBy: z.record(z.unknown()).optional(),
  chartType: z.nativeEnum(ChartType).optional(),
  chartConfig: z.record(z.unknown()).optional(),
});

router.post('/templates', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = createTemplateSchema.parse(req.body);
    const template = await analyticsService.createReportTemplate(
      { ...data, organizationId: req.user!.organizationId! },
      req.user!.userId
    );
    res.status(201).json(template);
  } catch (error) {
    next(error);
  }
});

router.get('/templates', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { reportType, category } = req.query;
    const templates = await analyticsService.getReportTemplates(
      req.user!.organizationId!,
      {
        reportType: reportType as ReportType | undefined,
        category: category as string | undefined,
      }
    );
    res.json(templates);
  } catch (error) {
    next(error);
  }
});

router.get('/templates/:templateId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const template = await analyticsService.getReportTemplate(
      req.params.templateId,
      req.user!.organizationId!
    );
    if (!template) {
      return res.status(404).json({ error: 'Template not found' });
    }
    res.json(template);
  } catch (error) {
    next(error);
  }
});

// ==========================================
// REPORT EXECUTION
// ==========================================

router.post('/templates/:templateId/execute', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { parameters } = req.body;
    const execution = await analyticsService.executeReport(
      req.params.templateId,
      req.user!.organizationId!,
      parameters as Record<string, unknown> | undefined,
      req.user!.userId
    );
    res.json(execution);
  } catch (error) {
    next(error);
  }
});

router.get('/executions', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { templateId, status, limit } = req.query;
    const executions = await analyticsService.getReportExecutions(
      req.user!.organizationId!,
      {
        templateId: templateId as string | undefined,
        status: status as import('@prisma/client').ExecutionStatus | undefined,
        limit: limit ? parseInt(limit as string, 10) : undefined,
      }
    );
    res.json(executions);
  } catch (error) {
    next(error);
  }
});

// ==========================================
// SCHEDULED REPORTS
// ==========================================

const scheduleReportSchema = z.object({
  templateId: z.string(),
  name: z.string().min(1),
  frequency: z.nativeEnum(ReportFrequency),
  dayOfWeek: z.number().min(0).max(6).optional(),
  dayOfMonth: z.number().min(1).max(31).optional(),
  hour: z.number().min(0).max(23).optional(),
  timezone: z.string().optional(),
  filters: z.record(z.unknown()).optional(),
  dateRange: z.string().optional(),
  deliveryMethod: z.array(z.nativeEnum(DeliveryMethod)),
  format: z.nativeEnum(ExportFormat),
  recipients: z.array(z.string().email()),
});

router.post('/scheduled', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = scheduleReportSchema.parse(req.body);
    const scheduled = await analyticsService.scheduleReport(
      data,
      req.user!.organizationId!,
      req.user!.userId
    );
    res.status(201).json(scheduled);
  } catch (error) {
    next(error);
  }
});

router.get('/scheduled', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const scheduled = await analyticsService.getScheduledReports(
      req.user!.organizationId!
    );
    res.json(scheduled);
  } catch (error) {
    next(error);
  }
});

// ==========================================
// COHORT ANALYSIS
// ==========================================

const createCohortSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  criteria: z.object({
    conditions: z.array(z.string()).optional(),
    ageRange: z.object({
      min: z.number().optional(),
      max: z.number().optional(),
    }).optional(),
    enrolledAfter: z.string().transform((s) => new Date(s)).optional(),
    enrolledBefore: z.string().transform((s) => new Date(s)).optional(),
    minReadings: z.number().optional(),
    vitalTypes: z.array(z.string()).optional(),
    riskLevel: z.string().optional(),
  }),
});

router.post('/cohorts', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = createCohortSchema.parse(req.body);
    const cohort = await analyticsService.createCohort(
      req.user!.organizationId!,
      data.name,
      data.description,
      data.criteria,
      req.user!.userId
    );
    res.status(201).json(cohort);
  } catch (error) {
    next(error);
  }
});

router.get('/cohorts', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const cohorts = await analyticsService.getCohorts(req.user!.organizationId!);
    res.json(cohorts);
  } catch (error) {
    next(error);
  }
});

const recordCohortOutcomeSchema = z.object({
  metricName: z.string(),
  metricType: z.nativeEnum(MetricType),
  currentValue: z.number(),
  periodStart: z.string().transform((s) => new Date(s)),
  periodEnd: z.string().transform((s) => new Date(s)),
  targetValue: z.number().optional(),
});

router.post('/cohorts/:cohortId/outcomes', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = recordCohortOutcomeSchema.parse(req.body);
    const outcome = await analyticsService.recordCohortOutcome(
      req.params.cohortId,
      req.user!.organizationId!,
      data.metricName,
      data.metricType,
      data.currentValue,
      data.periodStart,
      data.periodEnd,
      data.targetValue
    );
    res.status(201).json(outcome);
  } catch (error) {
    next(error);
  }
});

router.get('/cohorts/:cohortId/outcomes', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { metricName } = req.query;
    const outcomes = await prisma.cohortOutcome.findMany({
      where: {
        cohortId: req.params.cohortId,
        organizationId: req.user!.organizationId!,
        ...(metricName && { metricName: metricName as string }),
      },
      orderBy: { periodEnd: 'desc' },
    });
    res.json(outcomes);
  } catch (error) {
    next(error);
  }
});

// ==========================================
// POPULATION HEALTH
// ==========================================

router.get('/population/metrics', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const metrics = await analyticsService.getPopulationMetrics(
      req.user!.organizationId!
    );
    res.json(metrics);
  } catch (error) {
    next(error);
  }
});

const recordPopulationMetricSchema = z.object({
  metricCode: z.string(),
  metricName: z.string(),
  category: z.string(),
  numerator: z.number(),
  denominator: z.number(),
  periodType: z.string(),
  periodStart: z.string().transform((s) => new Date(s)),
  periodEnd: z.string().transform((s) => new Date(s)),
  targetRate: z.number().optional(),
  nationalBenchmark: z.number().optional(),
});

router.post('/population/metrics', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = recordPopulationMetricSchema.parse(req.body);
    const metric = await analyticsService.recordPopulationMetric(
      req.user!.organizationId!,
      data.metricCode,
      data.metricName,
      data.category,
      data.numerator,
      data.denominator,
      data.periodType,
      data.periodStart,
      data.periodEnd,
      data.targetRate,
      data.nationalBenchmark
    );
    res.status(201).json(metric);
  } catch (error) {
    next(error);
  }
});

router.get('/population/health-metrics', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { category, periodType } = req.query;
    const metrics = await analyticsService.getPopulationHealthMetrics(
      req.user!.organizationId!,
      {
        category: category as string | undefined,
        periodType: periodType as string | undefined,
      }
    );
    res.json(metrics);
  } catch (error) {
    next(error);
  }
});

export default router;
