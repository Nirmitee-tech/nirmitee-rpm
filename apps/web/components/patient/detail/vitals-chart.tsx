'use client';

import { useMemo } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  ReferenceArea,
  Legend,
  Line,
  ComposedChart,
} from 'recharts';
import { useTranslations } from '@/lib/i18n/i18n-context';
import { cn } from '@/lib/utils';
import { TrendingUp, TrendingDown, Minus, Activity, AlertTriangle, CheckCircle } from 'lucide-react';

interface VitalReading {
  timestamp: string;
  systolic?: number;
  diastolic?: number;
  pulse?: number;
  value?: number;
  status?: string;
}

interface VitalThresholds {
  criticalLow?: number;
  warningLow?: number;
  normalLow?: number;
  normalHigh?: number;
  warningHigh?: number;
  criticalHigh?: number;
}

interface VitalsChartProps {
  readings: VitalReading[];
  vitalType: 'blood_pressure' | 'blood_glucose' | 'weight' | 'oxygen' | 'heart_rate' | 'temperature';
  unit?: string;
  thresholds?: VitalThresholds;
  className?: string;
}

// Default thresholds for different vital types
const DEFAULT_THRESHOLDS: Record<string, VitalThresholds> = {
  blood_pressure: {
    criticalLow: 70,
    warningLow: 90,
    normalLow: 90,
    normalHigh: 120,
    warningHigh: 140,
    criticalHigh: 180,
  },
  blood_glucose: {
    criticalLow: 54,
    warningLow: 70,
    normalLow: 70,
    normalHigh: 140,
    warningHigh: 180,
    criticalHigh: 250,
  },
  oxygen: {
    criticalLow: 90,
    warningLow: 94,
    normalLow: 95,
    normalHigh: 100,
  },
  heart_rate: {
    criticalLow: 40,
    warningLow: 50,
    normalLow: 60,
    normalHigh: 100,
    warningHigh: 110,
    criticalHigh: 150,
  },
  temperature: {
    criticalLow: 95,
    warningLow: 97,
    normalLow: 97.8,
    normalHigh: 99.1,
    warningHigh: 100.4,
    criticalHigh: 103,
  },
  weight: {},
};

