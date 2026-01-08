'use client';

import { Bell, Menu } from 'lucide-react';
import { useTranslations } from '@/lib/i18n/i18n-context';
import { useAuth } from '@/lib/auth';

interface PatientHeaderProps {
  showGreeting?: boolean;
}

export function PatientHeader({ showGreeting = true }: PatientHeaderProps) {
  const { t } = useTranslations('patient.dashboard');
  const { user } = useAuth();

  const getTimeOfDay = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Morning';
    if (hour < 18) return 'Afternoon';
    return 'Evening';
  };

  const firstName = user?.firstName || 'there';
  const timeOfDay = getTimeOfDay();

  return (
    <header className="border-b bg-white px-4 py-3 dark:bg-gray-900 dark:border-gray-800">
      <div className="mx-auto flex max-w-screen-xl items-center justify-between">
        <div className="flex items-center gap-3">
          {showGreeting && (
            <div>
              <h1 className="text-lg font-bold text-gray-900 dark:text-gray-100">
                {t(`greeting${timeOfDay}`, { name: firstName })}
              </h1>
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="flex h-10 w-10 items-center justify-center rounded-full text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
            aria-label="Notifications"
          >
            <Bell className="h-5 w-5" />
          </button>
        </div>
      </div>
    </header>
  );
}
