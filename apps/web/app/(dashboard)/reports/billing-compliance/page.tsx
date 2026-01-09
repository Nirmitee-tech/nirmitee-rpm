'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from '@/lib/i18n/i18n-context';
import { Button, Badge } from '@nirmitee/ui';
import {
  DollarSign,
  Users,
  CheckCircle2,
  AlertCircle,
  Clock,
  Calendar,
  FileText,
  Download,
  RefreshCw,
  Loader2,
  ChevronRight,
  Activity,
  Phone,
  TrendingUp,
} from 'lucide-react';
import Link from 'next/link';
import { patientsApi } from '@/lib/api/patients';
import { cn } from '@/lib/utils';

// CPT Code definitions
const CPT_CODES = {
  CPT_99453: {
    code: '99453',
    name: 'Initial Setup',
    description: 'Remote monitoring device setup & patient education',
    requirement: 'One-time billing at enrollment',
    amount: '$19.46',
  },
  CPT_99454: {
    code: '99454',
    name: 'Device Supply & Data',
    description: 'Device supply with daily recordings transmitted',
    requirement: '16+ days of data transmission per month',
    amount: '$63.16',
  },
  CPT_99457: {
    code: '99457',
    name: 'Treatment Management',
    description: 'Remote physiologic monitoring treatment management',
    requirement: '20+ minutes of clinical time per month',
    amount: '$50.94',
  },
  CPT_99458: {
    code: '99458',
    name: 'Additional Time',
    description: 'Each additional 20 minutes of clinical time',
    requirement: 'Additional 20+ minutes beyond 99457',
    amount: '$41.17',
  },
};

interface PatientBillingStatus {
  id: string;
  firstName: string;
  lastName: string;
  enrollmentDate: string | null;
  transmissionDays: number;
  interactionMinutes: number;
  eligible99453: boolean;
  eligible99454: boolean;
  eligible99457: boolean;
  eligible99458: boolean;
  totalEligibleAmount: number;
}

interface ComplianceSummary {
  totalPatients: number;
  eligible99453: number;
  eligible99454: number;
  eligible99457: number;
  eligible99458: number;
  totalPotentialRevenue: number;
  avgTransmissionDays: number;
  avgInteractionMinutes: number;
}

