'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button, Input } from '@nirmitee/ui';
import { Eye, EyeOff, Mail, Lock, Loader2 } from 'lucide-react';
import { useAuth } from '@/lib/auth/auth-context';
import { oauthApi, OAuthProvider, MfaMethod } from '@/lib/api/auth';
import { useTranslations } from '@/lib/i18n/i18n-context';
import { MfaVerificationModal } from './mfa-verification-modal';

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login, completeMfaLogin } = useAuth();
  const { t } = useTranslations('auth.login');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [oauthProviders, setOAuthProviders] = useState<OAuthProvider[]>([]);
  const [oauthLoading, setOAuthLoading] = useState<string | null>(null);
  const [mfaRequired, setMfaRequired] = useState(false);
  const [mfaUserId, setMfaUserId] = useState('');
  const [mfaMethod, setMfaMethod] = useState<MfaMethod>('TOTP');

  // Check for error in URL params (from OAuth redirect)
  useEffect(() => {
    const errorParam = searchParams.get('error');
    if (errorParam) {
      setError(decodeURIComponent(errorParam));
    }

    // Load OAuth providers
    loadOAuthProviders();
  }, [searchParams]);

  const loadOAuthProviders = async () => {
    try {
      const { providers } = await oauthApi.getProviders();
      setOAuthProviders(providers);
    } catch (err) {
      console.error('Failed to load OAuth providers:', err);
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const result = await login({ email, password });

      // Check if MFA is required
      if (result && result.mfaRequired) {
        setMfaUserId(result.userId);
        setMfaMethod(result.mfaMethod);
        setMfaRequired(true);
        setIsLoading(false);
        return;
      }

      router.push('/dashboard');
    } catch (err: unknown) {
      const error = err as { message?: string };
      setError(error.message || 'Invalid email or password');
    } finally {
      setIsLoading(false);
    }
  };

  const handleMfaSuccess = (response: any) => {
    completeMfaLogin(response);
  };

  const handleMfaCancel = () => {
    setMfaRequired(false);
    setMfaUserId('');
    setMfaMethod('TOTP');
  };

  const handleOAuthLogin = async (provider: OAuthProvider) => {
    setOAuthLoading(provider.id);
    setError('');

    try {
      const { authorizationUrl } = await oauthApi.initiateOAuth(
        provider.id,
        `${window.location.origin}/dashboard`
      );
      window.location.href = authorizationUrl;
    } catch (err: unknown) {
      const error = err as { message?: string };
      setError(error.message || 'Failed to initiate OAuth');
      setOAuthLoading(null);
    }
  };

  return (
    <div className="space-y-6">
      {error && (
        <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm">
          {error}
        </div>
      )}

      {/* OAuth Providers */}
      {oauthProviders.length > 0 && (
        <>
          <div className="space-y-3">
            {oauthProviders.map((provider) => (
              <Button
                key={provider.id}
                type="button"
                variant="outline"
                className="w-full"
                onClick={() => handleOAuthLogin(provider)}
                disabled={oauthLoading !== null}
              >
                {oauthLoading === provider.id ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : provider.type === 'GOOGLE' ? (
                  <svg className="h-4 w-4 mr-2" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                ) : (
                  <svg className="h-4 w-4 mr-2" viewBox="0 0 24 24">
                    <path fill="#00A4EF" d="M11.4 24H0V12.6h11.4V24z"/>
                    <path fill="#FFB900" d="M24 24H12.6V12.6H24V24z"/>
                    <path fill="#F25022" d="M11.4 11.4H0V0h11.4v11.4z"/>
                    <path fill="#7FBA00" d="M24 11.4H12.6V0H24v11.4z"/>
                  </svg>
                )}
                Continue with {provider.name}
              </Button>
            ))}
          </div>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-[#D7D7D7] dark:border-[#212121]" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-white dark:bg-black px-2 text-secondary">
                {t('continueWith')}
              </span>
            </div>
          </div>
        </>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
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
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-primary mb-1">
            {t('password')}
          </label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              type={showPassword ? 'text' : 'password'}
              placeholder={t('passwordPlaceholder')}
              className="pl-10 pr-10"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-gray-300 text-brand focus:ring-brand"
            />
            <span className="text-secondary">{t('rememberMe')}</span>
          </label>
          <Link
            href="/forgot-password"
            className="text-sm text-brand hover:underline"
          >
            {t('forgotPassword')}
          </Link>
        </div>

        <Button type="submit" className="w-full" disabled={isLoading}>
          {isLoading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              {t('signingIn')}
            </>
          ) : (
            t('signIn')
          )}
        </Button>

        <p className="text-center text-sm text-secondary">
          {t('noAccount')}{' '}
          <Link href="/signup" className="text-brand hover:underline">
            {t('signUp')}
          </Link>
        </p>
      </form>

      {/* MFA Verification Modal */}
      <MfaVerificationModal
        open={mfaRequired}
        userId={mfaUserId}
        mfaMethod={mfaMethod}
        onSuccess={handleMfaSuccess}
        onCancel={handleMfaCancel}
      />
    </div>
  );
}
