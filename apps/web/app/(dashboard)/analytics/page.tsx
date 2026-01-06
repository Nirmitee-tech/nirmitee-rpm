'use client';

import { BarChart3, LineChart, PieChart, TrendingUp } from 'lucide-react';
import { useTranslations } from '@/lib/i18n/i18n-context';

export default function AnalyticsPage() {
  const { t } = useTranslations('analytics');

  const upcomingFeatures = [
    {
      icon: LineChart,
      title: t('upcoming.userActivity'),
      description: t('upcoming.userActivityDesc'),
    },
    {
      icon: BarChart3,
      title: t('upcoming.teamPerformance'),
      description: t('upcoming.teamPerformanceDesc'),
    },
    {
      icon: PieChart,
      title: t('upcoming.roleDistribution'),
      description: t('upcoming.roleDistributionDesc'),
    },
    {
      icon: TrendingUp,
      title: t('upcoming.growthMetrics'),
      description: t('upcoming.growthMetricsDesc'),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-semibold text-[#171717] dark:text-white">{t('title')}</h1>
        <p className="text-[#737373] mt-1">{t('subtitle')}</p>
      </div>

      {/* Coming Soon Banner */}
      <div className="bg-gradient-to-r from-[#745EE1]/10 to-[#5a47b8]/10 dark:from-[#745EE1]/20 dark:to-[#5a47b8]/20 border border-[#745EE1]/20 rounded-xl p-8 text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-[#745EE1]/10 mb-4">
          <BarChart3 className="h-8 w-8 text-[#745EE1]" />
        </div>
        <h2 className="text-xl font-semibold text-[#171717] dark:text-white mb-2">
          {t('comingSoon.title')}
        </h2>
        <p className="text-[#737373] max-w-md mx-auto">
          {t('comingSoon.description')}
        </p>
      </div>

      {/* Upcoming Features Grid */}
      <div>
        <h3 className="text-lg font-medium text-[#171717] dark:text-white mb-4">
          {t('comingSoon.featuresTitle')}
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {upcomingFeatures.map((feature) => {
            const Icon = feature.icon;
            return (
              <div
                key={feature.title}
                className="bg-white dark:bg-[#0a0a0a] border border-[#E5E5E5] dark:border-[#212121] p-5 rounded-xl flex items-start gap-4"
              >
                <div className="h-10 w-10 rounded-lg bg-[#745EE1]/10 flex items-center justify-center shrink-0">
                  <Icon className="h-5 w-5 text-[#745EE1]" />
                </div>
                <div>
                  <h4 className="font-medium text-[#171717] dark:text-white mb-1">
                    {feature.title}
                  </h4>
                  <p className="text-sm text-[#737373]">{feature.description}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
