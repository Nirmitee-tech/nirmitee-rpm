'use client';

import { useTranslations } from '@/lib/i18n/i18n-context';
import { Bluetooth, RefreshCw, WifiOff } from 'lucide-react';

interface DeviceSyncIndicatorProps {
  isConnected: boolean;
  isSyncing: boolean;
  lastSync?: Date;
  onSyncNow?: () => void;
  className?: string;
}

export function DeviceSyncIndicator({
  isConnected,
  isSyncing,
  lastSync,
  onSyncNow,
  className = '',
}: DeviceSyncIndicatorProps) {
  const { t } = useTranslations('patient.vitals.entry.deviceSync');

  const getLastSyncText = () => {
    if (!lastSync) return t('notConnected');
    const minutes = Math.floor((Date.now() - lastSync.getTime()) / 60000);
    if (minutes < 1) return t('lastSync', { time: 'just now' });
    if (minutes < 60) return t('lastSync', { time: `${minutes}m ago` });
    const hours = Math.floor(minutes / 60);
    return t('lastSync', { time: `${hours}h ago` });
  };

  return (
    <div
      className={`flex items-center justify-between p-3 rounded-lg border border-gray-200 dark:border-gray-700 ${className}`}
    >
      <div className="flex items-center gap-2">
        {isConnected ? (
          <Bluetooth className="h-5 w-5 text-blue-500" />
        ) : (
          <WifiOff className="h-5 w-5 text-gray-400" />
        )}
        <div className="flex flex-col">
          <span className="text-sm font-medium text-gray-900 dark:text-white">
            {isSyncing ? t('syncing') : isConnected ? t('connected') : t('notConnected')}
          </span>
          {lastSync && (
            <span className="text-xs text-gray-500 dark:text-gray-400">{getLastSyncText()}</span>
          )}
        </div>
      </div>

      {isConnected && onSyncNow && !isSyncing && (
        <button
          onClick={onSyncNow}
          className="flex items-center gap-1 px-3 py-1.5 text-sm text-brand hover:bg-brand/10 rounded-md transition-colors"
        >
          <RefreshCw className="h-4 w-4" />
          {t('syncNow')}
        </button>
      )}
    </div>
  );
}
