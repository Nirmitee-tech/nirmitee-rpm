import nodemailer, { Transporter } from 'nodemailer';
import { prisma } from '../utils/prisma';

// Email configuration interface
interface EmailConfig {
  host: string;
  port: number;
  secure: boolean;
  auth?: {
    user: string;
    pass: string;
  };
  from: string;
}

// Email sending options
interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

// Email template data interfaces
interface PasswordResetEmailData {
  firstName: string;
  resetUrl: string;
  expiresIn: string;
}

interface InvitationEmailData {
  inviterName: string;
  organizationName: string;
  roleName: string;
  inviteUrl: string;
  expiresIn: string;
}

interface WelcomeEmailData {
  firstName: string;
  organizationName: string;
  loginUrl: string;
}

interface EmailOtpData {
  firstName: string;
  otp: string;
  expiresIn: string;
}

class EmailService {
  private transporter: Transporter | null = null;
  private defaultConfig: EmailConfig;

  constructor() {
    // Default to MailHog for development
    this.defaultConfig = {
      host: process.env.SMTP_HOST || 'localhost',
      port: parseInt(process.env.SMTP_PORT || '1025', 10),
      secure: process.env.SMTP_SECURE === 'true',
      from: process.env.SMTP_FROM || 'NirmiteeRPM <noreply@nirmiteerpm.local>',
    };

    // Add auth if credentials provided
    if (process.env.SMTP_USER && process.env.SMTP_PASS) {
      this.defaultConfig.auth = {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      };
    }

    this.initializeTransporter();
  }

  /**
   * Initialize the email transporter
   */
  private initializeTransporter(): void {
    try {
      const transportConfig: nodemailer.TransportOptions = {
        host: this.defaultConfig.host,
        port: this.defaultConfig.port,
        secure: this.defaultConfig.secure,
      } as nodemailer.TransportOptions;

      if (this.defaultConfig.auth) {
        (transportConfig as Record<string, unknown>).auth = this.defaultConfig.auth;
      }

      this.transporter = nodemailer.createTransport(transportConfig);

      // Verify connection on startup (non-blocking)
      this.verifyConnection();
    } catch (error) {
      console.error('[EMAIL] Failed to initialize transporter:', error);
    }
  }

  /**
   * Verify SMTP connection
   */
  private async verifyConnection(): Promise<boolean> {
    if (!this.transporter) return false;

    try {
      await this.transporter.verify();
      console.log('[EMAIL] SMTP connection verified successfully');
      return true;
    } catch (error) {
      console.warn('[EMAIL] SMTP connection failed - emails will not be sent:', error);
      return false;
    }
  }

  /**
   * Get organization-specific email config if available
   */
  async getOrgEmailConfig(organizationId?: string): Promise<EmailConfig | null> {
    if (!organizationId) return null;

    try {
      const org = await prisma.organization.findUnique({
        where: { id: organizationId },
        select: { settings: true },
      });

      const settings = org?.settings as Record<string, unknown> | null;
      if (settings?.emailConfig) {
        const emailConfig = settings.emailConfig as Record<string, unknown>;
        return {
          host: emailConfig.host as string,
          port: emailConfig.port as number,
          secure: emailConfig.secure as boolean,
          auth: emailConfig.user ? {
            user: emailConfig.user as string,
            pass: emailConfig.pass as string,
          } : undefined,
          from: emailConfig.from as string || this.defaultConfig.from,
        };
      }
    } catch (error) {
      console.error('[EMAIL] Failed to get org email config:', error);
    }

    return null;
  }

  /**
   * Create transporter for specific config
   */
  private createTransporter(config: EmailConfig): Transporter {
    const transportConfig: nodemailer.TransportOptions = {
      host: config.host,
      port: config.port,
      secure: config.secure,
    } as nodemailer.TransportOptions;

    if (config.auth) {
      (transportConfig as Record<string, unknown>).auth = config.auth;
    }

    return nodemailer.createTransport(transportConfig);
  }

