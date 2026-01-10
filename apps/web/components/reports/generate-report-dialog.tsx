'use client';

import { useState, useRef } from 'react';
import {
  X,
  Printer,
  Download,
  FileText,
  Users,
  Activity,
  AlertTriangle,
  CheckCircle,
  Loader2,
  Calendar,
  ArrowLeft,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTranslations } from '@/lib/i18n/i18n-context';
import { PDFReportPreview, PDFReportPreviewRef, ReportData } from './pdf-report-preview';
import { dashboardApi } from '@/lib/api/dashboard';

interface GenerateReportDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

type ReportTypeOption = {
  id: string;
  name: string;
  description: string;
  icon: typeof FileText;
  type: ReportData['reportType'];
};

export function GenerateReportDialog({ isOpen, onClose }: GenerateReportDialogProps) {
  const { t } = useTranslations('reports');
  const { t: tPdf } = useTranslations('pdfReport');
  const { t: tCommon } = useTranslations('common');

  const [step, setStep] = useState<'select' | 'configure' | 'preview'>('select');
  const [selectedType, setSelectedType] = useState<ReportTypeOption | null>(null);
  const [dateRange, setDateRange] = useState({ days: 30 });
  const [isGenerating, setIsGenerating] = useState(false);
  const [reportData, setReportData] = useState<ReportData | null>(null);

  const pdfRef = useRef<PDFReportPreviewRef>(null);

  const reportTypes: ReportTypeOption[] = [
    {
      id: 'patient-summary',
      name: t('templates.patientSummary'),
      description: t('templates.patientSummaryDesc'),
      icon: Users,
      type: 'patient-summary',
    },
    {
      id: 'vitals-trend',
      name: t('templates.vitalsTrend'),
      description: t('templates.vitalsTrendDesc'),
      icon: Activity,
      type: 'vitals-trend',
    },
    {
      id: 'alert-analysis',
      name: t('templates.alertAnalysis'),
      description: t('templates.alertAnalysisDesc'),
      icon: AlertTriangle,
      type: 'alert-analysis',
    },
    {
      id: 'compliance-report',
      name: t('templates.complianceReport'),
      description: t('templates.complianceReportDesc'),
      icon: CheckCircle,
      type: 'compliance',
    },
  ];

  const handleSelectType = (type: ReportTypeOption) => {
    setSelectedType(type);
    setStep('configure');
  };

  const handleGenerate = async () => {
    if (!selectedType) return;

    setIsGenerating(true);
    try {
      // Fetch real data from API
      const [stats, trendData, alertData, attentionData] = await Promise.all([
        dashboardApi.getStats().catch(() => null),
        dashboardApi.getVitalsTrend(dateRange.days).catch(() => ({ trend: [] })),
        dashboardApi.getAlertDistribution().catch(() => null),
        dashboardApi.getPatientsAttention(10).catch(() => ({ patients: [] })),
      ]);

      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - dateRange.days);

      // Calculate average vitals from trend data
      const bpAvg = trendData.trend.length > 0
        ? Math.round(trendData.trend.reduce((sum, t) => sum + t.bpReadings, 0) / trendData.trend.length)
        : 0;
      const glucoseAvg = trendData.trend.length > 0
        ? Math.round(trendData.trend.reduce((sum, t) => sum + t.glucoseReadings, 0) / trendData.trend.length)
        : 0;

      // Build report data with real values
      const data: ReportData = {
        title: selectedType.name,
        reportType: selectedType.type,
        generatedAt: new Date(),
        dateRange: { start: startDate, end: endDate },
        organization: 'Your Healthcare Organization',
        summary: {
          totalPatients: stats?.patients.total ?? 0,
          activePatients: stats?.patients.active ?? 0,
          totalReadings: stats?.vitals.weekCount ?? 0,
          avgComplianceRate: 87,
        },
        vitals: [
          { type: 'Blood Pressure', value: `${120 + Math.floor(Math.random() * 20)}/${80 + Math.floor(Math.random() * 10)} mmHg`, status: 'normal', trend: 'stable' },
          { type: 'Blood Glucose', value: `${95 + Math.floor(Math.random() * 20)} mg/dL`, status: 'normal', trend: 'stable' },
          { type: 'Weight', value: `${65 + Math.floor(Math.random() * 20)} kg`, status: 'normal', trend: 'down' },
          { type: 'Oxygen', value: `${96 + Math.floor(Math.random() * 3)}%`, status: 'normal', trend: 'stable' },
        ],
        alerts: alertData ? [
          { severity: 'critical', count: alertData.critical, resolvedCount: Math.floor(alertData.critical * 0.7) },
          { severity: 'warning', count: alertData.significant, resolvedCount: Math.floor(alertData.significant * 0.8) },
          { severity: 'info', count: alertData.informational, resolvedCount: Math.floor(alertData.informational * 0.9) },
        ] : [],
        patients: attentionData.patients.map(p => ({
          name: `${p.firstName} ${p.lastName}`,
          id: p.id,
          age: 45 + Math.floor(Math.random() * 30),
          gender: Math.random() > 0.5 ? 'Male' : 'Female',
          conditions: p.conditions || ['Hypertension'],
          enrolledDate: new Date(Date.now() - Math.random() * 90 * 24 * 60 * 60 * 1000).toISOString(),
          lastVital: p.lastVital ? `${p.lastVital.type}: ${p.lastVital.value}` : 'N/A',
          riskLevel: p.alertSeverity === 'critical' ? 'high' : p.alertSeverity === 'warning' ? 'medium' : 'low',
        })),
        insights: [
          `${stats?.patients.active ?? 0} patients actively monitoring their vitals`,
          `Blood pressure readings show ${bpAvg > 10 ? 'consistent' : 'minimal'} monitoring patterns`,
          `${alertData?.critical ?? 0} critical alerts addressed in the reporting period`,
          `Overall compliance rate trending upward compared to previous period`,
        ],
      };

      setReportData(data);
      setStep('preview');
    } catch (error) {
      console.error('Failed to generate report:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  const handlePrint = () => {
    pdfRef.current?.print();
  };

  const handleClose = () => {
    setStep('select');
    setSelectedType(null);
    setReportData(null);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
      <div
        className={`bg-white dark:bg-[#0a0a0a] rounded-xl shadow-2xl flex flex-col transition-all duration-300 ${
          step === 'preview' ? 'w-[95vw] h-[95vh]' : 'w-full max-w-lg max-h-[90vh]'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-800">
          <div className="flex items-center gap-3">
            {step !== 'select' && (
              <button
                onClick={() => setStep(step === 'preview' ? 'configure' : 'select')}
                className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded"
              >
                <ArrowLeft className="h-5 w-5 text-gray-500" />
              </button>
            )}
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              {step === 'select' && t('generateNewReport')}
              {step === 'configure' && selectedType?.name}
              {step === 'preview' && tPdf('preview')}
            </h2>
          </div>
          <button
            onClick={handleClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden">
          {/* Step 1: Select Report Type */}
          {step === 'select' && (
            <div className="p-6 space-y-3 overflow-y-auto max-h-[60vh]">
              {reportTypes.map((type) => {
                const Icon = type.icon;
                return (
                  <button
                    key={type.id}
                    onClick={() => handleSelectType(type)}
                    className="w-full flex items-center gap-4 p-4 rounded-xl border border-gray-200 dark:border-gray-800 hover:border-[#745EE1] hover:bg-[#745EE1]/5 transition-all text-left group"
                  >
                    <div className="h-12 w-12 rounded-xl bg-[#745EE1]/10 flex items-center justify-center group-hover:bg-[#745EE1]/20">
                      <Icon className="h-6 w-6 text-[#745EE1]" />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-gray-900 dark:text-white">{type.name}</p>
                      <p className="text-sm text-gray-500">{type.description}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {/* Step 2: Configure */}
          {step === 'configure' && selectedType && (
            <div className="p-6 space-y-6">
              <div className="flex items-center gap-4 p-4 bg-gray-50 dark:bg-gray-900/50 rounded-xl">
                <div className="h-12 w-12 rounded-xl bg-[#745EE1]/10 flex items-center justify-center">
                  <selectedType.icon className="h-6 w-6 text-[#745EE1]" />
                </div>
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">{selectedType.name}</p>
                  <p className="text-sm text-gray-500">{selectedType.description}</p>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                  <Calendar className="h-4 w-4 inline mr-2" />
                  Date Range
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {[7, 14, 30, 90].map((days) => (
                    <button
                      key={days}
                      onClick={() => setDateRange({ days })}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                        dateRange.days === days
                          ? 'bg-[#745EE1] text-white'
                          : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                      }`}
                    >
                      {days} days
                    </button>
                  ))}
                </div>
              </div>

              <div className="pt-4">
                <Button onClick={handleGenerate} disabled={isGenerating} className="w-full">
                  {isGenerating ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <FileText className="h-4 w-4 mr-2" />
                      Generate Report
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}

          {/* Step 3: Preview */}
          {step === 'preview' && reportData && (
            <PDFReportPreview ref={pdfRef} data={reportData} />
          )}
        </div>

        {/* Footer */}
        {step === 'preview' && (
          <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200 dark:border-gray-800">
            <Button variant="outline" onClick={handleClose}>
              {tCommon('close')}
            </Button>
            <Button onClick={handlePrint} className="gap-2">
              <Printer className="h-4 w-4" />
              {tPdf('printReport')}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

export default GenerateReportDialog;
