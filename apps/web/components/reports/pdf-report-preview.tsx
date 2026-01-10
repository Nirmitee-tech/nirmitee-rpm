'use client';

import { forwardRef, useRef, useImperativeHandle } from 'react';
import {
  Activity,
  Users,
  Heart,
  AlertTriangle,
  TrendingUp,
  Calendar,
  CheckCircle,
  Clock,
  Droplet,
  Scale,
} from 'lucide-react';
import { useTranslations } from '@/lib/i18n/i18n-context';

interface PatientSummary {
  name: string;
  id: string;
  age: number;
  gender: string;
  conditions: string[];
  enrolledDate: string;
  lastVital: string;
  riskLevel: 'low' | 'medium' | 'high';
}

interface VitalStat {
  type: string;
  value: string;
  status: 'normal' | 'warning' | 'critical';
  trend: 'up' | 'down' | 'stable';
}

interface AlertStat {
  severity: 'critical' | 'warning' | 'info';
  count: number;
  resolvedCount: number;
}

export interface ReportData {
  title: string;
  reportType: 'patient-summary' | 'vitals-trend' | 'alert-analysis' | 'compliance';
  generatedAt: Date;
  dateRange: { start: Date; end: Date };
  organization: string;
  summary: {
    totalPatients: number;
    activePatients: number;
    totalReadings: number;
    avgComplianceRate: number;
  };
  patients?: PatientSummary[];
  vitals?: VitalStat[];
  alerts?: AlertStat[];
  insights?: string[];
}

export interface PDFReportPreviewRef {
  print: () => void;
}

interface PDFReportPreviewProps {
  data: ReportData;
}

