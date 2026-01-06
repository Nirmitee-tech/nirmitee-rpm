'use client';

import { useState, useEffect } from 'react';
import { User, Bell, Shield, Palette, Globe, Key, LogIn, Loader2, Trash2, Plus, Check } from 'lucide-react';
import { Button, Input } from '@nirmitee/ui';
import { cn } from '@nirmitee/ui';
import { oauthApi, OAuthProviderConfig } from '@/lib/api/auth';
import { rolesApi, usersApi } from '@/lib/api';
import { useAuth } from '@/lib/auth/auth-context';
import { useI18n, useTranslations } from '@/lib/i18n/i18n-context';
import { locales, localeNames, localeFlags, type Locale } from '@/i18n/config';

export default function SettingsPage() {
  const { t } = useTranslations('settings');
  const [activeTab, setActiveTab] = useState('profile');

  const settingsTabs = [
    { id: 'profile', label: t('tabs.profile'), icon: User },
    { id: 'notifications', label: t('tabs.notifications'), icon: Bell },
    { id: 'security', label: t('tabs.security'), icon: Shield },
    { id: 'sso', label: t('tabs.sso'), icon: LogIn },
    { id: 'appearance', label: t('tabs.appearance'), icon: Palette },
    { id: 'language', label: t('tabs.language'), icon: Globe },
    { id: 'api', label: t('tabs.api'), icon: Key },
  ];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-h1 text-primary">{t('title')}</h1>
        <p className="text-secondary mt-1">{t('subtitle')}</p>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Sidebar */}
        <div className="w-full lg:w-64 shrink-0">
          <div className="background-white border-primary rounded-lg p-2">
            {settingsTabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    'w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors',
                    activeTab === tab.id
                      ? 'bg-brand/10 text-brand'
                      : 'text-secondary hover:text-primary hover:bg-gray-100 dark:hover:bg-gray-800'
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1">
          {activeTab === 'profile' && <ProfileSettings />}
          {activeTab === 'notifications' && <NotificationSettings />}
          {activeTab === 'security' && <SecuritySettings />}
          {activeTab === 'sso' && <SSOSettings />}
          {activeTab === 'appearance' && <AppearanceSettings />}
          {activeTab === 'language' && <LanguageSettings />}
          {activeTab === 'api' && <ApiSettings />}
        </div>
      </div>
    </div>
  );
}

