'use client';

import { useState, useEffect } from 'react';
import {
  FileText,
  Download,
  Calendar,
  Filter,
  Plus,
  RefreshCw,
  Clock,
  CheckCircle,
  XCircle,
  Loader2,
  TrendingUp,
  Users,
  Activity,
  AlertTriangle,
  ChevronRight,
  Play,
  Eye,
} from 'lucide-react';
import { Button, Badge } from '@nirmitee/ui';
import { useTranslations } from '@/lib/i18n/i18n-context';
import {
  analyticsApi,
  ReportTemplate,
  ReportExecution,
  ScheduledReport,
  PopulationMetric,
} from '@/lib/api/analytics';
import { GenerateReportDialog } from '@/components/reports/generate-report-dialog';

type ReportTab = 'templates' | 'executions' | 'scheduled' | 'metrics';

export default function ReportsPage() {
  const { t } = useTranslations('reports');
  const { t: tCommon } = useTranslations('common');

  const [activeTab, setActiveTab] = useState<ReportTab>('templates');
  const [templates, setTemplates] = useState<ReportTemplate[]>([]);
  const [executions, setExecutions] = useState<ReportExecution[]>([]);
  const [scheduledReports, setScheduledReports] = useState<ScheduledReport[]>([]);
  const [populationMetrics, setPopulationMetrics] = useState<PopulationMetric[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [executingTemplate, setExecutingTemplate] = useState<string | null>(null);
  const [showGenerateModal, setShowGenerateModal] = useState(false);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [templatesData, executionsData, scheduledData, metricsData] = await Promise.all([
        analyticsApi.getTemplates().catch(() => []),
        analyticsApi.getExecutions({ limit: 20 }).catch(() => []),
        analyticsApi.getScheduledReports().catch(() => []),
        analyticsApi.getPopulationMetrics().catch(() => []),
      ]);

      setTemplates(templatesData);
      setExecutions(executionsData);
      setScheduledReports(scheduledData);
      setPopulationMetrics(metricsData);
    } catch (error) {
      console.error('Failed to fetch reports data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleExecuteReport = async (templateId: string) => {
    setExecutingTemplate(templateId);
    try {
      await analyticsApi.executeReport(templateId);
      // Refresh executions after running
      const newExecutions = await analyticsApi.getExecutions({ limit: 20 });
      setExecutions(newExecutions);
      setActiveTab('executions');
    } catch (error) {
      console.error('Failed to execute report:', error);
    } finally {
      setExecutingTemplate(null);
    }
  };

  const statusConfig = {
    PENDING: { color: 'warning', icon: Clock },
    RUNNING: { color: 'info', icon: Loader2 },
    COMPLETED: { color: 'success', icon: CheckCircle },
    FAILED: { color: 'danger', icon: XCircle },
  } as const;

  const reportTypeIcons = {
    PATIENT_SUMMARY: Users,
    VITALS_TREND: Activity,
    ALERT_ANALYSIS: AlertTriangle,
    COMPLIANCE: CheckCircle,
    CUSTOM: FileText,
  };

  // Default templates if none from API
  const defaultTemplates: ReportTemplate[] = [
    {
      id: 'patient-summary',
      name: t('templates.patientSummary'),
      description: t('templates.patientSummaryDesc'),
      reportType: 'PATIENT_SUMMARY',
      category: 'Clinical',
      dataSource: 'patients',
      columns: {},
      organizationId: '',
      createdById: '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: 'vitals-trend',
      name: t('templates.vitalsTrend'),
      description: t('templates.vitalsTrendDesc'),
      reportType: 'VITALS_TREND',
      category: 'Clinical',
      dataSource: 'vitals',
      columns: {},
      organizationId: '',
      createdById: '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: 'alert-analysis',
      name: t('templates.alertAnalysis'),
      description: t('templates.alertAnalysisDesc'),
      reportType: 'ALERT_ANALYSIS',
      category: 'Operations',
      dataSource: 'alerts',
      columns: {},
      organizationId: '',
      createdById: '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: 'compliance-report',
      name: t('templates.complianceReport'),
      description: t('templates.complianceReportDesc'),
      reportType: 'COMPLIANCE',
      category: 'Regulatory',
      dataSource: 'compliance',
      columns: {},
      organizationId: '',
      createdById: '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ];

  const displayTemplates = templates.length > 0 ? templates : defaultTemplates;

  const tabs = [
    { id: 'templates' as const, label: t('tabs.templates'), count: displayTemplates.length },
    { id: 'executions' as const, label: t('tabs.history'), count: executions.length },
    { id: 'scheduled' as const, label: t('tabs.scheduled'), count: scheduledReports.length },
    { id: 'metrics' as const, label: t('tabs.metrics'), count: populationMetrics.length },
  ];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-[#171717] dark:text-white">{t('title')}</h1>
          <p className="text-[#737373] mt-1">{t('subtitle')}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={fetchData} disabled={isLoading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            {tCommon('refresh')}
          </Button>
          <Button onClick={() => setShowGenerateModal(true)}>
            <Plus className="h-4 w-4 mr-2" />
            {t('generateReport')}
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-[#E5E5E5] dark:border-[#212121]">
        <div className="flex gap-6">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`pb-3 text-sm font-medium transition-colors relative ${
                activeTab === tab.id
                  ? 'text-[#745EE1] border-b-2 border-[#745EE1]'
                  : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              {tab.label}
              {tab.count > 0 && (
                <span className="ml-2 px-1.5 py-0.5 text-xs rounded-full bg-gray-100 dark:bg-gray-800">
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-[#745EE1]" />
        </div>
      ) : (
        <>
          {/* Templates Tab */}
          {activeTab === 'templates' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {displayTemplates.map((template) => {
                const Icon = reportTypeIcons[template.reportType as keyof typeof reportTypeIcons] || FileText;
                return (
                  <div
                    key={template.id}
                    className="bg-white dark:bg-[#0a0a0a] border border-[#E5E5E5] dark:border-[#212121] rounded-xl p-5 hover:border-[#745EE1]/50 transition-colors"
                  >
                    <div className="flex items-start gap-4">
                      <div className="h-12 w-12 rounded-xl bg-[#745EE1]/10 flex items-center justify-center flex-shrink-0">
                        <Icon className="h-6 w-6 text-[#745EE1]" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-base font-semibold text-[#171717] dark:text-white truncate">
                          {template.name}
                        </h3>
                        <p className="text-sm text-gray-500 mt-1 line-clamp-2">
                          {template.description || t('templates.noDescription')}
                        </p>
                        <div className="flex items-center gap-2 mt-3">
                          <Badge variant="gray" className="text-xs">
                            {template.category || t('templates.general')}
                          </Badge>
                          <Badge variant="gray" className="text-xs">
                            {template.reportType}
                          </Badge>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 mt-4 pt-4 border-t border-gray-100 dark:border-gray-800">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        onClick={() => handleExecuteReport(template.id)}
                        disabled={executingTemplate === template.id}
                      >
                        {executingTemplate === template.id ? (
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                          <Play className="h-4 w-4 mr-2" />
                        )}
                        {t('runReport')}
                      </Button>
                      <Button variant="ghost" size="sm">
                        <Eye className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Executions Tab */}
          {activeTab === 'executions' && (
            <div className="bg-white dark:bg-[#0a0a0a] border border-[#E5E5E5] dark:border-[#212121] rounded-xl overflow-hidden">
              {executions.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-[#E5E5E5] dark:border-[#212121] bg-gray-50 dark:bg-gray-900/50">
                        <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">
                          {t('table.reportName')}
                        </th>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">
                          {t('table.status')}
                        </th>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">
                          {t('table.startedAt')}
                        </th>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">
                          {t('table.duration')}
                        </th>
                        <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase">
                          {t('table.actions')}
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {executions.map((execution) => {
                        const config = statusConfig[execution.status as keyof typeof statusConfig];
                        const StatusIcon = config?.icon || Clock;
                        return (
                          <tr
                            key={execution.id}
                            className="border-b border-[#E5E5E5] dark:border-[#212121] last:border-0 hover:bg-gray-50 dark:hover:bg-gray-900/30"
                          >
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-3">
                                <FileText className="h-5 w-5 text-[#745EE1]" />
                                <span className="text-sm font-medium text-[#171717] dark:text-white">
                                  {execution.template?.name || t('table.unknownTemplate')}
                                </span>
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <Badge
                                variant={config?.color as 'success' | 'warning' | 'danger' | 'info'}
                                className="gap-1"
                              >
                                <StatusIcon className={`h-3 w-3 ${execution.status === 'RUNNING' ? 'animate-spin' : ''}`} />
                                {t(`status.${execution.status.toLowerCase()}`)}
                              </Badge>
                            </td>
                            <td className="px-4 py-3">
                              <span className="text-sm text-gray-500">
                                {new Date(execution.startedAt).toLocaleString()}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              <span className="text-sm text-gray-500">
                                {execution.executionTime ? `${execution.executionTime}ms` : '-'}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-right">
                              <Button
                                variant="ghost"
                                size="sm"
                                disabled={execution.status !== 'COMPLETED'}
                              >
                                <Download className="h-4 w-4 mr-1" />
                                {tCommon('download')}
                              </Button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-gray-400">
                  <FileText className="h-12 w-12 mb-3 opacity-50" />
                  <p className="text-sm">{t('noExecutions')}</p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-4"
                    onClick={() => setActiveTab('templates')}
                  >
                    {t('runFirstReport')}
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* Scheduled Tab */}
          {activeTab === 'scheduled' && (
            <div className="bg-white dark:bg-[#0a0a0a] border border-[#E5E5E5] dark:border-[#212121] rounded-xl">
              {scheduledReports.length > 0 ? (
                <div className="divide-y divide-[#E5E5E5] dark:divide-[#212121]">
                  {scheduledReports.map((scheduled) => (
                    <div key={scheduled.id} className="p-4 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-lg bg-[#745EE1]/10 flex items-center justify-center">
                          <Calendar className="h-5 w-5 text-[#745EE1]" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-[#171717] dark:text-white">
                            {scheduled.name}
                          </p>
                          <p className="text-xs text-gray-500">
                            {scheduled.frequency} • {t('nextRun')}: {scheduled.nextRunAt ? new Date(scheduled.nextRunAt).toLocaleDateString() : '-'}
                          </p>
                        </div>
                      </div>
                      <Badge variant={scheduled.isActive ? 'success' : 'gray'}>
                        {scheduled.isActive ? t('active') : t('paused')}
                      </Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-gray-400">
                  <Calendar className="h-12 w-12 mb-3 opacity-50" />
                  <p className="text-sm">{t('noScheduledReports')}</p>
                  <Button variant="outline" size="sm" className="mt-4">
                    {t('scheduleReport')}
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* Metrics Tab */}
          {activeTab === 'metrics' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {populationMetrics.length > 0 ? (
                populationMetrics.map((metric) => {
                  const isAboveTarget = metric.targetRate ? metric.rate >= metric.targetRate : true;
                  return (
                    <div
                      key={metric.id}
                      className="bg-white dark:bg-[#0a0a0a] border border-[#E5E5E5] dark:border-[#212121] rounded-xl p-5"
                    >
                      <div className="flex items-center justify-between mb-3">
                        <Badge variant="gray" className="text-xs">
                          {metric.category}
                        </Badge>
                        {metric.targetRate && (
                          <span className={`text-xs ${isAboveTarget ? 'text-green-500' : 'text-red-500'}`}>
                            {isAboveTarget ? '↑' : '↓'} {t('target')}: {metric.targetRate}%
                          </span>
                        )}
                      </div>
                      <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400">
                        {metric.metricName}
                      </h3>
                      <div className="flex items-end gap-2 mt-2">
                        <span className="text-3xl font-bold text-[#171717] dark:text-white">
                          {metric.rate.toFixed(1)}%
                        </span>
                        <span className="text-sm text-gray-500 mb-1">
                          ({metric.numerator}/{metric.denominator})
                        </span>
                      </div>
                      {metric.nationalBenchmark && (
                        <p className="text-xs text-gray-400 mt-2">
                          {t('nationalBenchmark')}: {metric.nationalBenchmark}%
                        </p>
                      )}
                    </div>
                  );
                })
              ) : (
                <div className="col-span-full flex flex-col items-center justify-center py-12 text-gray-400">
                  <TrendingUp className="h-12 w-12 mb-3 opacity-50" />
                  <p className="text-sm">{t('noMetrics')}</p>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* Generate Report Dialog */}
      <GenerateReportDialog
        isOpen={showGenerateModal}
        onClose={() => setShowGenerateModal(false)}
      />
    </div>
  );
}
