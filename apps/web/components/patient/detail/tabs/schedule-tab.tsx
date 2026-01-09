'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from '@/lib/i18n/i18n-context';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@nirmitee/ui';
import {
  Video,
  Calendar,
  Clock,
  CheckCircle2,
  XCircle,
  Loader2,
  Plus,
  RefreshCw,
  ChevronRight,
  User,
} from 'lucide-react';
import { telehealthApi, TelehealthSession } from '@/lib/api/telehealth';
import { cn } from '@/lib/utils';

interface ScheduleTabProps {
  patientId: string;
  isLoading: boolean;
  onRefresh: () => void;
  onScheduleCall?: () => void;
}

export function ScheduleTab({
  patientId,
  isLoading: parentLoading,
  onRefresh,
  onScheduleCall,
}: ScheduleTabProps) {
  const { t } = useTranslations('patientDetail');
  const { t: tCommon } = useTranslations('common');
  const [sessions, setSessions] = useState<TelehealthSession[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'scheduled' | 'completed'>('all');

  useEffect(() => {
    loadSessions();
  }, [patientId]);

  const loadSessions = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await telehealthApi.listSessions({ patientId, limit: 50 });
      setSessions(response.sessions);
    } catch (err) {
      console.error('Failed to load sessions:', err);
      setError(t('schedule.loadError'));
    } finally {
      setIsLoading(false);
    }
  };

  const filteredSessions = sessions.filter((session) => {
    if (filter === 'scheduled') {
      return session.status === 'SCHEDULED' || session.status === 'ACTIVE';
    }
    if (filter === 'completed') {
      return session.status === 'COMPLETED' || session.status === 'CANCELLED';
    }
    return true;
  });

  const upcomingSessions = sessions.filter(
    (s) => s.status === 'SCHEDULED' || s.status === 'ACTIVE'
  );
  const pastSessions = sessions.filter(
    (s) => s.status === 'COMPLETED' || s.status === 'CANCELLED'
  );

  const getStatusBadge = (status: TelehealthSession['status']) => {
    const statusConfig = {
      SCHEDULED: {
        label: t('schedule.statusScheduled'),
        className: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
      },
      ACTIVE: {
        label: t('schedule.statusActive'),
        className: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
      },
      COMPLETED: {
        label: t('schedule.statusCompleted'),
        className: 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400',
      },
      CANCELLED: {
        label: t('schedule.statusCancelled'),
        className: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
      },
    };
    const config = statusConfig[status];
    return (
      <span className={cn('px-2 py-0.5 rounded-full text-xs font-medium', config.className)}>
        {config.label}
      </span>
    );
  };

  const formatDuration = (minutes?: number) => {
    if (!minutes) return '--';
    if (minutes < 60) return `${minutes} ${t('schedule.minutes')}`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return {
      date: date.toLocaleDateString(undefined, {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
      }),
      time: date.toLocaleTimeString(undefined, {
        hour: '2-digit',
        minute: '2-digit',
      }),
    };
  };

  if (isLoading || parentLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-[#745EE1]" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <XCircle className="h-12 w-12 text-red-500 mx-auto" />
        <p className="mt-4 text-gray-500 dark:text-gray-400">{error}</p>
        <Button variant="outline" className="mt-4" onClick={loadSessions}>
          <RefreshCw className="h-4 w-4 mr-2" />
          {tCommon('retry')}
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header with Actions */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {/* Filter Tabs */}
          <div className="flex rounded-lg bg-gray-100 dark:bg-gray-800 p-1">
            {(['all', 'scheduled', 'completed'] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={cn(
                  'px-3 py-1.5 text-xs font-medium rounded-md transition-colors',
                  filter === f
                    ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                )}
              >
                {f === 'all' && t('schedule.filterAll')}
                {f === 'scheduled' && t('schedule.filterUpcoming')}
                {f === 'completed' && t('schedule.filterPast')}
              </button>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="h-8 text-xs"
            onClick={loadSessions}
          >
            <RefreshCw className="h-3 w-3 mr-1" />
            {tCommon('refresh')}
          </Button>
          {onScheduleCall && (
            <Button
              size="sm"
              className="h-8 text-xs bg-[#745EE1] hover:bg-[#6249d1]"
              onClick={onScheduleCall}
            >
              <Plus className="h-3 w-3 mr-1" />
              {t('schedule.scheduleNew')}
            </Button>
          )}
        </div>
      </div>

      {/* Sessions Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="p-3">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
              <Calendar className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-xs text-gray-500">{t('schedule.upcoming')}</p>
              <p className="text-lg font-semibold">{upcomingSessions.length}</p>
            </div>
          </div>
        </Card>
        <Card className="p-3">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/30">
              <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <p className="text-xs text-gray-500">{t('schedule.completed')}</p>
              <p className="text-lg font-semibold">
                {sessions.filter((s) => s.status === 'COMPLETED').length}
              </p>
            </div>
          </div>
        </Card>
        <Card className="p-3">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900/30">
              <Clock className="h-4 w-4 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <p className="text-xs text-gray-500">{t('schedule.totalMinutes')}</p>
              <p className="text-lg font-semibold">
                {sessions
                  .filter((s) => s.status === 'COMPLETED')
                  .reduce((sum, s) => sum + (s.duration || 0), 0)}
              </p>
            </div>
          </div>
        </Card>
        <Card className="p-3">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-orange-100 dark:bg-orange-900/30">
              <Video className="h-4 w-4 text-orange-600 dark:text-orange-400" />
            </div>
            <div>
              <p className="text-xs text-gray-500">{t('schedule.totalSessions')}</p>
              <p className="text-lg font-semibold">{sessions.length}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Sessions List */}
      {filteredSessions.length === 0 ? (
        <Card className="p-8">
          <div className="text-center">
            <Video className="h-12 w-12 text-gray-400 mx-auto" />
            <h3 className="mt-4 text-sm font-medium text-gray-900 dark:text-white">
              {t('schedule.noSessions')}
            </h3>
            <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
              {t('schedule.noSessionsDescription')}
            </p>
            {onScheduleCall && (
              <Button
                size="sm"
                className="mt-4 bg-[#745EE1] hover:bg-[#6249d1]"
                onClick={onScheduleCall}
              >
                <Plus className="h-3 w-3 mr-1" />
                {t('schedule.scheduleFirst')}
              </Button>
            )}
          </div>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="divide-y dark:divide-gray-800">
              {filteredSessions.map((session) => {
                const { date, time } = formatDateTime(session.scheduledAt);
                return (
                  <div
                    key={session.id}
                    className="flex items-center gap-4 p-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                  >
                    {/* Icon */}
                    <div
                      className={cn(
                        'p-2 rounded-lg',
                        session.status === 'COMPLETED'
                          ? 'bg-green-100 dark:bg-green-900/30'
                          : session.status === 'CANCELLED'
                          ? 'bg-red-100 dark:bg-red-900/30'
                          : session.status === 'ACTIVE'
                          ? 'bg-blue-100 dark:bg-blue-900/30'
                          : 'bg-purple-100 dark:bg-purple-900/30'
                      )}
                    >
                      <Video
                        className={cn(
                          'h-5 w-5',
                          session.status === 'COMPLETED'
                            ? 'text-green-600 dark:text-green-400'
                            : session.status === 'CANCELLED'
                            ? 'text-red-600 dark:text-red-400'
                            : session.status === 'ACTIVE'
                            ? 'text-blue-600 dark:text-blue-400'
                            : 'text-purple-600 dark:text-purple-400'
                        )}
                      />
                    </div>

                    {/* Session Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-gray-900 dark:text-white">
                          {t('schedule.videoCall')}
                        </p>
                        {getStatusBadge(session.status)}
                      </div>
                      <div className="flex items-center gap-3 mt-1 text-xs text-gray-500 dark:text-gray-400">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {date}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {time}
                        </span>
                        {session.provider && (
                          <span className="flex items-center gap-1">
                            <User className="h-3 w-3" />
                            {session.provider.firstName} {session.provider.lastName}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Duration */}
                    <div className="text-right">
                      {session.status === 'COMPLETED' && session.duration ? (
                        <div>
                          <p className="text-sm font-medium text-gray-900 dark:text-white">
                            {formatDuration(session.duration)}
                          </p>
                          {session.billableMinutes && (
                            <p className="text-xs text-gray-500">
                              {session.billableMinutes} {t('schedule.billable')}
                            </p>
                          )}
                        </div>
                      ) : session.status === 'SCHEDULED' ? (
                        <ChevronRight className="h-5 w-5 text-gray-400" />
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
