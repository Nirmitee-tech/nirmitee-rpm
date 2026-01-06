import { prisma } from '../utils/prisma';
import { wsService, WS_EVENTS } from './websocket-service';
import { NotificationType, Prisma } from '@prisma/client';

interface CreateNotificationData {
  userId: string;
  organizationId?: string;
  type: NotificationType;
  title: string;
  message: string;
  data?: Record<string, unknown>;
}

class NotificationService {
  /**
   * Create and send a notification to a user
   */
  async create(data: CreateNotificationData) {
    const notification = await prisma.notification.create({
      data: {
        userId: data.userId,
        organizationId: data.organizationId,
        type: data.type,
        title: data.title,
        message: data.message,
        data: data.data as Prisma.InputJsonValue,
      },
    });

    // Send real-time notification via WebSocket
    wsService.emitToUser(data.userId, WS_EVENTS.NOTIFICATION, {
      id: notification.id,
      type: notification.type,
      title: notification.title,
      message: notification.message,
      data: notification.data,
      createdAt: notification.createdAt,
    });

    return notification;
  }

  /**
   * Create notifications for multiple users
   */
  async createBulk(userIds: string[], data: Omit<CreateNotificationData, 'userId'>) {
    const notifications = await prisma.notification.createMany({
      data: userIds.map((userId) => ({
        userId,
        organizationId: data.organizationId,
        type: data.type,
        title: data.title,
        message: data.message,
        data: data.data as Prisma.InputJsonValue,
      })),
    });

    // Send real-time notifications
    userIds.forEach((userId) => {
      wsService.emitToUser(userId, WS_EVENTS.NOTIFICATION, {
        type: data.type,
        title: data.title,
        message: data.message,
        data: data.data,
        createdAt: new Date(),
      });
    });

    return notifications;
  }

  /**
   * Get notifications for a user
   */
  async getUserNotifications(
    userId: string,
    options?: {
      page?: number;
      limit?: number;
      unreadOnly?: boolean;
    }
  ) {
    const page = options?.page || 1;
    const limit = options?.limit || 20;
    const skip = (page - 1) * limit;

    const where: any = { userId };
    if (options?.unreadOnly) {
      where.isRead = false;
    }

    const [notifications, total, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.notification.count({ where }),
      prisma.notification.count({ where: { userId, isRead: false } }),
    ]);

    return {
      notifications,
      unreadCount,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Mark notification as read
   */
  async markAsRead(notificationId: string, userId: string) {
    const notification = await prisma.notification.updateMany({
      where: {
        id: notificationId,
        userId,
        isRead: false,
      },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    });

    return notification.count > 0;
  }

  /**
   * Mark all notifications as read for a user
   */
  async markAllAsRead(userId: string) {
    const result = await prisma.notification.updateMany({
      where: {
        userId,
        isRead: false,
      },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    });

    return result.count;
  }

  /**
   * Delete a notification
   */
  async delete(notificationId: string, userId: string) {
    return prisma.notification.deleteMany({
      where: {
        id: notificationId,
        userId,
      },
    });
  }

  /**
   * Delete old notifications (cleanup job)
   */
  async cleanupOldNotifications(daysOld = 30) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    const result = await prisma.notification.deleteMany({
      where: {
        createdAt: { lt: cutoffDate },
        isRead: true,
      },
    });

    return result.count;
  }

  // Convenience methods for common notifications
  async notifyTeamInvite(userId: string, teamName: string, inviterName: string, orgId?: string) {
    return this.create({
      userId,
      organizationId: orgId,
      type: 'TEAM_INVITE',
      title: 'Team Invitation',
      message: `${inviterName} invited you to join ${teamName}`,
    });
  }

  async notifyRoleChange(userId: string, newRole: string, changerName: string, orgId?: string) {
    return this.create({
      userId,
      organizationId: orgId,
      type: 'ROLE_CHANGE',
      title: 'Role Updated',
      message: `${changerName} changed your role to ${newRole}`,
    });
  }

  async notifyUserAdded(userId: string, orgName: string, addedByName: string, orgId?: string) {
    return this.create({
      userId,
      organizationId: orgId,
      type: 'USER_ADDED',
      title: 'Welcome!',
      message: `${addedByName} added you to ${orgName}`,
    });
  }
}

export const notificationService = new NotificationService();
