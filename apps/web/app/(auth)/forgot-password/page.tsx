'use client';

import { ForgotPasswordForm } from '@/components/features/auth/forgot-password-form';
import { Logo } from '@/components/ui/logo';
import { useTranslations } from '@/lib/i18n/i18n-context';

export default function ForgotPasswordPage() {
  const { t } = useTranslations('auth.forgotPassword');

  return (
    <div className="min-h-screen flex items-center justify-center background-primary p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Logo className="mx-auto mb-6" size="lg" />
          <h1 className="text-h2 text-primary font-semibold">{t('title')}</h1>
          <p className="text-secondary mt-2">{t('subtitle')}</p>
        </div>
        <div className="background-white border-primary p-6 rounded-lg">
          <ForgotPasswordForm />
        </div>
      </div>
    </div>
  );
}
