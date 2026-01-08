'use client';

import * as React from 'react';
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { cn } from '../../utils/cn';

export interface DonutChartDataItem {
  name: string;
  value: number;
  color: string;
  [key: string]: string | number;
}

export interface DonutChartProps {
  data: DonutChartDataItem[];
  centerLabel?: string;
  centerValue?: string | number;
  height?: number;
  innerRadius?: number;
  outerRadius?: number;
  showLegend?: boolean;
  showTooltip?: boolean;
  className?: string;
  legendPosition?: 'bottom' | 'right';
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{ name: string; value: number; payload: DonutChartDataItem }>;
}

const CustomTooltip = ({ active, payload }: CustomTooltipProps) => {
  if (active && payload && payload.length) {
    const data = payload[0];
    return (
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg p-3">
        <div className="flex items-center gap-2">
          <div
            className="w-3 h-3 rounded-full"
            style={{ backgroundColor: data.payload.color }}
          />
          <span className="text-sm font-medium text-gray-900 dark:text-white">
            {data.name}
          </span>
        </div>
        <p className="text-lg font-bold text-gray-900 dark:text-white mt-1">
          {data.value}
        </p>
      </div>
    );
  }
  return null;
};

interface CustomLegendProps {
  payload?: Array<{ value: string; color: string }>;
  data: DonutChartDataItem[];
}

const CustomLegend = ({ payload, data }: CustomLegendProps) => {
  if (!payload) return null;
  return (
    <div className="flex flex-col gap-2">
      {payload.map((entry, index) => {
        const item = data.find((d) => d.name === entry.value);
        return (
          <div key={index} className="flex items-center justify-between gap-4 min-w-[120px]">
            <div className="flex items-center gap-2">
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: entry.color }}
              />
              <span className="text-sm text-gray-600 dark:text-gray-300">
                {entry.value}
              </span>
            </div>
            <span className="text-sm font-semibold text-gray-900 dark:text-white">
              {item?.value ?? 0}
            </span>
          </div>
        );
      })}
    </div>
  );
};

export function DonutChart({
  data,
  centerLabel,
  centerValue,
  height = 250,
  innerRadius = 60,
  outerRadius = 90,
  showLegend = true,
  showTooltip = true,
  className,
  legendPosition = 'right',
}: DonutChartProps) {
  const total = data.reduce((sum, item) => sum + item.value, 0);

  return (
    <div
      className={cn(
        'w-full flex',
        legendPosition === 'right' ? 'flex-row items-center gap-4' : 'flex-col',
        className
      )}
    >
      <div className="relative flex-shrink-0" style={{ width: outerRadius * 2 + 20, height }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            {showTooltip && <Tooltip content={<CustomTooltip />} />}
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={innerRadius}
              outerRadius={outerRadius}
              paddingAngle={2}
              dataKey="value"
              strokeWidth={0}
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>

        {/* Center content */}
        {(centerLabel || centerValue) && (
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            {centerValue !== undefined && (
              <span className="text-2xl font-bold text-gray-900 dark:text-white">
                {centerValue}
              </span>
            )}
            {centerLabel && (
              <span className="text-xs text-gray-500 dark:text-gray-400">
                {centerLabel}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Custom Legend */}
      {showLegend && (
        <div className={cn(legendPosition === 'bottom' ? 'mt-4' : '')}>
          <CustomLegend
            payload={data.map((d) => ({ value: d.name, color: d.color }))}
            data={data}
          />
        </div>
      )}
    </div>
  );
}

export default DonutChart;
