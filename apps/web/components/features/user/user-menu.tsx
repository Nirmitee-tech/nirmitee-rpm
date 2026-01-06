'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ChevronDown, User, Settings, LogOut, HelpCircle } from 'lucide-react';
import { cn } from '@nirmitee/ui';
import { useAuth } from '@/lib/auth/auth-context';
import { useTranslations } from '@/lib/i18n/i18n-context';

export function UserMenu() {
  const { t } = useTranslations('userMenu');
  const { user, logout } = useAuth();
  const [isOpen, setIsOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
  };

  if (!user) return null;

  const initials = `${user.firstName?.[0] || ''}${user.lastName?.[0] || ''}`;

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
      >
        <div className="h-8 w-8 rounded-full bg-brand flex items-center justify-center">
          <span className="text-sm font-medium text-white">{initials}</span>
        </div>
        <div className="hidden sm:block text-left">
          <div className="text-sm font-medium text-primary">
            {user.firstName} {user.lastName}
          </div>
          <div className="text-xs text-secondary">{user.email}</div>
        </div>
        <ChevronDown className={cn(
          'h-4 w-4 text-gray-400 transition-transform',
          isOpen && 'rotate-180'
        )} />
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute right-0 top-full mt-2 w-56 py-1 background-white border-primary shadow-lg z-20">
            <div className="px-3 py-2 border-b border-[#D7D7D7] dark:border-[#212121]">
              <div className="text-sm font-medium text-primary">
                {user.firstName} {user.lastName}
              </div>
              <div className="text-xs text-secondary">{user.email}</div>
            </div>

            <div className="py-1">
              <Link
                href="/profile"
                onClick={() => setIsOpen(false)}
                className="flex items-center gap-2 px-3 py-2 text-sm text-primary hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              >
                <User className="h-4 w-4" />
                {t('profile')}
              </Link>
              <Link
                href="/settings"
                onClick={() => setIsOpen(false)}
                className="flex items-center gap-2 px-3 py-2 text-sm text-primary hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              >
                <Settings className="h-4 w-4" />
                {t('settings')}
              </Link>
              <Link
                href="/help"
                onClick={() => setIsOpen(false)}
                className="flex items-center gap-2 px-3 py-2 text-sm text-primary hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              >
                <HelpCircle className="h-4 w-4" />
                {t('help')}
              </Link>
            </div>

            <div className="border-t border-[#D7D7D7] dark:border-[#212121] py-1">
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-danger hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              >
                <LogOut className="h-4 w-4" />
                {t('signOut')}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
