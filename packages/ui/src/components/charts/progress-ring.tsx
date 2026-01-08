'use client';

import * as React from 'react';
import { cn } from '../../utils/cn';

export interface ProgressRingProps {
  value: number;
  max: number;
  size?: number;
  strokeWidth?: number;
  color?: string;
  backgroundColor?: string;
  label?: string;
  showPercentage?: boolean;
  className?: string;
}

export function ProgressRing({
  value,
  max,
  size = 100,
  strokeWidth = 8,
  color = '#745EE1',
  backgroundColor = '#E5E5E5',
  label,
  showPercentage = true,
  className,
}: ProgressRingProps) {
  const percentage = Math.min(Math.max((value / max) * 100, 0), 100);
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  return (
    <div className={cn('relative inline-flex items-center justify-center', className)}>
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="transform -rotate-90"
      >
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={backgroundColor}
          strokeWidth={strokeWidth}
          fill="none"
          className="dark:stroke-gray-700"
        />
        {/* Progress circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
          strokeWidth={strokeWidth}
          fill="none"
          strokeLinecap="round"
          style={{
            strokeDasharray: circumference,
            strokeDashoffset,
            transition: 'stroke-dashoffset 0.5s ease-in-out',
          }}
        />
      </svg>

      {/* Center content */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        {showPercentage && (
          <span className="text-lg font-bold text-gray-900 dark:text-white">
            {Math.round(percentage)}%
          </span>
        )}
        {label && (
          <span className="text-xs text-gray-500 dark:text-gray-400 text-center px-2">
            {label}
          </span>
        )}
      </div>
    </div>
  );
}

export interface ProgressBarProps {
  value: number;
  max: number;
  color?: string;
  backgroundColor?: string;
  label?: string;
  showValue?: boolean;
  height?: number;
  className?: string;
}

export function ProgressBar({
  value,
  max,
  color = '#745EE1',
  backgroundColor = '#E5E5E5',
  label,
  showValue = true,
  height = 8,
  className,
}: ProgressBarProps) {
  const percentage = Math.min(Math.max((value / max) * 100, 0), 100);

  return (
    <div className={cn('w-full', className)}>
      {(label || showValue) && (
        <div className="flex items-center justify-between mb-2">
          {label && (
            <span className="text-sm text-gray-600 dark:text-gray-300">{label}</span>
          )}
          {showValue && (
            <span className="text-sm font-medium text-gray-900 dark:text-white">
              {value}/{max}
            </span>
          )}
        </div>
      )}
      <div
        className="w-full rounded-full overflow-hidden dark:bg-gray-700"
        style={{ height, backgroundColor }}
      >
        <div
          className="h-full rounded-full transition-all duration-500 ease-out"
          style={{
            width: `${percentage}%`,
            backgroundColor: color,
          }}
        />
      </div>
    </div>
  );
}

export default ProgressRing;
