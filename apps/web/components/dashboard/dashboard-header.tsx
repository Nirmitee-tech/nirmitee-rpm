'use client';

import { cn } from '@/lib/utils';

export type DateRange = 'today' | '7d' | '30d';

export interface DashboardHeaderProps {
  title: string;
  subtitle?: string;
  dateRange: DateRange;
  onDateRangeChange: (range: DateRange) => void;
  className?: string;
}

const dateRangeOptions: { value: DateRange; label: string }[] = [
  { value: 'today', label: 'Today' },
  { value: '7d', label: '7 Days' },
  { value: '30d', label: '30 Days' },
];

export function DashboardHeader({
  title,
  subtitle,
  dateRange,
  onDateRangeChange,
  className,
}: DashboardHeaderProps) {
  return (
    <div className={cn('flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4', className)}>
      <div>
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">
          {title}
        </h1>
        {subtitle && (
          <p className="text-gray-500 dark:text-gray-400 mt-1">{subtitle}</p>
        )}
      </div>

      {/* Date Range Selector */}
      <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
        {dateRangeOptions.map((option) => (
          <button
            key={option.value}
            onClick={() => onDateRangeChange(option.value)}
            className={cn(
              'px-3 py-1.5 text-sm font-medium rounded-md transition-all duration-200',
              dateRange === option.value
                ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            )}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}

export default DashboardHeader;
