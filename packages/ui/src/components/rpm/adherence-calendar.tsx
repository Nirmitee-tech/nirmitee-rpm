import * as React from 'react';
import { cn } from '../../utils/cn';

export interface AdherenceCalendarProps extends React.HTMLAttributes<HTMLDivElement> {
  days: Array<{ date: Date; hasReading: boolean }>;
  requiredDays?: number;
}

const AdherenceCalendar = React.forwardRef<HTMLDivElement, AdherenceCalendarProps>(
  ({ className, days, requiredDays = 16, ...props }, ref) => {
    const daysWithReading = days.filter((d) => d.hasReading).length;
    const adherenceRate = days.length > 0 ? (daysWithReading / days.length) * 100 : 0;
    const meetsRequirement = daysWithReading >= requiredDays;

    return (
      <div
        ref={ref}
        className={cn('rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-950', className)}
        {...props}
      >
        <div className="space-y-4">
          {/* Header */}
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
              Adherence Calendar
            </h3>
            <div className="text-right">
              <div
                className={cn(
                  'text-lg font-bold',
                  meetsRequirement
                    ? 'text-green-600 dark:text-green-400'
                    : 'text-yellow-600 dark:text-yellow-400'
                )}
              >
                {daysWithReading}/{requiredDays}
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400">days with data</div>
            </div>
          </div>

          {/* Progress bar */}
          <div className="space-y-1">
            <div className="h-2 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-gray-800">
              <div
                className={cn(
                  'h-full transition-all',
                  meetsRequirement ? 'bg-green-500' : 'bg-yellow-500'
                )}
                style={{ width: `${Math.min(adherenceRate, 100)}%` }}
              />
            </div>
            <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
              <span>{adherenceRate.toFixed(0)}% adherence</span>
              {meetsRequirement ? (
                <span className="text-green-600 dark:text-green-400">✓ Billable</span>
              ) : (
                <span className="text-yellow-600 dark:text-yellow-400">
                  Need {requiredDays - daysWithReading} more
                </span>
              )}
            </div>
          </div>

          {/* Calendar grid */}
          <div className="grid grid-cols-8 gap-1">
            {days.slice(0, 30).map((day, index) => {
              const isToday = day.date.toDateString() === new Date().toDateString();

              return (
                <div
                  key={index}
                  className={cn(
                    'relative aspect-square rounded transition-colors',
                    day.hasReading
                      ? 'bg-green-500 dark:bg-green-600'
                      : 'bg-gray-200 dark:bg-gray-800',
                    isToday && 'ring-2 ring-brand ring-offset-1'
                  )}
                  title={`${day.date.toLocaleDateString()} - ${day.hasReading ? 'Data submitted' : 'No data'}`}
                >
                  {day.hasReading && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-xs font-bold text-white">✓</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Legend */}
          <div className="flex items-center justify-center gap-4 text-xs text-gray-600 dark:text-gray-400">
            <div className="flex items-center gap-1.5">
              <div className="h-3 w-3 rounded bg-green-500" />
              <span>Data submitted</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="h-3 w-3 rounded bg-gray-200 dark:bg-gray-800" />
              <span>No data</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="h-3 w-3 rounded ring-2 ring-brand ring-offset-1" />
              <span>Today</span>
            </div>
          </div>
        </div>
      </div>
    );
  }
);
AdherenceCalendar.displayName = 'AdherenceCalendar';

export { AdherenceCalendar };
