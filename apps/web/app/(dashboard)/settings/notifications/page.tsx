'use client';

import { useTranslations } from '@/lib/i18n/i18n-context';
import { NotificationPreferencesForm } from '@/components/features/notifications/notification-preferences-form';

export default function NotificationPreferencesPage() {
  const { t } = useTranslations('notificationPreferences');

  return (
    <div className="w-full space-y-6">
      {/* Header */}
      <div className="bg-white dark:bg-[#0a0a0a] border border-[#E5E5E5] dark:border-[#212121] rounded-xl p-6">
        <h2 className="text-lg font-semibold text-[#171717] dark:text-white mb-1">
          {t('title')}
        </h2>
        <p className="text-sm text-[#737373]">{t('subtitle')}</p>
      </div>

      {/* Form */}
      <NotificationPreferencesForm />
    </div>
  );
}
