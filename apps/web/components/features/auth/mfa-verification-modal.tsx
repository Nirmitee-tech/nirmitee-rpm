'use client';

import { useState, useEffect, useRef } from 'react';
import { Shield, Mail, Smartphone, Loader2, RefreshCw } from 'lucide-react';
import { Button, Input } from '@nirmitee/ui';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { mfaApi, MfaMethod } from '@/lib/api/auth';
import { toast } from 'sonner';

interface MfaVerificationModalProps {
  open: boolean;
  userId: string;
  mfaMethod: MfaMethod;
  onSuccess: (response: any) => void;
  onCancel: () => void;
}

export function MfaVerificationModal({
  open,
  userId,
  mfaMethod,
  onSuccess,
  onCancel,
}: MfaVerificationModalProps) {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState('');
  const [resendCooldown, setResendCooldown] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setCode('');
      setError('');
      setResendCooldown(0);
      // Focus input after modal opens
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open]);

  // Countdown timer for resend
  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  const handleVerify = async () => {
    if (code.length < 6) return;

    setLoading(true);
    setError('');

    try {
      const response = await mfaApi.verifyLogin(userId, code);
      onSuccess(response);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Invalid verification code');
      setCode('');
    } finally {
      setLoading(false);
    }
  };

  const handleResendCode = async () => {
    if (resendCooldown > 0) return;

    setResending(true);
    try {
      await mfaApi.resendLoginOtp(userId);
      toast.success('Verification code sent to your email');
      setResendCooldown(60); // 60 second cooldown
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to resend code');
    } finally {
      setResending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && code.length >= 6 && !loading) {
      handleVerify();
    }
  };

  const isEmail = mfaMethod === 'EMAIL';

  return (
    <Dialog open={open} onOpenChange={(open) => !open && onCancel()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="mx-auto p-3 bg-primary/10 rounded-full w-fit mb-4">
            {isEmail ? (
              <Mail className="h-6 w-6 text-primary" />
            ) : (
              <Smartphone className="h-6 w-6 text-primary" />
            )}
          </div>
          <DialogTitle className="text-center">Two-Factor Authentication</DialogTitle>
          <DialogDescription className="text-center">
            {isEmail
              ? 'Enter the 6-digit code sent to your email'
              : 'Enter the 6-digit code from your authenticator app'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {error && (
            <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm text-center">
              {error}
            </div>
          )}

          <div className="space-y-2">
            <Input
              ref={inputRef}
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={6}
              placeholder="000000"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
              onKeyDown={handleKeyDown}
              className="text-center text-2xl tracking-[0.5em] font-mono"
              autoComplete="one-time-code"
            />
            <p className="text-xs text-muted-foreground text-center">
              You can also use a backup code if you don&apos;t have access to your{' '}
              {isEmail ? 'email' : 'authenticator'}
            </p>
          </div>

          {/* Resend button for email OTP */}
          {isEmail && (
            <div className="text-center">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleResendCode}
                disabled={resending || resendCooldown > 0}
                className="text-sm"
              >
                {resending ? (
                  <>
                    <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                    Sending...
                  </>
                ) : resendCooldown > 0 ? (
                  <>
                    <RefreshCw className="mr-2 h-3 w-3" />
                    Resend in {resendCooldown}s
                  </>
                ) : (
                  <>
                    <RefreshCw className="mr-2 h-3 w-3" />
                    Resend code
                  </>
                )}
              </Button>
            </div>
          )}

          <div className="flex gap-3">
            <Button
              variant="outline"
              className="flex-1"
              onClick={onCancel}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              className="flex-1"
              onClick={handleVerify}
              disabled={code.length < 6 || loading}
            >
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Verify
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
