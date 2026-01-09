'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from '@/lib/i18n/i18n-context';
import {
  Video,
  Phone,
  Calendar,
  Clock,
  User,
  Plus,
  Search,
  Filter,
  MoreVertical,
  Play,
  CheckCircle,
  XCircle,
  AlertCircle,
  PhoneCall,
  PhoneMissed,
  History,
  Users,
  Activity,
  TrendingUp,
  ChevronRight,
  Bell,
  FileText,
  Loader2,
} from 'lucide-react';
import { cn } from '@nirmitee/ui';
import { QuickCallDialog } from '@/components/telehealth/quick-call-dialog';
import { ScheduleCallDialog } from '@/components/telehealth/schedule-call-dialog';
import { telehealthApi, TelehealthSession } from '@/lib/api/telehealth';

// Stats computed from real sessions
function computeStats(sessions: TelehealthSession[]) {
  const today = new Date().toDateString();
  const todaySessions = sessions.filter(s => new Date(s.createdAt).toDateString() === today);
  const completed = sessions.filter(s => s.status === 'COMPLETED');
  const cancelled = sessions.filter(s => s.status === 'CANCELLED');
  const totalMinutes = completed.reduce((sum, s) => sum + (s.duration || 0) / 60, 0);
  const billableMinutes = completed.reduce((sum, s) => sum + (s.billableMinutes || 0), 0);
  const avgDuration = completed.length > 0 ? Math.round(totalMinutes / completed.length) : 0;

  return {
    todayCalls: todaySessions.length,
    completedCalls: completed.length,
    cancelledCalls: cancelled.length,
    avgDuration: avgDuration > 0 ? `${avgDuration} min` : '-',
    totalMinutes: Math.round(totalMinutes),
    billableTime: billableMinutes,
  };
}

