'use client';

import { TrendingUp, TrendingDown, Users, Activity, Clock, Target } from 'lucide-react';
import { Badge } from '@nirmitee/ui';
import { useTranslations } from '@/lib/i18n/i18n-context';

export default function AnalyticsPage() {
  const { t } = useTranslations('analytics');

  const metrics = [
    {
      title: t('metrics.totalRevenue'),
      value: '$124,563',
      change: '+14.2%',
      trend: 'up' as const,
      icon: TrendingUp,
    },
    {
      title: t('metrics.activeUsers'),
      value: '8,942',
      change: '+5.8%',
      trend: 'up' as const,
      icon: Users,
    },
    {
      title: t('metrics.conversionRate'),
      value: '3.24%',
      change: '-0.4%',
      trend: 'down' as const,
      icon: Target,
    },
    {
      title: t('metrics.avgSession'),
      value: '12m 34s',
      change: '+2.1%',
      trend: 'up' as const,
      icon: Clock,
    },
  ];

  const topPages = [
    { page: '/dashboard', views: 12453, change: '+12%' },
    { page: '/users', views: 8234, change: '+8%' },
    { page: '/reports', views: 6123, change: '+15%' },
    { page: '/settings', views: 4532, change: '-3%' },
    { page: '/analytics', views: 3421, change: '+22%' },
  ];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-h1 text-primary">{t('title')}</h1>
        <p className="text-secondary mt-1">{t('subtitle')}</p>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {metrics.map((metric) => {
          const Icon = metric.icon;
          return (
            <div
              key={metric.title}
              className="background-white border-primary p-4 rounded-lg"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="h-10 w-10 rounded-lg bg-brand/10 flex items-center justify-center">
                  <Icon className="h-5 w-5 text-brand" />
                </div>
                <Badge variant={metric.trend === 'up' ? 'success' : 'danger'}>
                  {metric.trend === 'up' ? (
                    <TrendingUp className="h-3 w-3 mr-1" />
                  ) : (
                    <TrendingDown className="h-3 w-3 mr-1" />
                  )}
                  {metric.change}
                </Badge>
              </div>
              <div>
                <div className="text-2xl font-semibold text-primary">{metric.value}</div>
                <div className="text-sm text-secondary">{metric.title}</div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Chart Placeholder */}
        <div className="background-white border-primary p-4 rounded-lg">
          <h2 className="text-h3 text-primary mb-4">{t('trafficOverview')}</h2>
          <div className="h-64 flex items-center justify-center bg-gray-50 dark:bg-gray-900 rounded-lg">
            <div className="text-center">
              <Activity className="h-8 w-8 text-brand mx-auto mb-2" />
              <p className="text-sm text-secondary">{t('chartPlaceholder')}</p>
              <p className="text-xs text-secondary">{t('comingSoon')}</p>
            </div>
          </div>
        </div>

        {/* Top Pages */}
        <div className="background-white border-primary p-4 rounded-lg">
          <h2 className="text-h3 text-primary mb-4">{t('topPages')}</h2>
          <div className="space-y-3">
            {topPages.map((page, index) => (
              <div
                key={page.page}
                className="flex items-center justify-between py-2 border-b border-[#D7D7D7] dark:border-[#212121] last:border-0"
              >
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium text-secondary w-6">
                    {index + 1}.
                  </span>
                  <span className="text-sm text-primary">{page.page}</span>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-sm text-secondary">{page.views.toLocaleString()} views</span>
                  <Badge
                    variant={page.change.startsWith('+') ? 'success' : 'danger'}
                    className="text-xs"
                  >
                    {page.change}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