  /**
   * Send email with fallback handling
   */
  async sendEmail(options: SendEmailOptions, organizationId?: string): Promise<boolean> {
    // Try org-specific config first
    const orgConfig = await this.getOrgEmailConfig(organizationId);
    const transporter = orgConfig
      ? this.createTransporter(orgConfig)
      : this.transporter;

    if (!transporter) {
      console.error('[EMAIL] No transporter available');
      return false;
    }

    const fromAddress = orgConfig?.from || this.defaultConfig.from;

    try {
      const result = await transporter.sendMail({
        from: fromAddress,
        to: options.to,
        subject: options.subject,
        html: options.html,
        text: options.text || this.stripHtml(options.html),
      });

      console.log('[EMAIL] Sent successfully:', {
        messageId: result.messageId,
        to: options.to,
        subject: options.subject,
      });

      return true;
    } catch (error) {
      console.error('[EMAIL] Failed to send:', {
        to: options.to,
        subject: options.subject,
        error,
      });
      return false;
    }
  }

  /**
   * Strip HTML tags for plain text version
   */
  private stripHtml(html: string): string {
    return html
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/p>/gi, '\n\n')
      .replace(/<[^>]+>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .trim();
  }

  // ============================================
  // EMAIL TEMPLATES
  // ============================================

  /**
   * Send password reset email
   */
  async sendPasswordResetEmail(
    to: string,
    data: PasswordResetEmailData,
    organizationId?: string
  ): Promise<boolean> {
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Reset Your Password</title>
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #745EE1 0%, #5a47b8 100%); padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
            <h1 style="color: #fff; margin: 0; font-size: 24px;">NirmiteeRPM</h1>
          </div>
          <div style="background: #fff; padding: 30px; border: 1px solid #e5e5e5; border-top: none; border-radius: 0 0 12px 12px;">
            <h2 style="color: #171717; margin-top: 0;">Reset Your Password</h2>
            <p>Hi ${data.firstName},</p>
            <p>We received a request to reset your password. Click the button below to create a new password:</p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${data.resetUrl}" style="display: inline-block; background: #745EE1; color: #fff; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 600;">Reset Password</a>
            </div>
            <p style="color: #666; font-size: 14px;">This link will expire in ${data.expiresIn}.</p>
            <p style="color: #666; font-size: 14px;">If you didn't request this, you can safely ignore this email. Your password won't change until you create a new one.</p>
            <hr style="border: none; border-top: 1px solid #e5e5e5; margin: 30px 0;">
            <p style="color: #999; font-size: 12px; text-align: center;">
              If the button doesn't work, copy and paste this URL into your browser:<br>
              <a href="${data.resetUrl}" style="color: #745EE1; word-break: break-all;">${data.resetUrl}</a>
            </p>
          </div>
        </body>
      </html>
    `;

    return this.sendEmail({
      to,
      subject: 'Reset Your Password - NirmiteeRPM',
      html,
    }, organizationId);
  }

  /**
   * Send invitation email
   */
  async sendInvitationEmail(
    to: string,
    data: InvitationEmailData,
    organizationId?: string
  ): Promise<boolean> {
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>You're Invited!</title>
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #745EE1 0%, #5a47b8 100%); padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
            <h1 style="color: #fff; margin: 0; font-size: 24px;">NirmiteeRPM</h1>
          </div>
          <div style="background: #fff; padding: 30px; border: 1px solid #e5e5e5; border-top: none; border-radius: 0 0 12px 12px;">
            <h2 style="color: #171717; margin-top: 0;">You're Invited! 🎉</h2>
            <p><strong>${data.inviterName}</strong> has invited you to join <strong>${data.organizationName}</strong> on NirmiteeRPM.</p>
            <div style="background: #f8f8f8; padding: 15px; border-radius: 8px; margin: 20px 0;">
              <p style="margin: 0;"><strong>Role:</strong> ${data.roleName}</p>
            </div>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${data.inviteUrl}" style="display: inline-block; background: #745EE1; color: #fff; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 600;">Accept Invitation</a>
            </div>
            <p style="color: #666; font-size: 14px;">This invitation will expire in ${data.expiresIn}.</p>
            <hr style="border: none; border-top: 1px solid #e5e5e5; margin: 30px 0;">
            <p style="color: #999; font-size: 12px; text-align: center;">
              If the button doesn't work, copy and paste this URL into your browser:<br>
              <a href="${data.inviteUrl}" style="color: #745EE1; word-break: break-all;">${data.inviteUrl}</a>
            </p>
          </div>
        </body>
      </html>
    `;

    return this.sendEmail({
      to,
      subject: `You're invited to join ${data.organizationName} - NirmiteeRPM`,
      html,
    }, organizationId);
  }

