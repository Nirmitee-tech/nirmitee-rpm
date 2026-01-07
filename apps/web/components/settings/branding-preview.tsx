'use client';

import { Home, Users, Settings } from 'lucide-react';
import { useTranslations } from '@/lib/i18n/i18n-context';
import Image from 'next/image';

interface BrandingPreviewProps {
  logo?: string | null;
  primaryColor: string;
  accentColor: string;
}

export function BrandingPreview({ logo, primaryColor, accentColor }: BrandingPreviewProps) {
  const { t } = useTranslations('settings.branding');

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-medium text-[#171717] dark:text-white">{t('preview')}</h3>

      {/* Preview Container */}
      <div className="rounded-xl border-2 border-[#E5E5E5] dark:border-[#212121] overflow-hidden bg-white dark:bg-[#0a0a0a]">
        {/* Mini Sidebar */}
        <div className="flex h-[200px]">
          {/* Sidebar */}
          <div
            className="w-16 flex flex-col items-center py-4 space-y-4"
            style={{ backgroundColor: primaryColor }}
          >
            {/* Logo */}
            <div className="h-10 w-10 rounded-lg bg-white/10 flex items-center justify-center">
              {logo ? (
                <Image src={logo} alt="Logo" width={32} height={32} className="rounded" />
              ) : (
                <span className="text-white text-xs font-bold">N</span>
              )}
            </div>

            {/* Nav Items */}
            <div className="flex flex-col space-y-2">
              <div className="h-8 w-8 rounded-lg bg-white/10 flex items-center justify-center">
                <Home className="h-4 w-4 text-white" />
              </div>
              <div className="h-8 w-8 rounded-lg bg-white/20 flex items-center justify-center">
                <Users className="h-4 w-4 text-white" />
              </div>
              <div className="h-8 w-8 rounded-lg bg-white/10 flex items-center justify-center">
                <Settings className="h-4 w-4 text-white" />
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="flex-1 p-4 bg-[#F8F7FC] dark:bg-[#0a0a0a]">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <div className="h-6 w-32 rounded bg-[#E5E5E5] dark:bg-[#212121]" />
              <div className="h-8 w-8 rounded-full" style={{ backgroundColor: accentColor }} />
            </div>

            {/* Cards */}
            <div className="space-y-2">
              <div className="h-16 rounded-lg bg-white dark:bg-black border border-[#E5E5E5] dark:border-[#212121] p-3">
                <div className="h-3 w-24 rounded bg-[#E5E5E5] dark:bg-[#212121] mb-2" />
                <div className="h-2 w-full rounded bg-[#F5F5F5] dark:bg-[#171717]" />
              </div>
              <div className="h-16 rounded-lg bg-white dark:bg-black border border-[#E5E5E5] dark:border-[#212121] p-3">
                <div className="h-3 w-20 rounded bg-[#E5E5E5] dark:bg-[#212121] mb-2" />
                <div className="h-2 w-3/4 rounded bg-[#F5F5F5] dark:bg-[#171717]" />
              </div>
            </div>

            {/* Button Preview */}
            <div className="mt-4">
              <div
                className="inline-block px-4 py-2 rounded-lg text-white text-xs font-medium"
                style={{ backgroundColor: accentColor }}
              >
                {t('previewButton')}
              </div>
            </div>
          </div>
        </div>
      </div>

      <p className="text-xs text-[#737373]">{t('previewHint')}</p>
    </div>
  );
}
