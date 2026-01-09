import { prisma } from '../utils/prisma';
import {
  AlertSeverity,
  NotificationChannel,
  DeliveryStatus,
  Prisma,
} from '@prisma/client';
import { log } from '../utils/logger';
import { emailService } from './email-service';
import { smsService } from './sms-service';
import { wsService, WS_EVENTS } from './websocket-service';

interface AlertNotificationData {
  alertId: string;
  patientId: string;
  patientName: string;
  organizationId: string;
  severity: AlertSeverity;
  message: string;
  vitalType?: string;
  values?: Record<string, number>;
}

interface NotificationResult {
  channel: NotificationChannel;
  success: boolean;
  error?: string;
  messageId?: string;
}

class AlertNotificationService {
  /**
   * Send all notifications for an alert
   */
  async sendAlertNotifications(
    data: AlertNotificationData,
    recipientUserIds: string[]
  ): Promise<NotificationResult[]> {
    const results: NotificationResult[] = [];

    for (const userId of recipientUserIds) {
      // Get user preferences
      const prefs = await this.getUserNotificationPreferences(userId);
      if (!prefs) continue;

      // Check if should notify based on severity and preferences
      if (!this.shouldNotify(prefs, data.severity)) continue;

      // Send via enabled channels
      if (prefs.inAppEnabled) {
        const result = await this.sendInAppAlert(data, userId);
        results.push(result);
      }

      if (prefs.alertEmailEnabled) {
        const result = await this.sendEmailAlert(data, userId);
        results.push(result);
      }

      if (prefs.alertSmsEnabled && prefs.smsEnabled) {
        const result = await this.sendSmsAlert(data, userId);
        results.push(result);
      }
    }

    return results;
  }

  /**
   * Get user notification preferences
   */
  private async getUserNotificationPreferences(userId: string): Promise<{
    emailEnabled: boolean;
    smsEnabled: boolean;
    inAppEnabled: boolean;
    alertEmailEnabled: boolean;
    alertSmsEnabled: boolean;
    smsForCriticalOnly: boolean;
    quietHoursEnabled: boolean;
    quietHoursStart: string | null;
    quietHoursEnd: string | null;
  } | null> {
    const prefs = await prisma.notificationPreference.findUnique({
      where: { userId },
    });

    if (!prefs) {
      // Return defaults if no preferences set
      return {
        emailEnabled: true,
        smsEnabled: false,
        inAppEnabled: true,
        alertEmailEnabled: true,
        alertSmsEnabled: false,
        smsForCriticalOnly: true,
        quietHoursEnabled: false,
        quietHoursStart: null,
        quietHoursEnd: null,
      };
    }

    return {
      emailEnabled: prefs.emailEnabled,
      smsEnabled: prefs.smsEnabled,
      inAppEnabled: prefs.inAppEnabled,
      alertEmailEnabled: prefs.alertEmailEnabled,
      alertSmsEnabled: prefs.alertSmsEnabled,
      smsForCriticalOnly: prefs.smsForCriticalOnly,
      quietHoursEnabled: prefs.quietHoursEnabled,
      quietHoursStart: prefs.quietHoursStart,
      quietHoursEnd: prefs.quietHoursEnd,
    };
  }

  /**
   * Check if user should receive notification
   */
  private shouldNotify(
    prefs: {
      quietHoursEnabled: boolean;
      quietHoursStart: string | null;
      quietHoursEnd: string | null;
    },
    severity: AlertSeverity
  ): boolean {
    // Critical alerts always go through
    if (severity === 'CRITICAL') return true;

    // Check quiet hours for non-critical
    if (this.isWithinQuietHours(prefs)) {
      return false;
    }

    return true;
  }

  /**
   * Check if current time is within quiet hours
   */
  private isWithinQuietHours(prefs: {
    quietHoursEnabled: boolean;
    quietHoursStart: string | null;
    quietHoursEnd: string | null;
  }): boolean {
    if (!prefs.quietHoursEnabled || !prefs.quietHoursStart || !prefs.quietHoursEnd) {
      return false;
    }

    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();

    const [startHour, startMin] = prefs.quietHoursStart.split(':').map(Number);
    const [endHour, endMin] = prefs.quietHoursEnd.split(':').map(Number);

    const startMinutes = startHour * 60 + startMin;
    const endMinutes = endHour * 60 + endMin;

    // Handle overnight quiet hours
    if (startMinutes > endMinutes) {
      return currentMinutes >= startMinutes || currentMinutes < endMinutes;
    }

    return currentMinutes >= startMinutes && currentMinutes < endMinutes;
  }

