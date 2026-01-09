import { log } from '../utils/logger';
import { prisma } from '../utils/prisma';

// Twilio client types (optional dependency)
let twilioClient: TwilioClient | null = null;

interface TwilioClient {
  messages: {
    create: (options: {
      body: string;
      from: string;
      to: string;
    }) => Promise<{ sid: string; status: string }>;
  };
}

interface SmsResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

interface SendSmsOptions {
  priority?: 'high' | 'normal';
  metadata?: Record<string, unknown>;
}

// Rate limiting cache (in-memory for simplicity, use Redis in production)
const rateLimitCache = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_PER_HOUR = parseInt(process.env.SMS_RATE_LIMIT_PER_HOUR || '5', 10);

class SmsService {
  private fromNumber: string;
  private enabled: boolean;

  constructor() {
    this.fromNumber = process.env.TWILIO_FROM_NUMBER || '';
    this.enabled = process.env.ALERT_SMS_ENABLED === 'true';

    this.initializeTwilio();
  }

  /**
   * Initialize Twilio client
   */
  private async initializeTwilio(): Promise<void> {
    if (!this.enabled) {
      log.info('[SMS] SMS service disabled');
      return;
    }

    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;

    if (!accountSid || !authToken) {
      log.warn('[SMS] Twilio credentials not configured - SMS will be simulated');
      return;
    }

    try {
      // Dynamic import of Twilio to make it optional
      const twilio = await import('twilio');
      twilioClient = twilio.default(accountSid, authToken) as unknown as TwilioClient;
      log.info('[SMS] Twilio client initialized');
    } catch (error) {
      log.warn('[SMS] Twilio package not installed - SMS will be simulated', { error });
    }
  }

  /**
   * Check if SMS is enabled and configured
   */
  isEnabled(): boolean {
    return this.enabled && (twilioClient !== null || process.env.NODE_ENV === 'development');
  }

  /**
   * Check rate limit for a user
   */
  checkRateLimit(userId: string): boolean {
    const now = Date.now();
    const userLimit = rateLimitCache.get(userId);

    if (!userLimit || userLimit.resetAt < now) {
      // Reset or create new limit window
      rateLimitCache.set(userId, {
        count: 0,
        resetAt: now + 60 * 60 * 1000, // 1 hour
      });
      return true;
    }

    return userLimit.count < RATE_LIMIT_PER_HOUR;
  }

  /**
   * Increment rate limit counter
   */
  private incrementRateLimit(userId: string): void {
    const now = Date.now();
    const userLimit = rateLimitCache.get(userId);

    if (!userLimit || userLimit.resetAt < now) {
      rateLimitCache.set(userId, {
        count: 1,
        resetAt: now + 60 * 60 * 1000,
      });
    } else {
      userLimit.count++;
    }
  }

  /**
   * Send SMS with rate limiting
   */
  async sendSms(
    to: string,
    body: string,
    options: SendSmsOptions = {}
  ): Promise<SmsResult> {
    if (!this.isEnabled()) {
      log.debug('[SMS] SMS not enabled, skipping', { to });
      return { success: false, error: 'SMS service not enabled' };
    }

    // Validate phone number format
    if (!this.isValidPhoneNumber(to)) {
      log.warn('[SMS] Invalid phone number format', { to });
      return { success: false, error: 'Invalid phone number format' };
    }

    // Use Twilio client if available, otherwise simulate
    if (twilioClient) {
      try {
        const message = await twilioClient.messages.create({
          body,
          from: this.fromNumber,
          to,
        });

        log.info('[SMS] Message sent successfully', {
          sid: message.sid,
          to,
          status: message.status,
        });

        return { success: true, messageId: message.sid };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        log.error('[SMS] Failed to send message', { error: errorMessage, to });
        return { success: false, error: errorMessage };
      }
    } else {
      // Development mode: simulate SMS
      log.info('[SMS] Simulated SMS sent', { to, body: body.substring(0, 50) + '...' });
      return { success: true, messageId: `sim_${Date.now()}` };
    }
  }

