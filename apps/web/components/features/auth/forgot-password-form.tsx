'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Button, Input } from '@nirmitee/ui';
import { Mail, ArrowLeft, CheckCircle, AlertCircle } from 'lucide-react';
import { authApi } from '@/lib/api';
import { useTranslations } from '@/lib/i18n/i18n-context';

export function ForgotPasswordForm() {
  const { t } = useTranslations('auth.forgotPassword');
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      await authApi.forgotPassword(email);
      setIsSubmitted(true);
    } catch (err: unknown) {
      // Still show success to prevent email enumeration
      // The API returns success even if email doesn't exist
      setIsSubmitted(true);
    } finally {
      setIsLoading(false);
    }
  };

  if (isSubmitted) {
    return (
      <div className="text-center">
        <div className="mb-4 flex justify-center">
          <CheckCircle className="h-12 w-12 text-success" />
        </div>
        <h3 className="text-lg font-semibold text-primary mb-2">{t('checkEmail')}</h3>
        <p className="text-secondary text-sm mb-6">
          {t('emailSentMessage')}{' '}
          <span className="font-medium text-primary">{email}</span>
        </p>
        <p className="text-secondary text-xs mb-6">
          {t('checkSpam')}
        </p>
        <Link href="/login">
          <Button variant="outline" className="w-full">
            <ArrowLeft className="h-4 w-4 mr-2" />
            {t('backToSignIn')}
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 flex items-center gap-2">
          <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-primary mb-1">
          {t('email')}
        </label>
        <div className="relative">
          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            type="email"
            placeholder={t('emailPlaceholder')}
            className="pl-10"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            disabled={isLoading}
          />
        </div>
        <p className="mt-2 text-sm text-secondary">
          {t('enterEmailMessage')}
        </p>
      </div>

      <Button type="submit" className="w-full" disabled={isLoading}>
        {isLoading ? t('sending') : t('sendResetLink')}
      </Button>

      <Link
        href="/login"
        className="flex items-center justify-center gap-2 text-sm text-brand hover:underline"
      >
        <ArrowLeft className="h-4 w-4" />
        {t('backToSignIn')}
      </Link>
    </form>
  );
}
