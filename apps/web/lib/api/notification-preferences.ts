import { api } from './client';

export interface NotificationPreferences {
  id: string;
  userId: string;
  emailEnabled: boolean;
  pushEnabled: boolean;
  inAppEnabled: boolean;
  securityAlerts: boolean;
  teamUpdates: boolean;
  systemUpdates: boolean;
  marketingEmails: boolean;
  weeklyDigest: boolean;
  quietHoursEnabled: boolean;
  quietHoursStart: string | null;
  quietHoursEnd: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface UpdateNotificationPreferencesInput {
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

export interface TestNotificationResponse {
  success: boolean;
  message: string;
}

export const notificationPreferencesApi = {
  /**
   * Get user's notification preferences
   */
  get: () => api.get<NotificationPreferences>('/api/v1/notification-preferences'),

  /**
   * Update user's notification preferences
   */
  update: (data: UpdateNotificationPreferencesInput) =>
    api.patch<NotificationPreferences>('/api/v1/notification-preferences', data),

  /**
   * Send a test notification
   */
  sendTest: (channel: 'email' | 'push') =>
    api.post<TestNotificationResponse>('/api/v1/notification-preferences/test', { channel }),
};
