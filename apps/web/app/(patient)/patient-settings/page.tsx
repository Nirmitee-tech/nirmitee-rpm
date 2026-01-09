'use client';

import { ChevronRight, Bell, Globe, Shield, HelpCircle, Info, Pill, Users, AlertTriangle, Video, FileText } from 'lucide-react';
import Link from 'next/link';
import { useTranslations } from '@/lib/i18n/i18n-context';
import { useI18n } from '@/lib/i18n/i18n-context';

export default function PatientSettingsPage() {
  const { t } = useTranslations('patient.settings');
  const { locale, setLocale } = useI18n();

  // Quick access items
  const quickAccessItems = [
    {
      icon: Pill,
      label: 'Medications',
      href: '/medications',
      color: 'text-teal-600 dark:text-teal-400',
      bgColor: 'bg-teal-100 dark:bg-teal-900/30',
    },
    {
      icon: Users,
      label: 'Care Team',
      href: '/my-care-team',
      color: 'text-blue-600 dark:text-blue-400',
      bgColor: 'bg-blue-100 dark:bg-blue-900/30',
    },
    {
      icon: AlertTriangle,
      label: 'Alerts',
      href: '/my-alerts',
      color: 'text-orange-600 dark:text-orange-400',
      bgColor: 'bg-orange-100 dark:bg-orange-900/30',
    },
    {
      icon: Video,
      label: 'Video Call',
      href: '/video-call',
      color: 'text-purple-600 dark:text-purple-400',
      bgColor: 'bg-purple-100 dark:bg-purple-900/30',
    },
  ];

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
    <div className="space-y-4 p-4 pb-24">
      {/* Header */}
      <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">
        {t('title')}
      </h1>

      {/* Quick Access Grid */}
      <div className="grid grid-cols-4 gap-2">
        {quickAccessItems.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className="flex flex-col items-center justify-center rounded-xl border border-gray-200 bg-white p-3 transition-all hover:shadow-md dark:border-gray-800 dark:bg-gray-900"
            >
              <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${item.bgColor}`}>
                <Icon className={`h-5 w-5 ${item.color}`} />
              </div>
              <span className="mt-1.5 text-[10px] font-medium text-gray-700 dark:text-gray-300 text-center">
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>

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
