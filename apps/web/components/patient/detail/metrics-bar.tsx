'use client';

import { useTranslations } from '@/lib/i18n/i18n-context';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@nirmitee/ui';
import { cn } from '@/lib/utils';
import {
  Activity,
  Clock,
  Phone,
  CheckCircle,
  AlertTriangle,
  Calendar,
  TrendingUp,
  AlertCircle,
  Target,
  DollarSign,
} from 'lucide-react';

interface MetricsData {
  totalReadings: {
    current: number;
    required: number;
  };
  totalMinutes: {
    current: number;
    required: number;
  };
  lastCall?: string | null;
  callStatus?: 'successful' | 'missed' | 'no_answer' | null;
  billingPeriod?: {
    start: string;
    end: string;
  };
  // Optional additional metrics
  alertCount?: number;
  complianceRate?: number;
  daysRemaining?: number;
}

interface MetricsBarProps {
  metrics: MetricsData;
  className?: string;
  isLoading?: boolean;
}

// Tooltip wrapper component
function Tooltip({ children, content }: { children: React.ReactNode; content: string }) {
  return (
    <div className="group relative inline-flex w-full">
      {children}
      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 text-[10px] font-medium text-white bg-gray-900 dark:bg-gray-700 rounded opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 whitespace-nowrap z-50 pointer-events-none max-w-[200px] text-center">
        {content}
        <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-900 dark:border-t-gray-700" />
      </div>
    </div>
  );
}