// Custom Tooltip Component
const CustomTooltip = ({ active, payload, label, vitalType, unit }: any) => {
  if (!active || !payload || !payload.length) return null;

  const formatValue = (value: number) => {
    if (vitalType === 'temperature') return value.toFixed(1);
    return Math.round(value);
  };

  const getStatusColor = (value: number, thresholds: VitalThresholds) => {
    if (!thresholds.normalLow && !thresholds.normalHigh) return 'text-gray-600';
    if (thresholds.criticalLow && value < thresholds.criticalLow) return 'text-red-600';
    if (thresholds.criticalHigh && value > thresholds.criticalHigh) return 'text-red-600';
    if (thresholds.warningLow && value < thresholds.warningLow) return 'text-orange-600';
    if (thresholds.warningHigh && value > thresholds.warningHigh) return 'text-orange-600';
    return 'text-green-600';
  };

  const thresholds = DEFAULT_THRESHOLDS[vitalType] || {};

  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl p-4 min-w-[180px]">
      <p className="text-xs text-gray-500 dark:text-gray-400 mb-2 font-medium">{label}</p>
      <div className="space-y-2">
        {payload.map((entry: any, index: number) => (
          <div key={index} className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: entry.color }}
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">{entry.name}</span>
            </div>
            <span className={cn("text-sm font-bold", getStatusColor(entry.value, thresholds))}>
              {formatValue(entry.value)} {unit}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

// Statistics Card Component
interface StatCardProps {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  color: string;
  trend?: 'up' | 'down' | 'stable';
  trendValue?: string;
}

function StatCard({ label, value, icon, color, trend, trendValue }: StatCardProps) {
  return (
    <div className="flex items-center gap-3 p-3 rounded-lg bg-gray-50 dark:bg-gray-800/50">
      <div className={cn("p-2 rounded-lg", color)}>
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{label}</p>
        <div className="flex items-center gap-2">
          <p className="text-lg font-bold text-gray-900 dark:text-gray-100">{value}</p>
          {trend && (
            <span className={cn(
              "flex items-center text-xs font-medium",
              trend === 'up' && "text-green-600",
              trend === 'down' && "text-red-600",
              trend === 'stable' && "text-gray-500"
            )}>
              {trend === 'up' && <TrendingUp className="w-3 h-3 mr-0.5" />}
              {trend === 'down' && <TrendingDown className="w-3 h-3 mr-0.5" />}
              {trend === 'stable' && <Minus className="w-3 h-3 mr-0.5" />}
              {trendValue}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

export function VitalsChart({ readings, vitalType, unit = '', thresholds, className }: VitalsChartProps) {
  const { t } = useTranslations('patientDetail');

  const effectiveThresholds = thresholds || DEFAULT_THRESHOLDS[vitalType] || {};

  // Process data for chart
  const chartData = useMemo(() => {
    return readings.map((reading, index) => {
      const date = new Date(reading.timestamp);
      return {
        index,
        date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        time: date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
        fullDate: `${date.toLocaleDateString()} ${date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`,
        systolic: reading.systolic,
        diastolic: reading.diastolic,
        pulse: reading.pulse,
        value: reading.value,
        status: reading.status,
      };
    }).reverse(); // Show oldest to newest
  }, [readings]);

  // Calculate statistics
  const stats = useMemo(() => {
    if (readings.length === 0) return null;

    if (vitalType === 'blood_pressure') {
      const systolicValues = readings.map(r => r.systolic).filter((v): v is number => v !== undefined);
      const diastolicValues = readings.map(r => r.diastolic).filter((v): v is number => v !== undefined);
      const pulseValues = readings.map(r => r.pulse).filter((v): v is number => v !== undefined);

      const calcStats = (values: number[]) => ({
        min: Math.min(...values),
        max: Math.max(...values),
        avg: Math.round(values.reduce((a, b) => a + b, 0) / values.length),
        latest: values[0],
        trend: values.length > 1 ? (values[0] > values[1] ? 'up' : values[0] < values[1] ? 'down' : 'stable') : 'stable',
      });

      return {
        systolic: systolicValues.length ? calcStats(systolicValues) : null,
        diastolic: diastolicValues.length ? calcStats(diastolicValues) : null,
        pulse: pulseValues.length ? calcStats(pulseValues) : null,
        totalReadings: readings.length,
        normalCount: readings.filter(r => r.status === 'NORMAL' || r.status === 'normal').length,
        warningCount: readings.filter(r => r.status === 'WARNING' || r.status === 'warning').length,
        criticalCount: readings.filter(r => r.status === 'CRITICAL' || r.status === 'critical').length,
      };
    } else {
      const values = readings.map(r => r.value).filter((v): v is number => v !== undefined);
      if (values.length === 0) return null;

      return {
        min: Math.min(...values),
        max: Math.max(...values),
        avg: vitalType === 'temperature'
          ? (values.reduce((a, b) => a + b, 0) / values.length).toFixed(1)
          : Math.round(values.reduce((a, b) => a + b, 0) / values.length),
        latest: vitalType === 'temperature' ? values[0]?.toFixed(1) : values[0],
        trend: values.length > 1 ? (values[0] > values[1] ? 'up' : values[0] < values[1] ? 'down' : 'stable') as 'up' | 'down' | 'stable' : 'stable' as const,
        totalReadings: readings.length,
        normalCount: readings.filter(r => r.status === 'NORMAL' || r.status === 'normal').length,
        warningCount: readings.filter(r => r.status === 'WARNING' || r.status === 'warning').length,
        criticalCount: readings.filter(r => r.status === 'CRITICAL' || r.status === 'critical').length,
      };
    }
  }, [readings, vitalType]);

  // Calculate Y-axis domain
  const yDomain = useMemo(() => {
    if (vitalType === 'blood_pressure') {
      const allValues = readings.flatMap(r => [r.systolic, r.diastolic, r.pulse].filter((v): v is number => v !== undefined));
      if (allValues.length === 0) return [0, 200];
      const min = Math.min(...allValues);
      const max = Math.max(...allValues);
      const padding = (max - min) * 0.15;
      return [Math.max(0, Math.floor((min - padding) / 10) * 10), Math.ceil((max + padding) / 10) * 10];
    } else {
      const values = readings.map(r => r.value).filter((v): v is number => v !== undefined);
      if (values.length === 0) return [0, 100];
      const min = Math.min(...values);
      const max = Math.max(...values);
      const padding = (max - min) * 0.15 || 10;
      return [Math.max(0, Math.floor((min - padding) / 5) * 5), Math.ceil((max + padding) / 5) * 5];
    }
  }, [readings, vitalType]);

  if (readings.length === 0) {
    return (
      <div className={cn("w-full", className)}>
        <div className="flex flex-col items-center justify-center py-16 text-gray-400 dark:text-gray-500">
          <Activity className="w-12 h-12 mb-4 opacity-50" />
          <p className="text-lg font-medium">{t('noChartData')}</p>
          <p className="text-sm mt-1">Start recording vitals to see trends</p>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("w-full space-y-4", className)}>
      {/* Statistics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-2">
        {vitalType === 'blood_pressure' && stats && 'systolic' in stats && stats.systolic && (
          <>
            <StatCard
              label="Latest Systolic"
              value={`${stats.systolic.latest} mmHg`}
              icon={<Activity className="w-4 h-4 text-orange-600" />}
              color="bg-orange-100 dark:bg-orange-900/30"
              trend={stats.systolic.trend as 'up' | 'down' | 'stable'}
            />
            <StatCard
              label="Avg Systolic"
              value={`${stats.systolic.avg} mmHg`}
              icon={<TrendingUp className="w-4 h-4 text-orange-500" />}
              color="bg-orange-50 dark:bg-orange-900/20"
            />
            <StatCard
              label="Latest Diastolic"
              value={`${stats.diastolic?.latest || '--'} mmHg`}
              icon={<Activity className="w-4 h-4 text-purple-600" />}
              color="bg-purple-100 dark:bg-purple-900/30"
              trend={stats.diastolic?.trend as 'up' | 'down' | 'stable'}
            />
            <StatCard
              label="Avg Diastolic"
              value={`${stats.diastolic?.avg || '--'} mmHg`}
              icon={<TrendingUp className="w-4 h-4 text-purple-500" />}
              color="bg-purple-50 dark:bg-purple-900/20"
            />
          </>
        )}

        {vitalType !== 'blood_pressure' && stats && 'min' in stats && (
          <>
            <StatCard
              label="Latest"
              value={`${stats.latest} ${unit}`}
              icon={<Activity className="w-4 h-4 text-[#745EE1]" />}
              color="bg-[#745EE1]/10"
              trend={stats.trend}
            />
            <StatCard
              label="Average"
              value={`${stats.avg} ${unit}`}
              icon={<TrendingUp className="w-4 h-4 text-blue-600" />}
              color="bg-blue-100 dark:bg-blue-900/30"
            />
            <StatCard
              label="Min"
              value={`${vitalType === 'temperature' && stats.min !== undefined ? stats.min.toFixed(1) : stats.min ?? '--'} ${unit}`}
              icon={<TrendingDown className="w-4 h-4 text-cyan-600" />}
              color="bg-cyan-100 dark:bg-cyan-900/30"
            />
            <StatCard
              label="Max"
              value={`${vitalType === 'temperature' && stats.max !== undefined ? stats.max.toFixed(1) : stats.max ?? '--'} ${unit}`}
              icon={<TrendingUp className="w-4 h-4 text-pink-600" />}
              color="bg-pink-100 dark:bg-pink-900/30"
            />
          </>
        )}

        {/* Status Summary */}
        {stats && (
          <>
            <StatCard
              label="Normal"
              value={stats.normalCount || 0}
              icon={<CheckCircle className="w-4 h-4 text-green-600" />}
              color="bg-green-100 dark:bg-green-900/30"
            />
            <StatCard
              label="Alerts"
              value={(stats.warningCount || 0) + (stats.criticalCount || 0)}
              icon={<AlertTriangle className="w-4 h-4 text-amber-600" />}
              color="bg-amber-100 dark:bg-amber-900/30"
            />
          </>
        )}
      </div>

      {/* Chart */}
      <div className="w-full bg-white dark:bg-gray-900/50 rounded-xl border border-gray-200 dark:border-gray-800 p-4">
        <div className="h-[320px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            {vitalType === 'blood_pressure' ? (
              <ComposedChart data={chartData} margin={{ top: 20, right: 30, left: 10, bottom: 20 }}>
                <defs>
                  <linearGradient id="systolicGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f97316" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#f97316" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="diastolicGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#745EE1" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#745EE1" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="pulseGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#eab308" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#eab308" stopOpacity={0}/>
                  </linearGradient>
                </defs>

                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" className="dark:opacity-20" />

                {/* Normal range reference area */}
                <ReferenceArea
                  y1={90}
                  y2={120}
                  fill="#22c55e"
                  fillOpacity={0.1}
                  label={{ value: 'Normal BP', position: 'insideTopRight', fill: '#22c55e', fontSize: 10 }}
                />

                {/* Warning zones */}
                <ReferenceArea y1={120} y2={140} fill="#f59e0b" fillOpacity={0.08} />
                <ReferenceArea y1={140} y2={180} fill="#ef4444" fillOpacity={0.08} />

                <XAxis
                  dataKey="fullDate"
                  tick={{ fontSize: 11, fill: '#6b7280' }}
                  tickLine={false}
                  axisLine={{ stroke: '#e5e7eb' }}
                  interval="preserveStartEnd"
                />
                <YAxis
                  domain={yDomain}
                  tick={{ fontSize: 11, fill: '#6b7280' }}
                  tickLine={false}
                  axisLine={{ stroke: '#e5e7eb' }}
                  width={45}
                />
                <Tooltip content={<CustomTooltip vitalType={vitalType} unit="mmHg" />} />
                <Legend
                  wrapperStyle={{ paddingTop: '20px' }}
                  iconType="circle"
                  iconSize={8}
                />

                {/* Reference lines for key thresholds */}
                <ReferenceLine y={120} stroke="#22c55e" strokeDasharray="5 5" strokeWidth={1.5} />
                <ReferenceLine y={140} stroke="#f59e0b" strokeDasharray="5 5" strokeWidth={1.5} />

                <Area
                  type="monotone"
                  dataKey="systolic"
                  name="Systolic"
                  stroke="#f97316"
                  strokeWidth={2.5}
                  fill="url(#systolicGradient)"
                  dot={{ fill: '#f97316', strokeWidth: 0, r: 4 }}
                  activeDot={{ r: 6, stroke: '#f97316', strokeWidth: 2, fill: '#fff' }}
                />
                <Area
                  type="monotone"
                  dataKey="diastolic"
                  name="Diastolic"
                  stroke="#745EE1"
                  strokeWidth={2.5}
                  fill="url(#diastolicGradient)"
                  dot={{ fill: '#745EE1', strokeWidth: 0, r: 4 }}
                  activeDot={{ r: 6, stroke: '#745EE1', strokeWidth: 2, fill: '#fff' }}
                />
                <Line
                  type="monotone"
                  dataKey="pulse"
                  name="Pulse"
                  stroke="#eab308"
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  dot={{ fill: '#eab308', strokeWidth: 0, r: 3 }}
                  activeDot={{ r: 5, stroke: '#eab308', strokeWidth: 2, fill: '#fff' }}
                />
              </ComposedChart>
            ) : (
              <AreaChart data={chartData} margin={{ top: 20, right: 30, left: 10, bottom: 20 }}>
                <defs>
                  <linearGradient id="valueGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#745EE1" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#745EE1" stopOpacity={0}/>
                  </linearGradient>
                </defs>

                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" className="dark:opacity-20" />

                {/* Normal range for non-BP vitals */}
                {effectiveThresholds.normalLow && effectiveThresholds.normalHigh && (
                  <ReferenceArea
                    y1={effectiveThresholds.normalLow}
                    y2={effectiveThresholds.normalHigh}
                    fill="#22c55e"
                    fillOpacity={0.1}
                    label={{ value: 'Normal Range', position: 'insideTopRight', fill: '#22c55e', fontSize: 10 }}
                  />
                )}

                {/* Warning zones */}
                {effectiveThresholds.warningHigh && effectiveThresholds.criticalHigh && (
                  <ReferenceArea
                    y1={effectiveThresholds.warningHigh}
                    y2={effectiveThresholds.criticalHigh}
                    fill="#f59e0b"
                    fillOpacity={0.08}
                  />
                )}

                {/* Critical zones */}
                {effectiveThresholds.criticalHigh && (
                  <ReferenceArea
                    y1={effectiveThresholds.criticalHigh}
                    y2={yDomain[1]}
                    fill="#ef4444"
                    fillOpacity={0.08}
                  />
                )}

                <XAxis
                  dataKey="fullDate"
                  tick={{ fontSize: 11, fill: '#6b7280' }}
                  tickLine={false}
                  axisLine={{ stroke: '#e5e7eb' }}
                  interval="preserveStartEnd"
                />
                <YAxis
                  domain={yDomain}
                  tick={{ fontSize: 11, fill: '#6b7280' }}
                  tickLine={false}
                  axisLine={{ stroke: '#e5e7eb' }}
                  width={45}
                  tickFormatter={(value) => vitalType === 'temperature' ? value.toFixed(1) : value}
                />
                <Tooltip content={<CustomTooltip vitalType={vitalType} unit={unit} />} />

                {/* Reference lines */}
                {effectiveThresholds.normalHigh && (
                  <ReferenceLine
                    y={effectiveThresholds.normalHigh}
                    stroke="#22c55e"
                    strokeDasharray="5 5"
                    strokeWidth={1.5}
                    label={{ value: 'Upper Normal', position: 'right', fill: '#22c55e', fontSize: 10 }}
                  />
                )}
                {effectiveThresholds.normalLow && (
                  <ReferenceLine
                    y={effectiveThresholds.normalLow}
                    stroke="#22c55e"
                    strokeDasharray="5 5"
                    strokeWidth={1.5}
                    label={{ value: 'Lower Normal', position: 'right', fill: '#22c55e', fontSize: 10 }}
                  />
                )}

                <Area
                  type="monotone"
                  dataKey="value"
                  name={vitalType.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                  stroke="#745EE1"
                  strokeWidth={2.5}
                  fill="url(#valueGradient)"
                  dot={{ fill: '#745EE1', strokeWidth: 0, r: 4 }}
                  activeDot={{ r: 6, stroke: '#745EE1', strokeWidth: 2, fill: '#fff' }}
                />
              </AreaChart>
            )}
          </ResponsiveContainer>
        </div>

        {/* Chart Legend/Info */}
        <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-4 text-xs">
              <div className="flex items-center gap-2">
                <div className="w-8 h-2 rounded bg-gradient-to-r from-green-500/30 to-green-500/10" />
                <span className="text-gray-600 dark:text-gray-400">Normal Range</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-8 h-2 rounded bg-gradient-to-r from-orange-500/30 to-orange-500/10" />
                <span className="text-gray-600 dark:text-gray-400">Warning</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-8 h-2 rounded bg-gradient-to-r from-red-500/30 to-red-500/10" />
                <span className="text-gray-600 dark:text-gray-400">Critical</span>
              </div>
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400">
              {stats && 'totalReadings' in stats && (
                <span>{stats.totalReadings} readings • Last updated {chartData[chartData.length - 1]?.fullDate}</span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default VitalsChart;