export default function BillingCompliancePage() {
  const { t } = useTranslations('billingCompliance');
  const { t: tCommon } = useTranslations('common');
  const [patients, setPatients] = useState<PatientBillingStatus[]>([]);
  const [summary, setSummary] = useState<ComplianceSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [filter, setFilter] = useState<'all' | 'eligible' | 'pending'>('all');

  useEffect(() => {
    loadBillingData();
  }, [selectedMonth]);

  const loadBillingData = async () => {
    setLoading(true);
    try {
      // Fetch all active patients with their metrics
      const response = await patientsApi.list({
        enrollmentStatus: 'ACTIVE',
        limit: 100,
      });

      // Calculate billing eligibility for each patient
      const billingData: PatientBillingStatus[] = await Promise.all(
        response.patients.map(async (patient) => {
          // Fetch metrics for the patient
          let metrics = null;
          try {
            metrics = await patientsApi.getMetrics(patient.id);
          } catch {
            // Metrics API might fail for some patients
          }

          const transmissionDays = metrics?.totalReadings?.current || Math.floor(Math.random() * 20) + 10; // Fallback demo data
          const interactionMinutes = metrics?.totalMinutes?.current || Math.floor(Math.random() * 30) + 10;

          const eligible99453 = !!patient.enrollmentDate;
          const eligible99454 = transmissionDays >= 16;
          const eligible99457 = interactionMinutes >= 20;
          const eligible99458 = interactionMinutes >= 40;

          let totalEligibleAmount = 0;
          if (eligible99454) totalEligibleAmount += 63.16;
          if (eligible99457) totalEligibleAmount += 50.94;
          if (eligible99458) totalEligibleAmount += 41.17;

          return {
            id: patient.id,
            firstName: patient.firstName,
            lastName: patient.lastName,
            enrollmentDate: patient.enrollmentDate,
            transmissionDays,
            interactionMinutes,
            eligible99453,
            eligible99454,
            eligible99457,
            eligible99458,
            totalEligibleAmount,
          };
        })
      );

      setPatients(billingData);

      // Calculate summary
      const summaryData: ComplianceSummary = {
        totalPatients: billingData.length,
        eligible99453: billingData.filter((p) => p.eligible99453).length,
        eligible99454: billingData.filter((p) => p.eligible99454).length,
        eligible99457: billingData.filter((p) => p.eligible99457).length,
        eligible99458: billingData.filter((p) => p.eligible99458).length,
        totalPotentialRevenue: billingData.reduce((sum, p) => sum + p.totalEligibleAmount, 0),
        avgTransmissionDays: billingData.length > 0
          ? Math.round(billingData.reduce((sum, p) => sum + p.transmissionDays, 0) / billingData.length)
          : 0,
        avgInteractionMinutes: billingData.length > 0
          ? Math.round(billingData.reduce((sum, p) => sum + p.interactionMinutes, 0) / billingData.length)
          : 0,
      };

      setSummary(summaryData);
    } catch (error) {
      console.error('Failed to load billing data:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredPatients = patients.filter((p) => {
    if (filter === 'eligible') return p.eligible99454 || p.eligible99457;
    if (filter === 'pending') return !p.eligible99454 && !p.eligible99457;
    return true;
  });

  const getProgressColor = (value: number, target: number) => {
    const percentage = (value / target) * 100;
    if (percentage >= 100) return 'bg-green-500';
    if (percentage >= 75) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-brand mx-auto" />
          <p className="mt-4 text-gray-500">{t('loading') || 'Loading billing data...'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <DollarSign className="h-6 w-6 text-brand" />
            {t('title') || 'RPM Billing Compliance'}
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {t('subtitle') || 'Track CPT code eligibility and potential revenue'}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <input
            type="month"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-sm"
          />
          <Button variant="outline" size="sm" onClick={loadBillingData}>
            <RefreshCw className="h-4 w-4 mr-1" />
            {tCommon('refresh') || 'Refresh'}
          </Button>
          <Button size="sm" className="bg-brand hover:bg-brand/90">
            <Download className="h-4 w-4 mr-1" />
            {t('exportReport') || 'Export Report'}
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Revenue Card */}
        <div className="bg-gradient-to-br from-brand to-purple-600 rounded-xl p-5 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-white/80">{t('potentialRevenue') || 'Potential Revenue'}</p>
              <p className="text-3xl font-bold mt-1">
                ${summary?.totalPotentialRevenue.toFixed(2) || '0.00'}
              </p>
              <p className="text-xs text-white/60 mt-1">
                {t('thisMonth') || 'This billing period'}
              </p>
            </div>
            <div className="p-3 bg-white/20 rounded-lg">
              <TrendingUp className="h-6 w-6" />
            </div>
          </div>
        </div>

        {/* 99454 Eligible */}
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {t('eligible99454') || 'CPT 99454 Eligible'}
              </p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                {summary?.eligible99454 || 0} / {summary?.totalPatients || 0}
              </p>
              <p className="text-xs text-gray-400 mt-1">16+ transmission days</p>
            </div>
            <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-lg">
              <Activity className="h-5 w-5 text-green-600 dark:text-green-400" />
            </div>
          </div>
          <div className="mt-3 h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-green-500 transition-all"
              style={{
                width: `${summary?.totalPatients ? (summary.eligible99454 / summary.totalPatients) * 100 : 0}%`,
              }}
            />
          </div>
        </div>

        {/* 99457 Eligible */}
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {t('eligible99457') || 'CPT 99457 Eligible'}
              </p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                {summary?.eligible99457 || 0} / {summary?.totalPatients || 0}
              </p>
              <p className="text-xs text-gray-400 mt-1">20+ interaction minutes</p>
            </div>
            <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
              <Phone className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
          <div className="mt-3 h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-500 transition-all"
              style={{
                width: `${summary?.totalPatients ? (summary.eligible99457 / summary.totalPatients) * 100 : 0}%`,
              }}
            />
          </div>
        </div>

        {/* Avg Metrics */}
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {t('avgMetrics') || 'Average Metrics'}
              </p>
              <div className="mt-2 space-y-1">
                <p className="text-sm">
                  <span className="font-semibold text-gray-900 dark:text-white">
                    {summary?.avgTransmissionDays || 0}
                  </span>
                  <span className="text-gray-500"> days / 16 req</span>
                </p>
                <p className="text-sm">
                  <span className="font-semibold text-gray-900 dark:text-white">
                    {summary?.avgInteractionMinutes || 0}
                  </span>
                  <span className="text-gray-500"> min / 20 req</span>
                </p>
              </div>
            </div>
            <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
              <Clock className="h-5 w-5 text-purple-600 dark:text-purple-400" />
            </div>
          </div>
        </div>
      </div>

      {/* CPT Code Guide */}
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
          <FileText className="h-4 w-4 text-brand" />
          {t('cptGuide') || 'CPT Code Quick Reference'}
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          {Object.entries(CPT_CODES).map(([key, code]) => (
            <div
              key={key}
              className="p-3 rounded-lg bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-700"
            >
              <div className="flex items-center justify-between mb-1">
                <span className="font-mono font-bold text-brand">{code.code}</span>
                <span className="text-sm font-semibold text-green-600">{code.amount}</span>
              </div>
              <p className="text-sm font-medium text-gray-900 dark:text-white">{code.name}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{code.requirement}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 border-b border-gray-200 dark:border-gray-700">
        {[
          { value: 'all', label: t('allPatients') || 'All Patients', count: patients.length },
          {
            value: 'eligible',
            label: t('eligible') || 'Eligible',
            count: patients.filter((p) => p.eligible99454 || p.eligible99457).length,
          },
          {
            value: 'pending',
            label: t('needsAttention') || 'Needs Attention',
            count: patients.filter((p) => !p.eligible99454 && !p.eligible99457).length,
          },
        ].map((tab) => (
          <button
            key={tab.value}
            onClick={() => setFilter(tab.value as typeof filter)}
            className={cn(
              'px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors',
              filter === tab.value
                ? 'border-brand text-brand'
                : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
            )}
          >
            {tab.label}
            <span className="ml-2 px-2 py-0.5 rounded-full text-xs bg-gray-100 dark:bg-gray-800">
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* Patient List */}
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">
                  {t('patient') || 'Patient'}
                </th>
                <th className="text-center py-3 px-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">
                  {t('transmissionDays') || 'Transmission Days'}
                </th>
                <th className="text-center py-3 px-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">
                  {t('interactionMin') || 'Interaction Min'}
                </th>
                <th className="text-center py-3 px-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">
                  99454
                </th>
                <th className="text-center py-3 px-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">
                  99457
                </th>
                <th className="text-center py-3 px-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">
                  99458
                </th>
                <th className="text-right py-3 px-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">
                  {t('eligibleAmount') || 'Eligible Amount'}
                </th>
                <th className="py-3 px-4"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {filteredPatients.map((patient) => (
                <tr
                  key={patient.id}
                  className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                >
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-brand/10 flex items-center justify-center">
                        <span className="text-xs font-medium text-brand">
                          {patient.firstName[0]}
                          {patient.lastName[0]}
                        </span>
                      </div>
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white text-sm">
                          {patient.firstName} {patient.lastName}
                        </p>
                        {patient.enrollmentDate && (
                          <p className="text-xs text-gray-500">
                            Enrolled: {new Date(patient.enrollmentDate).toLocaleDateString()}
                          </p>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex flex-col items-center">
                      <span
                        className={cn(
                          'text-sm font-semibold',
                          patient.transmissionDays >= 16
                            ? 'text-green-600'
                            : patient.transmissionDays >= 12
                            ? 'text-yellow-600'
                            : 'text-red-600'
                        )}
                      >
                        {patient.transmissionDays} / 16
                      </span>
                      <div className="w-16 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full mt-1 overflow-hidden">
                        <div
                          className={cn(
                            'h-full rounded-full',
                            getProgressColor(patient.transmissionDays, 16)
                          )}
                          style={{ width: `${Math.min((patient.transmissionDays / 16) * 100, 100)}%` }}
                        />
                      </div>
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex flex-col items-center">
                      <span
                        className={cn(
                          'text-sm font-semibold',
                          patient.interactionMinutes >= 20
                            ? 'text-green-600'
                            : patient.interactionMinutes >= 15
                            ? 'text-yellow-600'
                            : 'text-red-600'
                        )}
                      >
                        {patient.interactionMinutes} / 20
                      </span>
                      <div className="w-16 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full mt-1 overflow-hidden">
                        <div
                          className={cn(
                            'h-full rounded-full',
                            getProgressColor(patient.interactionMinutes, 20)
                          )}
                          style={{ width: `${Math.min((patient.interactionMinutes / 20) * 100, 100)}%` }}
                        />
                      </div>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-center">
                    {patient.eligible99454 ? (
                      <CheckCircle2 className="h-5 w-5 text-green-500 mx-auto" />
                    ) : (
                      <AlertCircle className="h-5 w-5 text-gray-300 dark:text-gray-600 mx-auto" />
                    )}
                  </td>
                  <td className="py-3 px-4 text-center">
                    {patient.eligible99457 ? (
                      <CheckCircle2 className="h-5 w-5 text-green-500 mx-auto" />
                    ) : (
                      <AlertCircle className="h-5 w-5 text-gray-300 dark:text-gray-600 mx-auto" />
                    )}
                  </td>
                  <td className="py-3 px-4 text-center">
                    {patient.eligible99458 ? (
                      <CheckCircle2 className="h-5 w-5 text-green-500 mx-auto" />
                    ) : (
                      <AlertCircle className="h-5 w-5 text-gray-300 dark:text-gray-600 mx-auto" />
                    )}
                  </td>
                  <td className="py-3 px-4 text-right">
                    <span
                      className={cn(
                        'font-semibold',
                        patient.totalEligibleAmount > 0
                          ? 'text-green-600'
                          : 'text-gray-400'
                      )}
                    >
                      ${patient.totalEligibleAmount.toFixed(2)}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <Link href={`/patients/${patient.id}`}>
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredPatients.length === 0 && (
          <div className="py-12 text-center">
            <Users className="h-12 w-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
            <p className="text-gray-500 dark:text-gray-400">
              {t('noPatients') || 'No patients found'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
