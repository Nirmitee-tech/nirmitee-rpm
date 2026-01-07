'use client';

import { formatDistanceToNow } from 'date-fns';
import {
  Info,
  CheckCircle,
  AlertTriangle,
  AlertCircle,
  Users,
  UserPlus,
  UserMinus,
  Shield,
  Bell
} from 'lucide-react';
import { cn } from '@nirmitee/ui';
import type { Notification } from '@/lib/api/notifications';

interface NotificationItemProps {
  notification: Notification;
  onClick: (notification: Notification) => void;
}

const notificationIcons = {
  INFO: Info,
  SUCCESS: CheckCircle,
  WARNING: AlertTriangle,
  ERROR: AlertCircle,
  TEAM_INVITE: Users,
  ROLE_CHANGE: Shield,
  USER_ADDED: UserPlus,
  USER_REMOVED: UserMinus,
  SYSTEM: Bell,
  ALERT_CRITICAL: AlertCircle,
  ALERT_SIGNIFICANT: AlertTriangle,
  CARE_PLAN_UPDATED: Info,
};

const notificationColors = {
  INFO: 'text-blue-500',
  SUCCESS: 'text-green-500',
  WARNING: 'text-yellow-500',
  ERROR: 'text-red-500',
  TEAM_INVITE: 'text-purple-500',
  ROLE_CHANGE: 'text-indigo-500',
  USER_ADDED: 'text-green-500',
  USER_REMOVED: 'text-gray-500',
  SYSTEM: 'text-blue-500',
  ALERT_CRITICAL: 'text-red-500',
  ALERT_SIGNIFICANT: 'text-orange-500',
  CARE_PLAN_UPDATED: 'text-blue-500',
};

export function NotificationItem({ notification, onClick }: NotificationItemProps) {
  const Icon = notificationIcons[notification.type as keyof typeof notificationIcons] || Info;
  const iconColor = notificationColors[notification.type as keyof typeof notificationColors] || 'text-gray-500';

  return (
    <button
      onClick={() => onClick(notification)}
      className={cn(
        'w-full text-left px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors',
        'border-b border-gray-100 dark:border-gray-800 last:border-b-0',
        !notification.isRead && 'bg-blue-50/50 dark:bg-blue-950/20'
      )}
    >
      <div className="flex gap-3">
        {/* Icon */}
        <div className={cn('flex-shrink-0 mt-0.5', iconColor)}>
          <Icon className="h-5 w-5" />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <p className={cn(
              'text-sm font-medium text-gray-900 dark:text-gray-100',
              !notification.isRead && 'font-semibold'
            )}>
              {notification.title}
            </p>
            {!notification.isRead && (
              <span className="flex-shrink-0 h-2 w-2 bg-blue-500 rounded-full mt-1.5" />
            )}
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-0.5 line-clamp-2">
            {notification.message}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
            {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
          </p>
        </div>
      </div>
    </button>
  );
}
