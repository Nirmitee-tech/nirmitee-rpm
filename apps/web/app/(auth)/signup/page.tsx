'use client';

import { SignupForm } from '@/components/features/auth/signup-form';
import { Logo } from '@/components/ui/logo';
import { useTranslations } from '@/lib/i18n/i18n-context';

export default function SignupPage() {
  const { t } = useTranslations('auth.signup');

  return (
    <div className="min-h-screen flex items-center justify-center background-primary p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Logo className="mx-auto mb-6" size="lg" />
          <h1 className="text-h2 text-primary font-semibold">{t('title')}</h1>
          <p className="text-secondary mt-2">{t('subtitle')}</p>
        </div>
        <div className="background-white border-primary p-6 rounded-lg">
          <SignupForm />
        </div>
      </div>
    </div>
  );
}