  /**
   * Send in-app notification via WebSocket
   */
  async sendInAppAlert(
    data: AlertNotificationData,
    userId: string
  ): Promise<NotificationResult> {
    try {
      // Create notification in database
      const notification = await prisma.notification.create({
        data: {
          userId,
          organizationId: data.organizationId,
          type: data.severity === 'CRITICAL' ? 'ALERT_CRITICAL' : 'ALERT_SIGNIFICANT',
          title: `${data.severity} Alert: ${data.patientName}`,
          message: data.message,
          data: {
            alertId: data.alertId,
            patientId: data.patientId,
            vitalType: data.vitalType,
            values: data.values,
          } as Prisma.InputJsonValue,
        },
      });

      // Emit WebSocket event
      wsService.emitToUser(userId, WS_EVENTS.NOTIFICATION, {
        id: notification.id,
        type: notification.type,
        title: notification.title,
        message: notification.message,
        data: notification.data,
        createdAt: notification.createdAt,
      });

      // Log delivery
      await this.logDeliveryAttempt(
        data.alertId,
        data.organizationId,
        userId,
        NotificationChannel.IN_APP,
        DeliveryStatus.DELIVERED,
        notification.id
      );

      return {
        channel: NotificationChannel.IN_APP,
        success: true,
        messageId: notification.id,
      };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      log.error('[ALERT_NOTIFICATION] Failed to send in-app notification', { error: errorMsg, userId });

      await this.logDeliveryAttempt(
        data.alertId,
        data.organizationId,
        userId,
        NotificationChannel.IN_APP,
        DeliveryStatus.FAILED,
        undefined,
        errorMsg
      );

      return {
        channel: NotificationChannel.IN_APP,
        success: false,
        error: errorMsg,
      };
    }
  }

  /**
   * Send email alert
   */
  async sendEmailAlert(
    data: AlertNotificationData,
    userId: string
  ): Promise<NotificationResult> {
    try {
      // Get user email
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { email: true, firstName: true },
      });

      if (!user?.email) {
        return {
          channel: NotificationChannel.EMAIL,
          success: false,
          error: 'User email not found',
        };
      }

      // Generate alert email HTML
      const html = this.generateAlertEmailHtml(data, user.firstName);

      // Send email
      const success = await emailService.sendEmail({
        to: user.email,
        subject: this.getEmailSubject(data),
        html,
      }, data.organizationId);

      const status = success ? DeliveryStatus.SENT : DeliveryStatus.FAILED;

      await this.logDeliveryAttempt(
        data.alertId,
        data.organizationId,
        userId,
        NotificationChannel.EMAIL,
        status
      );

      return {
        channel: NotificationChannel.EMAIL,
        success,
        error: success ? undefined : 'Email delivery failed',
      };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      log.error('[ALERT_NOTIFICATION] Failed to send email alert', { error: errorMsg, userId });

      await this.logDeliveryAttempt(
        data.alertId,
        data.organizationId,
        userId,
        NotificationChannel.EMAIL,
        DeliveryStatus.FAILED,
        undefined,
        errorMsg
      );

