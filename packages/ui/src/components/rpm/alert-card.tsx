import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../utils/cn';
import { AlertTriangle, TrendingUp, Calendar, Wifi } from 'lucide-react';
import { Button } from '../button';

const alertCardVariants = cva(
  'rounded-lg border p-4 transition-colors',
  {
    variants: {
      severity: {
        critical: 'border-red-300 bg-red-50 dark:border-red-700 dark:bg-red-950',
        significant: 'border-yellow-300 bg-yellow-50 dark:border-yellow-700 dark:bg-yellow-950',
        informational: 'border-blue-300 bg-blue-50 dark:border-blue-700 dark:bg-blue-950',
      },
    },
    defaultVariants: {
      severity: 'informational',
    },
  }
);

const alertTypeIcons = {
  threshold: AlertTriangle,
  trend: TrendingUp,
  adherence: Calendar,
  device: Wifi,
};

export interface AlertCardProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof alertCardVariants> {
  severity: 'critical' | 'significant' | 'informational';
  type: 'threshold' | 'trend' | 'adherence' | 'device';
  patientName: string;
  message: string;
  createdAt: Date;
  onAcknowledge?: () => void;
  onEscalate?: () => void;
  onDismiss?: () => void;
}

const AlertCard = React.forwardRef<HTMLDivElement, AlertCardProps>(
  (
    {
      className,
      severity,
      type,
      patientName,
      message,
      createdAt,
      onAcknowledge,
      onEscalate,
      onDismiss,
      ...props
    },
    ref
  ) => {
    const Icon = alertTypeIcons[type];

    return (
      <div
        ref={ref}
        className={cn(alertCardVariants({ severity }), className)}
        {...props}
      >
        <div className="flex items-start gap-3">
          <Icon
            className={cn(
              'h-5 w-5 flex-shrink-0',
              severity === 'critical' && 'text-red-600 dark:text-red-400',
              severity === 'significant' && 'text-yellow-600 dark:text-yellow-400',
              severity === 'informational' && 'text-blue-600 dark:text-blue-400'
            )}
          />
          <div className="flex-1">
            <div className="flex items-start justify-between">
              <div>
                <h4 className="font-semibold text-gray-900 dark:text-gray-100">
                  {patientName}
                </h4>
                <p className="mt-1 text-sm text-gray-700 dark:text-gray-300">{message}</p>
              </div>
            </div>
            <div className="mt-2 text-xs text-gray-500 dark:text-gray-500">
              {createdAt.toLocaleString()}
            </div>
            {(onAcknowledge || onEscalate || onDismiss) && (
              <div className="mt-3 flex gap-2">
                {onAcknowledge && (
                  <Button size="sm" variant="secondary" onClick={onAcknowledge}>
                    Acknowledge
                  </Button>
                )}
                {onEscalate && (
                  <Button size="sm" variant="danger" onClick={onEscalate}>
                    Escalate
                  </Button>
                )}
                {onDismiss && (
                  <Button size="sm" variant="ghost" onClick={onDismiss}>
                    Dismiss
                  </Button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }
);
AlertCard.displayName = 'AlertCard';

export { AlertCard, alertCardVariants };
