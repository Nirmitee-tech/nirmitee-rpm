'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Settings,
  FileText,
  BarChart3,
  ShieldCheck,
  ChevronLeft,
  ChevronRight,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '@nirmitee/ui';
import { Logo } from '@/components/ui/logo';
import { useState } from 'react';
import { useTranslations } from '@/lib/i18n/i18n-context';

interface NavItem {
  href: string;
  icon: LucideIcon;
  labelKey: string;
}

const navItems: NavItem[] = [
  { href: '/dashboard', icon: LayoutDashboard, labelKey: 'dashboard' },
  { href: '/reports', icon: FileText, labelKey: 'reports' },
  { href: '/analytics', icon: BarChart3, labelKey: 'analytics' },
  { href: '/audit', icon: ShieldCheck, labelKey: 'auditLogs' },
  { href: '/settings', icon: Settings, labelKey: 'settings' },
];

export function Sidebar() {
  const pathname = usePathname();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const { t } = useTranslations('navigation');
  const { t: tCommon } = useTranslations('common');

  return (
    <aside
      className={cn(
        'sidebar-gradient h-full flex flex-col border-r border-[#E5E5E5] dark:border-[#1f1f2e] transition-all duration-300 shadow-sm',
        isCollapsed ? 'w-[68px]' : 'w-[240px]'
      )}
    >
      {/* Logo */}
      <div className="h-[60px] flex items-center px-4 border-b border-[#E5E5E5] dark:border-[#1f1f2e]">
        {isCollapsed ? (
          <span className="text-brand font-brand font-bold text-xl">N</span>
        ) : (
          <Logo variant="dark" />
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto hide-scrollbar p-2">
        <div className="space-y-1">
          {navItems.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
            const Icon = item.icon;
            const label = t(item.labelKey);
            return (
              <Link
                key={item.href}
                href={item.href}
                title={isCollapsed ? label : undefined}
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200',
                  isActive
                    ? 'bg-gradient-to-r from-[#745EE1] to-[#8B5CF6] text-white'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-[#745EE1]/10',
                  isCollapsed && 'justify-center'
                )}
              >
                <Icon className="h-5 w-5 shrink-0" />
                {!isCollapsed && label}
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Collapse Toggle */}
      <div className="p-2 border-t border-[#E5E5E5] dark:border-[#1f1f2e]">
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-gray-500 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/5 transition-colors"
        >
          {isCollapsed ? (
            <ChevronRight className="h-5 w-5" />
          ) : (
            <>
              <ChevronLeft className="h-5 w-5" />
              <span className="text-sm">{tCommon('collapse')}</span>
            </>
          )}
        </button>
      </div>
    </aside>
  );
}
