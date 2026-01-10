import { api } from './client';

// Type definitions (matching Prisma enums)
export type ReportType = 'PATIENT_SUMMARY' | 'VITALS_TREND' | 'ALERT_ANALYSIS' | 'COMPLIANCE' | 'CUSTOM';
export type ChartType = 'LINE' | 'BAR' | 'PIE' | 'AREA' | 'TABLE';
export type ReportFrequency = 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'QUARTERLY';
export type ExportFormat = 'PDF' | 'CSV' | 'EXCEL' | 'JSON';
export type DeliveryMethod = 'EMAIL' | 'DOWNLOAD' | 'DASHBOARD';
export type ExecutionStatus = 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED';

// Report Template types
export interface ReportTemplate {
  id: string;
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
  organizationId: string;
  createdById: string;
  createdAt: string;
  updatedAt: string;
}

export interface ReportExecution {
  id: string;
  templateId: string;
  template?: ReportTemplate;
  parameters?: Record<string, unknown>;
  status: ExecutionStatus;
  resultUrl?: string;
  errorMessage?: string;
  executionTime?: number;
  rowCount?: number;
  triggeredBy: string;
  organizationId: string;
  startedAt: string;
  completedAt?: string;
}

export interface ScheduledReport {
  id: string;
  templateId: string;
  template?: ReportTemplate;
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
  isActive: boolean;
  organizationId: string;
  lastRunAt?: string;
  nextRunAt?: string;
}

export interface CohortDefinition {
  id: string;
  name: string;
  description?: string;
  criteria: {
    conditions?: string[];
    ageRange?: { min?: number; max?: number };
    enrolledAfter?: string;
    enrolledBefore?: string;
    minReadings?: number;
    vitalTypes?: string[];
    riskLevel?: string;
  };
  patientCount: number;
  organizationId: string;
  createdAt: string;
}

export interface PopulationMetric {
  id: string;
  metricCode: string;
  metricName: string;
  category: string;
  numerator: number;
  denominator: number;
  rate: number;
  periodType: string;
  periodStart: string;
  periodEnd: string;
  targetRate?: number;
  nationalBenchmark?: number;
  organizationId: string;
}

export interface CreateTemplateInput {
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

export interface ScheduleReportInput {
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

export const analyticsApi = {
  // Report Templates
  createTemplate: (data: CreateTemplateInput) =>
    api.post<ReportTemplate>('/api/analytics/templates', data),

  getTemplates: (reportType?: string, category?: string) =>
    api.get<ReportTemplate[]>(`/api/analytics/templates?${new URLSearchParams({
      ...(reportType && { reportType }),
      ...(category && { category }),
    }).toString()}`),

  getTemplate: (templateId: string) =>
    api.get<ReportTemplate>(`/api/analytics/templates/${templateId}`),

  // Report Execution
  executeReport: (templateId: string, parameters?: Record<string, unknown>) =>
    api.post<ReportExecution>(`/api/analytics/templates/${templateId}/execute`, { parameters }),

  getExecutions: (options?: { templateId?: string; status?: string; limit?: number }) =>
    api.get<ReportExecution[]>(`/api/analytics/executions?${new URLSearchParams({
      ...(options?.templateId && { templateId: options.templateId }),
      ...(options?.status && { status: options.status }),
      ...(options?.limit && { limit: options.limit.toString() }),
    }).toString()}`),

  // Scheduled Reports
  scheduleReport: (data: ScheduleReportInput) =>
    api.post<ScheduledReport>('/api/analytics/scheduled', data),

  getScheduledReports: () =>
    api.get<ScheduledReport[]>('/api/analytics/scheduled'),

  // Cohorts
  createCohort: (name: string, description: string | undefined, criteria: CohortDefinition['criteria']) =>
    api.post<CohortDefinition>('/api/analytics/cohorts', { name, description, criteria }),

  getCohorts: () =>
    api.get<CohortDefinition[]>('/api/analytics/cohorts'),

  // Population Metrics
  getPopulationMetrics: () =>
    api.get<PopulationMetric[]>('/api/analytics/population/metrics'),

  getPopulationHealthMetrics: (category?: string, periodType?: string) =>
    api.get<PopulationMetric[]>(`/api/analytics/population/health-metrics?${new URLSearchParams({
      ...(category && { category }),
      ...(periodType && { periodType }),
    }).toString()}`),
};
