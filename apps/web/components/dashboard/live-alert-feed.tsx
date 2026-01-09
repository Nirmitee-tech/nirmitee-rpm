'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  AlertTriangle,
  AlertCircle,
  Info,
  ChevronRight,
  Clock,
  User,
  Bell,
  X,
} from 'lucide-react';
import { Button } from '@nirmitee/ui';
import { useTranslations } from '@/lib/i18n/i18n-context';
import { formatDistanceToNow } from 'date-fns';

interface Alert {
  id: string;
  patientId: string;
  patientName: string;
  severity: 'CRITICAL' | 'SIGNIFICANT' | 'INFORMATIONAL';
  title: string;
  message: string;
  vitalType?: string;
  status: string;
  escalationLevel: number;
  assignedToId?: string;
  createdAt: string;
}

interface LiveAlertFeedProps {
  alerts: Alert[];
  maxDisplay?: number;
  onDismiss?: (alertId: string) => void;
  emptyMessage?: string;
}

const severityConfig = {
  CRITICAL: {
    icon: AlertTriangle,
    bgColor: 'bg-red-50 dark:bg-red-900/20',
    borderColor: 'border-l-red-500',
    iconColor: 'text-red-500',
    badgeColor: 'bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300',
  },
  SIGNIFICANT: {
    icon: AlertCircle,
    bgColor: 'bg-amber-50 dark:bg-amber-900/20',
    borderColor: 'border-l-amber-500',
    iconColor: 'text-amber-500',
    badgeColor: 'bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300',
  },
  INFORMATIONAL: {
    icon: Info,
    bgColor: 'bg-blue-50 dark:bg-blue-900/20',
    borderColor: 'border-l-blue-500',
    iconColor: 'text-blue-500',
    badgeColor: 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300',
  },
};

export function LiveAlertFeed({
  alerts,
  maxDisplay = 5,
  onDismiss,
  emptyMessage,
}: LiveAlertFeedProps) {
  const { t } = useTranslations('dashboard.realtime');
  const displayedAlerts = alerts.slice(0, maxDisplay);

  if (alerts.length === 0) {
    return (
      <div className="bg-white dark:bg-gradient-to-br dark:from-[#0f0f1a] dark:to-[#15122a] border border-[#E5E5E5] dark:border-[#1f1f2e] rounded-xl p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <Bell className="h-5 w-5 text-[#745EE1]" />
            {t('liveAlerts')}
          </h3>
        </div>
        <div className="py-8 text-center text-gray-400">
          <Bell className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">{emptyMessage || t('noAlerts')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gradient-to-br dark:from-[#0f0f1a] dark:to-[#15122a] border border-[#E5E5E5] dark:border-[#1f1f2e] rounded-xl p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
          <Bell className="h-5 w-5 text-[#745EE1]" />
          {t('liveAlerts')}
          {alerts.length > 0 && (
            <span className="ml-2 px-2 py-0.5 text-xs rounded-full bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300">
              {alerts.length}
            </span>
          )}
        </h3>
        <Link
          href="/alerts"
          className="text-sm text-[#745EE1] hover:underline flex items-center gap-1"
        >
          {t('viewAll')}
          <ChevronRight className="h-4 w-4" />
        </Link>
      </div>

      <div className="space-y-3">
        {displayedAlerts.map((alert) => {
          const config = severityConfig[alert.severity];
          const Icon = config.icon;

          return (
            <div
              key={alert.id}
              className={`relative p-3 rounded-lg border-l-4 ${config.bgColor} ${config.borderColor} transition-all hover:shadow-sm`}
            >
              {onDismiss && (
                <button
                  onClick={() => onDismiss(alert.id)}
                  className="absolute top-2 right-2 p-1 rounded-full hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
                >
                  <X className="h-3.5 w-3.5 text-gray-400" />
                </button>
              )}

              <div className="flex items-start gap-3">
                <div className={`mt-0.5 ${config.iconColor}`}>
                  <Icon className="h-5 w-5" />
                </div>

                <div className="flex-1 min-w-0 pr-6">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`px-2 py-0.5 text-xs font-medium rounded ${config.badgeColor}`}>
                      {alert.severity}
                    </span>
                    {alert.escalationLevel > 0 && (
                      <span className="px-2 py-0.5 text-xs font-medium rounded bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-300">
                        L{alert.escalationLevel}
                      </span>
                    )}
                  </div>

                  <h4 className="mt-1 font-medium text-gray-900 dark:text-white text-sm truncate">
                    {alert.title}
                  </h4>

                  <p className="mt-0.5 text-xs text-gray-600 dark:text-gray-400 line-clamp-2">
                    {alert.message}
                  </p>

                  <div className="mt-2 flex items-center gap-3 text-xs text-gray-500">
                    <Link
                      href={`/patients/${alert.patientId}`}
                      className="flex items-center gap-1 hover:text-[#745EE1]"
                    >
                      <User className="h-3 w-3" />
                      {alert.patientName}
                    </Link>
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {formatDistanceToNow(new Date(alert.createdAt), { addSuffix: true })}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {alerts.length > maxDisplay && (
        <div className="mt-3 text-center">
          <Link href="/alerts">
            <Button variant="ghost" size="sm">
              {t('viewMore', { count: alerts.length - maxDisplay })}
            </Button>
          </Link>
        </div>
      )}
    </div>
  );
}
