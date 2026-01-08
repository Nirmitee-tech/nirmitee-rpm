'use client';

import { useTranslations } from '@/lib/i18n/i18n-context';
import { Button } from '@nirmitee/ui';
import { type VitalStatus } from '@/lib/api/vitals';
import { CheckCircle, AlertTriangle, AlertCircle } from 'lucide-react';

interface ReadingConfirmationProps {
  status: VitalStatus;
  onAddAnother: () => void;
  onViewHistory: () => void;
  className?: string;
}

export function ReadingConfirmation({
  status,
  onAddAnother,
  onViewHistory,
  className = '',
}: ReadingConfirmationProps) {
  const { t } = useTranslations('patient.vitals.entry.confirmation');

  const getStatusConfig = () => {
    switch (status) {
      case 'normal':
        return {
          icon: CheckCircle,
          color: 'text-success',
          bgColor: 'bg-success/10',
          borderColor: 'border-success/20',
        };
      case 'warning':
        return {
          icon: AlertTriangle,
          color: 'text-yellow-600',
          bgColor: 'bg-yellow-50 dark:bg-yellow-900/20',
          borderColor: 'border-yellow-200 dark:border-yellow-800',
        };
      case 'critical':
        return {
          icon: AlertCircle,
          color: 'text-danger',
          bgColor: 'bg-danger/10',
          borderColor: 'border-danger/20',
        };
    }
  };

  const config = getStatusConfig();
  const Icon = config.icon;

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Success message */}
      <div className="text-center">
        <div className={`inline-flex rounded-full p-3 ${config.bgColor} mb-4`}>
          <Icon className={`h-12 w-12 ${config.color}`} />
        </div>
        <h3 className="text-2xl font-bold text-gray-900 dark:text-white">{t('success')}</h3>
        <p className="mt-2 text-gray-600 dark:text-gray-400">{t('successDescription')}</p>
      </div>

      {/* Status message */}
      <div
        className={`p-4 rounded-lg border-2 ${config.borderColor} ${config.bgColor}`}
      >
        <p className={`text-sm font-medium ${config.color}`}>{t(`status.${status}`)}</p>
        {status === 'critical' && (
          <p className="mt-2 text-sm text-gray-700 dark:text-gray-300">
            {t('status.criticalAction')}
          </p>
        )}
      </div>

      {/* Action buttons */}
      <div className="flex flex-col gap-3 sm:flex-row">
        <Button onClick={onAddAnother} variant="default" className="flex-1">
          {useTranslations('patient.vitals.entry.buttons').t('addAnother')}
        </Button>
        <Button onClick={onViewHistory} variant="outline" className="flex-1">
          {t('viewHistory')}
        </Button>
      </div>
    </div>
  );
}
