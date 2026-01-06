import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../utils/cn';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

const vitalCardVariants = cva(
  'rounded-lg border p-4 transition-colors',
  {
    variants: {
      status: {
        normal: 'border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950',
        warning: 'border-yellow-200 bg-yellow-50 dark:border-yellow-800 dark:bg-yellow-950',
        critical: 'border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950',
      },
    },
    defaultVariants: {
      status: 'normal',
    },
  }
);

const vitalTypeLabels: Record<string, string> = {
  blood_pressure: 'Blood Pressure',
  weight: 'Weight',
  glucose: 'Glucose',
  oxygen: 'Oxygen Saturation',
  heart_rate: 'Heart Rate',
  temperature: 'Temperature',
};

export interface VitalReadingCardProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof vitalCardVariants> {
  type: 'blood_pressure' | 'weight' | 'glucose' | 'oxygen' | 'heart_rate' | 'temperature';
  value: Record<string, number>;
  unit: string;
  status: 'normal' | 'warning' | 'critical';
  recordedAt: Date;
  trend?: 'up' | 'down' | 'stable';
}

const VitalReadingCard = React.forwardRef<HTMLDivElement, VitalReadingCardProps>(
  ({ className, type, value, unit, status, recordedAt, trend, ...props }, ref) => {
    const formatValue = () => {
      if (type === 'blood_pressure') {
        return `${value.systolic}/${value.diastolic}`;
      }
      const keys = Object.keys(value);
      return keys.length > 0 ? value[keys[0]] : '';
    };

    const TrendIcon = trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : Minus;

    return (
      <div
        ref={ref}
        className={cn(vitalCardVariants({ status }), className)}
        {...props}
      >
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
              {vitalTypeLabels[type]}
            </p>
            <div className="mt-1 flex items-baseline gap-2">
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                {formatValue()}
              </p>
              <span className="text-sm text-gray-600 dark:text-gray-400">{unit}</span>
              {trend && (
                <TrendIcon
                  className={cn(
                    'h-4 w-4',
                    trend === 'up' && 'text-red-500',
                    trend === 'down' && 'text-green-500',
                    trend === 'stable' && 'text-gray-500'
                  )}
                />
              )}
            </div>
            {type === 'blood_pressure' && value.pulse && (
              <p className="mt-1 text-xs text-gray-600 dark:text-gray-400">
                Pulse: {value.pulse} bpm
              </p>
            )}
          </div>
        </div>
        <div className="mt-2 text-xs text-gray-500 dark:text-gray-500">
          {recordedAt.toLocaleString()}
        </div>
      </div>
    );
  }
);
VitalReadingCard.displayName = 'VitalReadingCard';

export { VitalReadingCard, vitalCardVariants };
