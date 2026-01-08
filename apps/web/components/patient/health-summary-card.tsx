'use client';

import { CheckCircle, AlertCircle, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTranslations } from '@/lib/i18n/i18n-context';

interface HealthSummaryCardProps {
  overallStatus: 'good' | 'attention' | 'critical';
  lastReadingTime?: string;
}

export function HealthSummaryCard({
  overallStatus,
  lastReadingTime,
}: HealthSummaryCardProps) {
  const { t } = useTranslations('patient.dashboard');
  const { t: tStatus } = useTranslations('patient.status');

  const statusConfig = {
    good: {
      icon: CheckCircle,
      title: tStatus('allGood'),
      color: 'text-green-600 dark:text-green-400',
      bgColor: 'bg-green-50 dark:bg-green-950',
      borderColor: 'border-green-200 dark:border-green-800',
    },
    attention: {
      icon: AlertTriangle,
      title: tStatus('needsAttention'),
      color: 'text-yellow-600 dark:text-yellow-400',
      bgColor: 'bg-yellow-50 dark:bg-yellow-950',
      borderColor: 'border-yellow-200 dark:border-yellow-800',
    },
    critical: {
      icon: AlertCircle,
      title: tStatus('checkWithDoctor'),
      color: 'text-red-600 dark:text-red-400',
      bgColor: 'bg-red-50 dark:bg-red-950',
      borderColor: 'border-red-200 dark:border-red-800',
    },
  };

  const config = statusConfig[overallStatus];
  const Icon = config.icon;

  return (
    <div
      className={cn(
        'rounded-lg border p-4',
        config.bgColor,
        config.borderColor
      )}
    >
      <div className="flex items-center gap-3">
        <Icon className={cn('h-8 w-8', config.color)} />
        <div className="flex-1">
          <h3 className={cn('text-lg font-bold', config.color)}>
            {config.title}
          </h3>
          {lastReadingTime && (
            <p className="mt-0.5 text-xs text-gray-600 dark:text-gray-400">
              {t('lastReading', { time: lastReadingTime })}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
