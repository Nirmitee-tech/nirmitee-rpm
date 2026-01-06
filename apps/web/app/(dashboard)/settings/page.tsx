'use client';

import { useState, useEffect } from 'react';
import { User, Bell, Shield, Palette, Globe, Key, LogIn, Loader2, Trash2, Plus } from 'lucide-react';
import { Button, Input } from '@nirmitee/ui';
import { cn } from '@nirmitee/ui';
import { oauthApi, OAuthProviderConfig } from '@/lib/api/auth';
import { rolesApi } from '@/lib/api';
import { useI18n, useTranslations } from '@/lib/i18n/i18n-context';
import { locales, localeNames, localeFlags, type Locale } from '@/i18n/config';

const settingsTabs = [
  { id: 'profile', label: 'Profile', icon: User },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'security', label: 'Security', icon: Shield },
  { id: 'sso', label: 'SSO / OAuth', icon: LogIn },
  { id: 'appearance', label: 'Appearance', icon: Palette },
  { id: 'language', label: 'Language', icon: Globe },
  { id: 'api', label: 'API Keys', icon: Key },
];

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState('profile');

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-h1 text-primary">Settings</h1>
        <p className="text-secondary mt-1">Manage your account settings and preferences</p>
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
  return (
    <div className="background-white border-primary rounded-lg p-6 space-y-6">
      <div>
        <h2 className="text-h3 text-primary mb-1">Profile Information</h2>
        <p className="text-sm text-secondary">Update your personal details</p>
      </div>

      <div className="flex items-center gap-4">
        <div className="h-16 w-16 rounded-full bg-brand flex items-center justify-center">
          <span className="text-xl font-medium text-white">JD</span>
        </div>
        <div>
          <Button variant="outline" size="sm">Change Photo</Button>
          <p className="text-xs text-secondary mt-1">JPG, PNG or GIF. Max 2MB.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-primary mb-1">First Name</label>
          <Input defaultValue="John" />
        </div>
        <div>
          <label className="block text-sm font-medium text-primary mb-1">Last Name</label>
          <Input defaultValue="Doe" />
        </div>
        <div className="sm:col-span-2">
          <label className="block text-sm font-medium text-primary mb-1">Email</label>
          <Input type="email" defaultValue="john.doe@example.com" />
        </div>
      </div>

      <div className="flex justify-end">
        <Button>Save Changes</Button>
      </div>
    </div>
  );
}

function NotificationSettings() {
  return (
    <div className="background-white border-primary rounded-lg p-6 space-y-6">
      <div>
        <h2 className="text-h3 text-primary mb-1">Notification Preferences</h2>
        <p className="text-sm text-secondary">Choose how you want to be notified</p>
      </div>

      <div className="space-y-4">
        {[
          { title: 'Email Notifications', description: 'Receive notifications via email' },
          { title: 'Push Notifications', description: 'Receive push notifications in browser' },
          { title: 'Security Alerts', description: 'Important security-related notifications' },
          { title: 'Weekly Reports', description: 'Get weekly summary reports' },
        ].map((item) => (
          <div key={item.title} className="flex items-center justify-between py-2">
            <div>
              <div className="text-sm font-medium text-primary">{item.title}</div>
              <div className="text-xs text-secondary">{item.description}</div>
            </div>
            <input
              type="checkbox"
              className="h-5 w-5 rounded border-gray-300 text-brand focus:ring-brand"
              defaultChecked
            />
          </div>
        ))}
      </div>
    </div>
  );
}

function SecuritySettings() {
  return (
    <div className="background-white border-primary rounded-lg p-6 space-y-6">
      <div>
        <h2 className="text-h3 text-primary mb-1">Security Settings</h2>
        <p className="text-sm text-secondary">Manage your account security</p>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-primary mb-1">Current Password</label>
          <Input type="password" placeholder="Enter current password" />
        </div>
        <div>
          <label className="block text-sm font-medium text-primary mb-1">New Password</label>
          <Input type="password" placeholder="Enter new password" />
        </div>
        <div>
          <label className="block text-sm font-medium text-primary mb-1">Confirm Password</label>
          <Input type="password" placeholder="Confirm new password" />
        </div>
      </div>

      <div className="flex justify-end">
        <Button>Update Password</Button>
      </div>
    </div>
  );
}

function AppearanceSettings() {
  return (
    <div className="background-white border-primary rounded-lg p-6 space-y-6">
      <div>
        <h2 className="text-h3 text-primary mb-1">Appearance</h2>
        <p className="text-sm text-secondary">Customize how the app looks</p>
      </div>

      <div className="space-y-4">
        <div>
          <div className="text-sm font-medium text-primary mb-2">Theme</div>
          <div className="flex gap-3">
            {['Light', 'Dark', 'System'].map((theme) => (
              <button
                key={theme}
                className="px-4 py-2 rounded-md border border-[#D7D7D7] dark:border-[#212121] text-sm hover:bg-brand/5"
              >
                {theme}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function LanguageSettings() {
  const { locale, setLocale } = useI18n();
  const { t } = useTranslations('settings.language');
  const [timezone, setTimezone] = useState('Asia/Kolkata');
  const [saved, setSaved] = useState(false);

  const handleLanguageChange = (newLocale: Locale) => {
    setLocale(newLocale);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="background-white border-primary rounded-lg p-6 space-y-6">
      <div>
        <h2 className="text-h3 text-primary mb-1">{t('title')}</h2>
        <p className="text-sm text-secondary">{t('subtitle')}</p>
      </div>

      {saved && (
        <div className="p-3 rounded-lg bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 text-sm">
          {locale === 'hi' ? 'भाषा सफलतापूर्वक अपडेट की गई!' : 'Language updated successfully!'}
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
            onChange={(e) => setTimezone(e.target.value)}
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
          <select className="w-full h-11 rounded-md border border-[#D7D7D7] dark:border-[#212121] px-3 bg-white dark:bg-black text-primary">
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
  return (
    <div className="background-white border-primary rounded-lg p-6 space-y-6">
      <div>
        <h2 className="text-h3 text-primary mb-1">API Keys</h2>
        <p className="text-sm text-secondary">Manage your API keys for external integrations</p>
      </div>

      <div className="p-4 rounded-lg bg-gray-50 dark:bg-gray-900 border border-dashed border-[#D7D7D7] dark:border-[#212121]">
        <p className="text-sm text-secondary text-center">
          No API keys generated yet.
        </p>
      </div>

      <Button variant="outline">Generate New API Key</Button>
    </div>
  );
}

interface Role {
  id: string;
  name: string;
}

function SSOSettings() {
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
            <h2 className="text-h3 text-primary mb-1">Single Sign-On (SSO)</h2>
            <p className="text-sm text-secondary">
              Configure OAuth providers for seamless authentication
            </p>
          </div>
          <Button onClick={() => setShowAddForm(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Provider
          </Button>
        </div>

        {providers.length === 0 ? (
          <div className="p-6 rounded-lg bg-gray-50 dark:bg-gray-900 border border-dashed border-[#D7D7D7] dark:border-[#212121] text-center">
            <LogIn className="h-8 w-8 mx-auto mb-2 text-secondary" />
            <p className="text-sm text-secondary">
              No OAuth providers configured yet.
            </p>
            <p className="text-xs text-secondary mt-1">
              Add Google or Microsoft login to enable SSO for your organization.
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
                      {provider.domain ? `Domain: ${provider.domain}` : provider.provider}
                      {provider.autoProvision && ' • Auto-provision enabled'}
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
