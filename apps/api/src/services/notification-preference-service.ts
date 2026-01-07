import { prisma } from '../utils/prisma';
import { emailService } from './email-service';
import logger from '../utils/logger';

interface NotificationPreferenceUpdate {
  emailEnabled?: boolean;
  pushEnabled?: boolean;
  inAppEnabled?: boolean;
  securityAlerts?: boolean;
  teamUpdates?: boolean;
  systemUpdates?: boolean;
  marketingEmails?: boolean;
  weeklyDigest?: boolean;
  quietHoursEnabled?: boolean;
  quietHoursStart?: string | null;
  quietHoursEnd?: string | null;
}

class NotificationPreferenceService {
  /**
   * Get user's notification preferences
   * Creates default preferences if none exist
   */
  async getPreferences(userId: string) {
    try {
      let preferences = await prisma.notificationPreference.findUnique({
        where: { userId },
      });

      // Create default preferences if none exist
      if (!preferences) {
        preferences = await this.createDefaultPreferences(userId);
      }

      return preferences;
    } catch (error) {
      logger.error('Error fetching notification preferences', { userId, error });
      throw error;
    }
  }

  /**
   * Update user's notification preferences
   */
  async updatePreferences(userId: string, data: NotificationPreferenceUpdate) {
    try {
      // Validate quiet hours format if provided
      if (data.quietHoursStart && !this.isValidTimeFormat(data.quietHoursStart)) {
        throw new Error('Invalid quietHoursStart format. Expected HH:mm (e.g., 22:00)');
      }

      if (data.quietHoursEnd && !this.isValidTimeFormat(data.quietHoursEnd)) {
        throw new Error('Invalid quietHoursEnd format. Expected HH:mm (e.g., 08:00)');
      }

      // If quiet hours are being disabled, clear the time values
      const updateData: NotificationPreferenceUpdate = { ...data };

      if (data.quietHoursEnabled === false) {
        updateData.quietHoursStart = null;
        updateData.quietHoursEnd = null;
      }

      const preferences = await prisma.notificationPreference.upsert({
        where: { userId },
        update: {
          ...updateData,
          updatedAt: new Date(),
        },
        create: {
          userId,
          ...this.getDefaultPreferences(),
          ...updateData,
        },
      });

      logger.info('Notification preferences updated', { userId });

      return preferences;
    } catch (error) {
      logger.error('Error updating notification preferences', { userId, error });
      throw error;
    }
  }

  /**
   * Create default preferences for a user
   */
  async createDefaultPreferences(userId: string) {
    try {
      const preferences = await prisma.notificationPreference.create({
        data: {
          userId,
          ...this.getDefaultPreferences(),
        },
      });

      logger.info('Default notification preferences created', { userId });

      return preferences;
    } catch (error) {
      logger.error('Error creating default notification preferences', { userId, error });
      throw error;
    }
  }

  /**
   * Get default preferences object
   */
  getDefaultPreferences() {
    return {
      emailEnabled: true,
      pushEnabled: true,
      inAppEnabled: true,
      securityAlerts: true,
      teamUpdates: true,
      systemUpdates: true,
      marketingEmails: false,
      weeklyDigest: true,
      quietHoursEnabled: false,
      quietHoursStart: null,
      quietHoursEnd: null,
    };
  }

  /**
   * Check if notification should be sent based on preferences
   */
  async shouldSendNotification(
    userId: string,
    channel: 'email' | 'push' | 'inApp',
    type: 'security' | 'team' | 'system' | 'marketing'
  ): Promise<boolean> {
    try {
      const preferences = await this.getPreferences(userId);

      // Check channel enabled
      const channelEnabled = {
        email: preferences.emailEnabled,
        push: preferences.pushEnabled,
        inApp: preferences.inAppEnabled,
      }[channel];

      if (!channelEnabled) {
        return false;
      }

      // Check type enabled
      const typeEnabled = {
        security: preferences.securityAlerts,
        team: preferences.teamUpdates,
        system: preferences.systemUpdates,
        marketing: preferences.marketingEmails,
      }[type];

      if (!typeEnabled) {
        return false;
      }

      // Check quiet hours (only for non-security notifications)
      if (type !== 'security' && preferences.quietHoursEnabled) {
        const isQuietHours = this.isWithinQuietHours(
          preferences.quietHoursStart,
          preferences.quietHoursEnd
        );

        if (isQuietHours) {
          return false;
        }
      }

      return true;
    } catch (error) {
      logger.error('Error checking notification preferences', { userId, channel, type, error });
      // Default to true if error checking preferences
      return true;
    }
  }

  /**
   * Send test notification to user
   */
  async sendTestNotification(userId: string, channel: 'email' | 'push') {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { email: true, firstName: true, lastName: true },
      });

      if (!user) {
        throw new Error('User not found');
      }

      if (channel === 'email') {
        await emailService.sendEmail({
          to: user.email,
          subject: 'Test Notification from NirmiteeRPM',
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2>Test Notification</h2>
              <p>Hi ${user.firstName},</p>
              <p>This is a test notification to confirm your email notification settings are working correctly.</p>
              <p>If you received this email, your email notifications are configured properly!</p>
              <br>
              <p>Best regards,<br>NirmiteeRPM Team</p>
            </div>
          `,
        });

        logger.info('Test email notification sent', { userId, email: user.email });
      } else if (channel === 'push') {
        // TODO: Implement push notification when push service is ready
        logger.info('Test push notification requested (not implemented yet)', { userId });
        throw new Error('Push notifications not yet implemented');
      }

      return { success: true, message: `Test ${channel} notification sent` };
    } catch (error) {
      logger.error('Error sending test notification', { userId, channel, error });
      throw error;
    }
  }

  /**
   * Delete user's preferences (for user deletion)
   */
  async deletePreferences(userId: string) {
    try {
      await prisma.notificationPreference.deleteMany({
        where: { userId },
      });

      logger.info('Notification preferences deleted', { userId });
    } catch (error) {
      logger.error('Error deleting notification preferences', { userId, error });
      throw error;
    }
  }

  // ============================================
  // HELPER METHODS
  // ============================================

  /**
   * Validate time format HH:mm
   */
  private isValidTimeFormat(time: string): boolean {
    const timeRegex = /^([0-1][0-9]|2[0-3]):[0-5][0-9]$/;
    return timeRegex.test(time);
  }

  /**
   * Check if current time is within quiet hours
   */
  private isWithinQuietHours(start: string | null, end: string | null): boolean {
    if (!start || !end) {
      return false;
    }

    const now = new Date();
    const currentTime = now.getHours() * 60 + now.getMinutes(); // Minutes since midnight

    const [startHour, startMin] = start.split(':').map(Number);
    const [endHour, endMin] = end.split(':').map(Number);

    const startTime = startHour * 60 + startMin;
    const endTime = endHour * 60 + endMin;

    // Handle quiet hours that span midnight (e.g., 22:00 - 08:00)
    if (startTime > endTime) {
      return currentTime >= startTime || currentTime <= endTime;
    }

    // Normal case (e.g., 08:00 - 17:00)
    return currentTime >= startTime && currentTime <= endTime;
  }
}

export const notificationPreferenceService = new NotificationPreferenceService();
