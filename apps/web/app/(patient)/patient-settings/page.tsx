'use client';

import { ChevronRight, Bell, Globe, Shield, HelpCircle, Info } from 'lucide-react';
import Link from 'next/link';
import { useTranslations } from '@/lib/i18n/i18n-context';
import { useI18n } from '@/lib/i18n/i18n-context';

export default function PatientSettingsPage() {
  const { t } = useTranslations('patient.settings');
  const { locale, setLocale } = useI18n();

  const settingsItems = [
    {
      icon: Bell,
      labelKey: 'notifications',
      descKey: 'notificationsDesc',
      href: '/settings',
    },
    {
      icon: Globe,
      labelKey: 'language',
      descKey: 'languageDesc',
      action: 'language',
    },
    {
      icon: Shield,
      labelKey: 'privacy',
      descKey: 'privacyDesc',
      href: '/settings',
    },
    {
      icon: HelpCircle,
      labelKey: 'help',
      descKey: 'helpDesc',
      href: '/help',
    },
  ];

  const handleLanguageToggle = () => {
    setLocale(locale === 'en' ? 'hi' : 'en');
  };

  return (
    <div className="space-y-4 p-4">
      {/* Header */}
      <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">
        {t('title')}
      </h1>

      {/* Settings List */}
      <div className="space-y-2">
        {settingsItems.map((item) => {
          const Icon = item.icon;

          if (item.action === 'language') {
            return (
              <button
                key={item.labelKey}
                type="button"
                onClick={handleLanguageToggle}
                className="flex w-full items-center justify-between rounded-lg border border-gray-200 bg-white p-4 text-left transition-colors hover:bg-gray-50 dark:border-gray-800 dark:bg-gray-900 dark:hover:bg-gray-800"
              >
                <div className="flex items-center gap-3">
                  <Icon className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                      {t(item.labelKey)}
                    </p>
                    <p className="text-xs text-gray-600 dark:text-gray-400">
                      {t(item.descKey)}
                    </p>
                    <p className="mt-1 text-xs text-brand-600 dark:text-brand-400">
                      Current: {locale === 'en' ? 'English' : 'हिन्दी'}
                    </p>
                  </div>
                </div>
                <ChevronRight className="h-5 w-5 text-gray-400" />
              </button>
            );
          }

          return (
            <Link
              key={item.labelKey}
              href={item.href || '#'}
              className="flex items-center justify-between rounded-lg border border-gray-200 bg-white p-4 transition-colors hover:bg-gray-50 dark:border-gray-800 dark:bg-gray-900 dark:hover:bg-gray-800"
            >
              <div className="flex items-center gap-3">
                <Icon className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                    {t(item.labelKey)}
                  </p>
                  <p className="text-xs text-gray-600 dark:text-gray-400">
                    {t(item.descKey)}
                  </p>
                </div>
              </div>
              <ChevronRight className="h-5 w-5 text-gray-400" />
            </Link>
          );
        })}
      </div>

      {/* App Info */}
      <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
        <div className="flex items-center gap-3">
          <Info className="h-5 w-5 text-gray-600 dark:text-gray-400" />
          <div>
            <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
              {t('about')}
            </p>
            <p className="text-xs text-gray-600 dark:text-gray-400">
              {t('version')}: 1.0.0
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
