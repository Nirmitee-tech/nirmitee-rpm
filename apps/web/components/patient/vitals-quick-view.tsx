'use client';

import { Activity, Heart, Weight, Droplets, TrendingUp, TrendingDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTranslations } from '@/lib/i18n/i18n-context';

interface VitalData {
  type: 'bloodPressure' | 'weight' | 'glucose' | 'oxygen' | 'heartRate';
  value: string;
  unit: string;
  status: 'normal' | 'warning' | 'critical';
  trend?: 'up' | 'down';
  lastReading?: string;
}

interface VitalsQuickViewProps {
  vitals: VitalData[];
}

const vitalIcons = {
  bloodPressure: Activity,
  weight: Weight,
  glucose: Droplets,
  oxygen: Activity,
  heartRate: Heart,
};

const statusColors = {
  normal: 'border-green-200 bg-green-50 text-green-900 dark:border-green-800 dark:bg-green-950 dark:text-green-100',
  warning: 'border-yellow-200 bg-yellow-50 text-yellow-900 dark:border-yellow-800 dark:bg-yellow-950 dark:text-yellow-100',
  critical: 'border-red-200 bg-red-50 text-red-900 dark:border-red-800 dark:bg-red-950 dark:text-red-100',
};

export function VitalsQuickView({ vitals }: VitalsQuickViewProps) {
  const { t } = useTranslations('patient.vitals');

  if (vitals.length === 0) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-6 text-center dark:border-gray-800 dark:bg-gray-900">
        <p className="text-sm text-gray-600 dark:text-gray-400">{t('noReadings')}</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-3">
      {vitals.map((vital) => {
        const Icon = vitalIcons[vital.type];
        const TrendIcon = vital.trend === 'up' ? TrendingUp : TrendingDown;

        return (
          <div
            key={vital.type}
            className={cn(
              'rounded-lg border p-4 transition-all',
              statusColors[vital.status]
            )}
          >
            <div className="flex items-start justify-between">
              <Icon className="h-5 w-5 opacity-60" />
              {vital.trend && (
                <TrendIcon
                  className={cn(
                    'h-4 w-4',
                    vital.trend === 'up' ? 'text-red-500' : 'text-green-500'
                  )}
                />
              )}
            </div>
            <div className="mt-2">
              <p className="text-xs font-medium opacity-80">{t(vital.type)}</p>
              <div className="mt-1 flex items-baseline gap-1">
                <p className="text-2xl font-bold">{vital.value}</p>
                <span className="text-xs opacity-60">{vital.unit}</span>
              </div>
              <p className="mt-1 text-[10px] opacity-70">
                {vital.status === 'normal' && t('normal')}
                {vital.status === 'warning' && t('warning')}
                {vital.status === 'critical' && t('critical')}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
