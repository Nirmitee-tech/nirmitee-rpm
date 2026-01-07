'use client';

import { useTranslations } from '@/lib/i18n/i18n-context';
import { cn } from '@nirmitee/ui';

interface UsageMeterProps {
  label: string;
  used: number;
  limit: number;
  unit?: string;
  className?: string;
}

export function UsageMeter({ label, used, limit, unit = '', className }: UsageMeterProps) {
  const { t } = useTranslations('billing');
  const percentage = Math.min((used / limit) * 100, 100);
  const isNearLimit = percentage >= 80;
  const isAtLimit = percentage >= 100;

  return (
    <div className={cn('space-y-2', className)}>
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium text-[#171717] dark:text-white">{label}</span>
        <span className="text-[#737373]">
          {used.toLocaleString()} {t('of')} {limit.toLocaleString()} {unit}
        </span>
      </div>
      <div className="h-2 bg-[#F5F5F5] dark:bg-[#171717] rounded-full overflow-hidden">
        <div
          className={cn(
            'h-full rounded-full transition-all duration-300',
            isAtLimit
              ? 'bg-red-500'
              : isNearLimit
                ? 'bg-yellow-500'
                : 'bg-[#745EE1]'
          )}
          style={{ width: `${percentage}%` }}
        />
      </div>
      {isNearLimit && (
        <p className={cn(
          'text-xs',
          isAtLimit ? 'text-red-600 dark:text-red-400' : 'text-yellow-600 dark:text-yellow-400'
        )}>
          {isAtLimit
            ? 'Limit reached - Upgrade to continue'
            : 'Approaching limit - Consider upgrading'
          }
        </p>
      )}
    </div>
  );
}
