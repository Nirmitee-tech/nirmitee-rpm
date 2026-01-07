'use client';

import { Invoice } from '@/lib/api/billing';
import { useTranslations } from '@/lib/i18n/i18n-context';
import { Button } from '@nirmitee/ui';
import { cn } from '@nirmitee/ui';
import { Download, ExternalLink, FileText } from 'lucide-react';

interface InvoiceTableProps {
  invoices: Invoice[];
  className?: string;
}

export function InvoiceTable({ invoices, className }: InvoiceTableProps) {
  const { t } = useTranslations('billing.invoices');

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const formatAmount = (amount: number, currency: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency.toUpperCase(),
    }).format(amount / 100);
  };

  const getStatusColor = (status: Invoice['status']) => {
    switch (status) {
      case 'paid':
        return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
      case 'open':
        return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';
      case 'draft':
        return 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400';
      case 'void':
      case 'uncollectible':
        return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
      default:
        return 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400';
    }
  };

  if (invoices.length === 0) {
    return (
      <div className={cn('p-12 bg-white dark:bg-[#0a0a0a] border border-[#E5E5E5] dark:border-[#212121] rounded-xl text-center', className)}>
        <FileText className="h-12 w-12 text-[#737373] mx-auto mb-4" />
        <h3 className="text-lg font-medium text-[#171717] dark:text-white mb-2">
          {t('noInvoices')}
        </h3>
        <p className="text-sm text-[#737373]">
          Your invoices will appear here once you have an active subscription
        </p>
      </div>
    );
  }

  return (
    <div className={cn('bg-white dark:bg-[#0a0a0a] border border-[#E5E5E5] dark:border-[#212121] rounded-xl overflow-hidden', className)}>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="border-b border-[#E5E5E5] dark:border-[#212121]">
            <tr>
              <th className="text-left py-3 px-4 text-xs font-medium text-[#737373] uppercase">
                {t('date')}
              </th>
              <th className="text-left py-3 px-4 text-xs font-medium text-[#737373] uppercase">
                {t('number')}
              </th>
              <th className="text-left py-3 px-4 text-xs font-medium text-[#737373] uppercase">
                {t('amount')}
              </th>
              <th className="text-left py-3 px-4 text-xs font-medium text-[#737373] uppercase">
                {t('status')}
              </th>
              <th className="text-right py-3 px-4 text-xs font-medium text-[#737373] uppercase">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {invoices.map((invoice) => (
              <tr
                key={invoice.id}
                className="border-b border-[#E5E5E5] dark:border-[#212121] last:border-0 hover:bg-[#F5F5F5] dark:hover:bg-[#171717] transition-colors"
              >
                <td className="py-3 px-4 text-sm text-[#171717] dark:text-white">
                  {formatDate(invoice.createdAt)}
                </td>
                <td className="py-3 px-4">
                  <span className="text-sm font-mono text-[#171717] dark:text-white">
                    {invoice.number}
                  </span>
                </td>
                <td className="py-3 px-4">
                  <span className="text-sm font-medium text-[#171717] dark:text-white">
                    {formatAmount(invoice.amount, invoice.currency)}
                  </span>
                </td>
                <td className="py-3 px-4">
                  <span
                    className={cn(
                      'inline-flex px-2 py-1 text-xs font-medium rounded-full capitalize',
                      getStatusColor(invoice.status)
                    )}
                  >
                    {invoice.status}
                  </span>
                </td>
                <td className="py-3 px-4">
                  <div className="flex items-center justify-end gap-2">
                    {invoice.invoicePdf && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => window.open(invoice.invoicePdf, '_blank')}
                      >
                        <Download className="h-4 w-4 mr-1" />
                        {t('download')}
                      </Button>
                    )}
                    {invoice.hostedInvoiceUrl && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => window.open(invoice.hostedInvoiceUrl, '_blank')}
                      >
                        <ExternalLink className="h-4 w-4 mr-1" />
                        {t('view')}
                      </Button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
