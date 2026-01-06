'use client';

import { Bell, Search, Moon, Sun } from 'lucide-react';
import { Button, Input } from '@nirmitee/ui';
import { UserMenu } from '@/components/features/user/user-menu';
import { OrgSwitcher } from '@/components/features/organization/org-switcher';
import { useTheme } from '@/components/providers/theme-provider';

export function Navbar() {
  const { theme, toggleTheme } = useTheme();

  return (
    <header className="navbar-gradient h-[60px] flex items-center justify-between px-4 border-b border-[#D7D7D7] dark:border-[#1f1f2e]">
      {/* Left side - Search */}
      <div className="flex items-center gap-4">
        {/* Search */}
        <div className="relative w-64 hidden md:block">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            type="search"
            placeholder="Search..."
            className="pl-10 h-9"
          />
        </div>
      </div>

      {/* Right actions */}
      <div className="flex items-center gap-2">
        {/* Mobile search */}
        <Button variant="ghost" size="icon" className="md:hidden">
          <Search className="h-5 w-5" />
        </Button>

        {/* Org Switcher */}
        <OrgSwitcher />

        {/* Theme toggle */}
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleTheme}
          aria-label="Toggle theme"
        >
          {theme === 'dark' ? (
            <Sun className="h-5 w-5" />
          ) : (
            <Moon className="h-5 w-5" />
          )}
        </Button>

        {/* Notifications */}
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          <span className="absolute top-1 right-1 h-2 w-2 bg-danger rounded-full" />
        </Button>

        {/* User menu */}
        <UserMenu />
      </div>
    </header>
  );
}
