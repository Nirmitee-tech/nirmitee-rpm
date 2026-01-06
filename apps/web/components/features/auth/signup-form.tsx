'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Button, Input } from '@nirmitee/ui';
import { Eye, EyeOff, Mail, Lock, User, Building2 } from 'lucide-react';
import { useAuth } from '@/lib/auth/auth-context';
import { useTranslations } from '@/lib/i18n/i18n-context';

export function SignupForm() {
  const { signup } = useAuth();
  const { t } = useTranslations('auth.signup');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
    organizationName: '',
    acceptTerms: false,
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);

    if (formData.password !== formData.confirmPassword) {
      setError(t('passwordsDoNotMatch'));
      return;
    }

    if (formData.password.length < 8) {
      setError(t('passwordRequirements'));
      return;
    }

    setIsLoading(true);

    try {
      // signup function handles API call, token storage, and redirect
      await signup({
        email: formData.email,
        password: formData.password,
        firstName: formData.firstName,
        lastName: formData.lastName,
        organizationName: formData.organizationName || `${formData.firstName}'s Organization`,
      });
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Signup failed. Please try again.';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-primary mb-1">
            {t('firstName')}
          </label>
          <div className="relative">
            <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              type="text"
              name="firstName"
              placeholder={t('firstNamePlaceholder')}
              className="pl-10"
              value={formData.firstName}
              onChange={handleChange}
              required
            />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-primary mb-1">
            {t('lastName')}
          </label>
          <div className="relative">
            <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              type="text"
              name="lastName"
              placeholder={t('lastNamePlaceholder')}
              className="pl-10"
              value={formData.lastName}
              onChange={handleChange}
              required
            />
          </div>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-primary mb-1">
          {t('email')}
        </label>
        <div className="relative">
          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            type="email"
            name="email"
            placeholder={t('emailPlaceholder')}
            className="pl-10"
            value={formData.email}
            onChange={handleChange}
            required
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-primary mb-1">
          {t('organizationName')}
        </label>
        <div className="relative">
          <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            type="text"
            name="organizationName"
            placeholder="My Company (optional)"
            className="pl-10"
            value={formData.organizationName}
            onChange={handleChange}
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
            name="password"
            placeholder={t('passwordPlaceholder')}
            className="pl-10 pr-10"
            value={formData.password}
            onChange={handleChange}
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
        <p className="text-xs text-gray-500 mt-1">{t('passwordRequirements')}</p>
      </div>

      <div>
        <label className="block text-sm font-medium text-primary mb-1">
          {t('confirmPassword')}
        </label>
        <div className="relative">
          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            type={showConfirmPassword ? 'text' : 'password'}
            name="confirmPassword"
            placeholder={t('confirmPasswordPlaceholder')}
            className="pl-10 pr-10"
            value={formData.confirmPassword}
            onChange={handleChange}
            required
          />
          <button
            type="button"
            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
      </div>

      <label className="flex items-start gap-2 text-sm cursor-pointer">
        <input
          type="checkbox"
          name="acceptTerms"
          checked={formData.acceptTerms}
          onChange={handleChange}
          className="mt-0.5 h-4 w-4 rounded border-gray-300 text-brand focus:ring-brand"
          required
        />
        <span className="text-secondary">
          {t('termsAgree')}{' '}
          <Link href="/terms" className="text-brand hover:underline">
            {t('termsOfService')}
          </Link>{' '}
          &{' '}
          <Link href="/privacy" className="text-brand hover:underline">
            {t('privacyPolicy')}
          </Link>
        </span>
      </label>

      <Button type="submit" className="w-full" disabled={isLoading}>
        {isLoading ? t('signingUp') : t('signUp')}
      </Button>

      <p className="text-center text-sm text-secondary">
        {t('hasAccount')}{' '}
        <Link href="/login" className="text-brand hover:underline">
          {t('signIn')}
        </Link>
      </p>
    </form>
  );
}
