'use client';

import { Monitor, Globe } from 'lucide-react';
import { AuditLog } from '@/lib/api/audit';
import { useTranslations } from '@/lib/i18n/i18n-context';

interface AuditLogDetailProps {
  log: AuditLog;
}

export function AuditLogDetail({ log }: AuditLogDetailProps) {
  const { t } = useTranslations('audit');

  const parseUserAgent = (userAgent?: string) => {
    if (!userAgent) return { browser: 'Unknown', os: 'Unknown' };

    let browser = 'Unknown';
    let os = 'Unknown';

    // Detect Browser
    if (userAgent.includes('Chrome')) browser = 'Chrome';
    else if (userAgent.includes('Firefox')) browser = 'Firefox';
    else if (userAgent.includes('Safari')) browser = 'Safari';
    else if (userAgent.includes('Edge')) browser = 'Edge';
    else if (userAgent.includes('Opera')) browser = 'Opera';

    // Detect OS
    if (userAgent.includes('Windows')) os = 'Windows';
    else if (userAgent.includes('Mac OS')) os = 'macOS';
    else if (userAgent.includes('Linux')) os = 'Linux';
    else if (userAgent.includes('Android')) os = 'Android';
    else if (userAgent.includes('iOS')) os = 'iOS';

    return { browser, os };
  };

  const { browser, os } = parseUserAgent(log.userAgent);

  return (
    <div className="space-y-4">
      {/* Device Info */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm font-medium text-[#171717] dark:text-white">
            <Monitor className="h-4 w-4 text-[#745EE1]" />
            {t('deviceInfo')}
          </div>
          <div className="ml-6 space-y-1">
            <div className="text-sm">
              <span className="text-[#737373]">{t('browser')}:</span>{' '}
              <span className="text-[#171717] dark:text-white">{browser}</span>
            </div>
            <div className="text-sm">
              <span className="text-[#737373]">{t('os')}:</span>{' '}
              <span className="text-[#171717] dark:text-white">{os}</span>
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm font-medium text-[#171717] dark:text-white">
            <Globe className="h-4 w-4 text-[#745EE1]" />
            {t('columns.ipAddress')}
          </div>
          <div className="ml-6">
            <div className="text-sm font-mono text-[#171717] dark:text-white">
              {log.ipAddress || 'N/A'}
            </div>
          </div>
        </div>
      </div>

      {/* Metadata */}
      {log.metadata && Object.keys(log.metadata).length > 0 && (
        <div className="space-y-2">
          <div className="text-sm font-medium text-[#171717] dark:text-white">
            {t('metadata')}
          </div>
          <div className="bg-[#F5F5F5] dark:bg-[#171717] rounded-lg p-3 overflow-x-auto">
            <pre className="text-xs font-mono text-[#171717] dark:text-white">
              {JSON.stringify(log.metadata, null, 2)}
            </pre>
          </div>
        </div>
      )}

      {/* User Agent (Full) */}
      {log.userAgent && (
        <div className="space-y-2">
          <div className="text-sm font-medium text-[#171717] dark:text-white">
            {t('userAgent')}
          </div>
          <div className="bg-[#F5F5F5] dark:bg-[#171717] rounded-lg p-3">
            <pre className="text-xs font-mono text-[#737373] break-all whitespace-pre-wrap">
              {log.userAgent}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}
