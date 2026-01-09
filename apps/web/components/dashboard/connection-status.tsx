'use client';

import { Wifi, WifiOff, AlertCircle } from 'lucide-react';
import { useTranslations } from '@/lib/i18n/i18n-context';

interface ConnectionStatusProps {
  isConnected: boolean;
  error?: string | null;
  className?: string;
}

export function ConnectionStatus({ isConnected, error, className = '' }: ConnectionStatusProps) {
  const { t } = useTranslations('dashboard.realtime');

  if (error) {
    return (
      <div
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 ${className}`}
      >
        <AlertCircle className="h-3 w-3" />
        <span>{t('error')}</span>
      </div>
    );
  }

  if (isConnected) {
    return (
      <div
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 ${className}`}
      >
        <Wifi className="h-3 w-3" />
        <span>{t('connected')}</span>
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
        </span>
      </div>
    );
  }

  return (
    <div
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 ${className}`}
    >
      <WifiOff className="h-3 w-3" />
      <span>{t('disconnected')}</span>
    </div>
  );
}
