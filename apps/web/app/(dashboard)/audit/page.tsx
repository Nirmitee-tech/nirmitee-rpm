'use client';

import { useState, useEffect, useCallback } from 'react';
import { Download, Loader2, FileText } from 'lucide-react';
import { Button } from '@nirmitee/ui';
import { auditApi, AuditLog, AuditFilters as AuditFilterType } from '@/lib/api/audit';
import { useTranslations } from '@/lib/i18n/i18n-context';
import { AuditLogTable } from '@/components/features/audit/audit-log-table';
import { AuditFilters } from '@/components/features/audit/audit-filters';

export default function AuditLogsPage() {
  const [loading, setLoading] = useState(true);
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [filters, setFilters] = useState<AuditFilterType>({});
  const [exporting, setExporting] = useState(false);

  const { t } = useTranslations('audit');
  const { t: tCommon } = useTranslations('common');

  const fetchLogs = useCallback(async () => {
    try {
      setLoading(true);
      const result = await auditApi.getLogs({
        page,
        limit: 20,
        ...filters,
      });
      setLogs(result.logs);
      setTotalPages(result.pagination.totalPages);
      setTotal(result.pagination.total);
    } catch (error) {
      console.error('Failed to fetch audit logs:', error);
    } finally {
      setLoading(false);
    }
  }, [page, filters]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const handleFilterChange = (newFilters: AuditFilterType) => {
    setFilters(newFilters);
    setPage(1); // Reset to first page when filters change
  };

  const handleExportCSV = async () => {
    try {
      setExporting(true);

      // Fetch all logs for export
      const result = await auditApi.getLogs({
        ...filters,
        limit: 10000, // Large limit for export
      });

      // Convert to CSV
      const headers = [
        'Timestamp',
        'User',
        'Email',
        'Action',
        'Entity',
        'Entity ID',
        'IP Address',
      ];

      const rows = result.logs.map((log) => [
        new Date(log.createdAt).toLocaleString(),
        log.user ? `${log.user.firstName} ${log.user.lastName}` : 'Unknown',
        log.user?.email || '-',
        log.action,
        log.entity,
        log.entityId || '-',
        log.ipAddress || '-',
      ]);

      const csvContent = [
        headers.join(','),
        ...rows.map((row) =>
          row.map((cell) => `"${cell}"`).join(',')
        ),
      ].join('\n');

      // Download CSV
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `audit-logs-${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('Failed to export audit logs:', error);
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-[#171717] dark:text-white">
            {t('title')}
          </h1>
          <p className="text-[#737373] mt-1">{t('subtitle')}</p>
        </div>
        <Button onClick={handleExportCSV} disabled={exporting || logs.length === 0}>
          {exporting ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              {tCommon('loading')}
            </>
          ) : (
            <>
              <Download className="h-4 w-4 mr-2" />
              {t('export')}
            </>
          )}
        </Button>
      </div>

      {/* Filters */}
      <AuditFilters onFilterChange={handleFilterChange} />

      {/* Stats Bar */}
      {!loading && total > 0 && (
        <div className="bg-white dark:bg-[#0a0a0a] border border-[#E5E5E5] dark:border-[#212121] rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="text-sm text-[#737373]">
              {t('showingLogs', { count: logs.length })} • {t('totalLogs', { total })}
            </div>
            <div className="text-sm text-[#737373]">
              {tCommon('showing')} {((page - 1) * 20) + 1} - {Math.min(page * 20, total)} {tCommon('of')} {total}
            </div>
          </div>
        </div>
      )}

      {/* Audit Logs Table */}
      <div className="bg-white dark:bg-[#0a0a0a] border border-[#E5E5E5] dark:border-[#212121] rounded-lg overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-[#745EE1]" />
          </div>
        ) : logs.length === 0 ? (
          <div className="text-center py-12">
            <div className="h-12 w-12 bg-[#745EE1]/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <FileText className="h-6 w-6 text-[#745EE1]" />
            </div>
            <h3 className="text-lg font-medium text-[#171717] dark:text-white mb-2">
              {t('noLogs')}
            </h3>
            <p className="text-[#737373]">
              No audit activity found for the selected filters
            </p>
          </div>
        ) : (
          <>
            <AuditLogTable logs={logs} loading={loading} />

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-[#E5E5E5] dark:border-[#212121]">
                <div className="text-sm text-[#737373]">
                  Page {page} {tCommon('of')} {totalPages}
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page === 1}
                    onClick={() => setPage(page - 1)}
                  >
                    {tCommon('previous')}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page >= totalPages}
                    onClick={() => setPage(page + 1)}
                  >
                    {tCommon('next')}
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
