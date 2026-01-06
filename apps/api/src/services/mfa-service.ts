import { authenticator } from 'otplib';
import * as QRCode from 'qrcode';
import * as crypto from 'crypto';
import { prisma } from '../utils/prisma';
import { emailService } from './email-service';

// Configure TOTP settings
authenticator.options = {
  digits: 6,
  step: 30, // 30 second window
  window: 1, // Allow 1 step before/after for clock drift
};

// Constants
const APP_NAME = 'NirmiteeRPM';
const BACKUP_CODE_COUNT = 10;
const BACKUP_CODE_LENGTH = 8;
const EMAIL_OTP_LENGTH = 6;
const EMAIL_OTP_EXPIRY_MINUTES = 10;

export type MfaMethodType = 'TOTP' | 'EMAIL';

export interface MfaSetupResponse {
  secret: string;
  qrCodeUrl: string;
  otpauthUrl: string;
}

export interface MfaStatusResponse {
  enabled: boolean;
  method: MfaMethodType | null;
  enabledAt: Date | null;
  hasBackupCodes: boolean;
  backupCodesCount: number;
}

export const mfaService = {
  /**
   * Generate a new MFA secret and QR code for setup
   */
  async generateSetup(userId: string): Promise<MfaSetupResponse> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true, mfaEnabled: true },
    });

    if (!user) {
      throw new Error('User not found');
    }

    if (user.mfaEnabled) {
      throw new Error('MFA is already enabled');
    }

    // Generate a new secret
    const secret = authenticator.generateSecret();

    // Create otpauth URL
    const otpauthUrl = authenticator.keyuri(user.email, APP_NAME, secret);

    // Generate QR code as data URL
    const qrCodeUrl = await QRCode.toDataURL(otpauthUrl);

    // Store the secret temporarily (will be confirmed during verification)
    await prisma.user.update({
      where: { id: userId },
      data: { mfaSecret: secret },
    });

    return {
      secret,
      qrCodeUrl,
      otpauthUrl,
    };
  },

  /**
   * Verify a TOTP code and enable MFA if valid
   */
  async verifyAndEnable(userId: string, code: string): Promise<{ backupCodes: string[] }> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { mfaSecret: true, mfaEnabled: true },
    });

    if (!user) {
      throw new Error('User not found');
    }

    if (user.mfaEnabled) {
      throw new Error('MFA is already enabled');
    }

    if (!user.mfaSecret) {
      throw new Error('MFA setup not initiated. Please start setup first.');
    }

    // Verify the code
    const isValid = authenticator.verify({ token: code, secret: user.mfaSecret });

    if (!isValid) {
      throw new Error('Invalid verification code');
    }

    // Generate backup codes
    const backupCodes = this.generateBackupCodes();
    const hashedBackupCodes = backupCodes.map(code => this.hashBackupCode(code));

    // Enable MFA with TOTP method
    await prisma.user.update({
      where: { id: userId },
      data: {
        mfaEnabled: true,
        mfaMethod: 'TOTP',
        mfaEnabledAt: new Date(),
        mfaBackupCodes: hashedBackupCodes,
      },
    });

    return { backupCodes };
  },

  /**
   * Verify a TOTP code during login
   */
  async verifyCode(userId: string, code: string): Promise<boolean> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { mfaSecret: true, mfaEnabled: true, mfaBackupCodes: true },
    });

    if (!user) {
      throw new Error('User not found');
    }

    if (!user.mfaEnabled || !user.mfaSecret) {
      throw new Error('MFA is not enabled for this user');
    }

    // First, try to verify as TOTP code
    const isValidTotp = authenticator.verify({ token: code, secret: user.mfaSecret });

    if (isValidTotp) {
      return true;
    }

    // If not a valid TOTP, check if it's a backup code
    const normalizedCode = code.replace(/[-\s]/g, '').toUpperCase();
    const hashedInput = this.hashBackupCode(normalizedCode);

    const backupCodeIndex = user.mfaBackupCodes.findIndex(
      hashedCode => hashedCode === hashedInput
    );

    if (backupCodeIndex !== -1) {
      // Remove the used backup code
      const updatedBackupCodes = [...user.mfaBackupCodes];
      updatedBackupCodes.splice(backupCodeIndex, 1);

      await prisma.user.update({
        where: { id: userId },
        data: { mfaBackupCodes: updatedBackupCodes },
      });

      return true;
    }

    return false;
  },

  /**
   * Disable MFA for a user
   */
  async disable(userId: string, password: string): Promise<void> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { passwordHash: true, mfaEnabled: true },
    });

    if (!user) {
      throw new Error('User not found');
    }

    if (!user.mfaEnabled) {
      throw new Error('MFA is not enabled');
    }

    // Verify password before disabling MFA
    const bcrypt = await import('bcryptjs');
    if (!user.passwordHash) {
      throw new Error('Cannot disable MFA for OAuth-only accounts');
    }

    const isValidPassword = await bcrypt.compare(password, user.passwordHash);
    if (!isValidPassword) {
      throw new Error('Invalid password');
    }

    // Disable MFA
    await prisma.user.update({
      where: { id: userId },
      data: {
        mfaEnabled: false,
        mfaSecret: null,
        mfaBackupCodes: [],
        mfaEnabledAt: null,
      },
    });
  },

  /**
   * Regenerate backup codes
   */
  async regenerateBackupCodes(userId: string, code: string): Promise<{ backupCodes: string[] }> {
    // First verify the current TOTP code
    const isValid = await this.verifyCode(userId, code);

    if (!isValid) {
      throw new Error('Invalid verification code');
    }

    // Generate new backup codes
    const backupCodes = this.generateBackupCodes();
    const hashedBackupCodes = backupCodes.map(code => this.hashBackupCode(code));

    await prisma.user.update({
      where: { id: userId },
      data: { mfaBackupCodes: hashedBackupCodes },
    });

    return { backupCodes };
  },

  /**
   * Get MFA status for a user
   */
  async getStatus(userId: string): Promise<MfaStatusResponse> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { mfaEnabled: true, mfaMethod: true, mfaEnabledAt: true, mfaBackupCodes: true },
    });

    if (!user) {
      throw new Error('User not found');
    }

    return {
      enabled: user.mfaEnabled,
      method: user.mfaMethod as MfaMethodType | null,
      enabledAt: user.mfaEnabledAt,
      hasBackupCodes: user.mfaBackupCodes.length > 0,
      backupCodesCount: user.mfaBackupCodes.length,
    };
  },

  /**
   * Check if MFA is required for login
   */
  async isMfaRequired(userId: string): Promise<boolean> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { mfaEnabled: true },
    });

    return user?.mfaEnabled ?? false;
  },

  /**
   * Get MFA method for a user
   */
  async getMfaMethod(userId: string): Promise<MfaMethodType | null> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { mfaMethod: true },
    });

    return (user?.mfaMethod as MfaMethodType) ?? null;
  },

  // ============================================
  // EMAIL OTP METHODS
  // ============================================

  /**
   * Enable email OTP MFA
   */
  async enableEmailOtp(userId: string): Promise<{ backupCodes: string[] }> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true, mfaEnabled: true },
    });

    if (!user) {
      throw new Error('User not found');
    }

    if (user.mfaEnabled) {
      throw new Error('MFA is already enabled');
    }

    // Generate backup codes
    const backupCodes = this.generateBackupCodes();
    const hashedBackupCodes = backupCodes.map(code => this.hashBackupCode(code));

    // Enable MFA with EMAIL method
    await prisma.user.update({
      where: { id: userId },
      data: {
        mfaEnabled: true,
        mfaMethod: 'EMAIL',
        mfaEnabledAt: new Date(),
        mfaBackupCodes: hashedBackupCodes,
      },
    });

    return { backupCodes };
  },

  /**
   * Send email OTP code
   */
  async sendEmailOtp(userId: string): Promise<void> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true, firstName: true, mfaEnabled: true, mfaMethod: true },
    });

    if (!user) {
      throw new Error('User not found');
    }

    // Generate 6-digit OTP
    const otp = this.generateEmailOtp();
    const hashedOtp = crypto.createHash('sha256').update(otp).digest('hex');
    const expiresAt = new Date(Date.now() + EMAIL_OTP_EXPIRY_MINUTES * 60 * 1000);

    // Store the OTP
    await prisma.user.update({
      where: { id: userId },
      data: {
        emailOtpCode: hashedOtp,
        emailOtpExpiresAt: expiresAt,
      },
    });

    // Send the OTP via email
    await emailService.sendEmailOtp(user.email, {
      firstName: user.firstName,
      otp,
      expiresIn: `${EMAIL_OTP_EXPIRY_MINUTES} minutes`,
    });
  },

  /**
   * Verify email OTP code
   */
  async verifyEmailOtp(userId: string, code: string): Promise<boolean> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        emailOtpCode: true,
        emailOtpExpiresAt: true,
        mfaBackupCodes: true,
      },
    });

    if (!user) {
      throw new Error('User not found');
    }

    // Check if OTP exists and hasn't expired
    if (user.emailOtpCode && user.emailOtpExpiresAt) {
      const hashedInput = crypto.createHash('sha256').update(code).digest('hex');

      if (user.emailOtpExpiresAt > new Date() && user.emailOtpCode === hashedInput) {
        // Clear the OTP after successful verification
        await prisma.user.update({
          where: { id: userId },
          data: {
            emailOtpCode: null,
            emailOtpExpiresAt: null,
          },
        });
        return true;
      }
    }

    // If not a valid email OTP, check if it's a backup code
    const normalizedCode = code.replace(/[-\s]/g, '').toUpperCase();
    const hashedBackupCode = this.hashBackupCode(normalizedCode);

    const backupCodeIndex = user.mfaBackupCodes.findIndex(
      hashedCode => hashedCode === hashedBackupCode
    );

    if (backupCodeIndex !== -1) {
      // Remove the used backup code
      const updatedBackupCodes = [...user.mfaBackupCodes];
      updatedBackupCodes.splice(backupCodeIndex, 1);

      await prisma.user.update({
        where: { id: userId },
        data: {
          mfaBackupCodes: updatedBackupCodes,
          emailOtpCode: null,
          emailOtpExpiresAt: null,
        },
      });

      return true;
    }

    return false;
  },

  /**
   * Generate a random 6-digit email OTP
   */
  generateEmailOtp(): string {
    return crypto.randomInt(100000, 999999).toString();
  },

  // Helper functions
  generateBackupCodes(): string[] {
    const codes: string[] = [];
    for (let i = 0; i < BACKUP_CODE_COUNT; i++) {
      const code = crypto
        .randomBytes(BACKUP_CODE_LENGTH / 2)
        .toString('hex')
        .toUpperCase();
      // Format as XXXX-XXXX for readability
      codes.push(`${code.slice(0, 4)}-${code.slice(4)}`);
    }
    return codes;
  },

  hashBackupCode(code: string): string {
    const normalized = code.replace(/[-\s]/g, '').toUpperCase();
    return crypto.createHash('sha256').update(normalized).digest('hex');
  },
};
