'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from '@/lib/i18n/i18n-context';
import { billingApi, Plan, Subscription, UsageLimits } from '@/lib/api/billing';
import { Button } from '@nirmitee/ui';
import { SubscriptionStatus } from '@/components/features/billing/subscription-status';
import { UsageMeter } from '@/components/features/billing/usage-meter';
import { PlanComparison } from '@/components/features/billing/plan-comparison';
import { Loader2, Receipt, AlertCircle, ExternalLink } from 'lucide-react';
import { cn } from '@nirmitee/ui';

export default function BillingPage() {
  const { t } = useTranslations('billing');
  const tCommon = useTranslations('common');
  const router = useRouter();

  const [plans, setPlans] = useState<Plan[]>([]);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [usage, setUsage] = useState<UsageLimits | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const loadBillingData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const [plansRes, subscriptionRes, usageData] = await Promise.all([
        billingApi.getPlans(),
        billingApi.getSubscription(),
        billingApi.getUsageLimits(),
      ]);

      setPlans(plansRes.plans);
      setSubscription(subscriptionRes.subscription);
      setUsage(usageData);
    } catch (err) {
      const error = err as { message?: string };
      setError(error.message || t('errors.loadSubscription'));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    loadBillingData();
  }, [loadBillingData]);

  const handleCancelSubscription = async () => {
    const confirmed = window.confirm(t('cancelConfirm'));
    if (!confirmed) return;

    try {
      setActionLoading(true);
      setError(null);
      await billingApi.cancelSubscription();
      setSuccessMessage(t('cancelSuccess'));
      await loadBillingData();
      setTimeout(() => setSuccessMessage(null), 5000);
    } catch (err) {
      const error = err as { message?: string };
      setError(error.message || t('errors.cancelSubscription'));
    } finally {
      setActionLoading(false);
    }
  };

  const handleResumeSubscription = async () => {
    try {
      setActionLoading(true);
      setError(null);
      await billingApi.resumeSubscription();
      setSuccessMessage(t('resumeSuccess'));
      await loadBillingData();
      setTimeout(() => setSuccessMessage(null), 5000);
    } catch (err) {
      const error = err as { message?: string };
      setError(error.message || t('errors.resumeSubscription'));
    } finally {
      setActionLoading(false);
    }
  };

  const handleManageSubscription = async () => {
    try {
      setActionLoading(true);
      setError(null);
      const { url } = await billingApi.getPortalUrl(window.location.href);
      window.location.href = url;
    } catch (err) {
      const error = err as { message?: string };
      setError(error.message || 'Failed to open billing portal');
      setActionLoading(false);
    }
  };

  const handleSelectPlan = async (plan: Plan) => {
    try {
      setActionLoading(true);
      setError(null);

      const successUrl = `${window.location.origin}/settings/billing?success=true`;
      const cancelUrl = `${window.location.origin}/settings/billing?canceled=true`;

      const { url } = await billingApi.createCheckout(plan.stripePriceId, successUrl, cancelUrl);
      window.location.href = url;
    } catch (err) {
      const error = err as { message?: string };
      setError(error.message || t('errors.createCheckout'));
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-[#745EE1]" />
      </div>
    );
  }

  return (
    <div className="w-full space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#171717] dark:text-white">
            {t('title')}
          </h1>
          <p className="text-sm text-[#737373] mt-1">
            Manage your subscription and billing
          </p>
        </div>
        <Button
          variant="outline"
          onClick={() => router.push('/settings/billing/invoices')}
        >
          <Receipt className="h-4 w-4 mr-2" />
          {t('viewInvoices')}
        </Button>
      </div>

      {/* Success/Error Messages */}
      {successMessage && (
        <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
          <p className="text-sm text-green-800 dark:text-green-200">{successMessage}</p>
        </div>
      )}

      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-red-800 dark:text-red-200">Error</p>
            <p className="text-sm text-red-700 dark:text-red-300 mt-1">{error}</p>
          </div>
        </div>
      )}

      {/* Current Subscription */}
      <SubscriptionStatus subscription={subscription} />

      {/* Usage Metrics */}
      {usage && (
        <div className="p-6 bg-white dark:bg-[#0a0a0a] border border-[#E5E5E5] dark:border-[#212121] rounded-xl">
          <h2 className="text-lg font-semibold text-[#171717] dark:text-white mb-4">
            {t('usage')}
          </h2>
          <div className="space-y-4">
            <UsageMeter
              label={t('users')}
              used={usage.users.used}
              limit={usage.users.limit}
            />
            <UsageMeter
              label={t('teams')}
              used={usage.teams.used}
              limit={usage.teams.limit}
            />
            <UsageMeter
              label={t('storage')}
              used={usage.storage.used}
              limit={usage.storage.limit}
              unit="GB"
            />
          </div>
        </div>
      )}

      {/* Subscription Actions */}
      {subscription && (
        <div className="p-6 bg-white dark:bg-[#0a0a0a] border border-[#E5E5E5] dark:border-[#212121] rounded-xl">
          <h2 className="text-lg font-semibold text-[#171717] dark:text-white mb-4">
            {t('manageSubscription')}
          </h2>
          <div className="flex flex-wrap gap-3">
            <Button
              variant="outline"
              onClick={handleManageSubscription}
              disabled={actionLoading}
            >
              {actionLoading ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <ExternalLink className="h-4 w-4 mr-2" />
              )}
              Manage Billing
            </Button>

            {subscription.cancelAtPeriodEnd ? (
              <Button
                variant="default"
                onClick={handleResumeSubscription}
                disabled={actionLoading}
              >
                {actionLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {t('resumeSubscription')}
              </Button>
            ) : subscription.status === 'active' ? (
              <Button
                variant="outline"
                onClick={handleCancelSubscription}
                disabled={actionLoading}
                className="text-red-600 border-red-200 hover:bg-red-50 dark:text-red-400 dark:border-red-800 dark:hover:bg-red-900/20"
              >
                {actionLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {t('cancelSubscription')}
              </Button>
            ) : null}
          </div>
        </div>
      )}

      {/* Available Plans */}
      {plans.length > 0 && (!subscription || subscription.status !== 'active') && (
        <PlanComparison
          plans={plans}
          currentPlanId={subscription?.planId}
          onSelectPlan={handleSelectPlan}
          loading={actionLoading}
        />
      )}
    </div>
  );
}
