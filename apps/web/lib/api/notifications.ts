import { api } from './client';

export interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  data?: Record<string, unknown>;
  isRead: boolean;
  readAt?: string;
  createdAt: string;
}

export interface ListNotificationsResponse {
  notifications: Notification[];
  unreadCount: number;
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export const notificationsApi = {
  list: (params?: { page?: number; limit?: number; unreadOnly?: boolean }) => {
    const query = new URLSearchParams();
    if (params?.page) query.set('page', params.page.toString());
    if (params?.limit) query.set('limit', params.limit.toString());
    if (params?.unreadOnly) query.set('unreadOnly', 'true');
    return api.get<ListNotificationsResponse>(`/api/notifications?${query.toString()}`);
  },

  markAsRead: (notificationId: string) =>
    api.post<{ success: boolean }>(`/api/notifications/${notificationId}/read`),

  markAllAsRead: () =>
    api.post<{ count: number }>('/api/notifications/read-all'),

  delete: (notificationId: string) =>
    api.delete<{ message: string }>(`/api/notifications/${notificationId}`),
};
