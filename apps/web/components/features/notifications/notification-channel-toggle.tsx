'use client';

import { ReactNode } from 'react';
import { Switch } from '@nirmitee/ui';

interface NotificationChannelToggleProps {
  icon: ReactNode;
  title: string;
  description: string;
  enabled: boolean;
  onChange: (enabled: boolean) => void;
  disabled?: boolean;
}

export function NotificationChannelToggle({
  icon,
  title,
  description,
  enabled,
  onChange,
  disabled = false,
}: NotificationChannelToggleProps) {
  return (
    <div className="flex items-start justify-between py-4 border-b border-[#E5E5E5] dark:border-[#212121] last:border-0">
      <div className="flex items-start gap-3 flex-1">
        <div className="mt-1 text-[#737373]">{icon}</div>
        <div className="flex-1">
          <h4 className="text-sm font-medium text-[#171717] dark:text-white mb-1">
            {title}
          </h4>
          <p className="text-xs text-[#737373]">{description}</p>
        </div>
      </div>
      <Switch checked={enabled} onCheckedChange={onChange} disabled={disabled} />
    </div>
  );
}
