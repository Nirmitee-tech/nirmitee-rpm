'use client';

import { useState, useEffect, useCallback } from 'react';
import { Loader2, Shield, AlertTriangle } from 'lucide-react';
import { Button } from '@nirmitee/ui';
import { useTranslations } from '@/lib/i18n/i18n-context';
import { sessionsApi, Session } from '@/lib/api/sessions';
import { SessionCard } from '@/components/settings/session-card';

export default function SessionsPage() {
  const { t } = useTranslations('sessions');
  const tCommon = useTranslations('common');
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [revokingId, setRevokingId] = useState<string | null>(null);
  const [revokingAll, setRevokingAll] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Get refresh token from localStorage
  const getRefreshToken = () => {
    const authState = localStorage.getItem('auth_state');
    if (authState) {
      try {
        const parsed = JSON.parse(authState);
        return parsed.refreshToken;
      } catch {
        return null;
      }
    }
    return null;
  };

  const loadSessions = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const refreshToken = getRefreshToken();
      const response = await sessionsApi.getSessions(refreshToken);
      setSessions(response.sessions);
    } catch (err: unknown) {
      const error = err as { message?: string };
      setError(error.message || 'Failed to load sessions');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSessions();
  }, [loadSessions]);

  const handleRevoke = async (sessionId: string) => {
    try {
      setRevokingId(sessionId);
      setError(null);
      await sessionsApi.revokeSession(sessionId);
      setSuccess(t('revokeSuccess'));
      setTimeout(() => setSuccess(null), 3000);
      await loadSessions();
    } catch (err: unknown) {
      const error = err as { message?: string };
      setError(error.message || 'Failed to revoke session');
    } finally {
      setRevokingId(null);
    }
  };

  const handleRevokeAll = async () => {
    if (
      !window.confirm(
        `${t('confirmRevokeAll')}\n\n${t('confirmRevokeAllMessage')}`
      )
    ) {
      return;
    }

    try {
      setRevokingAll(true);
      setError(null);
      const refreshToken = getRefreshToken();
      if (!refreshToken) {
        throw new Error('No refresh token found');
      }
      const response = await sessionsApi.revokeAllOtherSessions(refreshToken);
      setSuccess(t('revokeAllSuccess', { count: response.revokedCount }));
      setTimeout(() => setSuccess(null), 3000);
      await loadSessions();
    } catch (err: unknown) {
      const error = err as { message?: string };
      setError(error.message || 'Failed to revoke sessions');
    } finally {
      setRevokingAll(false);
    }
  };

  const currentSession = sessions.find((s) => s.isCurrent);
  const otherSessions = sessions.filter((s) => !s.isCurrent);

  return (
    <div className="w-full space-y-6">
      {/* Header */}
      <div className="bg-white dark:bg-[#0a0a0a] border border-[#E5E5E5] dark:border-[#212121] rounded-xl p-6">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-lg font-semibold text-[#171717] dark:text-white mb-1">
              {t('title')}
            </h2>
            <p className="text-sm text-[#737373]">{t('subtitle')}</p>
          </div>
          {otherSessions.length > 0 && (
            <Button
              variant="outline"
              onClick={handleRevokeAll}
              disabled={revokingAll}
            >
              {revokingAll ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {t('signingOutAll')}
                </>
              ) : (
                <>
                  <Shield className="h-4 w-4 mr-2" />
                  {t('signOutAllDevices')}
                </>
              )}
            </Button>
          )}
        </div>

        {/* Success Message */}
        {success && (
          <div className="mt-4 p-3 rounded-lg bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 text-sm">
            {success}
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="mt-4 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
            {error}
          </div>
        )}
      </div>

      {/* Loading State */}
      {loading && (
        <div className="bg-white dark:bg-[#0a0a0a] border border-[#E5E5E5] dark:border-[#212121] rounded-xl p-12 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-[#745EE1]" />
        </div>
      )}

      {/* Current Session */}
      {!loading && currentSession && (
        <div>
          <h3 className="text-sm font-medium text-[#171717] dark:text-white mb-3">
            {t('currentSession')}
          </h3>
          <SessionCard
            session={currentSession}
            onRevoke={handleRevoke}
            revoking={revokingId === currentSession.id}
          />
        </div>
      )}

      {/* Other Sessions */}
      {!loading && otherSessions.length > 0 && (
        <div>
          <h3 className="text-sm font-medium text-[#171717] dark:text-white mb-3">
            {t('activeSessions')}
          </h3>
          <div className="space-y-3">
            {otherSessions.map((session) => (
              <SessionCard
                key={session.id}
                session={session}
                onRevoke={handleRevoke}
                revoking={revokingId === session.id}
              />
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {!loading && otherSessions.length === 0 && currentSession && (
        <div className="bg-white dark:bg-[#0a0a0a] border border-[#E5E5E5] dark:border-[#212121] rounded-xl p-8 text-center">
          <Shield className="h-12 w-12 mx-auto mb-3 text-[#737373]" />
          <p className="text-sm font-medium text-[#171717] dark:text-white mb-1">
            {t('noSessions')}
          </p>
          <p className="text-xs text-[#737373]">
            {t('thisDevice')}
          </p>
        </div>
      )}
    </div>
  );
}
