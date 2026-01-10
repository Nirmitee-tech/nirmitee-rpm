'use client';

import { useState, useEffect } from 'react';
import {
  Users,
  Activity,
  AlertTriangle,
  TrendingUp,
  Heart,
  Droplet,
  Scale,
  Clock,
  RefreshCw,
  Calendar,
  Download,
  Filter,
} from 'lucide-react';
import { useTranslations } from '@/lib/i18n/i18n-context';
import { Button } from '@/components/ui/button';
import { StatCard } from '@nirmitee/ui';
import { AreaChart, DonutChart } from '@nirmitee/ui';
import {
  dashboardApi,
  DashboardStats,
  VitalsTrendPoint,
  AlertDistribution,
  PatientAttention,
} from '@/lib/api/dashboard';

type DateRange = '7d' | '14d' | '30d' | '90d';

export default function AnalyticsPage() {
  const { t } = useTranslations('analytics');
  const { t: tDashboard } = useTranslations('dashboard');
  const { t: tCommon } = useTranslations('common');

  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [vitalsTrend, setVitalsTrend] = useState<VitalsTrendPoint[]>([]);
  const [alertDistribution, setAlertDistribution] = useState<AlertDistribution | null>(null);
  const [patientsAttention, setPatientsAttention] = useState<PatientAttention[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [dateRange, setDateRange] = useState<DateRange>('7d');
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const days = dateRange === '7d' ? 7 : dateRange === '14d' ? 14 : dateRange === '30d' ? 30 : 90;
      const [statsData, trendData, alertData, attentionData] = await Promise.all([
        dashboardApi.getStats(),
        dashboardApi.getVitalsTrend(days),
        dashboardApi.getAlertDistribution(),
        dashboardApi.getPatientsAttention(5),
      ]);

      setStats(statsData);
      setVitalsTrend(trendData.trend);
      setAlertDistribution(alertData);
      setPatientsAttention(attentionData.patients);
      setLastUpdated(new Date());
    } catch (error) {
      console.error('Failed to fetch analytics data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [dateRange]);

  // Format date for chart display
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  // Prepare chart data
  const vitalsTrendSeries = [
    { dataKey: 'bpReadings', name: t('vitals.bloodPressure'), color: '#ef4444' },
    { dataKey: 'glucoseReadings', name: t('vitals.glucose'), color: '#3b82f6' },
    { dataKey: 'weightReadings', name: t('vitals.weight'), color: '#10b981' },
  ];

  const alertChartData = alertDistribution
    ? [
        { name: t('alerts.critical'), value: alertDistribution.critical, color: '#ef4444' },
        { name: t('alerts.significant'), value: alertDistribution.significant, color: '#f59e0b' },
        { name: t('alerts.informational'), value: alertDistribution.informational, color: '#3b82f6' },
      ]
    : [];

  // Calculate trends for sparklines (mock data for now - would come from API)
  const patientTrend = [42, 45, 48, 52, 55, 58, stats?.patients.total || 60];
  const vitalsTrend7Day = [120, 145, 132, 168, 155, 178, stats?.vitals.todayCount || 190];
  const alertTrend = [8, 12, 6, 15, 10, 8, stats?.alerts.new || 5];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-[#171717] dark:text-white">{t('title')}</h1>
          <p className="text-[#737373] mt-1">{t('subtitle')}</p>
        </div>

        <div className="flex items-center gap-3">
          {/* Date Range Selector */}
          <div className="flex items-center bg-white dark:bg-[#0a0a0a] border border-[#E5E5E5] dark:border-[#212121] rounded-lg p-1">
            {(['7d', '14d', '30d', '90d'] as DateRange[]).map((range) => (
              <button
                key={range}
                onClick={() => setDateRange(range)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                  dateRange === range
                    ? 'bg-[#745EE1] text-white'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
                }`}
              >
                {t(`dateRange.${range}`)}
              </button>
            ))}
          </div>

          {/* Refresh Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={fetchData}
            disabled={isLoading}
            className="gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            {tCommon('refresh')}
          </Button>
        </div>
      </div>

      {/* Last Updated */}
      <div className="flex items-center gap-2 text-xs text-gray-500">
        <Clock className="h-3 w-3" />
        {t('lastUpdated', { time: lastUpdated.toLocaleTimeString() })}
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title={t('metrics.totalPatients')}
          value={stats?.patients.total ?? '-'}
          change={stats?.patients.changePercent ? `${stats.patients.changePercent > 0 ? '+' : ''}${stats.patients.changePercent}%` : undefined}
          changeType={stats?.patients.changePercent && stats.patients.changePercent > 0 ? 'positive' : 'neutral'}
          icon={Users}
          trend={patientTrend}
          trendColor="#745EE1"
          subtitle={t('metrics.activeCount', { count: stats?.patients.active ?? 0 })}
        />

        <StatCard
          title={t('metrics.vitalsRecorded')}
          value={stats?.vitals.todayCount ?? '-'}
          subtitle={t('metrics.weekCount', { count: stats?.vitals.weekCount ?? 0 })}
          icon={Activity}
          trend={vitalsTrend7Day}
          trendColor="#10b981"
        />

        <StatCard
          title={t('metrics.activeAlerts')}
          value={stats?.alerts.new ?? '-'}
          variant={stats?.alerts.critical && stats.alerts.critical > 0 ? 'danger' : 'default'}
          subtitle={stats?.alerts.critical ? t('metrics.criticalCount', { count: stats.alerts.critical }) : undefined}
          icon={AlertTriangle}
          trend={alertTrend}
          trendColor="#ef4444"
        />

        <StatCard
          title={t('metrics.complianceRate')}
          value="87%"
          change="+5%"
          changeType="positive"
          icon={TrendingUp}
          trend={[78, 80, 82, 84, 85, 86, 87]}
          trendColor="#3b82f6"
          subtitle={t('metrics.vsLastMonth')}
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Vitals Trend Chart */}
        <div className="lg:col-span-2 bg-white dark:bg-[#0a0a0a] border border-[#E5E5E5] dark:border-[#212121] rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-semibold text-[#171717] dark:text-white">
                {t('charts.vitalsTrend')}
              </h3>
              <p className="text-xs text-gray-500 mt-0.5">{t('charts.vitalsTrendDesc')}</p>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" className="h-8 px-2">
                <Download className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {vitalsTrend.length > 0 ? (
            <AreaChart
              data={vitalsTrend as unknown as Record<string, unknown>[]}
              series={vitalsTrendSeries}
              xAxisKey="date"
              height={280}
              xAxisFormatter={formatDate}
              tooltipFormatter={(value, name) => `${value} ${t('charts.readings')}`}
            />
          ) : (
            <div className="flex items-center justify-center h-[280px] text-gray-400">
              {isLoading ? (
                <RefreshCw className="h-6 w-6 animate-spin" />
              ) : (
                t('charts.noData')
              )}
            </div>
          )}
        </div>

        {/* Alert Distribution */}
        <div className="bg-white dark:bg-[#0a0a0a] border border-[#E5E5E5] dark:border-[#212121] rounded-xl p-5">
          <div className="mb-4">
            <h3 className="text-base font-semibold text-[#171717] dark:text-white">
              {t('charts.alertDistribution')}
            </h3>
            <p className="text-xs text-gray-500 mt-0.5">{t('charts.alertDistributionDesc')}</p>
          </div>

          {alertDistribution && alertDistribution.total > 0 ? (
            <DonutChart
              data={alertChartData}
              centerValue={alertDistribution.total}
              centerLabel={t('charts.totalAlerts')}
              height={220}
              innerRadius={55}
              outerRadius={80}
              legendPosition="bottom"
            />
          ) : (
            <div className="flex flex-col items-center justify-center h-[220px] text-gray-400">
              <AlertTriangle className="h-8 w-8 mb-2 opacity-50" />
              <span className="text-sm">{t('charts.noAlerts')}</span>
            </div>
          )}
        </div>
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Vitals by Type */}
        <div className="bg-white dark:bg-[#0a0a0a] border border-[#E5E5E5] dark:border-[#212121] rounded-xl p-5">
          <h3 className="text-base font-semibold text-[#171717] dark:text-white mb-4">
            {t('vitals.byType')}
          </h3>
          <div className="space-y-4">
            {[
              { icon: Heart, name: t('vitals.bloodPressure'), color: '#ef4444', count: 45, percent: 35 },
              { icon: Droplet, name: t('vitals.glucose'), color: '#3b82f6', count: 38, percent: 30 },
              { icon: Scale, name: t('vitals.weight'), color: '#10b981', count: 25, percent: 20 },
              { icon: Activity, name: t('vitals.oxygen'), color: '#8b5cf6', count: 18, percent: 15 },
            ].map((vital) => {
              const Icon = vital.icon;
              return (
                <div key={vital.name} className="flex items-center gap-3">
                  <div
                    className="h-9 w-9 rounded-lg flex items-center justify-center"
                    style={{ backgroundColor: `${vital.color}15` }}
                  >
                    <Icon className="h-4 w-4" style={{ color: vital.color }} />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        {vital.name}
                      </span>
                      <span className="text-sm text-gray-500">{vital.count}</span>
                    </div>
                    <div className="h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{ width: `${vital.percent}%`, backgroundColor: vital.color }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Patients Requiring Attention */}
        <div className="bg-white dark:bg-[#0a0a0a] border border-[#E5E5E5] dark:border-[#212121] rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-semibold text-[#171717] dark:text-white">
              {t('patients.requiresAttention')}
            </h3>
            <Button variant="link" size="sm" className="text-[#745EE1] p-0 h-auto">
              {tCommon('viewAll')}
            </Button>
          </div>

          {patientsAttention.length > 0 ? (
            <div className="space-y-3">
              {patientsAttention.map((patient) => (
                <div
                  key={patient.id}
                  className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900/50 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`h-10 w-10 rounded-full flex items-center justify-center text-white text-sm font-medium ${
                        patient.alertSeverity === 'critical' ? 'bg-red-500' : 'bg-amber-500'
                      }`}
                    >
                      {patient.firstName[0]}
                      {patient.lastName[0]}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                        {patient.firstName} {patient.lastName}
                      </p>
                      <p className="text-xs text-gray-500">
                        {patient.lastVital
                          ? `${patient.lastVital.type}: ${patient.lastVital.value}`
                          : t('patients.noRecentVitals')}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                        patient.alertSeverity === 'critical'
                          ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                          : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                      }`}
                    >
                      {patient.alertCount} {t('alerts.alerts')}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-8 text-gray-400">
              <Users className="h-8 w-8 mb-2 opacity-50" />
              <span className="text-sm">{t('patients.allGood')}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
