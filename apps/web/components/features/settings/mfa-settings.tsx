'use client';

import { useState, useEffect } from 'react';
import { Shield, Smartphone, Mail, Key, Copy, Check, AlertTriangle, Loader2 } from 'lucide-react';
import { mfaApi, MfaStatusResponse, MfaMethod } from '@/lib/api/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Alert,
  AlertDescription,
} from '@/components/ui/alert';
import { toast } from 'sonner';

export function MfaSettings() {
  const [status, setStatus] = useState<MfaStatusResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [setupTotpOpen, setSetupTotpOpen] = useState(false);
  const [setupEmailOpen, setSetupEmailOpen] = useState(false);
  const [disableOpen, setDisableOpen] = useState(false);
  const [backupCodesOpen, setBackupCodesOpen] = useState(false);
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [regenerateOpen, setRegenerateOpen] = useState(false);

  useEffect(() => {
    fetchStatus();
  }, []);

  const fetchStatus = async () => {
    try {
      const response = await mfaApi.getStatus();
      setStatus(response);
    } catch (error) {
      console.error('Failed to fetch MFA status:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEnableEmail = async () => {
    setSetupEmailOpen(true);
  };

  const handleEmailSetupSuccess = (codes: string[]) => {
    setBackupCodes(codes);
    setSetupEmailOpen(false);
    setBackupCodesOpen(true);
    fetchStatus();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const isTotp = status?.method === 'TOTP';
  const isEmail = status?.method === 'EMAIL';

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-primary/10 rounded-lg">
          <Shield className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h3 className="font-semibold">Two-Factor Authentication (2FA)</h3>
          <p className="text-sm text-muted-foreground">
            Add an extra layer of security to your account
          </p>
        </div>
      </div>

      {/* Authenticator App Option */}
      <div className={`rounded-lg border p-4 ${isTotp ? 'border-primary bg-primary/5' : ''}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Smartphone className={`h-5 w-5 ${isTotp ? 'text-primary' : 'text-muted-foreground'}`} />
            <div>
              <p className="font-medium">Authenticator App</p>
              <p className="text-sm text-muted-foreground">
                {isTotp
                  ? `Enabled on ${new Date(status.enabledAt!).toLocaleDateString()}`
                  : 'Use an authenticator app like Google Authenticator'}
              </p>
            </div>
          </div>
          {isTotp ? (
            <Button variant="danger" onClick={() => setDisableOpen(true)}>
              Disable
            </Button>
          ) : !status?.enabled ? (
            <Button onClick={() => setSetupTotpOpen(true)}>Enable</Button>
          ) : (
            <span className="text-sm text-muted-foreground">Not active</span>
          )}
        </div>
      </div>

      {/* Email OTP Option */}
      <div className={`rounded-lg border p-4 ${isEmail ? 'border-primary bg-primary/5' : ''}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Mail className={`h-5 w-5 ${isEmail ? 'text-primary' : 'text-muted-foreground'}`} />
            <div>
              <p className="font-medium">Email OTP</p>
              <p className="text-sm text-muted-foreground">
                {isEmail
                  ? `Enabled on ${new Date(status.enabledAt!).toLocaleDateString()}`
                  : 'Receive a one-time code via email'}
              </p>
            </div>
          </div>
          {isEmail ? (
            <Button variant="danger" onClick={() => setDisableOpen(true)}>
              Disable
            </Button>
          ) : !status?.enabled ? (
            <Button onClick={handleEnableEmail}>Enable</Button>
          ) : (
            <span className="text-sm text-muted-foreground">Not active</span>
          )}
        </div>
      </div>

      {/* Backup Codes Section */}
      {status?.enabled && (
        <div className="rounded-lg border p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Key className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="font-medium">Backup Codes</p>
                <p className="text-sm text-muted-foreground">
                  {status.hasBackupCodes
                    ? `${status.backupCodesCount} codes remaining`
                    : 'No backup codes available'}
                </p>
              </div>
            </div>
            <Button variant="outline" onClick={() => setRegenerateOpen(true)}>
              Regenerate
            </Button>
          </div>
        </div>
      )}

      {/* TOTP Setup Dialog */}
      <SetupMfaDialog
        open={setupTotpOpen}
        onOpenChange={setSetupTotpOpen}
        onSuccess={(codes) => {
          setBackupCodes(codes);
          setSetupTotpOpen(false);
          setBackupCodesOpen(true);
          fetchStatus();
        }}
      />

      {/* Email OTP Setup Dialog */}
      <EnableEmailOtpDialog
        open={setupEmailOpen}
        onOpenChange={setSetupEmailOpen}
        onSuccess={handleEmailSetupSuccess}
      />

      {/* Disable MFA Dialog */}
      <DisableMfaDialog
        open={disableOpen}
        onOpenChange={setDisableOpen}
        onSuccess={() => {
          fetchStatus();
          setDisableOpen(false);
        }}
      />

      {/* Regenerate Backup Codes Dialog */}
      <RegenerateBackupCodesDialog
        open={regenerateOpen}
        onOpenChange={setRegenerateOpen}
        mfaMethod={status?.method || null}
        onSuccess={(codes) => {
          setBackupCodes(codes);
          setRegenerateOpen(false);
          setBackupCodesOpen(true);
          fetchStatus();
        }}
      />

      {/* Backup Codes Display Dialog */}
      <BackupCodesDialog
        open={backupCodesOpen}
        onOpenChange={setBackupCodesOpen}
        codes={backupCodes}
      />
    </div>
  );
}

// Setup MFA Dialog
function SetupMfaDialog({
  open,
  onOpenChange,
  onSuccess,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: (backupCodes: string[]) => void;
}) {
  const [step, setStep] = useState<'qr' | 'verify'>('qr');
  const [qrCode, setQrCode] = useState('');
  const [secret, setSecret] = useState('');
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [backupCodes, setBackupCodes] = useState<string[]>([]);

  useEffect(() => {
    if (open) {
      setStep('qr');
      setCode('');
      setQrCode('');
      setSecret('');
      generateSetup();
    }
  }, [open]);

  const generateSetup = async () => {
    setLoading(true);
    try {
      const response = await mfaApi.setup();
      setQrCode(response.qrCodeUrl);
      setSecret(response.secret);
    } catch (error) {
      toast.error('Failed to generate MFA setup');
      onOpenChange(false);
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async () => {
    if (code.length < 6) return;

    setLoading(true);
    try {
      const response = await mfaApi.verifySetup(code);
      setBackupCodes(response.backupCodes);
      toast.success('MFA enabled successfully');
      onSuccess(response.backupCodes);
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Invalid verification code');
    } finally {
      setLoading(false);
    }
  };

  const copySecret = () => {
    navigator.clipboard.writeText(secret);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Set Up Two-Factor Authentication</DialogTitle>
          <DialogDescription>
            Scan the QR code with your authenticator app
          </DialogDescription>
        </DialogHeader>

        {loading && !qrCode ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        ) : step === 'qr' ? (
          <div className="space-y-4">
            <div className="flex justify-center">
              {qrCode && (
                <img src={qrCode} alt="QR Code" className="rounded-lg border" />
              )}
            </div>

            <div className="space-y-2">
              <Label className="text-sm text-muted-foreground">
                Or enter this code manually:
              </Label>
              <div className="flex items-center gap-2">
                <code className="flex-1 px-3 py-2 bg-muted rounded-md font-mono text-sm break-all">
                  {secret}
                </code>
                <Button variant="outline" size="icon" onClick={copySecret}>
                  {copied ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>

            <Button className="w-full" onClick={() => setStep('verify')}>
              Continue
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Verification Code</Label>
              <Input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={6}
                placeholder="Enter 6-digit code"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                autoFocus
              />
              <p className="text-sm text-muted-foreground">
                Enter the 6-digit code from your authenticator app
              </p>
            </div>

            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setStep('qr')}>
                Back
              </Button>
              <Button
                className="flex-1"
                onClick={handleVerify}
                disabled={code.length < 6 || loading}
              >
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Verify & Enable
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

// Disable MFA Dialog
function DisableMfaDialog({
  open,
  onOpenChange,
  onSuccess,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}) {
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) setPassword('');
  }, [open]);

  const handleDisable = async () => {
    if (!password) return;

    setLoading(true);
    try {
      await mfaApi.disable(password);
      toast.success('MFA disabled successfully');
      onSuccess();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to disable MFA');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Disable Two-Factor Authentication</DialogTitle>
          <DialogDescription>
            Enter your password to confirm disabling 2FA
          </DialogDescription>
        </DialogHeader>

        <Alert variant="danger">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Disabling 2FA will make your account less secure
          </AlertDescription>
        </Alert>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Password</Label>
            <Input
              type="password"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoFocus
            />
          </div>

          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              className="flex-1"
              onClick={handleDisable}
              disabled={!password || loading}
            >
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Disable 2FA
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Enable Email OTP Dialog
function EnableEmailOtpDialog({
  open,
  onOpenChange,
  onSuccess,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: (backupCodes: string[]) => void;
}) {
  const [loading, setLoading] = useState(false);

  const handleEnable = async () => {
    setLoading(true);
    try {
      const response = await mfaApi.enableEmail();
      toast.success('Email OTP enabled successfully');
      onSuccess(response.backupCodes);
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to enable Email OTP');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="mx-auto p-3 bg-primary/10 rounded-full w-fit mb-4">
            <Mail className="h-6 w-6 text-primary" />
          </div>
          <DialogTitle className="text-center">Enable Email OTP</DialogTitle>
          <DialogDescription className="text-center">
            When you sign in, we&apos;ll send a verification code to your registered email address
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="bg-muted rounded-lg p-4 text-sm">
            <p className="font-medium mb-2">How it works:</p>
            <ul className="list-disc list-inside space-y-1 text-muted-foreground">
              <li>Enter your password when signing in</li>
              <li>We&apos;ll email you a 6-digit code</li>
              <li>Enter the code to complete sign-in</li>
              <li>Codes expire after 10 minutes</li>
            </ul>
          </div>

          <div className="flex gap-3">
            <Button variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button className="flex-1" onClick={handleEnable} disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Enable Email OTP
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Regenerate Backup Codes Dialog
function RegenerateBackupCodesDialog({
  open,
  onOpenChange,
  mfaMethod,
  onSuccess,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mfaMethod: MfaMethod | null;
  onSuccess: (codes: string[]) => void;
}) {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) setCode('');
  }, [open]);

  const handleRegenerate = async () => {
    if (code.length < 6) return;

    setLoading(true);
    try {
      const response = await mfaApi.regenerateBackupCodes(code);
      toast.success('Backup codes regenerated');
      onSuccess(response.backupCodes);
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Invalid verification code');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Regenerate Backup Codes</DialogTitle>
          <DialogDescription>
            Enter a verification code to generate new backup codes
          </DialogDescription>
        </DialogHeader>

        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            This will invalidate all existing backup codes
          </AlertDescription>
        </Alert>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Verification Code</Label>
            <Input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={6}
              placeholder="Enter 6-digit code"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
              autoFocus
            />
          </div>

          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              className="flex-1"
              onClick={handleRegenerate}
              disabled={code.length < 6 || loading}
            >
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Regenerate
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Backup Codes Display Dialog
function BackupCodesDialog({
  open,
  onOpenChange,
  codes,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  codes: string[];
}) {
  const [copied, setCopied] = useState(false);

  const copyAll = () => {
    navigator.clipboard.writeText(codes.join('\n'));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Save Your Backup Codes</DialogTitle>
          <DialogDescription>
            Store these codes in a safe place. Each code can only be used once.
          </DialogDescription>
        </DialogHeader>

        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            You won&apos;t be able to see these codes again after closing this dialog
          </AlertDescription>
        </Alert>

        {codes.length > 0 ? (
          <>
            <div className="grid grid-cols-2 gap-2 p-4 bg-muted rounded-lg font-mono text-sm">
              {codes.map((code, index) => (
                <div key={index} className="text-center py-1">
                  {code}
                </div>
              ))}
            </div>

            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={copyAll}>
                {copied ? (
                  <>
                    <Check className="mr-2 h-4 w-4" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy className="mr-2 h-4 w-4" />
                    Copy All
                  </>
                )}
              </Button>
              <Button onClick={() => onOpenChange(false)}>Done</Button>
            </div>
          </>
        ) : (
          <div className="text-center py-4 text-muted-foreground">
            <p>Backup codes were shown in the previous step.</p>
            <p className="text-sm mt-2">Make sure you saved them securely.</p>
            <Button className="mt-4" onClick={() => onOpenChange(false)}>
              I&apos;ve Saved My Codes
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