      return {
        channel: NotificationChannel.EMAIL,
        success: false,
        error: errorMsg,
      };
    }
  }

  /**
   * Send SMS alert
   */
  async sendSmsAlert(
    data: AlertNotificationData,
    userId: string
  ): Promise<NotificationResult> {
    try {
      const result = await smsService.sendAlertSms(userId, {
        alertId: data.alertId,
        patientName: data.patientName,
        severity: data.severity,
        message: data.message,
        organizationId: data.organizationId,
      });

      const status = result.success ? DeliveryStatus.SENT : DeliveryStatus.FAILED;

      await this.logDeliveryAttempt(
        data.alertId,
        data.organizationId,
        userId,
        NotificationChannel.SMS,
        status,
        result.messageId,
        result.error
      );

      return {
        channel: NotificationChannel.SMS,
        success: result.success,
        messageId: result.messageId,
        error: result.error,
      };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      log.error('[ALERT_NOTIFICATION] Failed to send SMS alert', { error: errorMsg, userId });

      await this.logDeliveryAttempt(
        data.alertId,
        data.organizationId,
        userId,
        NotificationChannel.SMS,
        DeliveryStatus.FAILED,
        undefined,
        errorMsg
      );

      return {
        channel: NotificationChannel.SMS,
        success: false,
        error: errorMsg,
      };
    }
  }

  /**
   * Log delivery attempt to database
   */
  private async logDeliveryAttempt(
    alertId: string,
    organizationId: string,
    userId: string,
    channel: NotificationChannel,
    status: DeliveryStatus,
    externalId?: string,
    failureReason?: string
  ): Promise<void> {
    try {
      await prisma.alertNotificationLog.create({
        data: {
          alertId,
          organizationId,
          userId,
          channel,
          status,
          externalId,
          failureReason,
          sentAt: status === DeliveryStatus.SENT ? new Date() : null,
          deliveredAt: status === DeliveryStatus.DELIVERED ? new Date() : null,
          failedAt: status === DeliveryStatus.FAILED ? new Date() : null,
        },
      });
    } catch (error) {
      log.error('[ALERT_NOTIFICATION] Failed to log delivery attempt', { error, alertId, userId });
    }
  }

  /**
   * Generate email subject based on severity
   */
  private getEmailSubject(data: AlertNotificationData): string {
    const prefix = data.severity === 'CRITICAL' ? '🚨 CRITICAL: ' : '⚠️ Alert: ';
    return `${prefix}${data.patientName} - NirmiteeRPM`;
  }

  /**
   * Generate alert email HTML
   */
  private generateAlertEmailHtml(
    data: AlertNotificationData,
    recipientName: string
  ): string {
    const severityColor = {
      CRITICAL: '#dc2626',
      SIGNIFICANT: '#f59e0b',
      INFORMATIONAL: '#3b82f6',
    }[data.severity];

    const severityBg = {
      CRITICAL: '#fef2f2',
      SIGNIFICANT: '#fffbeb',
      INFORMATIONAL: '#eff6ff',
    }[data.severity];

    const dashboardUrl = process.env.FRONTEND_URL || 'http://localhost:3000';

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Alert Notification</title>
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #745EE1 0%, #5a47b8 100%); padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
            <h1 style="color: #fff; margin: 0; font-size: 24px;">NirmiteeRPM</h1>
          </div>
          <div style="background: #fff; padding: 30px; border: 1px solid #e5e5e5; border-top: none; border-radius: 0 0 12px 12px;">
            <div style="background: ${severityBg}; border-left: 4px solid ${severityColor}; padding: 15px; margin-bottom: 20px; border-radius: 0 8px 8px 0;">
              <h2 style="color: ${severityColor}; margin: 0 0 8px 0; font-size: 18px;">
                ${data.severity} Alert
              </h2>
              <p style="margin: 0; font-weight: 600;">Patient: ${data.patientName}</p>
            </div>

            <p>Hi ${recipientName},</p>
            <p>${data.message}</p>

            ${data.vitalType && data.values ? `
              <div style="background: #f8f8f8; padding: 15px; border-radius: 8px; margin: 20px 0;">
                <p style="margin: 0 0 8px 0; font-weight: 600;">Vital Reading:</p>
                <p style="margin: 0; font-family: monospace; font-size: 16px;">
                  ${data.vitalType}: ${JSON.stringify(data.values)}
                </p>
              </div>
            ` : ''}

            <div style="text-align: center; margin: 30px 0;">
              <a href="${dashboardUrl}/patients/${data.patientId}" style="display: inline-block; background: #745EE1; color: #fff; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 600;">View Patient Details</a>
            </div>

            <hr style="border: none; border-top: 1px solid #e5e5e5; margin: 30px 0;">
            <p style="color: #999; font-size: 12px; text-align: center;">
              This is an automated alert from NirmiteeRPM.<br>
              To manage your notification preferences, visit your <a href="${dashboardUrl}/settings/notifications" style="color: #745EE1;">settings</a>.
            </p>
          </div>
        </body>
      </html>
    `;
  }

  /**
   * Queue alert for digest email
   */
  async queueForDigest(
    data: AlertNotificationData,
    userId: string
  ): Promise<void> {
    // This would be handled by a job queue in production
    // For now, just log it
    log.info('[ALERT_NOTIFICATION] Queued for digest', {
      alertId: data.alertId,
      userId,
    });
  }

  /**
   * Get notification delivery status for an alert
   */
  async getDeliveryStatus(alertId: string): Promise<{
    channel: NotificationChannel;
    userId: string;
    status: DeliveryStatus;
    sentAt: Date | null;
    deliveredAt: Date | null;
    failedAt: Date | null;
    failureReason: string | null;
  }[]> {
    const logs = await prisma.alertNotificationLog.findMany({
      where: { alertId },
      orderBy: { createdAt: 'desc' },
    });

    return logs.map(l => ({
      channel: l.channel,
      userId: l.userId,
      status: l.status,
      sentAt: l.sentAt,
      deliveredAt: l.deliveredAt,
      failedAt: l.failedAt,
      failureReason: l.failureReason,
    }));
  }
}

export const alertNotificationService = new AlertNotificationService();
