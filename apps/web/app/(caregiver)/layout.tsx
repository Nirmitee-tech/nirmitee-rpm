'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Users, Bell, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTranslations } from '@/lib/i18n/i18n-context';

const navItems = [
  { href: '/caregiver-dashboard', icon: Home, label: 'Dashboard' },
  { href: '/caregiver-alerts', icon: Bell, label: 'Alerts' },
  { href: '/caregiver-settings', icon: Settings, label: 'Settings' },
];

export default function CaregiverLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const { t } = useTranslations('caregiver');

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-gray-50 dark:bg-gray-950">
      {/* Header */}
      <header className="flex h-14 items-center justify-between border-b bg-white px-4 dark:border-gray-800 dark:bg-gray-900">
        <div className="flex items-center gap-2">
          <Users className="h-6 w-6 text-rose-600" />
          <span className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            {t('title') || 'Family Portal'}
          </span>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-auto pb-16">
        <div className="mx-auto max-w-screen-xl">{children}</div>
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 border-t bg-white dark:bg-gray-900 dark:border-gray-800 safe-area-inset-bottom">
        <div className="mx-auto flex max-w-screen-xl items-center justify-around">
          {navItems.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex min-h-[44px] flex-1 flex-col items-center justify-center gap-1 px-3 py-2 text-xs transition-colors',
                  isActive
                    ? 'text-rose-600 dark:text-rose-400'
                    : 'text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100'
                )}
              >
                <Icon className="h-5 w-5" />
                <span className="text-[10px] font-medium">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
