'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Button, Input } from '@nirmitee/ui';
import { Mail, ArrowLeft, CheckCircle } from 'lucide-react';

export function ForgotPasswordForm() {
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [email, setEmail] = useState('');

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);

    // Mock password reset - show success after delay
    setTimeout(() => {
      setIsSubmitted(true);
      setIsLoading(false);
    }, 1000);
  };

  if (isSubmitted) {
    return (
      <div className="text-center">
        <div className="mb-4 flex justify-center">
          <CheckCircle className="h-12 w-12 text-success" />
        </div>
        <h3 className="text-lg font-semibold text-primary mb-2">Check your email</h3>
        <p className="text-secondary text-sm mb-6">
          We&apos;ve sent a password reset link to{' '}
          <span className="font-medium text-primary">{email}</span>
        </p>
        <Link href="/login">
          <Button variant="outline" className="w-full">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Sign In
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-primary mb-1">
          Email
        </label>
        <div className="relative">
          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            type="email"
            placeholder="Enter your email"
            className="pl-10"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        <p className="mt-2 text-sm text-secondary">
          Enter the email address associated with your account and we&apos;ll send you a link to reset your password.
        </p>
      </div>

      <Button type="submit" className="w-full" disabled={isLoading}>
        {isLoading ? 'Sending...' : 'Send Reset Link'}
      </Button>

      <Link
        href="/login"
        className="flex items-center justify-center gap-2 text-sm text-brand hover:underline"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Sign In
      </Link>
    </form>
  );
}
