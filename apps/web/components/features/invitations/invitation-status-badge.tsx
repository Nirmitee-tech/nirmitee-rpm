'use client';

import { Clock, CheckCircle, XCircle, Ban } from 'lucide-react';
import { useTranslations } from '@/lib/i18n/i18n-context';
import { cn } from '@nirmitee/ui';

type InvitationStatus = 'PENDING' | 'ACCEPTED' | 'EXPIRED' | 'REVOKED';

interface InvitationStatusBadgeProps {
  status: InvitationStatus;
  expiresAt?: string;
  className?: string;
}

export function InvitationStatusBadge({ status, expiresAt, className }: InvitationStatusBadgeProps) {
  const { t } = useTranslations('invitations.status');

  const getTimeUntilExpiry = () => {
    if (!expiresAt || status !== 'PENDING') return null;

    const expiryDate = new Date(expiresAt);
    const now = new Date();
    const diffMs = expiryDate.getTime() - now.getTime();

    if (diffMs < 0) return null;

    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d`;
    if (hours > 0) return `${hours}h`;
    return '<1h';
  };

  const timeRemaining = getTimeUntilExpiry();

  const statusConfig: Record<InvitationStatus, {
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    bgColor: string;
    textColor: string;
    iconColor: string;
  }> = {
    PENDING: {
      label: t('pending'),
      icon: Clock,
      bgColor: 'bg-amber-50 dark:bg-amber-900/20',
      textColor: 'text-amber-700 dark:text-amber-400',
      iconColor: 'text-amber-500 dark:text-amber-500',
    },
    ACCEPTED: {
      label: t('accepted'),
      icon: CheckCircle,
      bgColor: 'bg-emerald-50 dark:bg-emerald-900/20',
      textColor: 'text-emerald-700 dark:text-emerald-400',
      iconColor: 'text-emerald-500 dark:text-emerald-500',
    },
    EXPIRED: {
      label: t('expired'),
      icon: XCircle,
      bgColor: 'bg-red-50 dark:bg-red-900/20',
      textColor: 'text-red-700 dark:text-red-400',
      iconColor: 'text-red-500 dark:text-red-500',
    },
    REVOKED: {
      label: t('revoked'),
      icon: Ban,
      bgColor: 'bg-gray-50 dark:bg-gray-900/20',
      textColor: 'text-gray-700 dark:text-gray-400',
      iconColor: 'text-gray-500 dark:text-gray-500',
    },
  };

  const config = statusConfig[status];
  const Icon = config.icon;

  return (
    <div className={cn('inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium', config.bgColor, config.textColor, className)}>
      <Icon className={cn('h-3.5 w-3.5', config.iconColor)} />
      <span>{config.label}</span>
      {timeRemaining && status === 'PENDING' && (
        <span className="ml-0.5 opacity-75">({timeRemaining})</span>
      )}
    </div>
  );
}
