import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../utils/cn';

const statusDotVariants = cva('inline-flex items-center gap-2', {
  variants: {
    size: {
      sm: 'text-xs',
      md: 'text-sm',
      lg: 'text-base',
    },
  },
  defaultVariants: {
    size: 'md',
  },
});

const dotVariants = cva('rounded-full', {
  variants: {
    status: {
      good: 'bg-green-500',
      warning: 'bg-yellow-500',
      critical: 'bg-red-500',
      unknown: 'bg-gray-400',
    },
    size: {
      sm: 'h-2 w-2',
      md: 'h-3 w-3',
      lg: 'h-4 w-4',
    },
    animated: {
      true: 'animate-pulse',
      false: '',
    },
  },
  defaultVariants: {
    status: 'unknown',
    size: 'md',
    animated: false,
  },
});

const statusLabels = {
  good: 'Good',
  warning: 'Warning',
  critical: 'Critical',
  unknown: 'Unknown',
};

export interface HealthStatusIndicatorProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof statusDotVariants> {
  status: 'good' | 'warning' | 'critical' | 'unknown';
  showLabel?: boolean;
  animated?: boolean;
}

const HealthStatusIndicator = React.forwardRef<HTMLDivElement, HealthStatusIndicatorProps>(
  ({ className, status, size, showLabel = true, animated = false, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(statusDotVariants({ size }), className)}
        {...props}
      >
        <span
          className={cn(dotVariants({ status, size, animated }))}
          aria-label={`Health status: ${statusLabels[status]}`}
        />
        {showLabel && (
          <span
            className={cn(
              'font-medium',
              status === 'good' && 'text-green-700 dark:text-green-400',
              status === 'warning' && 'text-yellow-700 dark:text-yellow-400',
              status === 'critical' && 'text-red-700 dark:text-red-400',
              status === 'unknown' && 'text-gray-700 dark:text-gray-400'
            )}
          >
            {statusLabels[status]}
          </span>
        )}
      </div>
    );
  }
);
HealthStatusIndicator.displayName = 'HealthStatusIndicator';

export { HealthStatusIndicator, statusDotVariants, dotVariants };
