'use client';

import { useState, useCallback } from 'react';
import { cn } from '@nirmitee/ui';

interface ThresholdSliderProps {
  label: string;
  unit: string;
  min: number;
  max: number;
  lowValue: number;
  highValue: number;
  normalMin?: number;
  normalMax?: number;
  onLowChange: (value: number) => void;
  onHighChange: (value: number) => void;
  color?: string;
  icon?: React.ReactNode;
}

export function ThresholdSlider({
  label,
  unit,
  min,
  max,
  lowValue,
  highValue,
  normalMin,
  normalMax,
  onLowChange,
  onHighChange,
  color = '#745EE1',
  icon,
}: ThresholdSliderProps) {
  const [isDraggingLow, setIsDraggingLow] = useState(false);
  const [isDraggingHigh, setIsDraggingHigh] = useState(false);

  const range = max - min;
  const lowPercent = ((lowValue - min) / range) * 100;
  const highPercent = ((highValue - min) / range) * 100;
  const normalMinPercent = normalMin ? ((normalMin - min) / range) * 100 : 0;
  const normalMaxPercent = normalMax ? ((normalMax - min) / range) * 100 : 100;

  const handleSliderClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const percent = ((e.clientX - rect.left) / rect.width) * 100;
    const value = Math.round(min + (percent / 100) * range);

    // Determine which thumb to move based on proximity
    const lowDist = Math.abs(percent - lowPercent);
    const highDist = Math.abs(percent - highPercent);

    if (lowDist < highDist && value < highValue) {
      onLowChange(Math.max(min, Math.min(value, highValue - 1)));
    } else if (value > lowValue) {
      onHighChange(Math.max(lowValue + 1, Math.min(value, max)));
    }
  }, [min, max, range, lowPercent, highPercent, lowValue, highValue, onLowChange, onHighChange]);

  return (
    <div className="p-4 rounded-xl bg-white dark:bg-[#0f0f1a] border border-[#E5E5E5] dark:border-[#1f1f2e]">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          {icon && (
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ backgroundColor: `${color}20` }}
            >
              <div style={{ color }}>{icon}</div>
            </div>
          )}
          <div>
            <h4 className="font-medium text-[#171717] dark:text-white">{label}</h4>
            <p className="text-xs text-[#737373]">{unit}</p>
          </div>
        </div>
        <div className="flex gap-4 text-sm">
          <div className="flex items-center gap-2">
            <span className="text-[#737373]">Low:</span>
            <input
              type="number"
              value={lowValue}
              onChange={(e) => onLowChange(Math.max(min, Math.min(Number(e.target.value), highValue - 1)))}
              className="w-16 px-2 py-1 rounded-lg border border-[#E5E5E5] dark:border-[#1f1f2e] bg-[#FAFAFA] dark:bg-[#1a1a2e] text-center text-sm"
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[#737373]">High:</span>
            <input
              type="number"
              value={highValue}
              onChange={(e) => onHighChange(Math.max(lowValue + 1, Math.min(Number(e.target.value), max)))}
              className="w-16 px-2 py-1 rounded-lg border border-[#E5E5E5] dark:border-[#1f1f2e] bg-[#FAFAFA] dark:bg-[#1a1a2e] text-center text-sm"
            />
          </div>
        </div>
      </div>

      {/* Slider Track */}
      <div
        className="relative h-10 cursor-pointer group"
        onClick={handleSliderClick}
      >
        {/* Background Track */}
        <div className="absolute top-1/2 -translate-y-1/2 left-0 right-0 h-3 rounded-full bg-[#F5F5F5] dark:bg-[#1a1a2e]" />

        {/* Normal Range Indicator */}
        {normalMin !== undefined && normalMax !== undefined && (
          <div
            className="absolute top-1/2 -translate-y-1/2 h-3 rounded-full bg-green-500/20"
            style={{
              left: `${normalMinPercent}%`,
              width: `${normalMaxPercent - normalMinPercent}%`,
            }}
          />
        )}

        {/* Low Danger Zone */}
        <div
          className="absolute top-1/2 -translate-y-1/2 h-3 rounded-l-full bg-red-500/30"
          style={{
            left: 0,
            width: `${lowPercent}%`,
          }}
        />

        {/* High Danger Zone */}
        <div
          className="absolute top-1/2 -translate-y-1/2 h-3 rounded-r-full bg-red-500/30"
          style={{
            left: `${highPercent}%`,
            right: 0,
          }}
        />

        {/* Selected Range */}
        <div
          className="absolute top-1/2 -translate-y-1/2 h-3"
          style={{
            left: `${lowPercent}%`,
            width: `${highPercent - lowPercent}%`,
            backgroundColor: `${color}40`,
          }}
        />

        {/* Low Thumb */}
        <div
          className={cn(
            'absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-6 h-6 rounded-full bg-white shadow-lg border-2 cursor-grab transition-transform',
            isDraggingLow && 'scale-110 cursor-grabbing'
          )}
          style={{
            left: `${lowPercent}%`,
            borderColor: '#ef4444',
          }}
          onMouseDown={() => setIsDraggingLow(true)}
          onMouseUp={() => setIsDraggingLow(false)}
        >
          <div className="absolute -top-8 left-1/2 -translate-x-1/2 px-2 py-1 rounded bg-red-500 text-white text-xs font-medium whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity">
            {lowValue} {unit}
          </div>
        </div>

        {/* High Thumb */}
        <div
          className={cn(
            'absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-6 h-6 rounded-full bg-white shadow-lg border-2 cursor-grab transition-transform',
            isDraggingHigh && 'scale-110 cursor-grabbing'
          )}
          style={{
            left: `${highPercent}%`,
            borderColor: '#ef4444',
          }}
          onMouseDown={() => setIsDraggingHigh(true)}
          onMouseUp={() => setIsDraggingHigh(false)}
        >
          <div className="absolute -top-8 left-1/2 -translate-x-1/2 px-2 py-1 rounded bg-red-500 text-white text-xs font-medium whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity">
            {highValue} {unit}
          </div>
        </div>
      </div>

      {/* Scale Labels */}
      <div className="flex justify-between mt-2 text-xs text-[#737373]">
        <span>{min}</span>
        {normalMin && <span className="text-green-600">Normal: {normalMin}</span>}
        {normalMax && <span className="text-green-600">{normalMax}</span>}
        <span>{max}</span>
      </div>

      {/* Legend */}
      <div className="flex gap-4 mt-3 text-xs">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded bg-red-500/30" />
          <span className="text-[#737373]">Alert Zone</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded bg-green-500/20" />
          <span className="text-[#737373]">Normal Range</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded" style={{ backgroundColor: `${color}40` }} />
          <span className="text-[#737373]">Safe Zone</span>
        </div>
      </div>
    </div>
  );
}
