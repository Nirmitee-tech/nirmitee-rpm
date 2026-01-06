import { prisma } from '../utils/prisma';
import { Request } from 'express';

export type AuditAction =
  // Auth actions
  | 'auth.login'
  | 'auth.logout'
  | 'auth.signup'
  | 'auth.password_reset'
  | 'auth.password_forgot'
  // User actions
  | 'user.created'
  | 'user.updated'
  | 'user.deleted'
  | 'user.role_changed'
  | 'user.invited'
  | 'user.invitation_accepted'
  // Team actions
  | 'team.created'
  | 'team.updated'
  | 'team.deleted'
  | 'team.member_added'
  | 'team.member_removed'
  | 'team.member_role_changed'
  // Role actions
  | 'role.created'
  | 'role.updated'
  | 'role.deleted'
  | 'role.permissions_changed'
  // Organization actions
  | 'organization.updated'
  | 'organization.settings_changed'
  // Settings actions
  | 'settings.updated';

export type AuditEntity =
  | 'user'
  | 'team'
  | 'role'
  | 'organization'
  | 'permission'
  | 'invitation'
  | 'session'
  | 'settings';

interface AuditLogData {
  userId?: string;
  organizationId?: string;
  action: AuditAction;
  entity: AuditEntity;
  entityId?: string;
  oldValues?: Record<string, unknown>;
  newValues?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  req?: Request;
}

class AuditService {
  /**
   * Log an audit event
   */
  async log(data: AuditLogData): Promise<void> {
    try {
      await prisma.auditLog.create({
        data: {
          userId: data.userId,
          organizationId: data.organizationId,
          action: data.action,
          entity: data.entity,
          entityId: data.entityId,
          oldValues: data.oldValues,
          newValues: data.newValues,
          metadata: data.metadata,
          ipAddress: data.req ? this.getIpAddress(data.req) : null,
          userAgent: data.req?.headers['user-agent'] || null,
        },
      });
    } catch (error) {
      // Log error but don't throw - audit logging should not break main flow
      console.error('Audit log error:', error);
    }
  }

  /**
   * Get audit logs for an organization
   */
  async getOrganizationLogs(
    organizationId: string,
    options?: {
      page?: number;
      limit?: number;
      userId?: string;
      action?: string;
      entity?: string;
      startDate?: Date;
      endDate?: Date;
    }
  ) {
    const page = options?.page || 1;
    const limit = options?.limit || 50;
    const skip = (page - 1) * limit;

    const where: any = { organizationId };

    if (options?.userId) where.userId = options.userId;
    if (options?.action) where.action = { contains: options.action };
    if (options?.entity) where.entity = options.entity;
    if (options?.startDate || options?.endDate) {
      where.createdAt = {};
      if (options?.startDate) where.createdAt.gte = options.startDate;
      if (options?.endDate) where.createdAt.lte = options.endDate;
    }

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.auditLog.count({ where }),
    ]);

    return {
      logs,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get audit logs for a specific entity
   */
  async getEntityLogs(entity: AuditEntity, entityId: string, limit = 20) {
    return prisma.auditLog.findMany({
      where: { entity, entityId },
      take: limit,
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Get audit logs for a specific user's actions
   */
  async getUserActivityLogs(userId: string, limit = 50) {
    return prisma.auditLog.findMany({
      where: { userId },
      take: limit,
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Get IP address from request, handling proxies
   */
  private getIpAddress(req: Request): string {
    const forwarded = req.headers['x-forwarded-for'];
    if (typeof forwarded === 'string') {
      return forwarded.split(',')[0].trim();
    }
    return req.socket.remoteAddress || 'unknown';
  }

  /**
   * Helper to create audit log from request context
   */
  fromRequest(req: Request) {
    return {
      userId: req.user?.userId,
      organizationId: req.organizationId,
      req,
    };
  }
}

export const auditService = new AuditService();

// Export helper function for quick logging
export function audit(data: AuditLogData) {
  return auditService.log(data);
}
