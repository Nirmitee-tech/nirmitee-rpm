'use client';

import { useState } from 'react';
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
} from 'lucide-react';
import { cn } from '@nirmitee/ui';

// Mock data for scheduled sessions
const MOCK_SCHEDULED_SESSIONS = [
  {
    id: 'session-001',
    patientName: 'Robert Johnson',
    patientAge: 67,
    patientGender: 'M',
    conditions: ['Hypertension', 'Diabetes'],
    scheduledTime: '2026-01-08T10:00:00',
    duration: 30,
    type: 'video',
    status: 'upcoming',
    provider: 'Dr. Sarah Chen',
    priority: 'high',
    lastVitals: { bp: '142/88', hr: 78, status: 'warning' },
  },
  {
    id: 'session-002',
    patientName: 'Maria Garcia',
    patientAge: 54,
    patientGender: 'F',
    conditions: ['CHF', 'Arrhythmia'],
    scheduledTime: '2026-01-08T10:30:00',
    duration: 20,
    type: 'video',
    status: 'upcoming',
    provider: 'Dr. Sarah Chen',
    priority: 'normal',
    lastVitals: { bp: '128/82', hr: 72, status: 'normal' },
  },
  {
    id: 'session-003',
    patientName: 'James Wilson',
    patientAge: 71,
    patientGender: 'M',
    conditions: ['COPD', 'Hypertension'],
    scheduledTime: '2026-01-08T11:00:00',
    duration: 30,
    type: 'phone',
    status: 'upcoming',
    provider: 'Dr. Sarah Chen',
    priority: 'normal',
    lastVitals: { bp: '138/85', hr: 82, spo2: 94, status: 'warning' },
  },
  {
    id: 'session-004',
    patientName: 'Patricia Brown',
    patientAge: 63,
    patientGender: 'F',
    conditions: ['Type 2 Diabetes'],
    scheduledTime: '2026-01-08T14:00:00',
    duration: 20,
    type: 'video',
    status: 'upcoming',
    provider: 'Dr. Michael Park',
    priority: 'low',
    lastVitals: { glucose: 156, status: 'warning' },
  },
];

// Mock data for recent calls
const MOCK_RECENT_CALLS = [
  {
    id: 'call-001',
    patientName: 'William Davis',
    patientAge: 58,
    callTime: '2026-01-07T16:30:00',
    duration: 1245,
    type: 'video',
    status: 'completed',
    cptCode: 'CPT 99457',
    notes: 'Reviewed BP readings, adjusted medication dosage',
  },
  {
    id: 'call-002',
    patientName: 'Susan Miller',
    patientAge: 72,
    callTime: '2026-01-07T15:00:00',
    duration: 890,
    type: 'video',
    status: 'completed',
    cptCode: 'CPT 99457',
    notes: 'CHF follow-up, weight stable',
  },
  {
    id: 'call-003',
    patientName: 'Thomas Anderson',
    patientAge: 65,
    callTime: '2026-01-07T14:00:00',
    duration: 0,
    type: 'video',
    status: 'missed',
    notes: 'Patient no-show, rescheduled',
  },
  {
    id: 'call-004',
    patientName: 'Nancy White',
    patientAge: 69,
    callTime: '2026-01-07T11:30:00',
    duration: 1560,
    type: 'phone',
    status: 'completed',
    cptCode: 'CPT 99458',
    notes: 'Medication reconciliation, ordered labs',
  },
];

// Mock stats
const MOCK_STATS = {
  todayCalls: 4,
  completedCalls: 12,
  missedCalls: 2,
  avgDuration: '18 min',
  totalMinutes: 216,
  billableTime: 180,
};

