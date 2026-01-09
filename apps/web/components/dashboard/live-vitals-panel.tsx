'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { Activity, ChevronRight, Clock, User, TrendingUp, TrendingDown } from 'lucide-react';
import { useTranslations } from '@/lib/i18n/i18n-context';
import { formatDistanceToNow } from 'date-fns';

interface VitalReading {
  id: string;
  patientId: string;
  patientName: string;
  vitalType: string;
  values: Record<string, number>;
  unit: string;
  status: 'normal' | 'warning' | 'critical';
  recordedAt: string;
  createdAt: string;
}

interface LiveVitalsPanelProps {
  vitals: VitalReading[];
  maxDisplay?: number;
  emptyMessage?: string;
}

const statusConfig = {
  normal: {
    bg: 'bg-green-100 dark:bg-green-900/30',
    text: 'text-green-700 dark:text-green-400',
    border: 'border-green-200 dark:border-green-800',
  },
  warning: {
    bg: 'bg-amber-100 dark:bg-amber-900/30',
    text: 'text-amber-700 dark:text-amber-400',
    border: 'border-amber-200 dark:border-amber-800',
  },
  critical: {
    bg: 'bg-red-100 dark:bg-red-900/30',
    text: 'text-red-700 dark:text-red-400',
    border: 'border-red-200 dark:border-red-800',
  },
};

const vitalTypeLabels: Record<string, string> = {
  BLOOD_PRESSURE: 'BP',
  WEIGHT: 'Weight',
  BLOOD_GLUCOSE: 'Glucose',
  PULSE_OXIMETRY: 'SpO2',
  HEART_RATE: 'HR',
  TEMPERATURE: 'Temp',
};

function formatVitalValue(vitalType: string, values: Record<string, number>): string {
  switch (vitalType) {
    case 'BLOOD_PRESSURE':
      return `${values.systolic || '-'}/${values.diastolic || '-'}`;
    case 'WEIGHT':
      return `${values.value?.toFixed(1) || '-'}`;
    case 'BLOOD_GLUCOSE':
      return `${values.value || '-'}`;
    case 'PULSE_OXIMETRY':
      return `${values.value || '-'}%`;
    case 'HEART_RATE':
      return `${values.value || '-'}`;
    case 'TEMPERATURE':
      return `${values.value?.toFixed(1) || '-'}°`;
    default:
      return Object.values(values)[0]?.toString() || '-';
  }
}

export function LiveVitalsPanel({
  vitals,
  maxDisplay = 10,
  emptyMessage,
}: LiveVitalsPanelProps) {
  const { t } = useTranslations('dashboard.realtime');

  const displayedVitals = useMemo(() => vitals.slice(0, maxDisplay), [vitals, maxDisplay]);

  if (vitals.length === 0) {
    return (
      <div className="bg-white dark:bg-gradient-to-br dark:from-[#0f0f1a] dark:to-[#15122a] border border-[#E5E5E5] dark:border-[#1f1f2e] rounded-xl p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <Activity className="h-5 w-5 text-[#745EE1]" />
            {t('liveVitals')}
          </h3>
        </div>
        <div className="py-8 text-center text-gray-400">
          <Activity className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">{emptyMessage || t('noVitals')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gradient-to-br dark:from-[#0f0f1a] dark:to-[#15122a] border border-[#E5E5E5] dark:border-[#1f1f2e] rounded-xl p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
          <Activity className="h-5 w-5 text-[#745EE1]" />
          {t('liveVitals')}
          <span className="ml-2 relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
          </span>
        </h3>
        <Link
          href="/vitals"
          className="text-sm text-[#745EE1] hover:underline flex items-center gap-1"
        >
          {t('viewAll')}
          <ChevronRight className="h-4 w-4" />
        </Link>
      </div>

      <div className="space-y-2">
        {displayedVitals.map((vital, index) => {
          const config = statusConfig[vital.status];
          const isNew = index === 0;

          return (
            <div
              key={vital.id}
              className={`p-3 rounded-lg border ${config.border} ${config.bg} transition-all ${
                isNew ? 'animate-in slide-in-from-top duration-300' : ''
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {/* Vital Type Badge */}
                  <div
                    className={`px-2 py-1 rounded text-xs font-semibold ${config.text} ${config.bg}`}
                  >
                    {vitalTypeLabels[vital.vitalType] || vital.vitalType}
                  </div>

                  {/* Value */}
                  <div className="flex items-center gap-1">
                    <span className={`text-lg font-bold ${config.text}`}>
                      {formatVitalValue(vital.vitalType, vital.values)}
                    </span>
                    <span className="text-xs text-gray-500">{vital.unit}</span>
                  </div>

                  {/* Status indicator */}
                  {vital.status === 'critical' && (
                    <TrendingDown className="h-4 w-4 text-red-500" />
                  )}
                  {vital.status === 'warning' && (
                    <TrendingUp className="h-4 w-4 text-amber-500" />
                  )}
                </div>

                {/* Timestamp */}
                <div className="text-xs text-gray-500 flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {formatDistanceToNow(new Date(vital.createdAt), { addSuffix: true })}
                </div>
              </div>

              {/* Patient Info */}
              <div className="mt-2 flex items-center gap-1 text-xs text-gray-600 dark:text-gray-400">
                <User className="h-3 w-3" />
                <Link
                  href={`/patients/${vital.patientId}`}
                  className="hover:text-[#745EE1] hover:underline"
                >
                  {vital.patientName}
                </Link>
              </div>
            </div>
          );
        })}
      </div>

      {vitals.length > maxDisplay && (
        <div className="mt-3 text-center text-xs text-gray-500">
          {t('moreVitals', { count: vitals.length - maxDisplay })}
        </div>
      )}
    </div>
  );
}