export default function TelehealthPage() {
  const router = useRouter();
  const { t } = useTranslations('telehealth');
  const [activeTab, setActiveTab] = useState<'scheduled' | 'recent' | 'patients'>('scheduled');
  const [searchQuery, setSearchQuery] = useState('');
  const [isQuickCallOpen, setIsQuickCallOpen] = useState(false);
  const [isScheduleOpen, setIsScheduleOpen] = useState(false);
  const [sessions, setSessions] = useState<TelehealthSession[]>([]);
  const [isLoadingSessions, setIsLoadingSessions] = useState(false);
  const [rejoinableSessions, setRejoinableSessions] = useState<Array<TelehealthSession & { timeRemaining: number }>>([]);

  // Fetch sessions on mount
  useEffect(() => {
    const fetchSessions = async () => {
      setIsLoadingSessions(true);
      try {
        const sessionsResponse = await telehealthApi.listSessions({ limit: 20 });
        setSessions(sessionsResponse.sessions);

        // Check for rejoinable sessions (completed in last 60 minutes)
        const recentlyEnded = sessionsResponse.sessions.filter(s => {
          if (s.status !== 'COMPLETED' || !s.endedAt) return false;
          const endedAt = new Date(s.endedAt).getTime();
          const now = Date.now();
          const sixtyMinutesAgo = now - 60 * 60 * 1000;
          return endedAt > sixtyMinutesAgo;
        });

        // Check if each can be rejoined
        const rejoinable: Array<TelehealthSession & { timeRemaining: number }> = [];
        for (const session of recentlyEnded) {
          try {
            const canRejoin = await telehealthApi.canRejoinSession(session.id);
            if (canRejoin.canRejoin && canRejoin.timeRemaining) {
              rejoinable.push({ ...session, timeRemaining: canRejoin.timeRemaining });
            }
          } catch {
            // Session cannot be rejoined
          }
        }
        setRejoinableSessions(rejoinable);
      } catch (err) {
        console.error('Failed to fetch sessions:', err);
      } finally {
        setIsLoadingSessions(false);
      }
    };

    fetchSessions();
  }, []);

  const formatTime = (isoString: string) => {
    return new Date(isoString).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  const formatDate = (isoString: string) => {
    return new Date(isoString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'missed':
        return <PhoneMissed className="w-4 h-4 text-red-500" />;
      case 'cancelled':
        return <XCircle className="w-4 h-4 text-gray-500" />;
      default:
        return <Clock className="w-4 h-4 text-blue-500" />;
    }
  };

  const getVitalsStatusColor = (status: string) => {
    switch (status) {
      case 'critical':
        return 'bg-red-500';
      case 'warning':
        return 'bg-orange-500';
      case 'normal':
        return 'bg-green-500';
      default:
        return 'bg-gray-500';
    }
  };

  const handleStartCall = (sessionId: string) => {
    router.push(`/call/${sessionId}`);
  };

  return (
    <div className="min-h-screen bg-[#FAFAFA] dark:bg-[#0a0a0f]">
      {/* Header */}
      <div className="bg-white dark:bg-[#12121a] border-b border-[#E5E5E5] dark:border-[#1f1f2e]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-[#171717] dark:text-white">
                  {t('title') || 'Telehealth'}
                </h1>
                <p className="text-sm text-[#737373] dark:text-gray-400 mt-1">
                  {t('subtitle') || 'Manage video consultations and patient calls'}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setIsScheduleOpen(true)}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg border border-[#E5E5E5] dark:border-[#1f1f2e] text-[#171717] dark:text-white hover:bg-[#F5F5F5] dark:hover:bg-[#1f1f2e] transition-colors"
                >
                  <Calendar className="w-4 h-4" />
                  {t('schedule') || 'Schedule'}
                </button>
                <button
                  onClick={() => setIsQuickCallOpen(true)}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-[#745EE1] to-[#8B5CF6] text-white hover:opacity-90 transition-opacity"
                >
                  <Video className="w-4 h-4" />
                  {t('startCall') || 'Start Call'}
                </button>
              </div>
            </div>

            {/* Stats Cards - Computed from real data */}
            {(() => {
              const stats = computeStats(sessions);
              return (
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mt-6">
                  <div className="p-4 rounded-xl bg-[#F5F5F5] dark:bg-[#1f1f2e]">
                    <div className="flex items-center gap-2 text-[#737373] dark:text-gray-400 text-xs mb-1">
                      <Calendar className="w-3 h-3" />
                      {t('todayCalls') || "Today's Calls"}
                    </div>
                    <div className="text-2xl font-bold text-[#171717] dark:text-white">{stats.todayCalls}</div>
                  </div>
                  <div className="p-4 rounded-xl bg-[#F5F5F5] dark:bg-[#1f1f2e]">
                    <div className="flex items-center gap-2 text-[#737373] dark:text-gray-400 text-xs mb-1">
                      <CheckCircle className="w-3 h-3" />
                      {t('completed') || 'Completed'}
                    </div>
                    <div className="text-2xl font-bold text-green-500">{stats.completedCalls}</div>
                  </div>
                  <div className="p-4 rounded-xl bg-[#F5F5F5] dark:bg-[#1f1f2e]">
                    <div className="flex items-center gap-2 text-[#737373] dark:text-gray-400 text-xs mb-1">
                      <XCircle className="w-3 h-3" />
                      {t('cancelled') || 'Cancelled'}
                    </div>
                    <div className="text-2xl font-bold text-red-500">{stats.cancelledCalls}</div>
                  </div>
                  <div className="p-4 rounded-xl bg-[#F5F5F5] dark:bg-[#1f1f2e]">
                    <div className="flex items-center gap-2 text-[#737373] dark:text-gray-400 text-xs mb-1">
                      <Clock className="w-3 h-3" />
                      {t('avgDuration') || 'Avg Duration'}
                    </div>
                    <div className="text-2xl font-bold text-[#171717] dark:text-white">{stats.avgDuration}</div>
                  </div>
                  <div className="p-4 rounded-xl bg-[#F5F5F5] dark:bg-[#1f1f2e]">
                    <div className="flex items-center gap-2 text-[#737373] dark:text-gray-400 text-xs mb-1">
                      <Activity className="w-3 h-3" />
                      {t('totalMinutes') || 'Total Minutes'}
                    </div>
                    <div className="text-2xl font-bold text-[#171717] dark:text-white">{stats.totalMinutes}</div>
                  </div>
                  <div className="p-4 rounded-xl bg-gradient-to-br from-[#745EE1]/10 to-[#8B5CF6]/10 border border-[#745EE1]/20">
                    <div className="flex items-center gap-2 text-[#745EE1] text-xs mb-1">
                      <TrendingUp className="w-3 h-3" />
                      {t('billableTime') || 'Billable Time'}
                    </div>
                    <div className="text-2xl font-bold text-[#745EE1]">{stats.billableTime} min</div>
                  </div>
                </div>
              );
            })()}
          </div>

          {/* Tabs */}
          <div className="flex items-center gap-6 -mb-px">
            {[
              { id: 'scheduled', label: t('scheduledSessions') || 'Scheduled Sessions', icon: Calendar },
              { id: 'recent', label: t('recentCalls') || 'Recent Calls', icon: History },
              { id: 'patients', label: t('patientQueue') || 'Patient Queue', icon: Users },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as typeof activeTab)}
                className={cn(
                  "flex items-center gap-2 px-1 py-3 text-sm font-medium border-b-2 transition-colors",
                  activeTab === tab.id
                    ? "text-[#745EE1] border-[#745EE1]"
                    : "text-[#737373] border-transparent hover:text-[#171717] dark:hover:text-white"
                )}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Search & Filter Bar */}
        <div className="flex items-center gap-4 mb-6">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#737373]" />
            <input
              type="text"
              placeholder={t('searchPatients') || 'Search patients...'}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-lg border border-[#E5E5E5] dark:border-[#1f1f2e] bg-white dark:bg-[#12121a] text-[#171717] dark:text-white placeholder:text-[#737373] focus:outline-none focus:ring-2 focus:ring-[#745EE1]/20 focus:border-[#745EE1]"
            />
          </div>
          <button className="flex items-center gap-2 px-4 py-2 rounded-lg border border-[#E5E5E5] dark:border-[#1f1f2e] text-[#737373] hover:text-[#171717] dark:hover:text-white hover:bg-[#F5F5F5] dark:hover:bg-[#1f1f2e] transition-colors">
            <Filter className="w-4 h-4" />
            {t('filter') || 'Filter'}
          </button>
        </div>

        {/* Scheduled Sessions Tab */}
        {activeTab === 'scheduled' && (
          <div className="space-y-4">
            {/* Upcoming Alert - Show only if there's an active session */}
            {(() => {
              const activeSession = sessions.find(s => s.status === 'ACTIVE');
              if (!activeSession) return null;
              const patientName = activeSession.patient
                ? `${activeSession.patient.user.firstName} ${activeSession.patient.user.lastName}`
                : 'Patient';
              return (
                <div className="p-4 rounded-xl bg-gradient-to-r from-[#745EE1]/10 to-[#8B5CF6]/10 border border-[#745EE1]/20 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-[#745EE1] flex items-center justify-center">
                      <Bell className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-[#171717] dark:text-white">
                        {t('activeSession') || 'Active session in progress'}
                      </p>
                      <p className="text-xs text-[#737373] dark:text-gray-400">
                        {patientName} - Video consultation
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleStartCall(activeSession.id)}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#745EE1] text-white hover:bg-[#6350c9] transition-colors"
                  >
                    <Play className="w-4 h-4" />
                    {t('rejoin') || 'Rejoin'}
                  </button>
                </div>
              );
            })()}

            {/* Rejoinable Sessions - Recently ended calls that can still be rejoined */}
            {rejoinableSessions.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-sm font-medium text-[#737373] dark:text-gray-400 flex items-center gap-2">
                  <History className="w-4 h-4" />
                  {t('rejoinAvailable') || 'Rejoin Available'}
                </h3>
                {rejoinableSessions.map((session) => {
                  const patientName = session.patient
                    ? `${session.patient.user.firstName} ${session.patient.user.lastName}`
                    : 'Patient';
                  const minutesRemaining = Math.ceil(session.timeRemaining / 60);
                  return (
                    <div
                      key={session.id}
                      className="p-4 rounded-xl bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800/30 flex items-center justify-between"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-orange-500 flex items-center justify-center">
                          <PhoneCall className="w-5 h-5 text-white" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-[#171717] dark:text-white">
                            {t('callEndedRecently') || 'Call ended recently'} - {patientName}
                          </p>
                          <p className="text-xs text-orange-600 dark:text-orange-400">
                            {t('rejoinTimeRemaining', { minutes: minutesRemaining }) || `${minutesRemaining} minutes remaining to rejoin`}
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => handleStartCall(session.id)}
                        className="flex items-center gap-2 px-4 py-2 rounded-lg bg-orange-500 text-white hover:bg-orange-600 transition-colors"
                      >
                        <Play className="w-4 h-4" />
                        {t('rejoin') || 'Rejoin'}
                      </button>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Session Cards - Real Data */}
            <div className="grid gap-4">
              {isLoadingSessions ? (
                <div className="p-8 text-center bg-white dark:bg-[#12121a] rounded-xl border border-[#E5E5E5] dark:border-[#1f1f2e]">
                  <Loader2 className="w-6 h-6 animate-spin text-[#745EE1] mx-auto mb-2" />
                  <p className="text-sm text-[#737373]">{t('loading') || 'Loading sessions...'}</p>
                </div>
              ) : sessions.filter(s => s.status === 'SCHEDULED' || s.status === 'ACTIVE').length === 0 ? (
                <div className="p-8 text-center bg-white dark:bg-[#12121a] rounded-xl border border-[#E5E5E5] dark:border-[#1f1f2e]">
                  <Calendar className="w-10 h-10 text-[#737373] mx-auto mb-3" />
                  <h3 className="text-lg font-medium text-[#171717] dark:text-white mb-1">
                    {t('noScheduledSessions') || 'No scheduled sessions'}
                  </h3>
                  <p className="text-sm text-[#737373] mb-4">
                    {t('startQuickCall') || 'Start a quick call to connect with a patient'}
                  </p>
                  <button
                    onClick={() => setIsQuickCallOpen(true)}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-[#745EE1] to-[#8B5CF6] text-white hover:opacity-90 transition-opacity"
                  >
                    <Video className="w-4 h-4" />
                    {t('startCall') || 'Start Call'}
                  </button>
                </div>
              ) : sessions.filter(s => s.status === 'SCHEDULED' || s.status === 'ACTIVE').map((session) => {
                const patientName = session.patient ? `${session.patient.user.firstName} ${session.patient.user.lastName}` : 'Unknown Patient';
                const providerName = session.provider ? `${session.provider.firstName} ${session.provider.lastName}` : 'Provider';
                const initials = patientName.split(' ').map(n => n[0]).join('');
                return (
                <div
                  key={session.id}
                  className="p-4 rounded-xl bg-white dark:bg-[#12121a] border border-[#E5E5E5] dark:border-[#1f1f2e] hover:border-[#745EE1]/30 transition-all"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4">
                      {/* Patient Avatar */}
                      <div className="relative">
                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#745EE1] to-[#8B5CF6] flex items-center justify-center">
                          <span className="text-white font-semibold">{initials}</span>
                        </div>
                        {session.status === 'ACTIVE' && (
                          <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-green-500 border-2 border-white dark:border-[#12121a]" />
                        )}
                      </div>

                      {/* Patient Info */}
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-[#171717] dark:text-white">
                            {patientName}
                          </h3>
                          {session.status === 'ACTIVE' && (
                            <span className="px-2 py-0.5 rounded-full bg-green-100 dark:bg-green-500/20 text-green-600 dark:text-green-400 text-xs">
                              {t('active') || 'Active'}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-[#737373] dark:text-gray-400 mt-1">
                          {t('sessionId') || 'Session'}: {session.id.slice(-8)}
                        </p>
                      </div>
                    </div>

                    {/* Time & Actions */}
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <div className="flex items-center gap-2 text-[#171717] dark:text-white">
                          <Video className="w-4 h-4 text-[#745EE1]" />
                          <span className="font-medium">{formatTime(session.scheduledAt)}</span>
                        </div>
                        <p className="text-xs text-[#737373] dark:text-gray-400">
                          {formatDate(session.scheduledAt)} • {providerName}
                        </p>
                      </div>

                      <button
                        onClick={() => handleStartCall(session.id)}
                        className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-[#745EE1] to-[#8B5CF6] text-white hover:opacity-90 transition-opacity"
                      >
                        <Play className="w-4 h-4" />
                        {session.status === 'ACTIVE' ? (t('rejoin') || 'Rejoin') : (t('start') || 'Start')}
                      </button>

                      <button className="p-2 rounded-lg hover:bg-[#F5F5F5] dark:hover:bg-[#1f1f2e] transition-colors">
                        <MoreVertical className="w-4 h-4 text-[#737373]" />
                      </button>
                    </div>
                  </div>
                </div>
              );})}
            </div>
          </div>
        )}

        {/* Recent Calls Tab */}
        {activeTab === 'recent' && (
          <div className="space-y-4">
            {isLoadingSessions ? (
              <div className="p-8 text-center bg-white dark:bg-[#12121a] rounded-xl border border-[#E5E5E5] dark:border-[#1f1f2e]">
                <Loader2 className="w-6 h-6 animate-spin text-[#745EE1] mx-auto mb-2" />
                <p className="text-sm text-[#737373]">{t('loading') || 'Loading...'}</p>
              </div>
            ) : sessions.filter(s => s.status === 'COMPLETED').length === 0 ? (
              <div className="p-8 text-center bg-white dark:bg-[#12121a] rounded-xl border border-[#E5E5E5] dark:border-[#1f1f2e]">
                <History className="w-10 h-10 text-[#737373] mx-auto mb-3" />
                <h3 className="text-lg font-medium text-[#171717] dark:text-white mb-1">
                  {t('noRecentCalls') || 'No recent calls'}
                </h3>
                <p className="text-sm text-[#737373]">
                  {t('completedCallsAppear') || 'Completed calls will appear here'}
                </p>
              </div>
            ) : sessions.filter(s => s.status === 'COMPLETED').map((call) => {
              const patientName = call.patient ? `${call.patient.user.firstName} ${call.patient.user.lastName}` : 'Unknown';
              const initials = patientName.split(' ').map(n => n[0]).join('');
              return (
              <div
                key={call.id}
                className="p-4 rounded-xl bg-white dark:bg-[#12121a] border border-[#E5E5E5] dark:border-[#1f1f2e]"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    <div className="w-10 h-10 rounded-full bg-[#F5F5F5] dark:bg-[#1f1f2e] flex items-center justify-center">
                      <span className="text-sm font-medium text-[#737373]">{initials}</span>
                    </div>
                    <div>
                      <h3 className="font-medium text-[#171717] dark:text-white">
                        {patientName}
                      </h3>
                      <p className="text-xs text-[#737373] dark:text-gray-400 mt-0.5">
                        {t('sessionId') || 'Session'}: {call.id.slice(-8)}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-6">
                    <div className="text-right">
                      <div className="flex items-center gap-2 text-sm text-[#171717] dark:text-white">
                        <Video className="w-4 h-4 text-[#737373]" />
                        <span>{call.endedAt ? formatDate(call.endedAt) : formatDate(call.createdAt)}</span>
                        <span className="text-[#737373]">{call.endedAt ? formatTime(call.endedAt) : formatTime(call.createdAt)}</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-[#737373] mt-0.5">
                        {call.duration && call.duration > 0 && (
                          <span>{formatDuration(call.duration)}</span>
                        )}
                        {call.billableMinutes && call.billableMinutes > 0 && (
                          <>
                            <span>•</span>
                            <span className="text-green-500 font-medium">{call.billableMinutes} min billable</span>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button className="p-2 rounded-lg hover:bg-[#F5F5F5] dark:hover:bg-[#1f1f2e] transition-colors">
                        <FileText className="w-4 h-4 text-[#737373]" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );})}
          </div>
        )}

        {/* Patient Queue Tab */}
        {activeTab === 'patients' && (
          <div className="text-center py-12">
            <div className="w-16 h-16 rounded-full bg-[#F5F5F5] dark:bg-[#1f1f2e] flex items-center justify-center mx-auto mb-4">
              <Users className="w-8 h-8 text-[#737373]" />
            </div>
            <h3 className="text-lg font-medium text-[#171717] dark:text-white mb-2">
              {t('noWaitingPatients') || 'No patients in queue'}
            </h3>
            <p className="text-sm text-[#737373] dark:text-gray-400 max-w-md mx-auto">
              {t('waitingRoomEmpty') || 'The virtual waiting room is empty. Patients will appear here when they join their scheduled appointment.'}
            </p>
          </div>
        )}
      </div>

      {/* Quick Call Dialog */}
      <QuickCallDialog
        isOpen={isQuickCallOpen}
        onClose={() => setIsQuickCallOpen(false)}
      />

      {/* Schedule Call Dialog */}
      <ScheduleCallDialog
        isOpen={isScheduleOpen}
        onClose={() => setIsScheduleOpen(false)}
        onScheduled={() => {
          // Refresh sessions after scheduling
          telehealthApi.listSessions({ limit: 20 }).then(r => setSessions(r.sessions));
        }}
      />
    </div>
  );
}
