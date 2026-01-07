'use client';

import { Plan } from '@/lib/api/billing';
import { useTranslations } from '@/lib/i18n/i18n-context';
import { PlanCard } from './plan-card';

interface PlanComparisonProps {
  plans: Plan[];
  currentPlanId?: string;
  onSelectPlan: (plan: Plan) => void;
  loading?: boolean;
  className?: string;
}

export function PlanComparison({
  plans,
  currentPlanId,
  onSelectPlan,
  loading = false,
  className,
}: PlanComparisonProps) {
  const { t } = useTranslations('billing.plans');

  // Determine which plan is most popular (usually the middle tier)
  const mostPopularIndex = Math.floor(plans.length / 2);

  return (
    <div className={className}>
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-[#171717] dark:text-white mb-2">
          {t('comparePlans')}
        </h2>
        <p className="text-[#737373]">Choose the perfect plan for your organization</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {plans.map((plan, index) => (
          <PlanCard
            key={plan.id}
            plan={plan}
            isCurrentPlan={plan.id === currentPlanId}
            isMostPopular={index === mostPopularIndex && plan.id !== currentPlanId}
            onSelect={onSelectPlan}
            loading={loading}
          />
        ))}
      </div>
    </div>
  );
}
