'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { BarChart3, Users, AlertTriangle, CheckCircle, UsersRound, Shield, Loader2 } from 'lucide-react';
import { Badge } from '@nirmitee/ui';
import { dashboardApi, DashboardStats, RecentActivity } from '@/lib/api';
import { InviteUserModal } from '@/components/features/user/invite-user-modal';
import { CreateTeamModal } from '@/components/features/team/create-team-modal';
import { CreateRoleModal } from '@/components/features/role/create-role-modal';
import { useTranslations } from '@/lib/i18n/i18n-context';

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [activity, setActivity] = useState<RecentActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showTeamModal, setShowTeamModal] = useState(false);
  const [showRoleModal, setShowRoleModal] = useState(false);
  const { t } = useTranslations('dashboard');
  const { t: tCommon } = useTranslations('common');

  const fetchData = async () => {
    try {
      setLoading(true);
      const [statsData, activityData] = await Promise.all([
        dashboardApi.getStats(),
        dashboardApi.getActivity(5),
      ]);
      setStats(statsData);
      setActivity(activityData.activity);
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-[#745EE1]" />
      </div>
    );
  }

  const statCards = stats ? [
    {
      title: t('stats.totalUsers'),
      value: stats.users.total.toLocaleString(),
      change: `${stats.users.changePercent >= 0 ? '+' : ''}${stats.users.changePercent}%`,
      changeType: stats.users.changePercent >= 0 ? 'positive' : 'negative' as const,
      icon: Users,
    },
    {
      title: t('stats.activeUsers'),
      value: stats.users.active.toLocaleString(),
      change: `${Math.round((stats.users.active / Math.max(stats.users.total, 1)) * 100)}%`,
      changeType: 'positive' as const,
      icon: CheckCircle,
    },
    {
      title: t('stats.teams'),
      value: stats.teams.total.toLocaleString(),
      change: `${stats.teams.changePercent >= 0 ? '+' : ''}${stats.teams.changePercent}%`,
      changeType: stats.teams.changePercent >= 0 ? 'positive' : 'negative' as const,
      icon: UsersRound,
    },
    {
      title: t('stats.pendingInvitations'),
      value: stats.invitations.pending.toLocaleString(),
      change: `${stats.invitations.sent} ${tCommon('sent')}`,
      changeType: 'warning' as const,
      icon: AlertTriangle,
    },
  ] : [];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-semibold text-[#171717] dark:text-white">{t('title')}</h1>
        <p className="text-[#737373] mt-1">{t('subtitle')}</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat) => {
          const Icon = stat.icon;
          return (
            <div
              key={stat.title}
              className="bg-white dark:bg-gradient-to-br dark:from-[#0f0f1a] dark:to-[#15122a] border border-[#E5E5E5] dark:border-[#1f1f2e] p-4 rounded-xl glow-purple transition-all duration-300"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="h-10 w-10 rounded-lg bg-[#745EE1]/10 flex items-center justify-center">
                  <Icon className="h-5 w-5 text-[#745EE1]" />
                </div>
                <Badge variant={stat.changeType === 'positive' ? 'success' : stat.changeType === 'warning' ? 'warning' : 'danger'}>
                  {stat.change}
                </Badge>
              </div>
              <div>
                <div className="text-2xl font-semibold text-[#171717] dark:text-white">{stat.value}</div>
                <div className="text-sm text-[#737373]">{stat.title}</div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Activity */}
        <div className="bg-white dark:bg-gradient-to-br dark:from-[#0f0f1a] dark:to-[#15122a] border border-[#E5E5E5] dark:border-[#1f1f2e] p-4 rounded-xl">
          <h2 className="text-lg font-semibold text-[#171717] dark:text-white mb-4">{t('recentActivity.title')}</h2>
          {activity.length > 0 ? (
            <div className="space-y-4">
              {activity.map((item) => (
                <div key={item.id} className="flex items-start gap-3">
                  <div className="h-8 w-8 rounded-full bg-[#745EE1]/10 flex items-center justify-center shrink-0">
                    <span className="text-xs font-medium text-[#745EE1]">
                      {item.user.split(' ').map((n) => n[0]).join('')}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-[#171717] dark:text-white">
                      <span className="font-medium">{item.user}</span>{' '}
                      <span className="text-[#737373]">{item.action}</span>
                    </p>
                    <p className="text-xs text-[#737373]">{item.time}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-[#737373]">
              <BarChart3 className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">{t('recentActivity.noActivity')}</p>
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div className="bg-white dark:bg-gradient-to-br dark:from-[#0f0f1a] dark:to-[#15122a] border border-[#E5E5E5] dark:border-[#1f1f2e] p-4 rounded-xl">
          <h2 className="text-lg font-semibold text-[#171717] dark:text-white mb-4">{t('quickActions.title')}</h2>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => setShowInviteModal(true)}
              className="p-4 rounded-lg border border-[#E5E5E5] dark:border-[#1f1f2e] hover:bg-[#745EE1]/5 dark:hover:bg-[#745EE1]/10 transition-all duration-200 text-left group"
            >
              <Users className="h-6 w-6 text-[#745EE1] mb-2 group-hover:scale-110 transition-transform" />
              <div className="text-sm font-medium text-[#171717] dark:text-white">{t('quickActions.inviteUser')}</div>
              <div className="text-xs text-[#737373]">{t('quickActions.inviteUserDesc')}</div>
            </button>
            <button
              onClick={() => setShowTeamModal(true)}
              className="p-4 rounded-lg border border-[#E5E5E5] dark:border-[#1f1f2e] hover:bg-[#745EE1]/5 dark:hover:bg-[#745EE1]/10 transition-all duration-200 text-left group"
            >
              <UsersRound className="h-6 w-6 text-[#745EE1] mb-2 group-hover:scale-110 transition-transform" />
              <div className="text-sm font-medium text-[#171717] dark:text-white">{t('quickActions.createTeam')}</div>
              <div className="text-xs text-[#737373]">{t('quickActions.createTeamDesc')}</div>
            </button>
            <button
              onClick={() => setShowRoleModal(true)}
              className="p-4 rounded-lg border border-[#E5E5E5] dark:border-[#1f1f2e] hover:bg-[#745EE1]/5 dark:hover:bg-[#745EE1]/10 transition-all duration-200 text-left group"
            >
              <Shield className="h-6 w-6 text-[#745EE1] mb-2 group-hover:scale-110 transition-transform" />
              <div className="text-sm font-medium text-[#171717] dark:text-white">{t('quickActions.createRole')}</div>
              <div className="text-xs text-[#737373]">{t('quickActions.createRoleDesc')}</div>
            </button>
            <Link
              href="/reports"
              className="p-4 rounded-lg border border-[#E5E5E5] dark:border-[#1f1f2e] hover:bg-[#745EE1]/5 dark:hover:bg-[#745EE1]/10 transition-all duration-200 text-left group"
            >
              <BarChart3 className="h-6 w-6 text-[#745EE1] mb-2 group-hover:scale-110 transition-transform" />
              <div className="text-sm font-medium text-[#171717] dark:text-white">{t('quickActions.viewReports')}</div>
              <div className="text-xs text-[#737373]">{t('quickActions.viewReportsDesc')}</div>
            </Link>
          </div>
        </div>
      </div>

      {/* Modals */}
      <InviteUserModal
        isOpen={showInviteModal}
        onClose={() => setShowInviteModal(false)}
        onSuccess={fetchData}
      />
      <CreateTeamModal
        isOpen={showTeamModal}
        onClose={() => setShowTeamModal(false)}
        onSuccess={fetchData}
      />
      <CreateRoleModal
        isOpen={showRoleModal}
        onClose={() => setShowRoleModal(false)}
        onSuccess={fetchData}
      />
    </div>
  );
}