export const PDFReportPreview = forwardRef<PDFReportPreviewRef, PDFReportPreviewProps>(
  ({ data }, ref) => {
    const { t } = useTranslations('pdfReport');
    const printRef = useRef<HTMLDivElement>(null);

    useImperativeHandle(ref, () => ({
      print: () => {
        if (printRef.current) {
          const printWindow = window.open('', '_blank');
          if (printWindow) {
            printWindow.document.write(`
              <!DOCTYPE html>
              <html>
              <head>
                <title>${data.title}</title>
                <style>
                  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');

                  * {
                    margin: 0;
                    padding: 0;
                    box-sizing: border-box;
                  }

                  body {
                    font-family: 'Inter', sans-serif;
                    background: #f8fafc;
                    color: #1e293b;
                    line-height: 1.6;
                  }

                  .page {
                    width: 210mm;
                    min-height: 297mm;
                    padding: 20mm;
                    margin: 0 auto;
                    background: white;
                    box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);
                  }

                  @media print {
                    body { background: white; }
                    .page {
                      box-shadow: none;
                      page-break-after: always;
                    }
                    .page:last-child {
                      page-break-after: avoid;
                    }
                  }

                  .header {
                    display: flex;
                    justify-content: space-between;
                    align-items: flex-start;
                    margin-bottom: 30px;
                    padding-bottom: 20px;
                    border-bottom: 3px solid #745EE1;
                  }

                  .logo-section h1 {
                    font-size: 28px;
                    font-weight: 700;
                    color: #745EE1;
                    margin-bottom: 4px;
                  }

                  .logo-section p {
                    font-size: 12px;
                    color: #64748b;
                  }

                  .report-info {
                    text-align: right;
                    font-size: 11px;
                    color: #64748b;
                  }

                  .report-info .date {
                    font-weight: 600;
                    color: #1e293b;
                    font-size: 13px;
                  }

                  .report-title {
                    text-align: center;
                    margin-bottom: 30px;
                  }

                  .report-title h2 {
                    font-size: 24px;
                    font-weight: 600;
                    color: #1e293b;
                    margin-bottom: 8px;
                  }

                  .report-title .period {
                    font-size: 13px;
                    color: #64748b;
                    display: inline-flex;
                    align-items: center;
                    gap: 6px;
                    background: #f1f5f9;
                    padding: 6px 12px;
                    border-radius: 20px;
                  }

                  .stats-grid {
                    display: grid;
                    grid-template-columns: repeat(4, 1fr);
                    gap: 16px;
                    margin-bottom: 30px;
                  }

                  .stat-card {
                    background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
                    border-radius: 12px;
                    padding: 20px;
                    text-align: center;
                    border: 1px solid #e2e8f0;
                  }

                  .stat-card.primary {
                    background: linear-gradient(135deg, #745EE1 0%, #5a47b8 100%);
                    color: white;
                    border: none;
                  }

                  .stat-card .icon {
                    width: 40px;
                    height: 40px;
                    margin: 0 auto 12px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    border-radius: 10px;
                    background: rgba(116, 94, 225, 0.1);
                  }

                  .stat-card.primary .icon {
                    background: rgba(255, 255, 255, 0.2);
                  }

                  .stat-card .value {
                    font-size: 32px;
                    font-weight: 700;
                    line-height: 1;
                    margin-bottom: 4px;
                  }

                  .stat-card .label {
                    font-size: 12px;
                    color: #64748b;
                    font-weight: 500;
                  }

                  .stat-card.primary .label {
                    color: rgba(255, 255, 255, 0.8);
                  }

                  .section {
                    margin-bottom: 30px;
                  }

                  .section-title {
                    font-size: 16px;
                    font-weight: 600;
                    color: #1e293b;
                    margin-bottom: 16px;
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    padding-bottom: 8px;
                    border-bottom: 2px solid #e2e8f0;
                  }

                  .section-title::before {
                    content: '';
                    width: 4px;
                    height: 20px;
                    background: #745EE1;
                    border-radius: 2px;
                  }

                  .patient-table {
                    width: 100%;
                    border-collapse: collapse;
                    font-size: 11px;
                  }

                  .patient-table th {
                    background: #f8fafc;
                    padding: 12px 8px;
                    text-align: left;
                    font-weight: 600;
                    color: #475569;
                    border-bottom: 2px solid #e2e8f0;
                  }

                  .patient-table td {
                    padding: 10px 8px;
                    border-bottom: 1px solid #f1f5f9;
                    vertical-align: middle;
                  }

                  .patient-table tr:hover {
                    background: #f8fafc;
                  }

                  .risk-badge {
                    display: inline-flex;
                    padding: 4px 10px;
                    border-radius: 12px;
                    font-size: 10px;
                    font-weight: 600;
                    text-transform: uppercase;
                  }

                  .risk-badge.low { background: #dcfce7; color: #166534; }
                  .risk-badge.medium { background: #fef3c7; color: #92400e; }
                  .risk-badge.high { background: #fee2e2; color: #991b1b; }

                  .vitals-grid {
                    display: grid;
                    grid-template-columns: repeat(2, 1fr);
                    gap: 16px;
                  }

                  .vital-card {
                    background: white;
                    border: 1px solid #e2e8f0;
                    border-radius: 12px;
                    padding: 16px;
                    display: flex;
                    align-items: center;
                    gap: 16px;
                  }

                  .vital-card .icon-wrapper {
                    width: 48px;
                    height: 48px;
                    border-radius: 12px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                  }

                  .vital-card .icon-wrapper.bp { background: #fef2f2; color: #dc2626; }
                  .vital-card .icon-wrapper.glucose { background: #eff6ff; color: #2563eb; }
                  .vital-card .icon-wrapper.weight { background: #ecfdf5; color: #059669; }
                  .vital-card .icon-wrapper.oxygen { background: #faf5ff; color: #9333ea; }

                  .vital-card .content {
                    flex: 1;
                  }

                  .vital-card .type {
                    font-size: 11px;
                    color: #64748b;
                    margin-bottom: 2px;
                  }

                  .vital-card .value {
                    font-size: 20px;
                    font-weight: 700;
                    color: #1e293b;
                  }

                  .insights-list {
                    list-style: none;
                    display: grid;
                    gap: 12px;
                  }

                  .insights-list li {
                    display: flex;
                    align-items: flex-start;
                    gap: 12px;
                    padding: 14px;
                    background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%);
                    border-radius: 10px;
                    font-size: 12px;
                    border-left: 4px solid #22c55e;
                  }

                  .insights-list li::before {
                    content: '✓';
                    color: #22c55e;
                    font-weight: bold;
                  }

                  .footer {
                    margin-top: 40px;
                    padding-top: 20px;
                    border-top: 1px solid #e2e8f0;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    font-size: 10px;
                    color: #94a3b8;
                  }

                  .footer .confidential {
                    display: flex;
                    align-items: center;
                    gap: 4px;
                    color: #ef4444;
                    font-weight: 500;
                  }
                </style>
              </head>
              <body>
                ${printRef.current.innerHTML}
              </body>
              </html>
            `);
            printWindow.document.close();
            printWindow.focus();
            setTimeout(() => {
              printWindow.print();
            }, 500);
          }
        }
      },
    }));

    const formatDate = (date: Date) => {
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    };

    return (
      <div className="bg-gray-100 p-8 overflow-auto max-h-[80vh]">
        <div
          ref={printRef}
          className="bg-white max-w-4xl mx-auto shadow-xl"
          style={{ fontFamily: 'Inter, sans-serif' }}
        >
          {/* Cover Page */}
          <div className="p-12 min-h-[800px] flex flex-col">
            {/* Header */}
            <div className="flex justify-between items-start pb-6 mb-8 border-b-4 border-[#745EE1]">
              <div>
                <h1 className="text-3xl font-bold text-[#745EE1]">NirmiteeRPM</h1>
                <p className="text-sm text-gray-500">Remote Patient Monitoring</p>
              </div>
              <div className="text-right text-sm">
                <p className="font-semibold text-gray-900">{formatDate(data.generatedAt)}</p>
                <p className="text-gray-500">{data.organization}</p>
              </div>
            </div>

            {/* Report Title */}
            <div className="text-center mb-10">
              <h2 className="text-2xl font-semibold text-gray-900 mb-3">{data.title}</h2>
              <span className="inline-flex items-center gap-2 bg-gray-100 px-4 py-2 rounded-full text-sm text-gray-600">
                <Calendar className="h-4 w-4" />
                {formatDate(data.dateRange.start)} - {formatDate(data.dateRange.end)}
              </span>
            </div>

            {/* Summary Stats */}
            <div className="grid grid-cols-4 gap-4 mb-10">
              <div className="bg-gradient-to-br from-[#745EE1] to-[#5a47b8] text-white rounded-xl p-5 text-center">
                <div className="w-10 h-10 mx-auto mb-3 bg-white/20 rounded-lg flex items-center justify-center">
                  <Users className="h-5 w-5" />
                </div>
                <div className="text-3xl font-bold">{data.summary.totalPatients}</div>
                <div className="text-xs text-white/80">{t('totalPatients')}</div>
              </div>
              <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl p-5 text-center border border-gray-200">
                <div className="w-10 h-10 mx-auto mb-3 bg-[#745EE1]/10 rounded-lg flex items-center justify-center">
                  <CheckCircle className="h-5 w-5 text-[#745EE1]" />
                </div>
                <div className="text-3xl font-bold text-gray-900">{data.summary.activePatients}</div>
                <div className="text-xs text-gray-500">{t('activePatients')}</div>
              </div>
              <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl p-5 text-center border border-gray-200">
                <div className="w-10 h-10 mx-auto mb-3 bg-[#745EE1]/10 rounded-lg flex items-center justify-center">
                  <Activity className="h-5 w-5 text-[#745EE1]" />
                </div>
                <div className="text-3xl font-bold text-gray-900">{data.summary.totalReadings}</div>
                <div className="text-xs text-gray-500">{t('totalReadings')}</div>
              </div>
              <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl p-5 text-center border border-gray-200">
                <div className="w-10 h-10 mx-auto mb-3 bg-[#745EE1]/10 rounded-lg flex items-center justify-center">
                  <TrendingUp className="h-5 w-5 text-[#745EE1]" />
                </div>
                <div className="text-3xl font-bold text-gray-900">{data.summary.avgComplianceRate}%</div>
                <div className="text-xs text-gray-500">{t('complianceRate')}</div>
              </div>
            </div>

            {/* Vitals Summary */}
            {data.vitals && data.vitals.length > 0 && (
              <div className="mb-10">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2 pb-2 border-b-2 border-gray-200">
                  <span className="w-1 h-5 bg-[#745EE1] rounded" />
                  {t('vitalsSummary')}
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  {data.vitals.map((vital, idx) => (
                    <div key={idx} className="flex items-center gap-4 p-4 bg-white border border-gray-200 rounded-xl">
                      <div
                        className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                          vital.type === 'Blood Pressure'
                            ? 'bg-red-50 text-red-500'
                            : vital.type === 'Blood Glucose'
                              ? 'bg-blue-50 text-blue-500'
                              : vital.type === 'Weight'
                                ? 'bg-green-50 text-green-500'
                                : 'bg-purple-50 text-purple-500'
                        }`}
                      >
                        {vital.type === 'Blood Pressure' && <Heart className="h-5 w-5" />}
                        {vital.type === 'Blood Glucose' && <Droplet className="h-5 w-5" />}
                        {vital.type === 'Weight' && <Scale className="h-5 w-5" />}
                        {vital.type === 'Oxygen' && <Activity className="h-5 w-5" />}
                      </div>
                      <div className="flex-1">
                        <div className="text-xs text-gray-500">{vital.type}</div>
                        <div className="text-xl font-bold text-gray-900">{vital.value}</div>
                      </div>
                      <span
                        className={`px-2 py-1 rounded text-xs font-medium ${
                          vital.status === 'normal'
                            ? 'bg-green-100 text-green-700'
                            : vital.status === 'warning'
                              ? 'bg-amber-100 text-amber-700'
                              : 'bg-red-100 text-red-700'
                        }`}
                      >
                        {vital.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Alerts Summary */}
            {data.alerts && data.alerts.length > 0 && (
              <div className="mb-10">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2 pb-2 border-b-2 border-gray-200">
                  <span className="w-1 h-5 bg-[#745EE1] rounded" />
                  {t('alertsSummary')}
                </h3>
                <div className="grid grid-cols-3 gap-4">
                  {data.alerts.map((alert, idx) => (
                    <div
                      key={idx}
                      className={`p-4 rounded-xl border ${
                        alert.severity === 'critical'
                          ? 'bg-red-50 border-red-200'
                          : alert.severity === 'warning'
                            ? 'bg-amber-50 border-amber-200'
                            : 'bg-blue-50 border-blue-200'
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <AlertTriangle
                          className={`h-4 w-4 ${
                            alert.severity === 'critical'
                              ? 'text-red-500'
                              : alert.severity === 'warning'
                                ? 'text-amber-500'
                                : 'text-blue-500'
                          }`}
                        />
                        <span className="text-sm font-semibold capitalize">{alert.severity}</span>
                      </div>
                      <div className="text-2xl font-bold text-gray-900">{alert.count}</div>
                      <div className="text-xs text-gray-500">
                        {alert.resolvedCount} {t('resolved')}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Patients Table */}
            {data.patients && data.patients.length > 0 && (
              <div className="mb-10">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2 pb-2 border-b-2 border-gray-200">
                  <span className="w-1 h-5 bg-[#745EE1] rounded" />
                  {t('patientOverview')}
                </h3>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="px-3 py-3 text-left font-semibold text-gray-600 border-b-2 border-gray-200">
                        {t('patient')}
                      </th>
                      <th className="px-3 py-3 text-left font-semibold text-gray-600 border-b-2 border-gray-200">
                        {t('conditions')}
                      </th>
                      <th className="px-3 py-3 text-left font-semibold text-gray-600 border-b-2 border-gray-200">
                        {t('lastVital')}
                      </th>
                      <th className="px-3 py-3 text-left font-semibold text-gray-600 border-b-2 border-gray-200">
                        {t('risk')}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.patients.slice(0, 8).map((patient, idx) => (
                      <tr key={idx} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="px-3 py-3">
                          <div className="font-medium text-gray-900">{patient.name}</div>
                          <div className="text-xs text-gray-500">
                            {patient.age}y, {patient.gender}
                          </div>
                        </td>
                        <td className="px-3 py-3 text-gray-600">
                          {patient.conditions.slice(0, 2).join(', ')}
                        </td>
                        <td className="px-3 py-3 text-gray-600">{patient.lastVital}</td>
                        <td className="px-3 py-3">
                          <span
                            className={`px-3 py-1 rounded-full text-xs font-semibold uppercase ${
                              patient.riskLevel === 'low'
                                ? 'bg-green-100 text-green-700'
                                : patient.riskLevel === 'medium'
                                  ? 'bg-amber-100 text-amber-700'
                                  : 'bg-red-100 text-red-700'
                            }`}
                          >
                            {patient.riskLevel}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Key Insights */}
            {data.insights && data.insights.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2 pb-2 border-b-2 border-gray-200">
                  <span className="w-1 h-5 bg-[#745EE1] rounded" />
                  {t('keyInsights')}
                </h3>
                <ul className="space-y-3">
                  {data.insights.map((insight, idx) => (
                    <li
                      key={idx}
                      className="flex items-start gap-3 p-4 bg-gradient-to-r from-green-50 to-green-100 rounded-xl border-l-4 border-green-500 text-sm"
                    >
                      <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0" />
                      {insight}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Footer */}
            <div className="mt-auto pt-8 border-t border-gray-200 flex justify-between items-center text-xs text-gray-400">
              <div className="flex items-center gap-1 text-red-500 font-medium">
                <AlertTriangle className="h-3 w-3" />
                {t('confidential')}
              </div>
              <div>{t('generatedBy')}</div>
              <div>{t('page')} 1</div>
            </div>
          </div>
        </div>
      </div>
    );
  }
);

PDFReportPreview.displayName = 'PDFReportPreview';

export default PDFReportPreview;
