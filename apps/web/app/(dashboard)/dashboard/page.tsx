'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Loader2, Heart, Activity, Bell, BarChart3, UserPlus, Users, ClipboardList, AlertTriangle } from 'lucide-react';
import {
  StatCard,
  AreaChart,
  DonutChart,
  ProgressBar,
} from '@nirmitee/ui';
import {
  dashboardApi,
  DashboardStats,
  RecentActivity,
  VitalsTrendPoint,
  AlertDistribution,
  PatientAttention,
} from '@/lib/api';
import {
  DashboardHeader,
  PatientAttentionTable,
  ActivityTimeline,
  QuickActionsGrid,
  DateRange,
} from '@/components/dashboard';
import { useTranslations } from '@/lib/i18n/i18n-context';

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [activity, setActivity] = useState<RecentActivity[]>([]);
  const [vitalsTrend, setVitalsTrend] = useState<VitalsTrendPoint[]>([]);
  const [alertDistribution, setAlertDistribution] = useState<AlertDistribution | null>(null);
  const [patientsAttention, setPatientsAttention] = useState<PatientAttention[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState<DateRange>('7d');
  const { t } = useTranslations('dashboard');
  const { t: tCommon } = useTranslations('common');

  const fetchData = async () => {
    try {
      setLoading(true);
      const days = dateRange === 'today' ? 1 : dateRange === '7d' ? 7 : 30;

      const [statsData, activityData, trendData, alertData, patientsData] = await Promise.all([
        dashboardApi.getStats(),
        dashboardApi.getActivity(5),
        dashboardApi.getVitalsTrend(days),
        dashboardApi.getAlertDistribution(),
        dashboardApi.getPatientsAttention(5),
      ]);

      setStats(statsData);
      setActivity(activityData.activity);
      setVitalsTrend(trendData.trend);
      setAlertDistribution(alertData);
      setPatientsAttention(patientsData.patients);
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [dateRange]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-[#745EE1]" />
      </div>
    );
  }

  // Prepare chart data
  const vitalsTrendChartData = vitalsTrend.map((point) => ({
    date: new Date(point.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    [t('charts.bp')]: point.bpReadings,
    [t('charts.glucose')]: point.glucoseReadings,
    [t('charts.weight')]: point.weightReadings,
  }));

  const alertChartData = alertDistribution
    ? [
        { name: t('alerts.critical'), value: alertDistribution.critical, color: '#ef4444' },
        { name: t('alerts.significant'), value: alertDistribution.significant, color: '#f59e0b' },
        { name: t('alerts.informational'), value: alertDistribution.informational, color: '#3b82f6' },
      ]
    : [];

  // Quick actions
  const quickActions = [
    {
      icon: UserPlus,
      title: t('quickActions.enrollPatient'),
      description: t('quickActions.enrollPatientDesc'),
      href: '/patients/enroll',
      color: '#10b981',
    },
    {
      icon: Activity,
      title: t('quickActions.recordVitals'),
      description: t('quickActions.recordVitalsDesc'),
      href: '/record-vitals',
      color: '#f59e0b',
    },
    {
      icon: AlertTriangle,
      title: t('quickActions.viewAlerts'),
      description: t('quickActions.viewAlertsDesc'),
      href: '/alerts',
      color: '#ef4444',
    },
    {
      icon: ClipboardList,
      title: t('quickActions.viewReports'),
      description: t('quickActions.viewReportsDesc'),
      href: '/reports',
      color: '#745EE1',
    },
  ];

  // Calculate vitals goal
  const vitalsGoal = 200; // Daily goal
  const vitalsToday = stats?.vitals?.todayCount || 0;

  return (
    <div className="space-y-6 p-2">
      {/* Header with Date Range Selector */}
      <DashboardHeader
        title={t('title')}
        subtitle={t('subtitle')}
        dateRange={dateRange}
        onDateRangeChange={setDateRange}
      />

      {/* Stats Cards - Full Width Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title={t('stats.totalPatients')}
          value={stats?.patients?.total?.toLocaleString() || '0'}
          change={`${(stats?.patients?.changePercent || 0) >= 0 ? '+' : ''}${stats?.patients?.changePercent || 0}%`}
          changeType={(stats?.patients?.changePercent || 0) >= 0 ? 'positive' : 'negative'}
          icon={Heart}
          trend={vitalsTrend.map((v) => v.totalReadings)}
          trendColor="#745EE1"
          tooltip={t('tooltips.totalPatients')}
        />
        <StatCard
          title={t('stats.activePatients')}
          value={stats?.patients?.active?.toLocaleString() || '0'}
          change={`${Math.round((stats?.patients?.active || 0) / Math.max(stats?.patients?.total || 1, 1) * 100)}%`}
          changeType="positive"
          icon={Activity}
          tooltip={t('tooltips.activePatients')}
        />
        <StatCard
          title={t('stats.newAlerts')}
          value={stats?.alerts?.new?.toLocaleString() || '0'}
          change={`${stats?.alerts?.critical || 0} ${t('stats.critical')}`}
          changeType={(stats?.alerts?.critical || 0) > 0 ? 'negative' : 'neutral'}
          icon={Bell}
          variant={(stats?.alerts?.critical || 0) > 0 ? 'danger' : 'default'}
          tooltip={t('tooltips.newAlerts')}
        />
        <div className="bg-white dark:bg-gradient-to-br dark:from-[#0f0f1a] dark:to-[#15122a] border border-[#E5E5E5] dark:border-[#1f1f2e] p-4 rounded-xl">
          <div className="flex items-center justify-between mb-3">
            <div className="h-10 w-10 rounded-lg bg-[#745EE1]/10 flex items-center justify-center">
              <BarChart3 className="h-5 w-5 text-[#745EE1]" />
            </div>
            <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
              {stats?.vitals?.weekCount || 0} {t('stats.thisWeek')}
            </span>
          </div>
          <div className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
            {vitalsToday}/{vitalsGoal}
          </div>
          <div className="text-sm text-gray-500 dark:text-gray-400 mb-3">
            {t('stats.vitalsToday')}
          </div>
          <ProgressBar
            value={vitalsToday}
            max={vitalsGoal}
            color="#745EE1"
            height={6}
          />
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Vitals Trend Chart - Takes 2 columns */}
        <div className="lg:col-span-2 bg-white dark:bg-gradient-to-br dark:from-[#0f0f1a] dark:to-[#15122a] border border-[#E5E5E5] dark:border-[#1f1f2e] rounded-xl p-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            {t('charts.vitalsTrend')}
          </h3>
          {vitalsTrendChartData.length > 0 ? (
            <AreaChart
              data={vitalsTrendChartData}
              series={[
                { dataKey: t('charts.bp'), name: t('charts.bloodPressure'), color: '#ef4444' },
                { dataKey: t('charts.glucose'), name: t('charts.bloodGlucose'), color: '#f59e0b' },
                { dataKey: t('charts.weight'), name: t('charts.weight'), color: '#3b82f6' },
              ]}
              xAxisKey="date"
              height={280}
              showLegend
              showTooltip
            />
          ) : (
            <div className="h-[280px] flex items-center justify-center text-gray-400">
              {t('charts.noData')}
            </div>
          )}
        </div>

        {/* Alert Distribution Chart */}
        <div className="bg-white dark:bg-gradient-to-br dark:from-[#0f0f1a] dark:to-[#15122a] border border-[#E5E5E5] dark:border-[#1f1f2e] rounded-xl p-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            {t('charts.alertDistribution')}
          </h3>
          {alertDistribution && alertDistribution.total > 0 ? (
            <DonutChart
              data={alertChartData}
              centerValue={alertDistribution.total}
              centerLabel={t('charts.totalAlerts')}
              height={220}
              legendPosition="bottom"
            />
          ) : (
            <div className="h-[220px] flex items-center justify-center text-gray-400">
              <div className="text-center">
                <Bell className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>{t('charts.noAlerts')}</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Patients Requiring Attention - Full Width */}
      <PatientAttentionTable
        patients={patientsAttention}
        emptyMessage={t('patientsAttention.noPatients')}
      />

      {/* Bottom Row: Activity + Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ActivityTimeline
          activities={activity}
          emptyMessage={t('recentActivity.noActivity')}
        />
        <QuickActionsGrid
          title={t('quickActions.title')}
          actions={quickActions}
          columns={2}
        />
      </div>
    </div>
  );
}
