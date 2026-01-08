'use client';

import { cn } from '@/lib/utils';
import {
  UserPlus,
  AlertTriangle,
  Activity,
  Settings,
  Users,
  Shield,
  Bell,
  Edit,
  Trash2,
  LogIn,
} from 'lucide-react';
import { LucideIcon } from 'lucide-react';

export interface ActivityItem {
  id: string;
  user: string;
  action: string;
  entityType: string;
  time: string;
  type: 'create' | 'update' | 'delete';
}

export interface ActivityTimelineProps {
  activities: ActivityItem[];
  isLoading?: boolean;
  emptyMessage?: string;
  showFilter?: boolean;
  className?: string;
}

const getActivityIcon = (entityType: string, actionType: string): LucideIcon => {
  const entityIcons: Record<string, LucideIcon> = {
    user: UserPlus,
    patient: Activity,
    alert: AlertTriangle,
    team: Users,
    role: Shield,
    organization: Settings,
    invitation: Bell,
  };

  if (actionType === 'delete') return Trash2;
  if (actionType === 'update') return Edit;
  if (entityType.toLowerCase() === 'session') return LogIn;

  return entityIcons[entityType.toLowerCase()] || Activity;
};

const getActivityColor = (type: string): string => {
  switch (type) {
    case 'create':
      return 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400';
    case 'delete':
      return 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400';
    case 'update':
    default:
      return 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400';
  }
};

export function ActivityTimeline({
  activities,
  isLoading,
  emptyMessage = 'No recent activity',
  className,
}: ActivityTimelineProps) {
  if (isLoading) {
    return (
      <div className={cn('bg-white dark:bg-gradient-to-br dark:from-[#0f0f1a] dark:to-[#15122a] border border-gray-200 dark:border-[#1f1f2e] rounded-xl p-4', className)}>
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-1/3" />
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="flex items-start gap-3">
              <div className="w-8 h-8 bg-gray-200 dark:bg-gray-700 rounded-full" />
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4" />
                <div className="h-3 bg-gray-100 dark:bg-gray-800 rounded w-1/4" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className={cn('bg-white dark:bg-gradient-to-br dark:from-[#0f0f1a] dark:to-[#15122a] border border-gray-200 dark:border-[#1f1f2e] rounded-xl p-4', className)}>
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
        Recent Activity
      </h3>

      {activities.length === 0 ? (
        <div className="text-center py-8">
          <Activity className="h-8 w-8 mx-auto mb-2 text-gray-300 dark:text-gray-600" />
          <p className="text-sm text-gray-500 dark:text-gray-400">{emptyMessage}</p>
        </div>
      ) : (
        <div className="relative">
          {/* Timeline line */}
          <div className="absolute left-4 top-0 bottom-0 w-px bg-gray-200 dark:bg-gray-700" />

          <div className="space-y-4">
            {activities.map((activity) => {
              const Icon = getActivityIcon(activity.entityType, activity.type);
              const colorClass = getActivityColor(activity.type);

              return (
                <div key={activity.id} className="relative flex items-start gap-3 pl-1">
                  {/* Icon */}
                  <div
                    className={cn(
                      'relative z-10 flex items-center justify-center w-8 h-8 rounded-full',
                      colorClass
                    )}
                  >
                    <Icon className="h-4 w-4" />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0 pt-0.5">
                    <p className="text-sm text-gray-900 dark:text-white">
                      <span className="font-medium">{activity.user}</span>{' '}
                      <span className="text-gray-500 dark:text-gray-400">
                        {activity.action}
                      </span>
                    </p>
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                      {activity.time}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

export default ActivityTimeline;
