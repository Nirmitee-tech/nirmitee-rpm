import * as React from 'react';
import { cn } from '../../utils/cn';
import { Badge } from '../badge';
import { AlertBadge } from './alert-badge';

export interface PatientSummaryCardProps extends React.HTMLAttributes<HTMLDivElement> {
  patient: {
    id: string;
    name: string;
    avatar?: string;
    conditions: string[];
    enrollmentStatus: string;
  };
  lastReading?: {
    type: string;
    value: string;
    recordedAt: Date;
  };
  alertCount: { critical: number; significant: number };
  onClick?: () => void;
}

const PatientSummaryCard = React.forwardRef<HTMLDivElement, PatientSummaryCardProps>(
  ({ className, patient, lastReading, alertCount, onClick, ...props }, ref) => {
    const totalAlerts = alertCount.critical + alertCount.significant;

    return (
      <div
        ref={ref}
        className={cn(
          'rounded-lg border border-gray-200 bg-white p-4 transition-all hover:shadow-md dark:border-gray-800 dark:bg-gray-950',
          onClick && 'cursor-pointer',
          className
        )}
        onClick={onClick}
        {...props}
      >
        <div className="flex items-start gap-3">
          {/* Avatar */}
          <div className="relative flex-shrink-0">
            {patient.avatar ? (
              <img
                src={patient.avatar}
                alt={patient.name}
                className="h-12 w-12 rounded-full object-cover"
              />
            ) : (
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-brand/10 text-brand">
                <span className="text-lg font-semibold">
                  {patient.name
                    .split(' ')
                    .map((n) => n[0])
                    .join('')
                    .toUpperCase()}
                </span>
              </div>
            )}
            {totalAlerts > 0 && (
              <div className="absolute -right-1 -top-1">
                <AlertBadge
                  count={totalAlerts}
                  variant={alertCount.critical > 0 ? 'critical' : 'significant'}
                  size="sm"
                />
              </div>
            )}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <h3 className="font-semibold text-gray-900 dark:text-gray-100 truncate">
                {patient.name}
              </h3>
              <Badge
                variant={
                  patient.enrollmentStatus === 'active'
                    ? 'success'
                    : patient.enrollmentStatus === 'paused'
                      ? 'warning'
                      : 'gray'
                }
              >
                {patient.enrollmentStatus}
              </Badge>
            </div>

            {/* Conditions */}
            {patient.conditions.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1">
                {patient.conditions.slice(0, 2).map((condition, idx) => (
                  <Badge key={idx} variant="default">
                    {condition}
                  </Badge>
                ))}
                {patient.conditions.length > 2 && (
                  <Badge variant="gray">+{patient.conditions.length - 2}</Badge>
                )}
              </div>
            )}

            {/* Last Reading */}
            {lastReading && (
              <div className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                <span className="font-medium">{lastReading.type}:</span>{' '}
                {lastReading.value}
                <span className="ml-1 text-xs text-gray-500">
                  ({lastReading.recordedAt.toLocaleDateString()})
                </span>
              </div>
            )}

            {/* Alert Summary */}
            {totalAlerts > 0 && (
              <div className="mt-2 flex gap-3 text-xs">
                {alertCount.critical > 0 && (
                  <span className="text-red-600 dark:text-red-400">
                    {alertCount.critical} critical
                  </span>
                )}
                {alertCount.significant > 0 && (
                  <span className="text-yellow-600 dark:text-yellow-400">
                    {alertCount.significant} significant
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }
);
PatientSummaryCard.displayName = 'PatientSummaryCard';

export { PatientSummaryCard };
