'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Activity, MessageCircle, Video, MoreHorizontal } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTranslations } from '@/lib/i18n/i18n-context';

const navItems = [
  {
    href: '/patient-dashboard',
    icon: Home,
    labelKey: 'home',
  },
  {
    href: '/my-vitals',
    icon: Activity,
    labelKey: 'vitals',
  },
  {
    href: '/video-call',
    icon: Video,
    labelKey: 'video',
  },
  {
    href: '/my-messages',
    icon: MessageCircle,
    labelKey: 'messages',
  },
  {
    href: '/patient-settings',
    icon: MoreHorizontal,
    labelKey: 'more',
  },
];

export function PatientBottomNav() {
  const pathname = usePathname();
  const { t } = useTranslations('patient.navigation');

  return (
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
                  ? 'text-brand-600 dark:text-brand-400'
                  : 'text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100'
              )}
            >
              <Icon className="h-5 w-5" />
              <span className="text-[10px] font-medium">{t(item.labelKey)}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
