'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Mail,
  Bell,
  AppWindow,
  Shield,
  Users,
  Settings,
  Megaphone,
  FileText,
  Loader2,
  Send,
  AlertTriangle,
  CheckCircle2,
} from 'lucide-react';
import { Button } from '@nirmitee/ui';
import { useTranslations } from '@/lib/i18n/i18n-context';
import {
  notificationPreferencesApi,
  NotificationPreferences,
  UpdateNotificationPreferencesInput,
} from '@/lib/api/notification-preferences';
import { NotificationChannelToggle } from './notification-channel-toggle';
import { QuietHoursPicker } from './quiet-hours-picker';

export function NotificationPreferencesForm() {
  const { t } = useTranslations('notificationPreferences');
  const { t: tCommon } = useTranslations('common');

  const [preferences, setPreferences] = useState<NotificationPreferences | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testingSend, setTestingSend] = useState<'email' | 'push' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Load preferences
  const loadPreferences = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await notificationPreferencesApi.get();
      setPreferences(data);
    } catch (err: unknown) {
      const error = err as { message?: string };
      setError(error.message || 'Failed to load preferences');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPreferences();
  }, [loadPreferences]);

  // Auto-save with debounce
  const savePreferences = useCallback(
    async (updates: UpdateNotificationPreferencesInput) => {
      if (!preferences) return;

      try {
        setSaving(true);
        setError(null);
        const updated = await notificationPreferencesApi.update(updates);
        setPreferences(updated);
        setSuccess(t('saved'));
        setTimeout(() => setSuccess(null), 2000);
      } catch (err: unknown) {
        const error = err as { message?: string };
        setError(error.message || 'Failed to save preferences');
      } finally {
        setSaving(false);
      }
    },
    [preferences, t]
  );

  // Handle test notification
  const handleTestNotification = async (channel: 'email' | 'push') => {
    try {
      setTestingSend(channel);
      setError(null);
      const result = await notificationPreferencesApi.sendTest(channel);
      setSuccess(result.message);
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: unknown) {
      const error = err as { message?: string };
      setError(error.message || `Failed to send test ${channel}`);
    } finally {
      setTestingSend(null);
    }
  };

  if (loading) {
    return (
      <div className="bg-white dark:bg-[#0a0a0a] border border-[#E5E5E5] dark:border-[#212121] rounded-xl p-12 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[#745EE1]" />
      </div>
    );
  }

  if (!preferences) {
    return (
      <div className="bg-white dark:bg-[#0a0a0a] border border-[#E5E5E5] dark:border-[#212121] rounded-xl p-12 text-center">
        <AlertTriangle className="h-12 w-12 mx-auto mb-3 text-[#737373]" />
        <p className="text-sm text-[#737373]">{error || 'Failed to load preferences'}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Success/Error Messages */}
      {success && (
        <div className="p-3 rounded-lg bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 text-sm flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          {success}
        </div>
      )}

      {error && (
        <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm flex items-start gap-2">
          <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
          {error}
        </div>
      )}

      {/* Notification Channels */}
      <div className="bg-white dark:bg-[#0a0a0a] border border-[#E5E5E5] dark:border-[#212121] rounded-xl p-6">
        <h3 className="text-base font-semibold text-[#171717] dark:text-white mb-4">
          {t('channels.title')}
        </h3>
        <div className="space-y-1">
          <NotificationChannelToggle
            icon={<Mail className="h-5 w-5" />}
            title={t('channels.email')}
            description={t('channels.emailDesc')}
            enabled={preferences.emailEnabled}
            onChange={(enabled) => savePreferences({ emailEnabled: enabled })}
            disabled={saving}
          />
          <NotificationChannelToggle
            icon={<Bell className="h-5 w-5" />}
            title={t('channels.push')}
            description={t('channels.pushDesc')}
            enabled={preferences.pushEnabled}
            onChange={(enabled) => savePreferences({ pushEnabled: enabled })}
            disabled={saving}
          />
          <NotificationChannelToggle
            icon={<AppWindow className="h-5 w-5" />}
            title={t('channels.inApp')}
            description={t('channels.inAppDesc')}
            enabled={preferences.inAppEnabled}
            onChange={(enabled) => savePreferences({ inAppEnabled: enabled })}
            disabled={saving}
          />
        </div>
      </div>

      {/* Notification Types */}
      <div className="bg-white dark:bg-[#0a0a0a] border border-[#E5E5E5] dark:border-[#212121] rounded-xl p-6">
        <h3 className="text-base font-semibold text-[#171717] dark:text-white mb-4">
          {t('types.title')}
        </h3>
        <div className="space-y-4">
          {/* Security Alerts */}
          <div className="flex items-start gap-3">
            <input
              type="checkbox"
              checked={preferences.securityAlerts}
              onChange={(e) => savePreferences({ securityAlerts: e.target.checked })}
              disabled={saving}
              className="mt-1 h-4 w-4 shrink-0 rounded border border-[#D7D7D7] dark:border-[#212121] focus:outline-none focus:ring-2 focus:ring-[#745EE1] disabled:cursor-not-allowed disabled:opacity-50 checked:bg-[#745EE1] checked:border-[#745EE1] cursor-pointer"
            />
            <div className="flex items-start gap-2 flex-1">
              <Shield className="h-4 w-4 text-[#737373] mt-0.5" />
              <div>
                <label className="text-sm font-medium text-[#171717] dark:text-white block cursor-pointer">
                  {t('types.securityAlerts')}
                </label>
                <p className="text-xs text-[#737373] mt-0.5">
                  {t('types.securityAlertsDesc')}
                </p>
              </div>
            </div>
          </div>

          {/* Team Updates */}
          <div className="flex items-start gap-3">
            <input
              type="checkbox"
              checked={preferences.teamUpdates}
              onChange={(e) => savePreferences({ teamUpdates: e.target.checked })}
              disabled={saving}
              className="mt-1 h-4 w-4 shrink-0 rounded border border-[#D7D7D7] dark:border-[#212121] focus:outline-none focus:ring-2 focus:ring-[#745EE1] disabled:cursor-not-allowed disabled:opacity-50 checked:bg-[#745EE1] checked:border-[#745EE1] cursor-pointer"
            />
            <div className="flex items-start gap-2 flex-1">
              <Users className="h-4 w-4 text-[#737373] mt-0.5" />
              <div>
                <label className="text-sm font-medium text-[#171717] dark:text-white block cursor-pointer">
                  {t('types.teamUpdates')}
                </label>
                <p className="text-xs text-[#737373] mt-0.5">
                  {t('types.teamUpdatesDesc')}
                </p>
              </div>
            </div>
          </div>

          {/* System Updates */}
          <div className="flex items-start gap-3">
            <input
              type="checkbox"
              checked={preferences.systemUpdates}
              onChange={(e) => savePreferences({ systemUpdates: e.target.checked })}
              disabled={saving}
              className="mt-1 h-4 w-4 shrink-0 rounded border border-[#D7D7D7] dark:border-[#212121] focus:outline-none focus:ring-2 focus:ring-[#745EE1] disabled:cursor-not-allowed disabled:opacity-50 checked:bg-[#745EE1] checked:border-[#745EE1] cursor-pointer"
            />
            <div className="flex items-start gap-2 flex-1">
              <Settings className="h-4 w-4 text-[#737373] mt-0.5" />
              <div>
                <label className="text-sm font-medium text-[#171717] dark:text-white block cursor-pointer">
                  {t('types.systemUpdates')}
                </label>
                <p className="text-xs text-[#737373] mt-0.5">
                  {t('types.systemUpdatesDesc')}
                </p>
              </div>
            </div>
          </div>

          {/* Marketing Emails */}
          <div className="flex items-start gap-3">
            <input
              type="checkbox"
              checked={preferences.marketingEmails}
              onChange={(e) => savePreferences({ marketingEmails: e.target.checked })}
              disabled={saving}
              className="mt-1 h-4 w-4 shrink-0 rounded border border-[#D7D7D7] dark:border-[#212121] focus:outline-none focus:ring-2 focus:ring-[#745EE1] disabled:cursor-not-allowed disabled:opacity-50 checked:bg-[#745EE1] checked:border-[#745EE1] cursor-pointer"
            />
            <div className="flex items-start gap-2 flex-1">
              <Megaphone className="h-4 w-4 text-[#737373] mt-0.5" />
              <div>
                <label className="text-sm font-medium text-[#171717] dark:text-white block cursor-pointer">
                  {t('types.marketingEmails')}
                </label>
                <p className="text-xs text-[#737373] mt-0.5">
                  {t('types.marketingEmailsDesc')}
                </p>
              </div>
            </div>
          </div>

          {/* Weekly Digest */}
          <div className="flex items-start gap-3">
            <input
              type="checkbox"
              checked={preferences.weeklyDigest}
              onChange={(e) => savePreferences({ weeklyDigest: e.target.checked })}
              disabled={saving}
              className="mt-1 h-4 w-4 shrink-0 rounded border border-[#D7D7D7] dark:border-[#212121] focus:outline-none focus:ring-2 focus:ring-[#745EE1] disabled:cursor-not-allowed disabled:opacity-50 checked:bg-[#745EE1] checked:border-[#745EE1] cursor-pointer"
            />
            <div className="flex items-start gap-2 flex-1">
              <FileText className="h-4 w-4 text-[#737373] mt-0.5" />
              <div>
                <label className="text-sm font-medium text-[#171717] dark:text-white block cursor-pointer">
                  {t('types.weeklyDigest')}
                </label>
                <p className="text-xs text-[#737373] mt-0.5">
                  {t('types.weeklyDigestDesc')}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Quiet Hours */}
      <div className="bg-white dark:bg-[#0a0a0a] border border-[#E5E5E5] dark:border-[#212121] rounded-xl p-6">
        <h3 className="text-base font-semibold text-[#171717] dark:text-white mb-1">
          {t('quietHours.title')}
        </h3>
        <p className="text-sm text-[#737373] mb-4">{t('quietHours.description')}</p>

        <QuietHoursPicker
          enabled={preferences.quietHoursEnabled}
          startTime={preferences.quietHoursStart}
          endTime={preferences.quietHoursEnd}
          onEnabledChange={(enabled) => savePreferences({ quietHoursEnabled: enabled })}
          onStartTimeChange={(time) => savePreferences({ quietHoursStart: time })}
          onEndTimeChange={(time) => savePreferences({ quietHoursEnd: time })}
          enabledLabel={t('quietHours.enabled')}
          startLabel={t('quietHours.start')}
          endLabel={t('quietHours.end')}
          timezoneLabel={t('quietHours.timezone')}
          disabled={saving}
        />
      </div>

      {/* Test Notifications */}
      <div className="bg-white dark:bg-[#0a0a0a] border border-[#E5E5E5] dark:border-[#212121] rounded-xl p-6">
        <h3 className="text-base font-semibold text-[#171717] dark:text-white mb-1">
          {t('test.title')}
        </h3>
        <p className="text-sm text-[#737373] mb-4">{t('test.description')}</p>

        <div className="flex flex-wrap gap-3">
          <Button
            variant="outline"
            onClick={() => handleTestNotification('email')}
            disabled={testingSend !== null || !preferences.emailEnabled}
          >
            {testingSend === 'email' ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                {tCommon('loading')}
              </>
            ) : (
              <>
                <Send className="h-4 w-4 mr-2" />
                {t('test.sendEmail')}
              </>
            )}
          </Button>

          <Button
            variant="outline"
            onClick={() => handleTestNotification('push')}
            disabled={testingSend !== null || !preferences.pushEnabled}
          >
            {testingSend === 'push' ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                {tCommon('loading')}
              </>
            ) : (
              <>
                <Send className="h-4 w-4 mr-2" />
                {t('test.sendPush')}
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Saving Indicator */}
      {saving && (
        <div className="flex items-center justify-center gap-2 text-sm text-[#737373]">
          <Loader2 className="h-4 w-4 animate-spin" />
          {tCommon('saving')}
        </div>
      )}
    </div>
  );
}
