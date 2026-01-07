'use client';

import { Switch } from '@nirmitee/ui';
import { Clock, Globe } from 'lucide-react';

interface QuietHoursPickerProps {
  enabled: boolean;
  startTime: string | null;
  endTime: string | null;
  onEnabledChange: (enabled: boolean) => void;
  onStartTimeChange: (time: string) => void;
  onEndTimeChange: (time: string) => void;
  enabledLabel: string;
  startLabel: string;
  endLabel: string;
  timezoneLabel: string;
  disabled?: boolean;
}

export function QuietHoursPicker({
  enabled,
  startTime,
  endTime,
  onEnabledChange,
  onStartTimeChange,
  onEndTimeChange,
  enabledLabel,
  startLabel,
  endLabel,
  timezoneLabel,
  disabled = false,
}: QuietHoursPickerProps) {
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

  return (
    <div className="space-y-4">
      {/* Enable Toggle */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-[#737373]" />
          <span className="text-sm font-medium text-[#171717] dark:text-white">
            {enabledLabel}
          </span>
        </div>
        <Switch checked={enabled} onCheckedChange={onEnabledChange} disabled={disabled} />
      </div>

      {/* Time Pickers */}
      {enabled && (
        <div className="pl-6 space-y-4">
          {/* Start Time */}
          <div className="space-y-2">
            <label className="text-xs font-medium text-[#737373] block">
              {startLabel}
            </label>
            <input
              type="time"
              value={startTime || '22:00'}
              onChange={(e) => onStartTimeChange(e.target.value)}
              disabled={disabled}
              className="w-full px-3 py-2 text-sm border border-[#E5E5E5] dark:border-[#212121] rounded-lg bg-white dark:bg-[#0a0a0a] text-[#171717] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#745EE1] disabled:opacity-50 disabled:cursor-not-allowed"
            />
          </div>

          {/* End Time */}
          <div className="space-y-2">
            <label className="text-xs font-medium text-[#737373] block">
              {endLabel}
            </label>
            <input
              type="time"
              value={endTime || '08:00'}
              onChange={(e) => onEndTimeChange(e.target.value)}
              disabled={disabled}
              className="w-full px-3 py-2 text-sm border border-[#E5E5E5] dark:border-[#212121] rounded-lg bg-white dark:bg-[#0a0a0a] text-[#171717] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#745EE1] disabled:opacity-50 disabled:cursor-not-allowed"
            />
          </div>

          {/* Timezone Display */}
          <div className="flex items-center gap-2 text-xs text-[#737373]">
            <Globe className="h-3 w-3" />
            <span>
              {timezoneLabel}: {timezone}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