// Compact circular progress
function MiniProgress({
  value,
  max,
  size = 32,
  strokeWidth = 3,
  color = '#745EE1',
}: {
  value: number;
  max: number;
  size?: number;
  strokeWidth?: number;
  color?: string;
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const percentage = Math.min((value / max) * 100, 100);
  const offset = circumference - (percentage / 100) * circumference;

  return (
    <svg width={size} height={size} className="transform -rotate-90">
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="#e5e7eb"
        strokeWidth={strokeWidth}
        className="dark:stroke-gray-700"
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        strokeLinecap="round"
        className="transition-all duration-500 ease-out"
      />
    </svg>
  );
}

// Compact metric item
function MetricItem({
  icon: Icon,
  label,
  value,
  subValue,
  color = 'brand',
  tooltip,
  progress,
  status,
}: {
  icon: React.ElementType;
  label: string;
  value: string | number;
  subValue?: string;
  color?: 'brand' | 'green' | 'yellow' | 'red' | 'blue' | 'gray';
  tooltip: string;
  progress?: { current: number; max: number };
  status?: 'success' | 'warning' | 'danger' | 'default';
}) {
  const colorClasses = {
    brand: 'text-[#745EE1] bg-[#745EE1]/10',
    green: 'text-green-600 bg-green-100 dark:text-green-400 dark:bg-green-900/30',
    yellow: 'text-yellow-600 bg-yellow-100 dark:text-yellow-400 dark:bg-yellow-900/30',
    red: 'text-red-600 bg-red-100 dark:text-red-400 dark:bg-red-900/30',
    blue: 'text-blue-600 bg-blue-100 dark:text-blue-400 dark:bg-blue-900/30',
    gray: 'text-gray-500 bg-gray-100 dark:text-gray-400 dark:bg-gray-800',
  };

  const progressColor = status === 'success' ? '#22c55e' : status === 'warning' ? '#f59e0b' : '#745EE1';

  return (
    <Tooltip content={tooltip}>
      <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white dark:bg-gray-800/50 border border-gray-100 dark:border-gray-700/50 hover:border-gray-200 dark:hover:border-gray-600 transition-colors cursor-help min-w-0">
        <div className="relative flex-shrink-0">
          {progress ? (
            <div className="relative">
              <MiniProgress
                value={progress.current}
                max={progress.max}
                size={32}
                strokeWidth={3}
                color={progressColor}
              />
              <div className="absolute inset-0 flex items-center justify-center">
                <Icon className={cn('w-3 h-3', status === 'success' ? 'text-green-500' : status === 'warning' ? 'text-yellow-500' : 'text-[#745EE1]')} />
              </div>
            </div>
          ) : (
            <div className={cn('w-7 h-7 rounded-full flex items-center justify-center', colorClasses[color])}>
              <Icon className="w-3.5 h-3.5" />
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[9px] uppercase tracking-wide font-medium text-gray-400 dark:text-gray-500 truncate">
            {label}
          </p>
          <div className="flex items-baseline gap-1">
            <span className="text-sm font-bold text-gray-900 dark:text-gray-100">
              {value}
            </span>
            {subValue && (
              <span className="text-[10px] text-gray-400 dark:text-gray-500 truncate">
                {subValue}
              </span>
            )}
          </div>
        </div>
        {status && (
          <div className="flex-shrink-0">
            {status === 'success' && <CheckCircle className="w-3.5 h-3.5 text-green-500" />}
            {status === 'warning' && <AlertTriangle className="w-3.5 h-3.5 text-yellow-500" />}
            {status === 'danger' && <AlertCircle className="w-3.5 h-3.5 text-red-500" />}
          </div>
        )}
      </div>
    </Tooltip>
  );
}

export function MetricsBar({ metrics, className, isLoading }: MetricsBarProps) {
  const { t } = useTranslations('patientDetail');

  // Calculate derived values
  const readingsPercentage = Math.round((metrics.totalReadings.current / metrics.totalReadings.required) * 100);
  const minutesPercentage = Math.round((metrics.totalMinutes.current / metrics.totalMinutes.required) * 100);
  const isReadingsMet = metrics.totalReadings.current >= metrics.totalReadings.required;
  const isMinutesMet = metrics.totalMinutes.current >= metrics.totalMinutes.required;
  const isBillable = isReadingsMet && isMinutesMet;

  // Calculate days remaining in billing period
  const now = new Date();
  const endOfMonth = metrics.billingPeriod?.end
    ? new Date(metrics.billingPeriod.end)
    : new Date(now.getFullYear(), now.getMonth() + 1, 0);
  const daysRemaining = Math.max(0, Math.ceil((endOfMonth.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));

  // Format billing period
  const billingPeriodStr = metrics.billingPeriod
    ? `${new Date(metrics.billingPeriod.start).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${new Date(metrics.billingPeriod.end).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
    : new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  const getCallStatusLabel = (status?: string | null) => {
    switch (status) {
      case 'successful': return t('callStatusSuccessful');
      case 'missed': return t('callStatusMissed');
      case 'no_answer': return t('callStatusNoAnswer');
      default: return t('callStatusNone');
    }
  };

  const getCallColor = (status?: string | null): 'green' | 'red' | 'gray' => {
    switch (status) {
      case 'successful': return 'green';
      case 'missed': return 'red';
      default: return 'gray';
    }
  };

  if (isLoading) {
    return (
      <Card className={cn('w-full', className)}>
        <CardContent className="p-2">
          <div className="flex items-center justify-center py-3">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-[#745EE1]" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn('w-full overflow-hidden', className)}>
      {/* Compact Header */}
      <div className="px-3 py-1.5 bg-gradient-to-r from-[#745EE1]/10 to-transparent border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Calendar className="w-3 h-3 text-[#745EE1]" />
          <span className="text-[10px] font-medium text-gray-500 dark:text-gray-400">
            {t('billingPeriod')}:
          </span>
          <span className="text-[10px] font-semibold text-gray-900 dark:text-gray-100">
            {billingPeriodStr}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Badge
            variant={isBillable ? 'success' : 'gray'}
            className="text-[9px] h-4 px-1.5"
          >
            {isBillable ? t('billableStatus') || 'Billable' : t('notBillable') || 'Not Billable'}
          </Badge>
          <Tooltip content={t('cmsRequirementsTooltip') || 'CMS requires 16 readings and 20 minutes for RPM billing'}>
            <Badge variant="gray" className="text-[9px] h-4 px-1.5 cursor-help">
              CMS
            </Badge>
          </Tooltip>
        </div>
      </div>

      <CardContent className="p-2">
        {/* 6-column compact grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
          {/* Total Readings */}
          <MetricItem
            icon={Activity}
            label={t('totalReadings')}
            value={metrics.totalReadings.current}
            subValue={`/ ${metrics.totalReadings.required}`}
            tooltip={t('readingsTooltip') || 'CMS requires minimum 16 device readings per month'}
            progress={{ current: metrics.totalReadings.current, max: metrics.totalReadings.required }}
            status={isReadingsMet ? 'success' : readingsPercentage < 50 ? 'warning' : 'default'}
          />

          {/* Total Minutes */}
          <MetricItem
            icon={Clock}
            label={t('totalMinutes')}
            value={metrics.totalMinutes.current}
            subValue={`/ ${metrics.totalMinutes.required} min`}
            tooltip={t('minutesTooltip') || 'CMS requires minimum 20 minutes of clinical staff time'}
            progress={{ current: metrics.totalMinutes.current, max: metrics.totalMinutes.required }}
            status={isMinutesMet ? 'success' : minutesPercentage < 50 ? 'warning' : 'default'}
          />

          {/* Days Remaining */}
          <MetricItem
            icon={Target}
            label={t('daysRemaining') || 'Days Left'}
            value={daysRemaining}
            subValue={t('days') || 'days'}
            color={daysRemaining <= 7 ? 'yellow' : 'blue'}
            tooltip={t('daysRemainingTooltip') || 'Days remaining in current billing period'}
          />

          {/* Compliance Rate */}
          <MetricItem
            icon={TrendingUp}
            label={t('compliance') || 'Compliance'}
            value={`${Math.round((readingsPercentage + minutesPercentage) / 2)}%`}
            color={isBillable ? 'green' : 'yellow'}
            tooltip={t('complianceTooltip') || 'Overall compliance with RPM requirements'}
          />

          {/* Last Call */}
          <MetricItem
            icon={Phone}
            label={t('lastCall')}
            value={metrics.lastCall
              ? new Date(metrics.lastCall).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
              : t('noCallsYet') || 'None'}
            subValue={metrics.lastCall
              ? new Date(metrics.lastCall).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
              : undefined}
            color={getCallColor(metrics.callStatus)}
            tooltip={t('lastCallTooltip') || 'Most recent patient interaction'}
          />

          {/* Billable Status */}
          <MetricItem
            icon={DollarSign}
            label={t('billingStatus') || 'Status'}
            value={isBillable ? t('ready') || 'Ready' : t('pending') || 'Pending'}
            color={isBillable ? 'green' : 'gray'}
            tooltip={isBillable
              ? t('billableTooltip') || 'Patient meets all RPM billing requirements'
              : t('notBillableTooltip') || 'Patient does not yet meet RPM billing requirements'}
            status={isBillable ? 'success' : undefined}
          />
        </div>
      </CardContent>
    </Card>
  );
}
