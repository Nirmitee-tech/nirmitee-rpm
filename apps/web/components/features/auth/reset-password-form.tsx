'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button, Input } from '@nirmitee/ui';
import { Eye, EyeOff, Lock, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { authApi } from '@/lib/api';
import { useTranslations } from '@/lib/i18n/i18n-context';

interface ResetPasswordFormProps {
  token: string;
}

export function ResetPasswordForm({ token }: ResetPasswordFormProps) {
  const router = useRouter();
  const { t } = useTranslations('auth.resetPassword');
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);

  const validatePasswords = (): boolean => {
    setValidationError(null);

    if (newPassword.length < 8) {
      setValidationError(t('passwordRequirements'));
      return false;
    }

    if (newPassword !== confirmPassword) {
      setValidationError(t('passwordMismatch'));
      return false;
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);

    if (!validatePasswords()) {
      return;
    }

    setIsLoading(true);

    try {
      await authApi.resetPassword(token, newPassword);
      setIsSuccess(true);

      // Redirect to login after 3 seconds
      setTimeout(() => {
        router.push('/login');
      }, 3000);
    } catch (err: unknown) {
      const error = err as { message?: string; code?: string };

      // Handle specific error cases
      if (error.message?.toLowerCase().includes('expired') ||
          error.message?.toLowerCase().includes('invalid')) {
        setError(t('invalidToken'));
      } else {
        setError(error.message || 'Failed to reset password');
      }
    } finally {
      setIsLoading(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="text-center space-y-6">
        <div className="flex justify-center">
          <CheckCircle className="h-16 w-16 text-success" />
        </div>
        <div className="space-y-2">
          <h3 className="text-xl font-semibold text-primary">{t('success')}</h3>
          <p className="text-secondary text-sm">
            Redirecting you to login page...
          </p>
        </div>
        <Link href="/login">
          <Button variant="outline" className="w-full">
            {t('backToLogin')}
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 flex items-center gap-2">
          <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400 flex-shrink-0" />
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        </div>
      )}

      {validationError && (
        <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 flex items-center gap-2">
          <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400 flex-shrink-0" />
          <p className="text-sm text-amber-600 dark:text-amber-400">{validationError}</p>
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-primary mb-1">
          {t('newPassword')}
        </label>
        <div className="relative">
          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            type={showNewPassword ? 'text' : 'password'}
            placeholder={t('newPasswordPlaceholder')}
            className="pl-10 pr-10"
            value={newPassword}
            onChange={(e) => {
              setNewPassword(e.target.value);
              setValidationError(null);
            }}
            required
            disabled={isLoading}
            minLength={8}
          />
          <button
            type="button"
            onClick={() => setShowNewPassword(!showNewPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            disabled={isLoading}
            tabIndex={-1}
          >
            {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
        <p className="mt-1 text-xs text-secondary">
          {t('passwordRequirements')}
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-primary mb-1">
          {t('confirmPassword')}
        </label>
        <div className="relative">
          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            type={showConfirmPassword ? 'text' : 'password'}
            placeholder={t('confirmPasswordPlaceholder')}
            className="pl-10 pr-10"
            value={confirmPassword}
            onChange={(e) => {
              setConfirmPassword(e.target.value);
              setValidationError(null);
            }}
            required
            disabled={isLoading}
            minLength={8}
          />
          <button
            type="button"
            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            disabled={isLoading}
            tabIndex={-1}
          >
            {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
      </div>

      <Button type="submit" className="w-full" disabled={isLoading}>
        {isLoading ? (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            {t('resetting')}
          </>
        ) : (
          t('reset')
        )}
      </Button>

      <Link
        href="/login"
        className="flex items-center justify-center gap-2 text-sm text-brand hover:underline"
      >
        {t('backToLogin')}
      </Link>
    </form>
  );
}
