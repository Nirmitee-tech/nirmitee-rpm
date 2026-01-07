'use client';

import { Subscription } from '@/lib/api/billing';
import { useTranslations } from '@/lib/i18n/i18n-context';
import { cn } from '@nirmitee/ui';
import { CreditCard, Calendar, AlertCircle } from 'lucide-react';

interface SubscriptionStatusProps {
  subscription: Subscription | null;
  className?: string;
}

export function SubscriptionStatus({ subscription, className }: SubscriptionStatusProps) {
  const { t } = useTranslations('billing');

  if (!subscription) {
    return (
      <div className={cn('p-6 bg-white dark:bg-[#0a0a0a] border border-[#E5E5E5] dark:border-[#212121] rounded-xl', className)}>
        <div className="flex items-center gap-3 mb-4">
          <div className="h-12 w-12 rounded-lg bg-[#F5F5F5] dark:bg-[#171717] flex items-center justify-center">
            <CreditCard className="h-6 w-6 text-[#737373]" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-[#171717] dark:text-white">
              {t('freePlan')}
            </h3>
            <p className="text-sm text-[#737373]">No active subscription</p>
          </div>
        </div>
      </div>
    );
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const getStatusColor = (status: Subscription['status']) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
      case 'trialing':
        return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';
      case 'canceled':
        return 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400';
      case 'past_due':
      case 'unpaid':
        return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
      default:
        return 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400';
    }
  };

  return (
    <div className={cn('p-6 bg-white dark:bg-[#0a0a0a] border border-[#E5E5E5] dark:border-[#212121] rounded-xl', className)}>
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-lg bg-[#745EE1]/10 flex items-center justify-center">
            <CreditCard className="h-6 w-6 text-[#745EE1]" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-[#171717] dark:text-white">
              {subscription.planName}
            </h3>
            <p className="text-sm text-[#737373]">{t('currentPlan')}</p>
          </div>
        </div>
        <span className={cn('px-3 py-1 rounded-full text-xs font-medium', getStatusColor(subscription.status))}>
          {t(`status.${subscription.status}`)}
        </span>
      </div>

      <div className="space-y-3">
        <div className="flex items-center gap-2 text-sm">
          <Calendar className="h-4 w-4 text-[#737373]" />
          <span className="text-[#737373]">{t('billingPeriod')}:</span>
          <span className="text-[#171717] dark:text-white font-medium">
            {formatDate(subscription.currentPeriodStart)} - {formatDate(subscription.currentPeriodEnd)}
          </span>
        </div>

        {subscription.cancelAtPeriodEnd && (
          <div className="flex items-start gap-2 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
            <AlertCircle className="h-4 w-4 text-yellow-600 dark:text-yellow-400 mt-0.5" />
            <div className="text-xs">
              <p className="font-medium text-yellow-800 dark:text-yellow-300">
                {t('canceledAt')}
              </p>
              <p className="text-yellow-700 dark:text-yellow-400 mt-1">
                Access continues until {formatDate(subscription.currentPeriodEnd)}
              </p>
            </div>
          </div>
        )}

        {subscription.status === 'trialing' && subscription.trialEnd && (
          <div className="flex items-start gap-2 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <AlertCircle className="h-4 w-4 text-blue-600 dark:text-blue-400 mt-0.5" />
            <div className="text-xs">
              <p className="font-medium text-blue-800 dark:text-blue-300">
                {t('trialEnds')}: {formatDate(subscription.trialEnd)}
              </p>
            </div>
          </div>
        )}

        {(subscription.status === 'past_due' || subscription.status === 'unpaid') && (
          <div className="flex items-start gap-2 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
            <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400 mt-0.5" />
            <div className="text-xs">
              <p className="font-medium text-red-800 dark:text-red-300">
                Payment Required
              </p>
              <p className="text-red-700 dark:text-red-400 mt-1">
                Please update your payment method to avoid service interruption
              </p>
            </div>
          </div>
        )}

        {!subscription.cancelAtPeriodEnd && subscription.status === 'active' && (
          <div className="pt-2 border-t border-[#E5E5E5] dark:border-[#212121]">
            <p className="text-xs text-[#737373]">
              {t('nextBillingDate')}: <span className="text-[#171717] dark:text-white font-medium">{formatDate(subscription.currentPeriodEnd)}</span>
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
