'use client';

import { useState, useEffect } from 'react';
import { Upload, Loader2, Check, X, Image as ImageIcon } from 'lucide-react';
import { Button, Input } from '@nirmitee/ui';
import { ColorPicker } from '@/components/settings/color-picker';
import { BrandingPreview } from '@/components/settings/branding-preview';
import { brandingApi, BrandingSettings } from '@/lib/api/branding';
import { useTranslations } from '@/lib/i18n/i18n-context';
import { cn } from '@nirmitee/ui';

export default function BrandingPage() {
  const { t } = useTranslations('settings.branding');
  const tCommon = useTranslations('common');

  const [logo, setLogo] = useState<string | null>(null);
  const [favicon, setFavicon] = useState<string | null>(null);
  const [primaryColor, setPrimaryColor] = useState('#745EE1');
  const [accentColor, setAccentColor] = useState('#3B82F6');
  const [darkMode, setDarkMode] = useState(false);

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [faviconFile, setFaviconFile] = useState<File | null>(null);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingFavicon, setUploadingFavicon] = useState(false);

  // Load existing branding settings from organization
  useEffect(() => {
    loadBrandingSettings();
  }, []);

  const loadBrandingSettings = async () => {
    try {
      setLoading(true);
      // In a real implementation, you would fetch the current organization's branding
      // For now, we'll load from localStorage as a fallback
      const stored = localStorage.getItem('org_branding');
      if (stored) {
        const branding = JSON.parse(stored);
        setLogo(branding.logo || null);
        setFavicon(branding.favicon || null);
        setPrimaryColor(branding.primaryColor || '#745EE1');
        setAccentColor(branding.accentColor || '#3B82F6');
        setDarkMode(branding.darkMode || false);
      }
    } catch (err) {
      console.error('Failed to load branding settings:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'logo' | 'favicon') => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setError(t('invalidImageType'));
      return;
    }

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      setError(t('imageTooLarge'));
      return;
    }

    try {
      if (type === 'logo') {
        setUploadingLogo(true);
      } else {
        setUploadingFavicon(true);
      }

      // Create a local preview URL
      const previewUrl = URL.createObjectURL(file);

      // In a real implementation, you would upload to your file storage service
      // For now, we'll use the preview URL
      if (type === 'logo') {
        setLogo(previewUrl);
        setLogoFile(file);
      } else {
        setFavicon(previewUrl);
        setFaviconFile(file);
      }

      setError('');
    } catch (err) {
      const error = err as { message?: string };
      setError(error.message || t('uploadFailed'));
    } finally {
      if (type === 'logo') {
        setUploadingLogo(false);
      } else {
        setUploadingFavicon(false);
      }
    }
  };

  const handleRemoveLogo = async (type: 'logo' | 'favicon') => {
    try {
      if (type === 'logo') {
        setLogo(null);
        setLogoFile(null);
      } else {
        setFavicon(null);
        setFaviconFile(null);
      }
    } catch (err) {
      console.error('Failed to remove logo:', err);
    }
  };

  const handleSave = async () => {
    setError('');
    setSaving(true);
    setSaved(false);

    try {
      const brandingData: BrandingSettings = {
        logo,
        favicon,
        primaryColor,
        accentColor,
        darkMode,
      };

      // Save to API
      await brandingApi.updateBranding(brandingData);

      // Also save to localStorage for persistence
      localStorage.setItem('org_branding', JSON.stringify(brandingData));

      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      const error = err as { message?: string };
      setError(error.message || t('saveFailed'));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-[#745EE1]" />
      </div>
    );
  }

  return (
    <div className="w-full space-y-6">
      {/* Main Settings Card */}
      <div className="bg-white dark:bg-[#0a0a0a] border border-[#E5E5E5] dark:border-[#212121] rounded-xl p-6">
        <h2 className="text-lg font-semibold text-[#171717] dark:text-white mb-1">
          {t('title')}
        </h2>
        <p className="text-sm text-[#737373] mb-6">{t('subtitle')}</p>

        {saved && (
          <div className="mb-4 p-3 rounded-lg bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 text-sm flex items-center gap-2">
            <Check className="h-4 w-4" />
            {t('saveSuccess')}
          </div>
        )}

        {error && (
          <div className="mb-4 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column - Settings */}
          <div className="space-y-6">
            {/* Logo Upload */}
            <div>
              <label className="block text-sm font-medium text-[#171717] dark:text-white mb-2">
                {t('organizationLogo')}
              </label>
              <div className="space-y-3">
                {logo ? (
                  <div className="relative w-32 h-32 rounded-lg border-2 border-[#E5E5E5] dark:border-[#212121] overflow-hidden bg-white dark:bg-black flex items-center justify-center">
                    <img src={logo} alt="Logo" className="max-w-full max-h-full object-contain" />
                    <button
                      onClick={() => handleRemoveLogo('logo')}
                      className="absolute top-1 right-1 p-1 rounded-full bg-red-500 text-white hover:bg-red-600 transition-colors"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ) : (
                  <label className="block w-32 h-32 rounded-lg border-2 border-dashed border-[#E5E5E5] dark:border-[#212121] hover:border-[#745EE1] dark:hover:border-[#745EE1] transition-colors cursor-pointer">
                    <div className="h-full flex flex-col items-center justify-center">
                      {uploadingLogo ? (
                        <Loader2 className="h-6 w-6 animate-spin text-[#745EE1]" />
                      ) : (
                        <>
                          <ImageIcon className="h-6 w-6 text-[#737373] mb-2" />
                          <span className="text-xs text-[#737373]">{t('uploadLogo')}</span>
                        </>
                      )}
                    </div>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleLogoUpload(e, 'logo')}
                      className="hidden"
                    />
                  </label>
                )}
                <p className="text-xs text-[#737373]">{t('logoHint')}</p>
              </div>
            </div>

            {/* Favicon Upload */}
            <div>
              <label className="block text-sm font-medium text-[#171717] dark:text-white mb-2">
                {t('favicon')}
              </label>
              <div className="space-y-3">
                {favicon ? (
                  <div className="relative w-16 h-16 rounded-lg border-2 border-[#E5E5E5] dark:border-[#212121] overflow-hidden bg-white dark:bg-black flex items-center justify-center">
                    <img src={favicon} alt="Favicon" className="max-w-full max-h-full object-contain" />
                    <button
                      onClick={() => handleRemoveLogo('favicon')}
                      className="absolute top-0 right-0 p-0.5 rounded-full bg-red-500 text-white hover:bg-red-600 transition-colors"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ) : (
                  <label className="block w-16 h-16 rounded-lg border-2 border-dashed border-[#E5E5E5] dark:border-[#212121] hover:border-[#745EE1] dark:hover:border-[#745EE1] transition-colors cursor-pointer">
                    <div className="h-full flex items-center justify-center">
                      {uploadingFavicon ? (
                        <Loader2 className="h-5 w-5 animate-spin text-[#745EE1]" />
                      ) : (
                        <Upload className="h-5 w-5 text-[#737373]" />
                      )}
                    </div>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleLogoUpload(e, 'favicon')}
                      className="hidden"
                    />
                  </label>
                )}
                <p className="text-xs text-[#737373]">{t('faviconHint')}</p>
              </div>
            </div>

            {/* Primary Color */}
            <ColorPicker
              label={t('primaryColor')}
              value={primaryColor}
              onChange={setPrimaryColor}
            />

            {/* Accent Color */}
            <ColorPicker
              label={t('accentColor')}
              value={accentColor}
              onChange={setAccentColor}
            />

            {/* Dark Mode Toggle */}
            <div className="flex items-center justify-between py-3 border-t border-[#E5E5E5] dark:border-[#212121]">
              <div>
                <div className="text-sm font-medium text-[#171717] dark:text-white">
                  {t('darkModeDefault')}
                </div>
                <div className="text-xs text-[#737373]">{t('darkModeDesc')}</div>
              </div>
              <button
                type="button"
                onClick={() => setDarkMode(!darkMode)}
                className={cn(
                  "relative inline-flex h-6 w-11 items-center rounded-full transition-colors",
                  darkMode ? "bg-[#745EE1]" : "bg-gray-300 dark:bg-gray-600"
                )}
              >
                <span
                  className={cn(
                    "inline-block h-4 w-4 transform rounded-full bg-white transition-transform",
                    darkMode ? "translate-x-6" : "translate-x-1"
                  )}
                />
              </button>
            </div>
          </div>

          {/* Right Column - Preview */}
          <div className="space-y-6">
            <BrandingPreview
              logo={logo}
              primaryColor={primaryColor}
              accentColor={accentColor}
            />
          </div>
        </div>

        {/* Save Button */}
        <div className="flex justify-end pt-6 border-t border-[#E5E5E5] dark:border-[#212121] mt-6">
          <Button onClick={handleSave} disabled={saving}>
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                {tCommon.t('saving')}
              </>
            ) : (
              tCommon.t('save')
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
