'use client';

import { Monitor, Smartphone, Tablet, MapPin, Globe, Clock } from 'lucide-react';
import { Button } from '@nirmitee/ui';
import { cn } from '@nirmitee/ui';
import { useTranslations } from '@/lib/i18n/i18n-context';
import { Session } from '@/lib/api/sessions';
import { formatDistanceToNow } from 'date-fns';

interface SessionCardProps {
  session: Session;
  onRevoke: (sessionId: string) => void;
  revoking: boolean;
}

export function SessionCard({ session, onRevoke, revoking }: SessionCardProps) {
  const { t } = useTranslations('sessions');

  const getDeviceIcon = () => {
    switch (session.deviceType) {
      case 'mobile':
        return <Smartphone className="h-5 w-5" />;
      case 'tablet':
        return <Tablet className="h-5 w-5" />;
      default:
        return <Monitor className="h-5 w-5" />;
    }
  };

  const getDeviceLabel = () => {
    return t(`deviceTypes.${session.deviceType}` as any) || session.deviceType;
  };

  const formatLastActive = () => {
    return formatDistanceToNow(new Date(session.lastActive), { addSuffix: true });
  };

  return (
    <div
      className={cn(
        'p-5 rounded-xl border transition-all',
        session.isCurrent
          ? 'border-[#745EE1] bg-[#745EE1]/5 ring-2 ring-[#745EE1]/20'
          : 'border-[#E5E5E5] dark:border-[#212121] bg-white dark:bg-[#0a0a0a]'
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3 flex-1">
          <div
            className={cn(
              'h-10 w-10 rounded-lg flex items-center justify-center shrink-0',
              session.isCurrent
                ? 'bg-[#745EE1]/20 text-[#745EE1]'
                : 'bg-[#F5F5F5] dark:bg-[#171717] text-[#737373]'
            )}
          >
            {getDeviceIcon()}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-medium text-[#171717] dark:text-white">
                {getDeviceLabel()}
              </h3>
              {session.isCurrent && (
                <span className="px-2 py-0.5 text-xs font-medium bg-[#745EE1] text-white rounded">
                  {t('currentSession')}
                </span>
              )}
            </div>

            <div className="space-y-1 text-sm text-[#737373]">
              <div className="flex items-center gap-2">
                <Globe className="h-3.5 w-3.5" />
                <span>
                  {session.browser} • {session.os}
                </span>
              </div>

              {session.location && (
                <div className="flex items-center gap-2">
                  <MapPin className="h-3.5 w-3.5" />
                  <span>{session.location}</span>
                </div>
              )}

              {session.ipAddress && (
                <div className="flex items-center gap-2">
                  <Globe className="h-3.5 w-3.5" />
                  <span className="font-mono text-xs">{session.ipAddress}</span>
                </div>
              )}

              <div className="flex items-center gap-2">
                <Clock className="h-3.5 w-3.5" />
                <span>
                  {t('lastActive')}: {formatLastActive()}
                </span>
              </div>
            </div>
          </div>
        </div>

        {!session.isCurrent && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => onRevoke(session.id)}
            disabled={revoking}
            className="shrink-0"
          >
            {revoking ? t('revoking') : t('revoke')}
          </Button>
        )}
      </div>
    </div>
  );
}
