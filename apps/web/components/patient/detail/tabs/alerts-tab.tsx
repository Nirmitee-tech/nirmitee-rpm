'use client';

import { useState } from 'react';
import { useTranslations } from '@/lib/i18n/i18n-context';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@nirmitee/ui';
import {
  AlertCircle,
  AlertTriangle,
  Info,
  CheckCircle,
  Clock,
  RefreshCw,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Alert } from '@/lib/api/patients';

// Types based on Prisma schema
type AlertSeverity = 'LOW' | 'MODERATE' | 'SIGNIFICANT' | 'CRITICAL';
type AlertStatus = 'NEW' | 'ACKNOWLEDGED' | 'ESCALATED' | 'RESOLVED';

interface AlertsTabProps {
  patientId: string;
  alerts: Alert[];
  isLoading: boolean;
  onAcknowledge: (alertId: string) => Promise<void>;
  onResolve: (alertId: string, resolution: string) => Promise<void>;
  onRefresh: () => void;
}

type FilterStatus = 'ALL' | 'NEW' | 'ACKNOWLEDGED' | 'ESCALATED' | 'RESOLVED';

export function AlertsTab({
  patientId,
  alerts,
  isLoading,
  onAcknowledge,
  onResolve,
  onRefresh,
}: AlertsTabProps) {
  const { t } = useTranslations('patient.alerts');
  const { t: tCommon } = useTranslations('common');
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('ALL');
  const [resolvingAlertId, setResolvingAlertId] = useState<string | null>(null);
  const [resolutionText, setResolutionText] = useState('');
  const [processingAlertId, setProcessingAlertId] = useState<string | null>(null);

  // Filter alerts by status
  const filteredAlerts = alerts.filter((alert) => {
    if (filterStatus === 'ALL') return true;
    return alert.status === filterStatus;
  });

  // Count alerts by status
  const statusCounts = {
    ALL: alerts.length,
    NEW: alerts.filter((a) => a.status === 'NEW').length,
    ACKNOWLEDGED: alerts.filter((a) => a.status === 'ACKNOWLEDGED').length,
    ESCALATED: alerts.filter((a) => a.status === 'ESCALATED').length,
    RESOLVED: alerts.filter((a) => a.status === 'RESOLVED').length,
  };

  const getSeverityStyles = (severity: AlertSeverity) => {
    switch (severity) {
      case 'CRITICAL':
        return {
          badge: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-200',
          icon: AlertCircle,
          iconColor: 'text-red-600 dark:text-red-400',
        };
      case 'SIGNIFICANT':
        return {
          badge: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-200',
          icon: AlertTriangle,
          iconColor: 'text-orange-600 dark:text-orange-400',
        };
      case 'MODERATE':
        return {
          badge: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-200',
          icon: AlertTriangle,
          iconColor: 'text-yellow-600 dark:text-yellow-400',
        };
      case 'LOW':
      default:
        return {
          badge: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-200',
          icon: Info,
          iconColor: 'text-blue-600 dark:text-blue-400',
        };
    }
  };

  const getStatusBadgeStyles = (status: AlertStatus) => {
    switch (status) {
      case 'NEW':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-200';
      case 'ACKNOWLEDGED':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-200';
      case 'ESCALATED':
        return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-200';
      case 'RESOLVED':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-200';
    }
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return t('justNow', { default: 'Just now' });
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  const handleAcknowledge = async (alertId: string) => {
    setProcessingAlertId(alertId);
    try {
      await onAcknowledge(alertId);
    } finally {
      setProcessingAlertId(null);
    }
  };

  const handleResolveClick = (alertId: string) => {
    setResolvingAlertId(alertId);
    setResolutionText('');
  };

  const handleResolveSave = async (alertId: string) => {
    if (!resolutionText.trim()) return;

    setProcessingAlertId(alertId);
    try {
      await onResolve(alertId, resolutionText);
      setResolvingAlertId(null);
      setResolutionText('');
    } finally {
      setProcessingAlertId(null);
    }
  };

  const handleResolveCancel = () => {
    setResolvingAlertId(null);
    setResolutionText('');
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 animate-spin text-gray-400 mx-auto mb-2" />
          <p className="text-sm text-gray-500">{tCommon('loading')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filter Bar */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2 flex-wrap">
          {(['ALL', 'NEW', 'ACKNOWLEDGED', 'RESOLVED'] as const).map((status) => (
            <button
              key={status}
              onClick={() => setFilterStatus(status)}
              className={cn(
                'px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
                'border',
                filterStatus === status
                  ? 'bg-[#745EE1] text-white border-[#745EE1]'
                  : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700'
              )}
            >
              {t(`filters.${status.toLowerCase()}` as any)}
              <span className="ml-1.5 text-xs opacity-75">({statusCounts[status]})</span>
            </button>
          ))}
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={onRefresh}
          className="flex items-center gap-2"
        >
          <RefreshCw className="w-4 h-4" />
          {tCommon('tryAgain', { default: 'Refresh' })}
        </Button>
      </div>

      {/* Alert Cards */}
      {filteredAlerts.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-3" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-1">
              {t('empty.noAlertsFound')}
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {t('empty.description')}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredAlerts.map((alert) => {
            const severityConfig = getSeverityStyles(alert.severity);
            const SeverityIcon = severityConfig.icon;
            const isResolving = resolvingAlertId === alert.id;
            const isProcessing = processingAlertId === alert.id;

            return (
              <Card key={alert.id} className="overflow-hidden">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    {/* Severity Icon */}
                    <div className="flex-shrink-0 mt-0.5">
                      <SeverityIcon className={cn('w-5 h-5', severityConfig.iconColor)} />
                    </div>

                    {/* Alert Content */}
                    <div className="flex-1 min-w-0 space-y-2">
                      {/* Header: Severity & Status */}
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge className={cn('text-xs font-medium', severityConfig.badge)}>
                          {t(`severity.${alert.severity.toLowerCase()}` as any)}
                        </Badge>
                        <Badge className={cn('text-xs font-medium', getStatusBadgeStyles(alert.status))}>
                          {t(`status.${alert.status.toLowerCase()}` as any)}
                        </Badge>
                        <span className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {formatTimestamp(alert.createdAt)}
                        </span>
                      </div>

                      {/* Alert Message */}
                      <p className="text-sm text-gray-900 dark:text-gray-100 font-medium">
                        {alert.message}
                      </p>

                      {/* Resolution Info (if resolved) */}
                      {alert.status === 'RESOLVED' && alert.resolution && (
                        <div className="mt-3 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                          <div className="flex items-start gap-2">
                            <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0" />
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-medium text-green-900 dark:text-green-100 mb-1">
                                {t('resolution.resolution')}
                              </p>
                              <p className="text-xs text-green-700 dark:text-green-300">
                                {alert.resolution}
                              </p>
                              {alert.resolvedAt && (
                                <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                                  {formatTimestamp(alert.resolvedAt)}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Resolution Input (if resolving) */}
                      {isResolving && (
                        <div className="mt-3 space-y-2">
                          <label className="block text-xs font-medium text-gray-700 dark:text-gray-300">
                            {t('actions.enterResolution')}
                          </label>
                          <textarea
                            value={resolutionText}
                            onChange={(e) => setResolutionText(e.target.value)}
                            placeholder={t('actions.resolutionPlaceholder')}
                            className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-[#745EE1] focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                            rows={3}
                          />
                          <div className="flex items-center gap-2">
                            <Button
                              size="sm"
                              onClick={() => handleResolveSave(alert.id)}
                              disabled={!resolutionText.trim() || isProcessing}
                              className="bg-[#745EE1] hover:bg-[#5d4ab8] text-white"
                            >
                              {isProcessing ? t('actions.resolving') : t('actions.resolve')}
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={handleResolveCancel}
                              disabled={isProcessing}
                            >
                              {t('actions.cancelResolve')}
                            </Button>
                          </div>
                        </div>
                      )}

                      {/* Action Buttons */}
                      {!isResolving && (
                        <div className="flex items-center gap-2 mt-3">
                          {alert.status === 'NEW' && (
                            <Button
                              size="sm"
                              onClick={() => handleAcknowledge(alert.id)}
                              disabled={isProcessing}
                              className="bg-[#745EE1] hover:bg-[#5d4ab8] text-white"
                            >
                              {isProcessing && processingAlertId === alert.id
                                ? t('actions.acknowledging')
                                : t('actions.acknowledge')}
                            </Button>
                          )}
                          {alert.status === 'ACKNOWLEDGED' && (
                            <Button
                              size="sm"
                              onClick={() => handleResolveClick(alert.id)}
                              disabled={isProcessing}
                              className="bg-[#745EE1] hover:bg-[#5d4ab8] text-white"
                            >
                              {t('actions.resolve')}
                            </Button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
