'use client';

import { CheckCircle, AlertCircle, AlertTriangle, Info, Bell as BellIcon } from 'lucide-react';
import { useTranslations } from '@/lib/i18n/i18n-context';
import { cn } from '@/lib/utils';

interface Alert {
  id: string;
  type: 'VITAL_READING' | 'MEDICATION_REMINDER' | 'APPOINTMENT' | 'MESSAGE';
  title: string;
  message: string;
  severity: 'INFO' | 'WARNING' | 'CRITICAL';
  createdAt: Date;
  read: boolean;
}

export default function MyAlertsPage() {
  const { t } = useTranslations('patient.alerts');

  // Mock alerts
  const mockAlerts: Alert[] = [
    {
      id: '1',
      type: 'VITAL_READING',
      title: 'Blood Pressure Reading',
      message: 'Your blood pressure is within normal range',
      severity: 'INFO',
      createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
      read: false,
    },
    {
      id: '2',
      type: 'MEDICATION_REMINDER',
      title: 'Medication Due',
      message: 'Time to take your morning medication',
      severity: 'WARNING',
      createdAt: new Date(Date.now() - 4 * 60 * 60 * 1000),
      read: false,
    },
    {
      id: '3',
      type: 'APPOINTMENT',
      title: 'Upcoming Appointment',
      message: 'Checkup with Dr. Johnson tomorrow at 10:00 AM',
      severity: 'INFO',
      createdAt: new Date(Date.now() - 26 * 60 * 60 * 1000),
      read: true,
    },
  ];

  const getSeverityIcon = (severity: Alert['severity']) => {
    switch (severity) {
      case 'CRITICAL':
        return <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400" />;
      case 'WARNING':
        return <AlertTriangle className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />;
      default:
        return <Info className="h-5 w-5 text-blue-600 dark:text-blue-400" />;
    }
  };

  const getSeverityColor = (severity: Alert['severity']) => {
    switch (severity) {
      case 'CRITICAL':
        return 'border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950';
      case 'WARNING':
        return 'border-yellow-200 bg-yellow-50 dark:border-yellow-800 dark:bg-yellow-950';
      default:
        return 'border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950';
    }
  };

  return (
    <div className="space-y-4 p-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">
          {t('title')}
        </h1>
        <button
          type="button"
          className="text-sm font-medium text-brand-600 hover:text-brand-700 dark:text-brand-400"
        >
          {t('markAllRead')}
        </button>
      </div>

      {/* Alerts List */}
      <div className="space-y-3">
        {mockAlerts.length > 0 ? (
          mockAlerts.map((alert) => (
            <div
              key={alert.id}
              className={cn(
                'rounded-lg border p-4 transition-colors',
                getSeverityColor(alert.severity),
                !alert.read && 'ring-2 ring-brand-500/20'
              )}
            >
              <div className="flex items-start gap-3">
                {getSeverityIcon(alert.severity)}
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                    {alert.title}
                  </h3>
                  <p className="mt-1 text-sm text-gray-700 dark:text-gray-300">
                    {alert.message}
                  </p>
                  <p className="mt-2 text-xs text-gray-500 dark:text-gray-500">
                    {alert.createdAt.toLocaleString()}
                  </p>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="rounded-lg border border-gray-200 bg-white p-8 text-center dark:border-gray-800 dark:bg-gray-900">
            <CheckCircle className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-600" />
            <p className="mt-3 text-sm text-gray-600 dark:text-gray-400">
              {t('noAlerts')}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
