'use client';

import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../utils/cn';
import { LucideIcon } from 'lucide-react';
import {
  LineChart,
  Line,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';

const statCardVariants = cva(
  'relative overflow-hidden rounded-xl border p-4 transition-all duration-300',
  {
    variants: {
      variant: {
        default: 'bg-white dark:bg-gradient-to-br dark:from-[#0f0f1a] dark:to-[#15122a] border-[#E5E5E5] dark:border-[#1f1f2e]',
        success: 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800/50',
        warning: 'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800/50',
        danger: 'bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800/50',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);

export interface StatCardProps extends VariantProps<typeof statCardVariants> {
  title: string;
  value: string | number;
  change?: string;
  changeType?: 'positive' | 'negative' | 'neutral';
  icon?: LucideIcon;
  trend?: number[];
  trendColor?: string;
  tooltip?: string;
  subtitle?: string;
  className?: string;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{ value: number }>;
  label?: string;
}

const CustomTooltip = ({ active, payload }: CustomTooltipProps) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-gray-900 dark:bg-gray-800 text-white text-xs px-2 py-1 rounded shadow-lg">
        {payload[0].value}
      </div>
    );
  }
  return null;
};

export function StatCard({
  title,
  value,
  change,
  changeType = 'neutral',
  icon: Icon,
  trend,
  trendColor = '#745EE1',
  tooltip,
  subtitle,
  variant,
  className,
}: StatCardProps) {
  const trendData = trend?.map((v, i) => ({ value: v, index: i })) || [];

  const changeColorClass =
    changeType === 'positive'
      ? 'text-emerald-600 dark:text-emerald-400'
      : changeType === 'negative'
        ? 'text-red-600 dark:text-red-400'
        : 'text-gray-500 dark:text-gray-400';

  return (
    <div
      className={cn(statCardVariants({ variant }), 'group hover:shadow-lg', className)}
      title={tooltip}
    >
      {/* Header with icon */}
      <div className="flex items-center justify-between mb-3">
        {Icon && (
          <div className="h-10 w-10 rounded-lg bg-[#745EE1]/10 flex items-center justify-center">
            <Icon className="h-5 w-5 text-[#745EE1]" />
          </div>
        )}
        {change && (
          <span className={cn('text-xs font-medium px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800', changeColorClass)}>
            {change}
          </span>
        )}
      </div>

      {/* Main value */}
      <div className="space-y-1">
        <div className="text-2xl font-bold text-gray-900 dark:text-white">{value}</div>
        <div className="text-sm text-gray-500 dark:text-gray-400">{title}</div>
        {subtitle && (
          <div className="text-xs text-gray-400 dark:text-gray-500">{subtitle}</div>
        )}
      </div>

      {/* Sparkline trend */}
      {trend && trend.length > 1 && (
        <div className="mt-3 h-12 -mx-1">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={trendData}>
              <Tooltip content={<CustomTooltip />} />
              <Line
                type="monotone"
                dataKey="value"
                stroke={trendColor}
                strokeWidth={2}
                dot={false}
                isAnimationActive={true}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}

export default StatCard;
