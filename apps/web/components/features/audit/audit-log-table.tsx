'use client';

import { Fragment, useState } from 'react';
import { ChevronDown, ChevronRight, User } from 'lucide-react';
import { Badge, Button } from '@nirmitee/ui';
import { AuditLog } from '@/lib/api/audit';
import { useTranslations } from '@/lib/i18n/i18n-context';
import { AuditLogDetail } from './audit-log-detail';

interface AuditLogTableProps {
  logs: AuditLog[];
  loading?: boolean;
}

const actionColors: Record<string, 'success' | 'danger' | 'warning' | 'default' | 'gray'> = {
  create: 'success',
  delete: 'danger',
  update: 'default',
  login: 'gray',
  logout: 'gray',
  invite: 'warning',
  revoke: 'danger',
  accept: 'success',
  assign: 'default',
  remove: 'danger',
  enable: 'success',
  disable: 'warning',
};

export function AuditLogTable({ logs, loading }: AuditLogTableProps) {
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  const { t } = useTranslations('audit');

  const toggleRow = (logId: string) => {
    setExpandedRow(expandedRow === logId ? null : logId);
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) return `${diffInSeconds}s ago`;
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;

    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
    });
  };

  const getFullTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString('en-US', {
      dateStyle: 'medium',
      timeStyle: 'medium',
    });
  };

  if (loading) {
    return (
      <div className="animate-pulse space-y-2">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-12 bg-gray-100 dark:bg-[#171717] rounded" />
        ))}
      </div>
    );
  }

  if (logs.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="h-12 w-12 bg-[#745EE1]/10 rounded-full flex items-center justify-center mx-auto mb-4">
          <User className="h-6 w-6 text-[#745EE1]" />
        </div>
        <h3 className="text-lg font-medium text-[#171717] dark:text-white mb-2">
          {t('noLogs')}
        </h3>
        <p className="text-[#737373]">
          No audit activity to display
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-[#E5E5E5] dark:border-[#212121]">
            <th className="w-8"></th>
            <th className="text-left px-4 py-3 text-sm font-semibold text-[#171717] dark:text-white">
              {t('columns.timestamp')}
            </th>
            <th className="text-left px-4 py-3 text-sm font-semibold text-[#171717] dark:text-white">
              {t('columns.user')}
            </th>
            <th className="text-left px-4 py-3 text-sm font-semibold text-[#171717] dark:text-white">
              {t('columns.action')}
            </th>
            <th className="text-left px-4 py-3 text-sm font-semibold text-[#171717] dark:text-white">
              {t('columns.entity')}
            </th>
            <th className="text-left px-4 py-3 text-sm font-semibold text-[#171717] dark:text-white">
              {t('columns.ipAddress')}
            </th>
          </tr>
        </thead>
        <tbody>
          {logs.map((log) => (
            <Fragment key={log.id}>
              <tr
                className="border-b border-[#E5E5E5] dark:border-[#212121] last:border-0 hover:bg-gray-50 dark:hover:bg-[#171717]"
              >
                <td className="px-2 py-3">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={() => toggleRow(log.id)}
                  >
                    {expandedRow === log.id ? (
                      <ChevronDown className="h-4 w-4" />
                    ) : (
                      <ChevronRight className="h-4 w-4" />
                    )}
                  </Button>
                </td>
                <td className="px-4 py-3">
                  <div className="text-sm text-[#171717] dark:text-white">
                    <span title={getFullTimestamp(log.createdAt)}>
                      {formatTimestamp(log.createdAt)}
                    </span>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <div className="h-8 w-8 rounded-full bg-[#745EE1]/10 flex items-center justify-center flex-shrink-0">
                      <span className="text-xs font-medium text-[#745EE1]">
                        {log.user?.firstName?.[0] || '?'}
                        {log.user?.lastName?.[0] || ''}
                      </span>
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-medium text-[#171717] dark:text-white truncate">
                        {log.user
                          ? `${log.user.firstName} ${log.user.lastName}`
                          : t('unknownUser')}
                      </div>
                      <div className="text-xs text-[#737373] truncate">
                        {log.user?.email || '-'}
                      </div>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <Badge
                    variant={actionColors[log.action.toLowerCase()] || 'default'}
                    className="capitalize"
                  >
                    {log.action}
                  </Badge>
                </td>
                <td className="px-4 py-3">
                  <div className="text-sm text-[#171717] dark:text-white capitalize">
                    {log.entity}
                  </div>
                  {log.entityId && (
                    <div className="text-xs text-[#737373] font-mono truncate max-w-[120px]">
                      {log.entityId}
                    </div>
                  )}
                </td>
                <td className="px-4 py-3">
                  <div className="text-sm text-[#737373] font-mono">
                    {log.ipAddress || '-'}
                  </div>
                </td>
              </tr>
              {expandedRow === log.id && (
                <tr>
                  <td colSpan={6} className="px-4 py-4 bg-gray-50 dark:bg-[#0a0a0a]">
                    <AuditLogDetail log={log} />
                  </td>
                </tr>
              )}
            </Fragment>
          ))}
        </tbody>
      </table>
    </div>
  );
}
