'use client';

import { Plan } from '@/lib/api/billing';
import { useTranslations } from '@/lib/i18n/i18n-context';
import { Button } from '@nirmitee/ui';
import { cn } from '@nirmitee/ui';
import { Check } from 'lucide-react';

interface PlanCardProps {
  plan: Plan;
  isCurrentPlan?: boolean;
  isMostPopular?: boolean;
  onSelect?: (plan: Plan) => void;
  loading?: boolean;
  className?: string;
}

export function PlanCard({
  plan,
  isCurrentPlan = false,
  isMostPopular = false,
  onSelect,
  loading = false,
  className,
}: PlanCardProps) {
  const { t } = useTranslations('billing.plans');

  return (
    <div
      className={cn(
        'relative p-6 border-2 rounded-xl transition-all',
        isCurrentPlan
          ? 'border-[#745EE1] bg-[#745EE1]/5'
          : isMostPopular
            ? 'border-[#745EE1] shadow-lg'
            : 'border-[#E5E5E5] dark:border-[#212121] hover:border-[#745EE1]/50',
        className
      )}
    >
      {isMostPopular && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <span className="px-3 py-1 bg-[#745EE1] text-white text-xs font-medium rounded-full">
            {t('mostPopular')}
          </span>
        </div>
      )}

      <div className="text-center mb-6">
        <h3 className="text-xl font-bold text-[#171717] dark:text-white mb-2">
          {plan.name}
        </h3>
        <p className="text-sm text-[#737373] mb-4">{plan.description}</p>
        <div className="flex items-baseline justify-center gap-1">
          <span className="text-4xl font-bold text-[#171717] dark:text-white">
            ${plan.price}
          </span>
          <span className="text-[#737373]">
            {plan.interval === 'month' ? t('perMonth') : t('perYear')}
          </span>
        </div>
      </div>

      <div className="mb-6">
        <p className="text-xs font-semibold text-[#737373] uppercase tracking-wider mb-3">
          {t('features')}
        </p>
        <ul className="space-y-2">
          {plan.features.map((feature, index) => (
            <li key={index} className="flex items-start gap-2">
              <Check className="h-5 w-5 text-[#745EE1] shrink-0 mt-0.5" />
              <span className="text-sm text-[#171717] dark:text-white">{feature}</span>
            </li>
          ))}
        </ul>
      </div>

      {plan.limits && Object.keys(plan.limits).length > 0 && (
        <div className="mb-6 pt-4 border-t border-[#E5E5E5] dark:border-[#212121]">
          <p className="text-xs font-semibold text-[#737373] uppercase tracking-wider mb-2">
            Limits
          </p>
          <div className="space-y-1">
            {Object.entries(plan.limits).map(([key, value]) => (
              <div key={key} className="flex justify-between text-sm">
                <span className="text-[#737373] capitalize">{key}:</span>
                <span className="text-[#171717] dark:text-white font-medium">
                  {value === -1 ? 'Unlimited' : value.toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {onSelect && (
        <Button
          onClick={() => onSelect(plan)}
          disabled={isCurrentPlan || loading}
          className="w-full"
          variant={isCurrentPlan ? 'outline' : 'default'}
        >
          {isCurrentPlan ? t('currentPlan') : t('selectPlan')}
        </Button>
      )}
    </div>
  );
}
