import { prisma } from '../utils/prisma';
import { ActorType, Prisma } from '@prisma/client';
import { log } from '../utils/logger';

export interface LogActivityData {
  organizationId: string;
  actorId: string;
  actorType?: ActorType;
  action: string;
  entityType: string;
  entityId: string;
  entityName?: string;
  metadata?: Record<string, unknown>;
}

export interface ActivityOptions {
  page?: number;
  limit?: number;
  entityTypes?: string[];
  actions?: string[];
  actorId?: string;
  startDate?: Date;
  endDate?: Date;
}

export interface TimelineOptions extends ActivityOptions {
  includeSystem?: boolean;
}

class ActivityService {
  /**
   * Log an activity event
   */
  async log(data: LogActivityData): Promise<void> {
    try {
      await prisma.activity.create({
        data: {
          organizationId: data.organizationId,
          actorId: data.actorId,
          actorType: data.actorType || ActorType.USER,
          action: data.action,
          entityType: data.entityType,
          entityId: data.entityId,
          entityName: data.entityName,
          metadata: data.metadata as Prisma.InputJsonValue,
        },
      });
    } catch (error) {
      // Log error but don't throw - activity logging should not break main flow
      log.error('Activity log error:', error);
    }
  }

  /**
   * Get activities for an organization
   */
  async getByOrganization(
    organizationId: string,
    options: ActivityOptions = {}
  ) {
    const page = options.page || 1;
    const limit = options.limit || 50;
    const skip = (page - 1) * limit;

    const where: Prisma.ActivityWhereInput = { organizationId };

    if (options.entityTypes && options.entityTypes.length > 0) {
      where.entityType = { in: options.entityTypes };
    }

    if (options.actions && options.actions.length > 0) {
      where.action = { in: options.actions };
    }

    if (options.actorId) {
      where.actorId = options.actorId;
    }

    if (options.startDate || options.endDate) {
      where.createdAt = {};
      if (options.startDate) where.createdAt.gte = options.startDate;
      if (options.endDate) where.createdAt.lte = options.endDate;
    }

    const [activities, total] = await Promise.all([
      prisma.activity.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.activity.count({ where }),
    ]);

    return {
      activities,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get activities for a specific entity
   */
  async getByEntity(entityType: string, entityId: string, limit = 20) {
    return prisma.activity.findMany({
      where: { entityType, entityId },
      take: limit,
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Get activities performed by a specific user
   */
  async getByUser(userId: string, options: ActivityOptions = {}) {
    const page = options.page || 1;
    const limit = options.limit || 50;
    const skip = (page - 1) * limit;

    const where: Prisma.ActivityWhereInput = { actorId: userId };

    if (options.entityTypes && options.entityTypes.length > 0) {
      where.entityType = { in: options.entityTypes };
    }

    if (options.startDate || options.endDate) {
      where.createdAt = {};
      if (options.startDate) where.createdAt.gte = options.startDate;
      if (options.endDate) where.createdAt.lte = options.endDate;
    }

    const [activities, total] = await Promise.all([
      prisma.activity.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.activity.count({ where }),
    ]);

    return {
      activities,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get timeline for organization (with optional filters)
   */
  async getTimeline(organizationId: string, options: TimelineOptions = {}) {
    const page = options.page || 1;
    const limit = options.limit || 50;
    const skip = (page - 1) * limit;

    const where: Prisma.ActivityWhereInput = { organizationId };

    // Optionally exclude system activities
    if (!options.includeSystem) {
      where.actorType = { not: ActorType.SYSTEM };
    }

    if (options.entityTypes && options.entityTypes.length > 0) {
      where.entityType = { in: options.entityTypes };
    }

    if (options.actions && options.actions.length > 0) {
      where.action = { in: options.actions };
    }

    if (options.startDate || options.endDate) {
      where.createdAt = {};
      if (options.startDate) where.createdAt.gte = options.startDate;
      if (options.endDate) where.createdAt.lte = options.endDate;
    }

    const [activities, total] = await Promise.all([
      prisma.activity.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.activity.count({ where }),
    ]);

    return {
      activities,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Bulk delete old activities (for data retention)
   */
  async deleteOldActivities(organizationId: string, daysToKeep = 90) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

    const result = await prisma.activity.deleteMany({
      where: {
        organizationId,
        createdAt: { lt: cutoffDate },
      },
    });

    return { deleted: result.count };
  }
}

export const activityService = new ActivityService();