  /**
   * Send alert SMS to a user
   */
  async sendAlertSms(
    userId: string,
    alertData: {
      alertId: string;
      patientName: string;
      severity: 'CRITICAL' | 'SIGNIFICANT' | 'INFORMATIONAL';
      message: string;
      organizationId: string;
    }
  ): Promise<SmsResult> {
    // Get user's phone number and preferences
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        phoneNumber: true,
        phoneVerified: true,
        firstName: true,
        notificationPreference: {
          select: {
            smsEnabled: true,
            smsForCriticalOnly: true,
            alertSmsEnabled: true,
            quietHoursEnabled: true,
            quietHoursStart: true,
            quietHoursEnd: true,
          },
        },
      },
    });

    if (!user) {
      return { success: false, error: 'User not found' };
    }

    if (!user.phoneNumber) {
      return { success: false, error: 'User has no phone number' };
    }

    if (!user.phoneVerified) {
      return { success: false, error: 'Phone number not verified' };
    }

    const prefs = user.notificationPreference;

    // Check preferences
    if (!prefs?.smsEnabled || !prefs?.alertSmsEnabled) {
      return { success: false, error: 'SMS notifications disabled by user' };
    }

    // Check if only critical alerts enabled
    if (prefs.smsForCriticalOnly && alertData.severity !== 'CRITICAL') {
      return { success: false, error: 'User only receives SMS for critical alerts' };
    }

    // Check quiet hours
    if (this.isWithinQuietHours(prefs.quietHoursEnabled, prefs.quietHoursStart, prefs.quietHoursEnd)) {
      // Allow critical alerts during quiet hours
      if (alertData.severity !== 'CRITICAL') {
        return { success: false, error: 'Within quiet hours' };
      }
    }

    // Check rate limit
    if (!this.checkRateLimit(userId)) {
      log.warn('[SMS] Rate limit exceeded for user', { userId });
      return { success: false, error: 'SMS rate limit exceeded' };
    }

    // Format alert message
    const smsBody = this.formatAlertMessage(alertData, user.firstName);

    // Send SMS
    const result = await this.sendSms(user.phoneNumber, smsBody, {
      priority: alertData.severity === 'CRITICAL' ? 'high' : 'normal',
      metadata: { alertId: alertData.alertId, userId },
    });

    // Increment rate limit on success
    if (result.success) {
      this.incrementRateLimit(userId);
    }

    return result;
  }

  /**
   * Format alert message for SMS
   */
  private formatAlertMessage(
    alertData: {
      patientName: string;
      severity: string;
      message: string;
    },
    recipientName: string
  ): string {
    const severityEmoji = {
      CRITICAL: '🚨',
      SIGNIFICANT: '⚠️',
      INFORMATIONAL: 'ℹ️',
    }[alertData.severity] || '';

    return `${severityEmoji} NirmiteeRPM Alert\n` +
      `Patient: ${alertData.patientName}\n` +
      `${alertData.message}\n` +
      `Login to view details.`;
  }

  /**
   * Check if current time is within quiet hours
   */
  private isWithinQuietHours(
    enabled: boolean | undefined | null,
    start: string | null | undefined,
    end: string | null | undefined
  ): boolean {
    if (!enabled || !start || !end) return false;

    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();

    const [startHour, startMin] = start.split(':').map(Number);
    const [endHour, endMin] = end.split(':').map(Number);

    const startMinutes = startHour * 60 + startMin;
    const endMinutes = endHour * 60 + endMin;

    // Handle overnight quiet hours (e.g., 22:00 - 08:00)
    if (startMinutes > endMinutes) {
      return currentMinutes >= startMinutes || currentMinutes < endMinutes;
    }

    return currentMinutes >= startMinutes && currentMinutes < endMinutes;
  }

  /**
   * Validate phone number format (E.164)
   */
  private isValidPhoneNumber(phone: string): boolean {
    // E.164 format: +[country code][number], 11-15 digits total
    const e164Regex = /^\+[1-9]\d{10,14}$/;
    return e164Regex.test(phone);
  }

  /**
   * Send verification code to a phone number
   */
  async sendVerificationCode(
    phoneNumber: string,
    code: string
  ): Promise<SmsResult> {
    const body = `Your NirmiteeRPM verification code is: ${code}\n\nThis code expires in 10 minutes.`;
    return this.sendSms(phoneNumber, body);
  }

  /**
   * Send test SMS
   */
  async sendTestSms(phoneNumber: string): Promise<SmsResult> {
    const body = 'This is a test message from NirmiteeRPM. Your SMS notifications are configured correctly!';
    return this.sendSms(phoneNumber, body);
  }

  /**
   * Get remaining SMS count for user this hour
   */
  getRemainingLimit(userId: string): number {
    const now = Date.now();
    const userLimit = rateLimitCache.get(userId);

    if (!userLimit || userLimit.resetAt < now) {
      return RATE_LIMIT_PER_HOUR;
    }

    return Math.max(0, RATE_LIMIT_PER_HOUR - userLimit.count);
  }
}

export const smsService = new SmsService();
