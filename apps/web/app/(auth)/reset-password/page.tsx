'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { ResetPasswordForm } from '@/components/features/auth/reset-password-form';
import { Logo } from '@/components/ui/logo';
import { useTranslations } from '@/lib/i18n/i18n-context';
import { AlertCircle } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@nirmitee/ui';

function ResetPasswordContent() {
  const searchParams = useSearchParams();
  const { t } = useTranslations('auth.resetPassword');
  const token = searchParams.get('token');

  if (!token) {
    return (
      <div className="text-center space-y-6">
        <div className="flex justify-center">
          <AlertCircle className="h-16 w-16 text-red-500" />
        </div>
        <div className="space-y-2">
          <h3 className="text-xl font-semibold text-primary">{t('invalidToken')}</h3>
          <p className="text-secondary text-sm">
            The password reset link is invalid or has expired.
          </p>
        </div>
        <Link href="/forgot-password">
          <Button variant="outline" className="w-full">
            Request New Reset Link
          </Button>
        </Link>
      </div>
    );
  }

  return <ResetPasswordForm token={token} />;
}

export default function ResetPasswordPage() {
  const { t } = useTranslations('auth.resetPassword');

  return (
    <div className="min-h-screen flex items-center justify-center background-primary p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Logo className="mx-auto mb-6" size="lg" />
          <h1 className="text-h2 text-primary font-semibold">{t('title')}</h1>
          <p className="text-secondary mt-2">{t('subtitle')}</p>
        </div>
        <div className="background-white border-primary p-6 rounded-lg">
          <Suspense fallback={
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand"></div>
            </div>
          }>
            <ResetPasswordContent />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