function ProfileSettings() {
  const { t } = useTranslations('settings.profile');
  const tCommon = useTranslations('common');
  const { user } = useAuth();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  // Initialize form with user data
  useEffect(() => {
    if (user) {
      setFirstName(user.firstName || '');
      setLastName(user.lastName || '');
    }
  }, [user]);

  const getInitials = () => {
    const first = firstName || user?.firstName || '';
    const last = lastName || user?.lastName || '';
    return `${first.charAt(0)}${last.charAt(0)}`.toUpperCase() || '?';
  };

  const handleSave = async () => {
    if (!user) return;

    setError('');
    setSaving(true);
    setSaved(false);

    try {
      await usersApi.update(user.id, {
        firstName,
        lastName,
      });

      // Update localStorage auth state
      const stored = localStorage.getItem('auth_state');
      if (stored) {
        const parsed = JSON.parse(stored);
        parsed.user = { ...parsed.user, firstName, lastName };
        localStorage.setItem('auth_state', JSON.stringify(parsed));
      }

      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err: unknown) {
      const error = err as { message?: string };
      setError(error.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  if (!user) {
    return (
      <div className="background-white border-primary rounded-lg p-6 flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-brand" />
      </div>
    );
  }

  return (
    <div className="background-white border-primary rounded-lg p-6 space-y-6">
      <div>
        <h2 className="text-h3 text-primary mb-1">{t('title')}</h2>
        <p className="text-sm text-secondary">{t('subtitle')}</p>
      </div>

      {saved && (
        <div className="p-3 rounded-lg bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 text-sm flex items-center gap-2">
          <Check className="h-4 w-4" />
          {t('success')}
        </div>
      )}

      {error && (
        <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm">
          {error}
        </div>
      )}

      <div className="flex items-center gap-4">
        <div className="h-16 w-16 rounded-full bg-brand flex items-center justify-center">
          <span className="text-xl font-medium text-white">{getInitials()}</span>
        </div>
        <div>
          <Button variant="outline" size="sm">{t('changePhoto')}</Button>
          <p className="text-xs text-secondary mt-1">{t('photoHint')}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-primary mb-1">{t('firstName')}</label>
          <Input
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            placeholder={t('firstNamePlaceholder')}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-primary mb-1">{t('lastName')}</label>
          <Input
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            placeholder={t('lastNamePlaceholder')}
          />
        </div>
        <div className="sm:col-span-2">
          <label className="block text-sm font-medium text-primary mb-1">{t('email')}</label>
          <Input
            type="email"
            value={user.email}
            disabled
            className="bg-gray-50 dark:bg-gray-900"
          />
          <p className="text-xs text-secondary mt-1">{t('emailHint')}</p>
        </div>
      </div>

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving}>
          {saving ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              {tCommon.t('saving')}
            </>
          ) : (
            t('saveChanges')
          )}
        </Button>
      </div>
    </div>
  );
}

const NOTIFICATION_PREFS_KEY = 'notification_preferences';

interface NotificationPrefs {
  emailNotifications: boolean;
  pushNotifications: boolean;
  securityAlerts: boolean;
  weeklyReports: boolean;
}

const defaultNotificationPrefs: NotificationPrefs = {
  emailNotifications: true,
  pushNotifications: true,
  securityAlerts: true,
  weeklyReports: false,
};

function NotificationSettings() {
  const { t } = useTranslations('settings.notifications');
  const [prefs, setPrefs] = useState<NotificationPrefs>(defaultNotificationPrefs);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(NOTIFICATION_PREFS_KEY);
    if (stored) {
      try {
        setPrefs(JSON.parse(stored));
      } catch {
        // Use defaults if parsing fails
      }
    }
  }, []);

  const handleToggle = (key: keyof NotificationPrefs) => {
    const newPrefs = { ...prefs, [key]: !prefs[key] };
    setPrefs(newPrefs);
    localStorage.setItem(NOTIFICATION_PREFS_KEY, JSON.stringify(newPrefs));
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const notificationItems = [
    { key: 'emailNotifications' as const, title: t('emailNotifications'), description: t('emailDesc') },
    { key: 'pushNotifications' as const, title: t('pushNotifications'), description: t('pushDesc') },
    { key: 'securityAlerts' as const, title: t('securityAlerts'), description: t('securityDesc') },
    { key: 'weeklyReports' as const, title: t('weeklyReports'), description: t('weeklyDesc') },
  ];

  return (
    <div className="background-white border-primary rounded-lg p-6 space-y-6">
      <div>
        <h2 className="text-h3 text-primary mb-1">{t('title')}</h2>
        <p className="text-sm text-secondary">{t('subtitle')}</p>
      </div>

      {saved && (
        <div className="p-3 rounded-lg bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 text-sm flex items-center gap-2">
          <Check className="h-4 w-4" />
          Preferences saved!
        </div>
      )}

      <div className="space-y-4">
        {notificationItems.map((item) => (
          <div key={item.key} className="flex items-center justify-between py-2">
            <div>
              <div className="text-sm font-medium text-primary">{item.title}</div>
              <div className="text-xs text-secondary">{item.description}</div>
            </div>
            <button
              type="button"
              onClick={() => handleToggle(item.key)}
              className={cn(
                "relative inline-flex h-6 w-11 items-center rounded-full transition-colors",
                prefs[item.key] ? "bg-brand" : "bg-gray-300 dark:bg-gray-600"
              )}
            >
              <span
                className={cn(
                  "inline-block h-4 w-4 transform rounded-full bg-white transition-transform",
                  prefs[item.key] ? "translate-x-6" : "translate-x-1"
                )}
              />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

function SecuritySettings() {
  const { t } = useTranslations('settings.security');
  const tCommon = useTranslations('common');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (newPassword !== confirmPassword) {
      setError('New passwords do not match');
      return;
    }

    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    setSaving(true);
    setSaved(false);

    try {
      const { authApi } = await import('@/lib/api/auth');
      await authApi.changePassword(currentPassword, newPassword);
      setSaved(true);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => setSaved(false), 3000);
    } catch (err: unknown) {
      const error = err as { message?: string };
      setError(error.message || 'Failed to update password');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="background-white border-primary rounded-lg p-6 space-y-6">
      <div>
        <h2 className="text-h3 text-primary mb-1">{t('title')}</h2>
        <p className="text-sm text-secondary">{t('subtitle')}</p>
      </div>

      {saved && (
        <div className="p-3 rounded-lg bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 text-sm flex items-center gap-2">
          <Check className="h-4 w-4" />
          Password updated successfully!
        </div>
      )}

      {error && (
        <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-primary mb-1">{t('currentPassword')}</label>
          <Input
            type="password"
            placeholder={t('currentPasswordPlaceholder')}
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-primary mb-1">{t('newPassword')}</label>
          <Input
            type="password"
            placeholder={t('newPasswordPlaceholder')}
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-primary mb-1">{t('confirmPassword')}</label>
          <Input
            type="password"
            placeholder={t('confirmPasswordPlaceholder')}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
          />
        </div>

        <div className="flex justify-end">
          <Button type="submit" disabled={saving}>
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                {tCommon.t('saving')}
              </>
            ) : (
              t('updatePassword')
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}

type Theme = 'light' | 'dark' | 'system';
const THEME_STORAGE_KEY = 'app_theme';

function AppearanceSettings() {
  const { t } = useTranslations('settings.appearance');
  const [theme, setThemeState] = useState<Theme>('system');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(THEME_STORAGE_KEY) as Theme | null;
    if (stored && ['light', 'dark', 'system'].includes(stored)) {
      setThemeState(stored);
    }
  }, []);

  const applyTheme = (newTheme: Theme) => {
    const root = document.documentElement;

    if (newTheme === 'system') {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      root.classList.toggle('dark', prefersDark);
    } else {
      root.classList.toggle('dark', newTheme === 'dark');
    }
  };

  const handleThemeChange = (newTheme: Theme) => {
    setThemeState(newTheme);
    localStorage.setItem(THEME_STORAGE_KEY, newTheme);
    applyTheme(newTheme);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const themes: { value: Theme; label: string; icon: React.ReactNode }[] = [
    {
      value: 'light',
      label: t('light'),
      icon: <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>
    },
    {
      value: 'dark',
      label: t('dark'),
      icon: <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
    },
    {
      value: 'system',
      label: t('system'),
      icon: <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/></svg>
    },
  ];

  return (
    <div className="background-white border-primary rounded-lg p-6 space-y-6">
      <div>
        <h2 className="text-h3 text-primary mb-1">{t('title')}</h2>
        <p className="text-sm text-secondary">{t('subtitle')}</p>
      </div>

      {saved && (
        <div className="p-3 rounded-lg bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 text-sm flex items-center gap-2">
          <Check className="h-4 w-4" />
          Theme updated!
        </div>
      )}

      <div className="space-y-4">
        <div>
          <div className="text-sm font-medium text-primary mb-2">{t('theme')}</div>
          <div className="flex gap-3">
            {themes.map((t) => (
              <button
                key={t.value}
                onClick={() => handleThemeChange(t.value)}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-md border text-sm transition-colors",
                  theme === t.value
                    ? "border-brand bg-brand/10 text-brand"
                    : "border-[#D7D7D7] dark:border-[#212121] hover:bg-brand/5"
                )}
              >
                {t.icon}
                {t.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

const REGIONAL_PREFS_KEY = 'regional_preferences';

interface RegionalPrefs {
  timezone: string;
  dateFormat: string;
}

function LanguageSettings() {
  const { locale, setLocale } = useI18n();
  const { t } = useTranslations('settings.language');
  const [timezone, setTimezoneState] = useState('Asia/Kolkata');
  const [dateFormat, setDateFormatState] = useState('DD/MM/YYYY');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(REGIONAL_PREFS_KEY);
    if (stored) {
      try {
        const prefs: RegionalPrefs = JSON.parse(stored);
        if (prefs.timezone) setTimezoneState(prefs.timezone);
        if (prefs.dateFormat) setDateFormatState(prefs.dateFormat);
      } catch {
        // Use defaults
      }
    }
  }, []);

  const saveRegionalPrefs = (newTimezone?: string, newDateFormat?: string) => {
    const prefs: RegionalPrefs = {
      timezone: newTimezone ?? timezone,
      dateFormat: newDateFormat ?? dateFormat,
    };
    localStorage.setItem(REGIONAL_PREFS_KEY, JSON.stringify(prefs));
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleLanguageChange = (newLocale: Locale) => {
    setLocale(newLocale);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleTimezoneChange = (newTimezone: string) => {
    setTimezoneState(newTimezone);
    saveRegionalPrefs(newTimezone, undefined);
  };

  const handleDateFormatChange = (newFormat: string) => {
    setDateFormatState(newFormat);
    saveRegionalPrefs(undefined, newFormat);
  };

  return (
    <div className="background-white border-primary rounded-lg p-6 space-y-6">
      <div>
        <h2 className="text-h3 text-primary mb-1">{t('title')}</h2>
        <p className="text-sm text-secondary">{t('subtitle')}</p>
      </div>

      {saved && (
        <div className="p-3 rounded-lg bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 text-sm flex items-center gap-2">
          <Check className="h-4 w-4" />
          {locale === 'hi' ? 'सेटिंग्स सफलतापूर्वक अपडेट की गईं!' : 'Settings updated successfully!'}
        </div>
      )}

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-primary mb-2">{t('language')}</label>
          <div className="grid grid-cols-2 gap-3">
            {locales.map((loc) => (
              <button
                key={loc}
                onClick={() => handleLanguageChange(loc)}
                className={cn(
                  "flex items-center gap-3 p-4 rounded-lg border transition-all",
                  locale === loc
                    ? "border-brand bg-brand/5 ring-2 ring-brand/20"
                    : "border-[#D7D7D7] dark:border-[#212121] hover:border-brand/50"
                )}
              >
                <span className="text-2xl">{localeFlags[loc]}</span>
                <div className="text-left">
                  <div className="font-medium text-primary">{localeNames[loc]}</div>
                  <div className="text-xs text-secondary">
                    {loc === 'en' ? 'English' : 'Hindi'}
                  </div>
                </div>
                {locale === loc && (
                  <div className="ml-auto">
                    <svg className="h-5 w-5 text-brand" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-primary mb-1">{t('timezone')}</label>
          <select
            value={timezone}
            onChange={(e) => handleTimezoneChange(e.target.value)}
            className="w-full h-11 rounded-md border border-[#D7D7D7] dark:border-[#212121] px-3 bg-white dark:bg-black text-primary"
          >
            <option value="Asia/Kolkata">India Standard Time (IST)</option>
            <option value="UTC">UTC</option>
            <option value="America/New_York">Eastern Time (US)</option>
            <option value="America/Los_Angeles">Pacific Time (US)</option>
            <option value="Europe/London">London (GMT/BST)</option>
            <option value="Asia/Tokyo">Tokyo (JST)</option>
            <option value="Asia/Singapore">Singapore (SGT)</option>
            <option value="Asia/Dubai">Dubai (GST)</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-primary mb-1">{t('dateFormat')}</label>
          <select
            value={dateFormat}
            onChange={(e) => handleDateFormatChange(e.target.value)}
            className="w-full h-11 rounded-md border border-[#D7D7D7] dark:border-[#212121] px-3 bg-white dark:bg-black text-primary"
          >
            <option value="DD/MM/YYYY">DD/MM/YYYY (31/12/2024)</option>
            <option value="MM/DD/YYYY">MM/DD/YYYY (12/31/2024)</option>
            <option value="YYYY-MM-DD">YYYY-MM-DD (2024-12-31)</option>
          </select>
        </div>
      </div>
    </div>
  );
}

function ApiSettings() {
  const { t } = useTranslations('settings.api');
  return (
    <div className="background-white border-primary rounded-lg p-6 space-y-6">
      <div>
        <h2 className="text-h3 text-primary mb-1">{t('title')}</h2>
        <p className="text-sm text-secondary">{t('subtitle')}</p>
      </div>

      <div className="p-6 rounded-lg bg-gray-50 dark:bg-gray-900 border border-dashed border-[#D7D7D7] dark:border-[#212121] text-center">
        <Key className="h-8 w-8 mx-auto mb-2 text-secondary" />
        <p className="text-sm font-medium text-primary mb-1">Coming Soon</p>
        <p className="text-xs text-secondary">
          API key management will be available in a future update.
        </p>
      </div>
    </div>
  );
}

interface Role {
  id: string;
  name: string;
}

function SSOSettings() {
  const { t } = useTranslations('settings.sso');
  const tCommon = useTranslations('common');
  const [providers, setProviders] = useState<OAuthProviderConfig[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [formData, setFormData] = useState({
    provider: 'GOOGLE',
    name: '',
    clientId: '',
    clientSecret: '',
    tenantId: '',
    domain: '',
    enabled: true,
    autoProvision: false,
    defaultRoleId: '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [providersRes, rolesRes] = await Promise.all([
        oauthApi.getOrgProviders(),
        rolesApi.list(),
      ]);
      setProviders(providersRes.providers);
      setRoles(rolesRes);
    } catch (err) {
      console.error('Failed to load SSO settings:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSaving(true);

    try {
      await oauthApi.configureProvider({
        provider: formData.provider,
        name: formData.name || `${formData.provider} Login`,
        clientId: formData.clientId,
        clientSecret: formData.clientSecret,
        tenantId: formData.tenantId || undefined,
        domain: formData.domain || undefined,
        enabled: formData.enabled,
        autoProvision: formData.autoProvision,
        defaultRoleId: formData.defaultRoleId || undefined,
      });

      setShowAddForm(false);
      setFormData({
        provider: 'GOOGLE',
        name: '',
        clientId: '',
        clientSecret: '',
        tenantId: '',
        domain: '',
        enabled: true,
        autoProvision: false,
        defaultRoleId: '',
      });
      loadData();
    } catch (err: unknown) {
      const error = err as { message?: string };
      setError(error.message || 'Failed to save provider');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this OAuth provider?')) return;

    try {
      await oauthApi.deleteProvider(id);
      loadData();
    } catch (err) {
      console.error('Failed to delete provider:', err);
    }
  };

  const toggleProvider = async (provider: OAuthProviderConfig) => {
    try {
      await oauthApi.updateProvider(provider.id, {
        enabled: !provider.enabled,
        clientSecret: '', // Required but we're only toggling
      });
      loadData();
    } catch (err) {
      console.error('Failed to toggle provider:', err);
    }
  };

  if (loading) {
    return (
      <div className="background-white border-primary rounded-lg p-6 flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-brand" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="background-white border-primary rounded-lg p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-h3 text-primary mb-1">{t('title')}</h2>
            <p className="text-sm text-secondary">
              {t('subtitle')}
            </p>
          </div>
          <Button onClick={() => setShowAddForm(true)}>
            <Plus className="h-4 w-4 mr-2" />
            {t('addProvider')}
          </Button>
        </div>

        {providers.length === 0 ? (
          <div className="p-6 rounded-lg bg-gray-50 dark:bg-gray-900 border border-dashed border-[#D7D7D7] dark:border-[#212121] text-center">
            <LogIn className="h-8 w-8 mx-auto mb-2 text-secondary" />
            <p className="text-sm text-secondary">
              {t('noProviders')}
            </p>
            <p className="text-xs text-secondary mt-1">
              {t('noProvidersHint')}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {providers.map((provider) => (
              <div
                key={provider.id}
                className="flex items-center justify-between p-4 rounded-lg border border-[#D7D7D7] dark:border-[#212121]"
              >
                <div className="flex items-center gap-4">
                  <div className={cn(
                    "h-10 w-10 rounded-lg flex items-center justify-center",
                    provider.provider === 'GOOGLE' ? "bg-red-100 dark:bg-red-900/30" : "bg-blue-100 dark:bg-blue-900/30"
                  )}>
                    {provider.provider === 'GOOGLE' ? (
                      <svg className="h-5 w-5" viewBox="0 0 24 24">
                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                      </svg>
                    ) : (
                      <svg className="h-5 w-5" viewBox="0 0 24 24">
                        <path fill="#00A4EF" d="M11.4 24H0V12.6h11.4V24z"/>
                        <path fill="#FFB900" d="M24 24H12.6V12.6H24V24z"/>
                        <path fill="#F25022" d="M11.4 11.4H0V0h11.4v11.4z"/>
                        <path fill="#7FBA00" d="M24 11.4H12.6V0H24v11.4z"/>
                      </svg>
                    )}
                  </div>
                  <div>
                    <div className="font-medium text-primary">{provider.name}</div>
                    <div className="text-xs text-secondary">
                      {provider.domain ? `${t('domain')} ${provider.domain}` : provider.provider}
                      {provider.autoProvision && ` • ${t('autoProvision')}`}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => toggleProvider(provider)}
                    className={cn(
                      "relative inline-flex h-6 w-11 items-center rounded-full transition-colors",
                      provider.enabled ? "bg-brand" : "bg-gray-300 dark:bg-gray-600"
                    )}
                  >
                    <span
                      className={cn(
                        "inline-block h-4 w-4 transform rounded-full bg-white transition-transform",
                        provider.enabled ? "translate-x-6" : "translate-x-1"
                      )}
                    />
                  </button>
                  <button
                    onClick={() => handleDelete(provider.id)}
                    className="p-2 text-secondary hover:text-red-500 transition-colors"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add Provider Form */}
      {showAddForm && (
        <div className="background-white border-primary rounded-lg p-6 space-y-6">
          <div>
            <h2 className="text-h3 text-primary mb-1">Add OAuth Provider</h2>
            <p className="text-sm text-secondary">
              Configure a new OAuth provider for your organization
            </p>
          </div>

          {error && (
            <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-primary mb-1">Provider Type</label>
                <select
                  value={formData.provider}
                  onChange={(e) => setFormData({ ...formData, provider: e.target.value })}
                  className="w-full h-11 rounded-md border border-[#D7D7D7] dark:border-[#212121] px-3 bg-white dark:bg-black text-primary"
                >
                  <option value="GOOGLE">Google</option>
                  <option value="MICROSOFT">Microsoft</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-primary mb-1">Display Name</label>
                <Input
                  placeholder={`e.g., ${formData.provider === 'GOOGLE' ? 'Google Workspace' : 'Microsoft Entra ID'}`}
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-primary mb-1">Client ID</label>
                <Input
                  required
                  placeholder="OAuth client ID"
                  value={formData.clientId}
                  onChange={(e) => setFormData({ ...formData, clientId: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-primary mb-1">Client Secret</label>
                <Input
                  required
                  type="password"
                  placeholder="OAuth client secret"
                  value={formData.clientSecret}
                  onChange={(e) => setFormData({ ...formData, clientSecret: e.target.value })}
                />
              </div>
              {formData.provider === 'MICROSOFT' && (
                <div>
                  <label className="block text-sm font-medium text-primary mb-1">Tenant ID</label>
                  <Input
                    placeholder="Azure AD tenant ID (optional)"
                    value={formData.tenantId}
                    onChange={(e) => setFormData({ ...formData, tenantId: e.target.value })}
                  />
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-primary mb-1">
                  {formData.provider === 'GOOGLE' ? 'Domain Restriction' : 'Domain Hint'}
                </label>
                <Input
                  placeholder="e.g., company.com"
                  value={formData.domain}
                  onChange={(e) => setFormData({ ...formData, domain: e.target.value })}
                />
                <p className="text-xs text-secondary mt-1">
                  {formData.provider === 'GOOGLE'
                    ? 'Only allow users from this domain'
                    : 'Pre-fill domain for login'}
                </p>
              </div>
            </div>

            <div className="space-y-3 border-t border-[#D7D7D7] dark:border-[#212121] pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium text-primary">Auto-provision users</div>
                  <div className="text-xs text-secondary">Automatically create accounts for new SSO users</div>
                </div>
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, autoProvision: !formData.autoProvision })}
                  className={cn(
                    "relative inline-flex h-6 w-11 items-center rounded-full transition-colors",
                    formData.autoProvision ? "bg-brand" : "bg-gray-300 dark:bg-gray-600"
                  )}
                >
                  <span
                    className={cn(
                      "inline-block h-4 w-4 transform rounded-full bg-white transition-transform",
                      formData.autoProvision ? "translate-x-6" : "translate-x-1"
                    )}
                  />
                </button>
              </div>

              {formData.autoProvision && (
                <div>
                  <label className="block text-sm font-medium text-primary mb-1">Default Role</label>
                  <select
                    value={formData.defaultRoleId}
                    onChange={(e) => setFormData({ ...formData, defaultRoleId: e.target.value })}
                    className="w-full h-11 rounded-md border border-[#D7D7D7] dark:border-[#212121] px-3 bg-white dark:bg-black text-primary"
                  >
                    <option value="">Select a role...</option>
                    {roles.map((role) => (
                      <option key={role.id} value={role.id}>{role.name}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button type="button" variant="outline" onClick={() => setShowAddForm(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  'Save Provider'
                )}
              </Button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
