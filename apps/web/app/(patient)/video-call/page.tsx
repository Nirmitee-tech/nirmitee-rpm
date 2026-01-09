'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from '@/lib/i18n/i18n-context';
import {
  Video,
  ArrowRight,
  Loader2,
  Calendar,
  User,
  Clock,
  RefreshCw,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { telehealthApi, TelehealthSession } from '@/lib/api/telehealth';
import { cn } from '@nirmitee/ui';

export default function PatientVideoCallPage() {
  const router = useRouter();
  const { t } = useTranslations('telehealth');
  const [sessions, setSessions] = useState<TelehealthSession[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [joiningSessionId, setJoiningSessionId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showManualEntry, setShowManualEntry] = useState(false);
  const [manualSessionId, setManualSessionId] = useState('');
  const [manualJoinLoading, setManualJoinLoading] = useState(false);
  const [manualJoinError, setManualJoinError] = useState<string | null>(null);

  // Fetch pending sessions on mount
  useEffect(() => {
    fetchSessions();
  }, []);

  const fetchSessions = async () => {
    try {
      setError(null);
      const data = await telehealthApi.getMySessions();
      setSessions(data);
    } catch (err) {
      console.error('Failed to fetch sessions:', err);
      setError(t('fetchError') || 'Failed to load video calls');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setIsRefreshing(true);
    fetchSessions();
  };

  const handleJoinSession = async (sessionId: string) => {
    setJoiningSessionId(sessionId);
    setError(null);

    try {
      await telehealthApi.joinSession(sessionId);
      router.push(`/call/${sessionId}`);
    } catch (err) {
      console.error('Failed to join session:', err);
      setError(
        err instanceof Error
          ? err.message
          : t('joinError') || 'Failed to join call'
      );
      setJoiningSessionId(null);
    }
  };

  const handleManualJoin = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!manualSessionId.trim()) {
      setManualJoinError(t('sessionIdRequired') || 'Please enter a session ID');
      return;
    }

    setManualJoinLoading(true);
    setManualJoinError(null);

    try {
      await telehealthApi.joinSession(manualSessionId.trim());
      router.push(`/call/${manualSessionId.trim()}`);
    } catch (err) {
      console.error('Failed to join session:', err);
      setManualJoinError(
        err instanceof Error
          ? err.message
          : t('joinError') || 'Failed to join call. Please check the session ID.'
      );
    } finally {
      setManualJoinLoading(false);
    }
  };

  const formatDateTime = (isoString: string) => {
    const date = new Date(isoString);
    return {
      date: date.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
      }),
      time: date.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      }),
    };
  };

  const isSessionActive = (session: TelehealthSession) => {
    return session.status === 'ACTIVE';
  };

  const isSessionUpcoming = (session: TelehealthSession) => {
    if (session.status !== 'SCHEDULED') return false;
    const scheduledTime = new Date(session.scheduledAt);
    const now = new Date();
    const diffMinutes = (scheduledTime.getTime() - now.getTime()) / (1000 * 60);
    // Show as upcoming if within 15 minutes
    return diffMinutes <= 15 && diffMinutes >= -5;
  };

  return (
    <div className="min-h-[calc(100vh-120px)] p-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              {t('videoCalls') || 'Video Calls'}
            </h1>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              {t('videoCallsDescription') || 'Join scheduled video consultations with your care team'}
            </p>
          </div>
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors disabled:opacity-50"
            title={t('refresh') || 'Refresh'}
          >
            <RefreshCw className={cn('w-5 h-5 text-gray-600 dark:text-gray-400', isRefreshing && 'animate-spin')} />
          </button>
        </div>

        {/* Error Banner */}
        {error && (
          <div className="mb-4 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm">
            {error}
          </div>
        )}

        {/* Loading State */}
        {isLoading && (
          <div className="flex flex-col items-center justify-center py-12">
            <Loader2 className="w-8 h-8 text-[#745EE1] animate-spin mb-4" />
            <p className="text-gray-600 dark:text-gray-400">
              {t('loadingCalls') || 'Loading your video calls...'}
            </p>
          </div>
        )}

        {/* Sessions List */}
        {!isLoading && sessions.length > 0 && (
          <div className="space-y-4 mb-8">
            {sessions.map((session) => {
              const { date, time } = formatDateTime(session.scheduledAt);
              const isActive = isSessionActive(session);
              const isUpcoming = isSessionUpcoming(session);
              const isJoining = joiningSessionId === session.id;

              return (
                <div
                  key={session.id}
                  className={cn(
                    'p-4 rounded-xl border transition-all',
                    isActive
                      ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
                      : isUpcoming
                      ? 'bg-[#745EE1]/5 border-[#745EE1]/30'
                      : 'bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800'
                  )}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      {/* Status Badge */}
                      {isActive && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-500 text-white text-xs font-medium mb-2">
                          <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                          {t('activeNow') || 'Active Now'}
                        </span>
                      )}
                      {isUpcoming && !isActive && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#745EE1] text-white text-xs font-medium mb-2">
                          {t('startingSoon') || 'Starting Soon'}
                        </span>
                      )}

                      {/* Provider Info */}
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#745EE1] to-[#8B5CF6] flex items-center justify-center">
                          {session.provider ? (
                            <span className="text-white text-sm font-medium">
                              {session.provider.firstName?.[0]}
                              {session.provider.lastName?.[0]}
                            </span>
                          ) : (
                            <User className="w-5 h-5 text-white" />
                          )}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white">
                            {session.provider
                              ? `Dr. ${session.provider.firstName} ${session.provider.lastName}`
                              : t('yourProvider') || 'Your Provider'}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {t('videoConsultation') || 'Video Consultation'}
                          </p>
                        </div>
                      </div>

                      {/* Schedule Info */}
                      <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          {date}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-4 h-4" />
                          {time}
                        </span>
                      </div>
                    </div>

                    {/* Join Button */}
                    <button
                      onClick={() => handleJoinSession(session.id)}
                      disabled={isJoining}
                      className={cn(
                        'flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all',
                        isActive || isUpcoming
                          ? 'bg-gradient-to-r from-[#745EE1] to-[#8B5CF6] text-white hover:opacity-90'
                          : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                      )}
                    >
                      {isJoining ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          {t('joining') || 'Joining...'}
                        </>
                      ) : (
                        <>
                          <Video className="w-4 h-4" />
                          {t('joinCall') || 'Join Call'}
                        </>
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Empty State */}
        {!isLoading && sessions.length === 0 && (
          <div className="text-center py-12 mb-8">
            <div className="w-20 h-20 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mx-auto mb-4">
              <Video className="w-10 h-10 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              {t('noScheduledCalls') || 'No Scheduled Calls'}
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 max-w-sm mx-auto">
              {t('noScheduledCallsDescription') || "You don't have any upcoming video calls. Your provider will schedule one when needed."}
            </p>
          </div>
        )}

        {/* Manual Session Entry - Collapsible */}
        <div className="border-t border-gray-200 dark:border-gray-800 pt-6">
          <button
            onClick={() => setShowManualEntry(!showManualEntry)}
            className="flex items-center justify-between w-full text-left"
          >
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              {t('haveSessionId') || 'Have a session ID?'}
            </span>
            {showManualEntry ? (
              <ChevronUp className="w-4 h-4 text-gray-500" />
            ) : (
              <ChevronDown className="w-4 h-4 text-gray-500" />
            )}
          </button>

          {showManualEntry && (
            <form onSubmit={handleManualJoin} className="mt-4 space-y-3">
              <div>
                <input
                  type="text"
                  value={manualSessionId}
                  onChange={(e) => {
                    setManualSessionId(e.target.value);
                    setManualJoinError(null);
                  }}
                  placeholder={t('sessionIdPlaceholder') || 'Enter session ID...'}
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#745EE1]/50 focus:border-[#745EE1]"
                  disabled={manualJoinLoading}
                />
              </div>

              {manualJoinError && (
                <p className="text-sm text-red-600 dark:text-red-400">
                  {manualJoinError}
                </p>
              )}

              <button
                type="submit"
                disabled={manualJoinLoading || !manualSessionId.trim()}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 font-medium hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {manualJoinLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    {t('joining') || 'Joining...'}
                  </>
                ) : (
                  <>
                    {t('joinWithId') || 'Join with ID'}
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