  /**
   * Send welcome email after signup
   */
  async sendWelcomeEmail(
    to: string,
    data: WelcomeEmailData,
    organizationId?: string
  ): Promise<boolean> {
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Welcome to NirmiteeRPM</title>
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #745EE1 0%, #5a47b8 100%); padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
            <h1 style="color: #fff; margin: 0; font-size: 24px;">NirmiteeRPM</h1>
          </div>
          <div style="background: #fff; padding: 30px; border: 1px solid #e5e5e5; border-top: none; border-radius: 0 0 12px 12px;">
            <h2 style="color: #171717; margin-top: 0;">Welcome, ${data.firstName}! 🎉</h2>
            <p>Thank you for signing up for NirmiteeRPM. Your organization <strong>${data.organizationName}</strong> is now ready to use.</p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${data.loginUrl}" style="display: inline-block; background: #745EE1; color: #fff; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 600;">Go to Dashboard</a>
            </div>
            <h3 style="color: #171717;">Getting Started</h3>
            <ul style="color: #666;">
              <li>Invite team members to your organization</li>
              <li>Configure roles and permissions</li>
              <li>Set up your organization settings</li>
            </ul>
            <p>If you have any questions, please don't hesitate to reach out to our support team.</p>
            <hr style="border: none; border-top: 1px solid #e5e5e5; margin: 30px 0;">
            <p style="color: #999; font-size: 12px; text-align: center;">
              © ${new Date().getFullYear()} NirmiteeRPM. All rights reserved.
            </p>
          </div>
        </body>
      </html>
    `;

    return this.sendEmail({
      to,
      subject: 'Welcome to NirmiteeRPM!',
      html,
    }, organizationId);
  }

  /**
   * Send email OTP for MFA
   */
  async sendEmailOtp(
    to: string,
    data: EmailOtpData,
    organizationId?: string
  ): Promise<boolean> {
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Your Verification Code</title>
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #745EE1 0%, #5a47b8 100%); padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
            <h1 style="color: #fff; margin: 0; font-size: 24px;">NirmiteeRPM</h1>
          </div>
          <div style="background: #fff; padding: 30px; border: 1px solid #e5e5e5; border-top: none; border-radius: 0 0 12px 12px;">
            <h2 style="color: #171717; margin-top: 0;">Your Verification Code</h2>
            <p>Hi ${data.firstName},</p>
            <p>Use the following code to complete your sign-in:</p>
            <div style="text-align: center; margin: 30px 0;">
              <div style="display: inline-block; background: #f4f4f5; padding: 20px 40px; border-radius: 12px; border: 2px dashed #745EE1;">
                <span style="font-size: 36px; font-weight: bold; letter-spacing: 8px; color: #171717; font-family: monospace;">${data.otp}</span>
              </div>
            </div>
            <p style="color: #666; font-size: 14px; text-align: center;">This code will expire in ${data.expiresIn}.</p>
            <p style="color: #666; font-size: 14px;">If you didn't try to sign in, you can safely ignore this email. Someone may have entered your email address by mistake.</p>
            <hr style="border: none; border-top: 1px solid #e5e5e5; margin: 30px 0;">
            <p style="color: #999; font-size: 12px; text-align: center;">
              For security reasons, never share this code with anyone.<br>
              NirmiteeRPM will never ask you for this code.
            </p>
          </div>
        </body>
      </html>
    `;

    return this.sendEmail({
      to,
      subject: `${data.otp} is your verification code - NirmiteeRPM`,
      html,
    }, organizationId);
  }

  /**
   * Test email configuration
   */
  async testEmailConfig(config: EmailConfig, testEmail: string): Promise<{ success: boolean; error?: string }> {
    try {
      const testTransporter = this.createTransporter(config);
      await testTransporter.verify();

      await testTransporter.sendMail({
        from: config.from,
        to: testEmail,
        subject: 'Test Email - NirmiteeRPM Email Configuration',
        html: `
          <div style="font-family: sans-serif; padding: 20px;">
            <h2>Email Configuration Test</h2>
            <p>If you received this email, your email configuration is working correctly!</p>
            <p style="color: #666;">Sent at: ${new Date().toISOString()}</p>
          </div>
        `,
      });

      return { success: true };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return { success: false, error: errorMessage };
    }
  }
}

// Export singleton instance
export const emailService = new EmailService();
