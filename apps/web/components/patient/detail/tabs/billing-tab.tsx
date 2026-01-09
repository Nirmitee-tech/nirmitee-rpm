'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from '@/lib/i18n/i18n-context';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@nirmitee/ui';
import {
  DollarSign,
  FileText,
  Clock,
  Calendar,
  CheckCircle2,
  AlertTriangle,
  Smartphone,
  TrendingUp,
  RefreshCw,
  AlertCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { patientsApi, BillingPeriod as ApiBillingPeriod } from '@/lib/api/patients';

// Types
interface CPTCodeInfo {
  code: string;
  name: string;
  description: string;
  requirements: string;
  reimbursement: string;
}

interface BillingPeriod {
  id: string;
  startDate: string;
  endDate: string;
  dataTransmissionDays: number;
  interactionMinutes: number;
  status: 'pending' | 'eligible' | 'submitted' | 'paid' | 'denied';
  eligibleCodes: string[];
  amount?: number | null;
  claimId?: string | null;
}

interface BillingTabProps {
  patientId: string;
  enrollmentDate?: string;
  isLoading: boolean;
  onRefresh?: () => void;
}

// Map API response to component format
function mapApiBillingPeriod(api: ApiBillingPeriod): BillingPeriod {
  return {
    id: api.id,
    startDate: api.periodStart,
    endDate: api.periodEnd,
    dataTransmissionDays: api.dataTransmissionDays,
    interactionMinutes: api.interactionMinutes,
    status: api.status,
    eligibleCodes: api.eligibleCodes,
    amount: api.amount,
    claimId: api.claimId,
  };
}

// RPM CPT Codes information
const CPT_CODES: CPTCodeInfo[] = [
  {
    code: '99453',
    name: 'Initial Setup',
    description: 'Initial patient education and device setup',
    requirements: 'One-time code at enrollment',
    reimbursement: '~$19-21',
  },
  {
    code: '99454',
    name: 'Device Supply',
    description: 'Daily device data transmission (16+ days/month)',
    requirements: '16+ days of data transmission per 30-day period',
    reimbursement: '~$50-64',
  },
  {
    code: '99457',
    name: 'Treatment Management',
    description: 'First 20 minutes of interactive communication',
    requirements: '20+ minutes of clinical staff time per month',
    reimbursement: '~$50-56',
  },
  {
    code: '99458',
    name: 'Additional Management',
    description: 'Each additional 20 minutes of interactive communication',
    requirements: 'Additional 20-minute blocks (up to 2x per month)',
    reimbursement: '~$42-47',
  },
];

export function BillingTab({
  patientId,
  enrollmentDate,
  isLoading: externalLoading,
  onRefresh,
}: BillingTabProps) {
  const { t } = useTranslations('billing');
  const { t: tCommon } = useTranslations('common');
  const [billingPeriods, setBillingPeriods] = useState<BillingPeriod[]>([]);
  const [currentPeriod, setCurrentPeriod] = useState<BillingPeriod | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch billing data
  const fetchBillingData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [periodsResponse, currentResponse] = await Promise.all([
        patientsApi.getBillingRecords(patientId),
        patientsApi.getCurrentBillingPeriod(patientId),
      ]);

      // Map API responses to component format
      const periods = periodsResponse.data?.map(mapApiBillingPeriod) || [];
      setBillingPeriods(periods);

      // Set current period from API or find from periods
      if (currentResponse.data) {
        setCurrentPeriod(mapApiBillingPeriod(currentResponse.data));
      } else if (periods.length > 0) {
        // Fallback: find current period from list
        const now = new Date();
        const current = periods.find(p => {
          const start = new Date(p.startDate);
          const end = new Date(p.endDate);
          return now >= start && now <= end;
        });
        setCurrentPeriod(current || periods[0]);
      }
    } catch (err) {
      console.error('Failed to fetch billing data:', err);
      setError('Failed to load billing data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBillingData();
  }, [patientId]);

  // Refresh handler
  const handleRefresh = () => {
    fetchBillingData();
    onRefresh?.();
  };

  // Status badge config
  const getStatusConfig = (status: BillingPeriod['status']) => {
    const configs = {
      pending: { label: t('statusPending'), className: 'bg-gray-100 text-gray-700', icon: Clock },
      eligible: { label: t('statusEligible'), className: 'bg-blue-100 text-blue-700', icon: CheckCircle2 },
      submitted: { label: t('statusSubmitted'), className: 'bg-yellow-100 text-yellow-700', icon: FileText },
      paid: { label: t('statusPaid'), className: 'bg-green-100 text-green-700', icon: DollarSign },
      denied: { label: t('statusDenied'), className: 'bg-red-100 text-red-700', icon: AlertTriangle },
    };
    return configs[status] || configs.pending;
  };

  // Calculate eligibility for current period
  const getEligibility = (period: BillingPeriod) => {
    const eligibility = {
      '99454': period.dataTransmissionDays >= 16,
      '99457': period.interactionMinutes >= 20,
      '99458': period.interactionMinutes >= 40,
    };
    return eligibility;
  };

  if (loading || externalLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#745EE1] mx-auto mb-2"></div>
          <p className="text-sm text-gray-500">{tCommon('loading')}</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <AlertCircle className="w-12 h-12 text-red-400 mb-4" />
        <p className="text-gray-600 mb-4">{error}</p>
        <Button onClick={handleRefresh} variant="outline" size="sm">
          <RefreshCw className="w-4 h-4 mr-2" />
          {tCommon('retry')}
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header Actions */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold text-gray-900">{t('title')}</h3>
          <p className="text-sm text-gray-500 mt-0.5">{t('subtitle')}</p>
        </div>
        <Button
          size="sm"
          variant="outline"
          onClick={handleRefresh}
          className="h-8 text-xs"
        >
          <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
          {tCommon('refresh')}
        </Button>
      </div>

      {/* Current Period Summary */}
      {currentPeriod && (
        <Card className="border-[#745EE1]/30 bg-purple-50/30">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-[#745EE1]/10 flex items-center justify-center">
                  <Calendar className="w-4 h-4 text-[#745EE1]" />
                </div>
                <div>
                  <CardTitle className="text-base font-semibold">{t('currentPeriod')}</CardTitle>
                  <p className="text-xs text-gray-500">
                    {new Date(currentPeriod.startDate).toLocaleDateString()} - {new Date(currentPeriod.endDate).toLocaleDateString()}
                  </p>
                </div>
              </div>
              <Badge className={cn('text-xs', getStatusConfig(currentPeriod.status).className)}>
                {getStatusConfig(currentPeriod.status).label}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="grid grid-cols-2 gap-4">
              {/* Data Transmission Days */}
              <div className="p-3 rounded-lg bg-white border">
                <div className="flex items-center gap-2 mb-2">
                  <Smartphone className="w-4 h-4 text-[#745EE1]" />
                  <span className="text-xs font-medium text-gray-600">{t('dataTransmissionDays')}</span>
                </div>
                <div className="flex items-baseline gap-1">
                  <span className="text-2xl font-bold text-gray-900">{currentPeriod.dataTransmissionDays}</span>
                  <span className="text-sm text-gray-500">/ 16 {t('daysRequired')}</span>
                </div>
                <div className="mt-2 h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className={cn(
                      'h-full rounded-full transition-all',
                      currentPeriod.dataTransmissionDays >= 16 ? 'bg-green-500' : 'bg-[#745EE1]'
                    )}
                    style={{ width: `${Math.min((currentPeriod.dataTransmissionDays / 16) * 100, 100)}%` }}
                  />
                </div>
                <p className={cn(
                  'text-xs mt-1',
                  currentPeriod.dataTransmissionDays >= 16 ? 'text-green-600' : 'text-gray-500'
                )}>
                  {currentPeriod.dataTransmissionDays >= 16 ? t('eligible99454') : t('needMoreDays', { days: 16 - currentPeriod.dataTransmissionDays })}
                </p>
              </div>

              {/* Interaction Minutes */}
              <div className="p-3 rounded-lg bg-white border">
                <div className="flex items-center gap-2 mb-2">
                  <Clock className="w-4 h-4 text-[#745EE1]" />
                  <span className="text-xs font-medium text-gray-600">{t('interactionMinutes')}</span>
                </div>
                <div className="flex items-baseline gap-1">
                  <span className="text-2xl font-bold text-gray-900">{currentPeriod.interactionMinutes}</span>
                  <span className="text-sm text-gray-500">{t('minutes')}</span>
                </div>
                <div className="mt-2 h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className={cn(
                      'h-full rounded-full transition-all',
                      currentPeriod.interactionMinutes >= 20 ? 'bg-green-500' : 'bg-[#745EE1]'
                    )}
                    style={{ width: `${Math.min((currentPeriod.interactionMinutes / 60) * 100, 100)}%` }}
                  />
                </div>
                <p className={cn(
                  'text-xs mt-1',
                  currentPeriod.interactionMinutes >= 20 ? 'text-green-600' : 'text-gray-500'
                )}>
                  {currentPeriod.interactionMinutes >= 40
                    ? t('eligible99457_99458')
                    : currentPeriod.interactionMinutes >= 20
                    ? t('eligible99457')
                    : t('needMoreMinutes', { minutes: 20 - currentPeriod.interactionMinutes })}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* CPT Codes Reference */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-[#745EE1]" />
            <CardTitle className="text-base font-semibold">{t('cptCodes')}</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="grid gap-2">
            {CPT_CODES.map((cpt) => {
              const isEligible = currentPeriod && getEligibility(currentPeriod)[cpt.code as keyof ReturnType<typeof getEligibility>];
              return (
                <div
                  key={cpt.code}
                  className={cn(
                    'p-3 rounded-lg border transition-colors',
                    isEligible ? 'border-green-200 bg-green-50/50' : 'border-gray-200 bg-gray-50/50'
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm font-bold text-gray-900">{cpt.code}</span>
                        <span className="text-sm font-medium text-gray-700">{cpt.name}</span>
                        {isEligible && (
                          <Badge className="bg-green-100 text-green-700 text-xs">
                            <CheckCircle2 className="w-3 h-3 mr-1" />
                            {t('eligible')}
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-gray-600 mt-1">{cpt.description}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{cpt.requirements}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-[#745EE1]">{cpt.reimbursement}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Billing History */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-[#745EE1]" />
            <CardTitle className="text-base font-semibold">{t('billingHistory')}</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          {billingPeriods.length === 0 ? (
            <div className="text-center py-6">
              <DollarSign className="w-12 h-12 text-gray-300 mx-auto mb-2" />
              <p className="text-sm text-gray-500">{t('noBillingHistory')}</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-left text-gray-500 border-b">
                    <th className="pb-2 font-medium">{t('period')}</th>
                    <th className="pb-2 font-medium text-center">{t('days')}</th>
                    <th className="pb-2 font-medium text-center">{t('minutes')}</th>
                    <th className="pb-2 font-medium">{t('codes')}</th>
                    <th className="pb-2 font-medium">{t('status')}</th>
                    <th className="pb-2 font-medium text-right">{t('amount')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {billingPeriods.map((period) => {
                    const statusConfig = getStatusConfig(period.status);
                    const StatusIcon = statusConfig.icon;
                    return (
                      <tr key={period.id} className="hover:bg-gray-50">
                        <td className="py-2">
                          <div className="flex flex-col">
                            <span className="font-medium">
                              {new Date(period.startDate).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                            </span>
                            {period.claimId && (
                              <span className="text-xs text-gray-400">{period.claimId}</span>
                            )}
                          </div>
                        </td>
                        <td className="py-2 text-center">
                          <span className={period.dataTransmissionDays >= 16 ? 'text-green-600 font-medium' : ''}>
                            {period.dataTransmissionDays}
                          </span>
                        </td>
                        <td className="py-2 text-center">
                          <span className={period.interactionMinutes >= 20 ? 'text-green-600 font-medium' : ''}>
                            {period.interactionMinutes}
                          </span>
                        </td>
                        <td className="py-2">
                          <div className="flex gap-1">
                            {period.eligibleCodes.length > 0 ? (
                              period.eligibleCodes.map((code) => (
                                <span key={code} className="font-mono text-xs bg-gray-100 px-1.5 py-0.5 rounded">
                                  {code}
                                </span>
                              ))
                            ) : (
                              <span className="text-gray-400">-</span>
                            )}
                          </div>
                        </td>
                        <td className="py-2">
                          <Badge className={cn('text-xs', statusConfig.className)}>
                            <StatusIcon className="w-3 h-3 mr-1" />
                            {statusConfig.label}
                          </Badge>
                        </td>
                        <td className="py-2 text-right font-medium">
                          {period.amount ? `$${period.amount.toFixed(2)}` : '-'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Summary Stats */}
      <Card className="bg-gray-50">
        <CardContent className="py-3">
          <div className="flex items-center justify-between text-xs text-gray-600">
            <span>
              {t('totalBilled')}: <strong>${billingPeriods.reduce((sum, p) => sum + (p.amount || 0), 0).toFixed(2)}</strong>
            </span>
            <span>
              {t('periodsSubmitted')}: <strong>{billingPeriods.filter(p => p.status !== 'pending').length}</strong>
            </span>
            <span>
              {t('enrollmentDate')}: <strong>{enrollmentDate ? new Date(enrollmentDate).toLocaleDateString() : '-'}</strong>
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
