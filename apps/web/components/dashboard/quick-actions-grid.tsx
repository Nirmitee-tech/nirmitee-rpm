'use client';

import Link from 'next/link';
import { cn } from '@/lib/utils';
import { LucideIcon } from 'lucide-react';

export interface QuickAction {
  icon: LucideIcon;
  title: string;
  description: string;
  href?: string;
  onClick?: () => void;
  color?: string;
}

export interface QuickActionsGridProps {
  title?: string;
  actions: QuickAction[];
  columns?: 2 | 3 | 4;
  className?: string;
}

export function QuickActionsGrid({
  title = 'Quick Actions',
  actions,
  columns = 2,
  className,
}: QuickActionsGridProps) {
  const gridCols = {
    2: 'grid-cols-2',
    3: 'grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-2 lg:grid-cols-4',
  };

  return (
    <div className={cn('bg-white dark:bg-gradient-to-br dark:from-[#0f0f1a] dark:to-[#15122a] border border-gray-200 dark:border-[#1f1f2e] rounded-xl p-4', className)}>
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
        {title}
      </h3>

      <div className={cn('grid gap-3', gridCols[columns])}>
        {actions.map((action, index) => {
          const Icon = action.icon;
          const iconColor = action.color || '#745EE1';

          const content = (
            <>
              <div
                className="w-10 h-10 rounded-lg flex items-center justify-center mb-2 transition-transform group-hover:scale-110"
                style={{ backgroundColor: `${iconColor}15` }}
              >
                <Icon className="h-5 w-5" style={{ color: iconColor }} />
              </div>
              <div className="text-sm font-medium text-gray-900 dark:text-white">
                {action.title}
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                {action.description}
              </div>
            </>
          );

          const className = cn(
            'group p-4 rounded-lg border border-gray-200 dark:border-[#1f1f2e]',
            'hover:bg-[#745EE1]/5 dark:hover:bg-[#745EE1]/10',
            'transition-all duration-200 text-left cursor-pointer'
          );

          if (action.href) {
            return (
              <Link key={index} href={action.href} className={className}>
                {content}
              </Link>
            );
          }

          return (
            <button key={index} onClick={action.onClick} className={className}>
              {content}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default QuickActionsGrid;
