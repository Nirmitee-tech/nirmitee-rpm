'use client';

import { useState, useEffect } from 'react';
import { CheckCircle, AlertCircle, AlertTriangle, Info, RefreshCw } from 'lucide-react';
import { useTranslations } from '@/lib/i18n/i18n-context';
import { cn } from '@/lib/utils';
import { patientPortalApi, PatientAlert } from '@/lib/api';

export default function MyAlertsPage() {
  const { t } = useTranslations('patient.alerts');
  const { t: tCommon } = useTranslations('common');
  const [alerts, setAlerts] = useState<PatientAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [markingRead, setMarkingRead] = useState(false);

  // Fetch alerts
  const fetchAlerts = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await patientPortalApi.getAlerts();
      setAlerts(response.data || []);
    } catch (err) {
      console.error('Failed to fetch alerts:', err);
      setError('Failed to load alerts');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAlerts();
  }, []);

  // Mark all as read
  const handleMarkAllRead = async () => {
    try {
      setMarkingRead(true);
      await patientPortalApi.markAllAlertsRead();
      // Update local state
      setAlerts(prev => prev.map(a => ({ ...a, read: true })));
    } catch (err) {
      console.error('Failed to mark alerts as read:', err);
    } finally {
      setMarkingRead(false);
    }
  };

  // Mark single alert as read
  const handleMarkRead = async (alertId: string) => {
    try {
      await patientPortalApi.markAlertRead(alertId);
      // Update local state
      setAlerts(prev => prev.map(a =>
        a.id === alertId ? { ...a, read: true } : a
      ));
    } catch (err) {
      console.error('Failed to mark alert as read:', err);
    }
  };

  const getSeverityIcon = (severity: PatientAlert['severity']) => {
    switch (severity) {
      case 'CRITICAL':
        return <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400" />;
      case 'WARNING':
        return <AlertTriangle className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />;
      default:
        return <Info className="h-5 w-5 text-blue-600 dark:text-blue-400" />;
    }
  };

  const getSeverityColor = (severity: PatientAlert['severity']) => {
    switch (severity) {
      case 'CRITICAL':
        return 'border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950';
      case 'WARNING':
        return 'border-yellow-200 bg-yellow-50 dark:border-yellow-800 dark:bg-yellow-950';
      default:
        return 'border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12 p-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-600 mx-auto mb-2"></div>
          <p className="text-sm text-gray-500">{tCommon('loading')}</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-12 p-4">
        <AlertCircle className="w-12 h-12 text-red-400 mb-4" />
        <p className="text-gray-600 mb-4">{error}</p>
        <button
          onClick={fetchAlerts}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-brand-600 hover:text-brand-700 border border-brand-300 rounded-lg"
        >
          <RefreshCw className="w-4 h-4" />
          {tCommon('retry')}
        </button>
      </div>
    );
  }

  const unreadCount = alerts.filter(a => !a.read).length;

  return (
    <div className="space-y-4 p-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">
          {t('title')}
        </h1>
        {unreadCount > 0 && (
          <button
            type="button"
            onClick={handleMarkAllRead}
            disabled={markingRead}
            className="text-sm font-medium text-brand-600 hover:text-brand-700 dark:text-brand-400 disabled:opacity-50"
          >
            {markingRead ? tCommon('loading') : t('markAllRead')}
          </button>
        )}
      </div>

      {/* Alerts List */}
      <div className="space-y-3">
        {alerts.length > 0 ? (
          alerts.map((alert) => (
            <div
              key={alert.id}
              onClick={() => !alert.read && handleMarkRead(alert.id)}
              className={cn(
                'rounded-lg border p-4 transition-colors cursor-pointer',
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
                    {new Date(alert.createdAt).toLocaleString()}
                  </p>
                </div>
                {!alert.read && (
                  <div className="w-2 h-2 rounded-full bg-brand-500 mt-2"></div>
                )}
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
