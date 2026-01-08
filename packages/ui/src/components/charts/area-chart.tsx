'use client';

import * as React from 'react';
import {
  AreaChart as RechartsAreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import { cn } from '../../utils/cn';

export interface AreaChartSeries {
  dataKey: string;
  name: string;
  color: string;
  fillOpacity?: number;
}

export interface AreaChartProps {
  data: Record<string, unknown>[];
  series: AreaChartSeries[];
  xAxisKey?: string;
  height?: number;
  showGrid?: boolean;
  showLegend?: boolean;
  showTooltip?: boolean;
  normalRange?: { min: number; max: number };
  className?: string;
  xAxisFormatter?: (value: string) => string;
  tooltipFormatter?: (value: number, name: string) => string;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{ name: string; value: number; color: string }>;
  label?: string;
  formatter?: (value: number, name: string) => string;
}

const CustomTooltip = ({ active, payload, label, formatter }: CustomTooltipProps) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg p-3 min-w-[150px]">
        <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">{label}</p>
        <div className="space-y-1">
          {payload.map((entry, index) => (
            <div key={index} className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <div
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: entry.color }}
                />
                <span className="text-xs text-gray-600 dark:text-gray-300">
                  {entry.name}
                </span>
              </div>
              <span className="text-xs font-semibold text-gray-900 dark:text-white">
                {formatter ? formatter(entry.value, entry.name) : entry.value}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  }
  return null;
};

interface CustomLegendProps {
  payload?: Array<{ value: string; color: string; dataKey: string }>;
}

const CustomLegend = ({ payload }: CustomLegendProps) => {
  if (!payload) return null;
  return (
    <div className="flex flex-wrap justify-center gap-4 mt-4">
      {payload.map((entry, index) => (
        <div key={index} className="flex items-center gap-2">
          <div
            className="w-3 h-3 rounded-full"
            style={{ backgroundColor: entry.color }}
          />
          <span className="text-xs font-medium text-gray-600 dark:text-gray-300">
            {entry.value}
          </span>
        </div>
      ))}
    </div>
  );
};

export function AreaChart({
  data,
  series,
  xAxisKey = 'date',
  height = 300,
  showGrid = true,
  showLegend = true,
  showTooltip = true,
  normalRange,
  className,
  xAxisFormatter,
  tooltipFormatter,
}: AreaChartProps) {
  return (
    <div className={cn('w-full', className)}>
      <ResponsiveContainer width="100%" height={height}>
        <RechartsAreaChart
          data={data}
          margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
        >
          {showGrid && (
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="currentColor"
              className="text-gray-200 dark:text-gray-700"
              vertical={false}
            />
          )}

          {/* Normal range reference area */}
          {normalRange && (
            <>
              <ReferenceLine
                y={normalRange.min}
                stroke="#10b981"
                strokeDasharray="5 5"
                strokeOpacity={0.5}
              />
              <ReferenceLine
                y={normalRange.max}
                stroke="#10b981"
                strokeDasharray="5 5"
                strokeOpacity={0.5}
              />
            </>
          )}

          <XAxis
            dataKey={xAxisKey}
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 11, fill: '#737373' }}
            tickFormatter={xAxisFormatter}
            dy={10}
          />
          <YAxis
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 11, fill: '#737373' }}
            dx={-10}
          />

          {showTooltip && (
            <Tooltip
              content={<CustomTooltip formatter={tooltipFormatter} />}
              cursor={{ stroke: '#745EE1', strokeWidth: 1, strokeDasharray: '3 3' }}
            />
          )}

          {showLegend && <Legend content={<CustomLegend />} />}

          {series.map((s) => (
            <Area
              key={s.dataKey}
              type="monotone"
              dataKey={s.dataKey}
              name={s.name}
              stroke={s.color}
              fill={s.color}
              fillOpacity={s.fillOpacity ?? 0.1}
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4, strokeWidth: 0 }}
            />
          ))}
        </RechartsAreaChart>
      </ResponsiveContainer>
    </div>
  );
}

export default AreaChart;
