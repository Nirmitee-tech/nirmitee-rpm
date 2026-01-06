import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../utils/cn';
import { Wifi, WifiOff, RefreshCw, AlertCircle, Battery } from 'lucide-react';

const statusVariants = cva('inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium', {
  variants: {
    status: {
      connected: 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400',
      disconnected: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400',
      syncing: 'bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400',
      error: 'bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400',
    },
  },
  defaultVariants: {
    status: 'connected',
  },
});

const statusIcons = {
  connected: Wifi,
  disconnected: WifiOff,
  syncing: RefreshCw,
  error: AlertCircle,
};

export interface DeviceStatusIndicatorProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof statusVariants> {
  status: 'connected' | 'disconnected' | 'syncing' | 'error';
  lastSync?: Date;
  batteryLevel?: number;
}

const DeviceStatusIndicator = React.forwardRef<HTMLDivElement, DeviceStatusIndicatorProps>(
  ({ className, status, lastSync, batteryLevel, ...props }, ref) => {
    const Icon = statusIcons[status];

    const formatLastSync = () => {
      if (!lastSync) return null;
      const now = new Date();
      const diff = now.getTime() - lastSync.getTime();
      const minutes = Math.floor(diff / 60000);
      const hours = Math.floor(minutes / 60);
      const days = Math.floor(hours / 24);

      if (days > 0) return `${days}d ago`;
      if (hours > 0) return `${hours}h ago`;
      if (minutes > 0) return `${minutes}m ago`;
      return 'Just now';
    };

    const getBatteryColor = () => {
      if (batteryLevel === undefined) return 'text-gray-400';
      if (batteryLevel <= 20) return 'text-red-500';
      if (batteryLevel <= 50) return 'text-yellow-500';
      return 'text-green-500';
    };

    return (
      <div ref={ref} className={cn('inline-flex flex-col gap-1', className)} {...props}>
        <div className={cn(statusVariants({ status }))}>
          <Icon className={cn('h-3.5 w-3.5', status === 'syncing' && 'animate-spin')} />
          <span className="capitalize">{status}</span>
        </div>

        {(lastSync || batteryLevel !== undefined) && (
          <div className="flex items-center gap-2 px-3 text-xs text-gray-500 dark:text-gray-400">
            {lastSync && <span>Synced {formatLastSync()}</span>}
            {batteryLevel !== undefined && (
              <span className="flex items-center gap-1">
                <Battery className={cn('h-3.5 w-3.5', getBatteryColor())} />
                {batteryLevel}%
              </span>
            )}
          </div>
        )}
      </div>
    );
  }
);
DeviceStatusIndicator.displayName = 'DeviceStatusIndicator';

export { DeviceStatusIndicator, statusVariants };
