'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from '@/lib/i18n/i18n-context';
import { billingApi, Invoice } from '@/lib/api/billing';
import { Button } from '@nirmitee/ui';
import { InvoiceTable } from '@/components/features/billing/invoice-table';
import { Loader2, ArrowLeft, AlertCircle } from 'lucide-react';

export default function InvoicesPage() {
  const { t } = useTranslations('billing.invoices');
  const tCommon = useTranslations('common');
  const router = useRouter();

  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadInvoices = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const { invoices: invoiceData } = await billingApi.getInvoices();
      setInvoices(invoiceData);
    } catch (err) {
      const error = err as { message?: string };
      setError(error.message || 'Failed to load invoices');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadInvoices();
  }, [loadInvoices]);

  return (
    <div className="w-full space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="outline"
          size="sm"
          onClick={() => router.push('/settings/billing')}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          {t('backToBilling')}
        </Button>
      </div>

      <div>
        <h1 className="text-2xl font-bold text-[#171717] dark:text-white">
          {t('title')}
        </h1>
        <p className="text-sm text-[#737373] mt-1">
          View and download your billing invoices
        </p>
      </div>

      {/* Error Message */}
      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-red-800 dark:text-red-200">Error</p>
            <p className="text-sm text-red-700 dark:text-red-300 mt-1">{error}</p>
          </div>
        </div>
      )}

      {/* Loading State */}
      {loading ? (
        <div className="flex items-center justify-center min-h-[40vh]">
          <Loader2 className="h-8 w-8 animate-spin text-[#745EE1]" />
        </div>
      ) : (
        <InvoiceTable invoices={invoices} />
      )}
    </div>
  );
}