export default function TelehealthPage() {
  const router = useRouter();
  const { t } = useTranslations('telehealth');
  const [activeTab, setActiveTab] = useState<'scheduled' | 'recent' | 'patients'>('scheduled');
  const [searchQuery, setSearchQuery] = useState('');

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
                <button className="flex items-center gap-2 px-4 py-2 rounded-lg border border-[#E5E5E5] dark:border-[#1f1f2e] text-[#171717] dark:text-white hover:bg-[#F5F5F5] dark:hover:bg-[#1f1f2e] transition-colors">
                  <Calendar className="w-4 h-4" />
                  {t('schedule') || 'Schedule'}
                </button>
                <button
                  onClick={() => handleStartCall('new-session')}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-[#745EE1] to-[#8B5CF6] text-white hover:opacity-90 transition-opacity"
                >
                  <Video className="w-4 h-4" />
                  {t('startCall') || 'Start Call'}
                </button>
              </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mt-6">
              <div className="p-4 rounded-xl bg-[#F5F5F5] dark:bg-[#1f1f2e]">
                <div className="flex items-center gap-2 text-[#737373] dark:text-gray-400 text-xs mb-1">
                  <Calendar className="w-3 h-3" />
                  {t('todayCalls') || "Today's Calls"}
                </div>
                <div className="text-2xl font-bold text-[#171717] dark:text-white">{MOCK_STATS.todayCalls}</div>
              </div>
              <div className="p-4 rounded-xl bg-[#F5F5F5] dark:bg-[#1f1f2e]">
                <div className="flex items-center gap-2 text-[#737373] dark:text-gray-400 text-xs mb-1">
                  <CheckCircle className="w-3 h-3" />
                  {t('completed') || 'Completed'}
                </div>
                <div className="text-2xl font-bold text-green-500">{MOCK_STATS.completedCalls}</div>
              </div>
              <div className="p-4 rounded-xl bg-[#F5F5F5] dark:bg-[#1f1f2e]">
                <div className="flex items-center gap-2 text-[#737373] dark:text-gray-400 text-xs mb-1">
                  <PhoneMissed className="w-3 h-3" />
                  {t('missed') || 'Missed'}
                </div>
                <div className="text-2xl font-bold text-red-500">{MOCK_STATS.missedCalls}</div>
              </div>
              <div className="p-4 rounded-xl bg-[#F5F5F5] dark:bg-[#1f1f2e]">
                <div className="flex items-center gap-2 text-[#737373] dark:text-gray-400 text-xs mb-1">
                  <Clock className="w-3 h-3" />
                  {t('avgDuration') || 'Avg Duration'}
                </div>
                <div className="text-2xl font-bold text-[#171717] dark:text-white">{MOCK_STATS.avgDuration}</div>
              </div>
              <div className="p-4 rounded-xl bg-[#F5F5F5] dark:bg-[#1f1f2e]">
                <div className="flex items-center gap-2 text-[#737373] dark:text-gray-400 text-xs mb-1">
                  <Activity className="w-3 h-3" />
                  {t('totalMinutes') || 'Total Minutes'}
                </div>
                <div className="text-2xl font-bold text-[#171717] dark:text-white">{MOCK_STATS.totalMinutes}</div>
              </div>
              <div className="p-4 rounded-xl bg-gradient-to-br from-[#745EE1]/10 to-[#8B5CF6]/10 border border-[#745EE1]/20">
                <div className="flex items-center gap-2 text-[#745EE1] text-xs mb-1">
                  <TrendingUp className="w-3 h-3" />
                  {t('billableTime') || 'Billable Time'}
                </div>
                <div className="text-2xl font-bold text-[#745EE1]">{MOCK_STATS.billableTime} min</div>
              </div>
            </div>
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
            {/* Upcoming Alert */}
            <div className="p-4 rounded-xl bg-gradient-to-r from-[#745EE1]/10 to-[#8B5CF6]/10 border border-[#745EE1]/20 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[#745EE1] flex items-center justify-center">
                  <Bell className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="text-sm font-medium text-[#171717] dark:text-white">
                    {t('nextSession') || 'Next session in 5 minutes'}
                  </p>
                  <p className="text-xs text-[#737373] dark:text-gray-400">
                    Robert Johnson - Video consultation
                  </p>
                </div>
              </div>
              <button
                onClick={() => handleStartCall('session-001')}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#745EE1] text-white hover:bg-[#6350c9] transition-colors"
              >
                <Play className="w-4 h-4" />
                {t('joinNow') || 'Join Now'}
              </button>
            </div>

            {/* Session Cards */}
            <div className="grid gap-4">
              {MOCK_SCHEDULED_SESSIONS.map((session) => (
                <div
                  key={session.id}
                  className="p-4 rounded-xl bg-white dark:bg-[#12121a] border border-[#E5E5E5] dark:border-[#1f1f2e] hover:border-[#745EE1]/30 transition-all"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4">
                      {/* Patient Avatar */}
                      <div className="relative">
                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#745EE1] to-[#8B5CF6] flex items-center justify-center">
                          <span className="text-white font-semibold">
                            {session.patientName.split(' ').map(n => n[0]).join('')}
                          </span>
                        </div>
                        <div className={cn(
                          "absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-white dark:border-[#12121a]",
                          getVitalsStatusColor(session.lastVitals.status)
                        )} />
                      </div>

                      {/* Patient Info */}
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-[#171717] dark:text-white">
                            {session.patientName}
                          </h3>
                          <span className="text-xs text-[#737373]">
                            {session.patientAge}y {session.patientGender}
                          </span>
                          {session.priority === 'high' && (
                            <span className="px-2 py-0.5 rounded-full bg-red-100 dark:bg-red-500/20 text-red-600 dark:text-red-400 text-xs">
                              Priority
                            </span>
                          )}
                        </div>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {session.conditions.map((condition, i) => (
                            <span
                              key={i}
                              className="px-2 py-0.5 rounded-full bg-[#F5F5F5] dark:bg-[#1f1f2e] text-[#737373] dark:text-gray-400 text-xs"
                            >
                              {condition}
                            </span>
                          ))}
                        </div>

                        {/* Last Vitals Preview */}
                        <div className="flex items-center gap-4 mt-2 text-xs text-[#737373] dark:text-gray-400">
                          {session.lastVitals.bp && (
                            <span className="flex items-center gap-1">
                              <Activity className="w-3 h-3" />
                              BP: <span className={cn(
                                session.lastVitals.status === 'warning' ? "text-orange-500 font-medium" : ""
                              )}>{session.lastVitals.bp}</span>
                            </span>
                          )}
                          {session.lastVitals.hr && (
                            <span>HR: {session.lastVitals.hr}</span>
                          )}
                          {session.lastVitals.spo2 && (
                            <span className={cn(
                              session.lastVitals.spo2 < 95 ? "text-orange-500 font-medium" : ""
                            )}>SpO2: {session.lastVitals.spo2}%</span>
                          )}
                          {session.lastVitals.glucose && (
                            <span className={cn(
                              session.lastVitals.status === 'warning' ? "text-orange-500 font-medium" : ""
                            )}>Glucose: {session.lastVitals.glucose}</span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Time & Actions */}
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <div className="flex items-center gap-2 text-[#171717] dark:text-white">
                          {session.type === 'video' ? (
                            <Video className="w-4 h-4 text-[#745EE1]" />
                          ) : (
                            <Phone className="w-4 h-4 text-green-500" />
                          )}
                          <span className="font-medium">{formatTime(session.scheduledTime)}</span>
                        </div>
                        <p className="text-xs text-[#737373] dark:text-gray-400">
                          {session.duration} min • {session.provider}
                        </p>
                      </div>

                      <button
                        onClick={() => handleStartCall(session.id)}
                        className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-[#745EE1] to-[#8B5CF6] text-white hover:opacity-90 transition-opacity"
                      >
                        <Play className="w-4 h-4" />
                        {t('start') || 'Start'}
                      </button>

                      <button className="p-2 rounded-lg hover:bg-[#F5F5F5] dark:hover:bg-[#1f1f2e] transition-colors">
                        <MoreVertical className="w-4 h-4 text-[#737373]" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recent Calls Tab */}
        {activeTab === 'recent' && (
          <div className="space-y-4">
            {MOCK_RECENT_CALLS.map((call) => (
              <div
                key={call.id}
                className="p-4 rounded-xl bg-white dark:bg-[#12121a] border border-[#E5E5E5] dark:border-[#1f1f2e]"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    {getStatusIcon(call.status)}
                    <div className="w-10 h-10 rounded-full bg-[#F5F5F5] dark:bg-[#1f1f2e] flex items-center justify-center">
                      <span className="text-sm font-medium text-[#737373]">
                        {call.patientName.split(' ').map(n => n[0]).join('')}
                      </span>
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium text-[#171717] dark:text-white">
                          {call.patientName}
                        </h3>
                        <span className="text-xs text-[#737373]">{call.patientAge}y</span>
                      </div>
                      {call.notes && (
                        <p className="text-xs text-[#737373] dark:text-gray-400 mt-0.5">
                          {call.notes}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-6">
                    <div className="text-right">
                      <div className="flex items-center gap-2 text-sm text-[#171717] dark:text-white">
                        {call.type === 'video' ? (
                          <Video className="w-4 h-4 text-[#737373]" />
                        ) : (
                          <Phone className="w-4 h-4 text-[#737373]" />
                        )}
                        <span>{formatDate(call.callTime)}</span>
                        <span className="text-[#737373]">{formatTime(call.callTime)}</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-[#737373] mt-0.5">
                        {call.duration > 0 && (
                          <>
                            <span>{formatDuration(call.duration)}</span>
                            {call.cptCode && (
                              <>
                                <span>•</span>
                                <span className="text-green-500 font-medium">{call.cptCode}</span>
                              </>
                            )}
                          </>
                        )}
                        {call.status === 'missed' && (
                          <span className="text-red-500">No-show</span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button className="p-2 rounded-lg hover:bg-[#F5F5F5] dark:hover:bg-[#1f1f2e] transition-colors">
                        <FileText className="w-4 h-4 text-[#737373]" />
                      </button>
                      <button className="p-2 rounded-lg hover:bg-[#F5F5F5] dark:hover:bg-[#1f1f2e] transition-colors">
                        <PhoneCall className="w-4 h-4 text-[#737373]" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
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
    </div>
  );
}
