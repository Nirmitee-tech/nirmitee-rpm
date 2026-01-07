import { Request } from 'express';
import { activityService, LogActivityData } from '../services/activity-service';
import { ActorType, Prisma } from '@prisma/client';
import { log } from './logger';
import { prisma } from './prisma';

interface Entity {
  type: string;
  id: string;
  name?: string;
}

/**
 * Helper function to log activity from request context
 */
export async function logActivity(
  req: Request,
  action: string,
  entity: Entity,
  metadata?: Record<string, unknown>
): Promise<void> {
  if (!req.user?.userId || !req.organizationId) {
    log.warn('Activity logging skipped: missing user or organization context');
    return;
  }

  const data: LogActivityData = {
    organizationId: req.organizationId,
    actorId: req.user.userId,
    actorType: ActorType.USER,
    action,
    entityType: entity.type,
    entityId: entity.id,
    entityName: entity.name,
    metadata,
  };

  await activityService.log(data);
}

/**
 * Helper to log system-generated activities
 */
export async function logSystemActivity(
  organizationId: string,
  action: string,
  entity: Entity,
  metadata?: Record<string, unknown>
): Promise<void> {
  const data: LogActivityData = {
    organizationId,
    actorId: 'system',
    actorType: ActorType.SYSTEM,
    action,
    entityType: entity.type,
    entityId: entity.id,
    entityName: entity.name,
    metadata,
  };

  await activityService.log(data);
}

/**
 * Helper to log API-generated activities
 */
export async function logApiActivity(
  organizationId: string,
  apiKeyId: string,
  action: string,
  entity: Entity,
  metadata?: Record<string, unknown>
): Promise<void> {
  const data: LogActivityData = {
    organizationId,
    actorId: apiKeyId,
    actorType: ActorType.API,
    action,
    entityType: entity.type,
    entityId: entity.id,
    entityName: entity.name,
    metadata,
  };

  await activityService.log(data);
}

/**
 * Interface for audit logging
 */
interface AuditLogData {
  userId: string;
  action: string;
  entity: string;
  entityId: string;
  metadata?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
  organizationId?: string;
}

/**
 * Log an audit event to the database
 */
export async function logAudit(data: AuditLogData): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        userId: data.userId,
        organizationId: data.organizationId,
        action: data.action,
        entity: data.entity,
        entityId: data.entityId,
        metadata: data.metadata as Prisma.InputJsonValue,
        ipAddress: data.ipAddress || null,
        userAgent: data.userAgent || null,
      },
    });
  } catch (error) {
    // Log error but don't throw - audit logging should not break main flow
    log.error('Audit log error:', error);
  }
}

/**
 * Decorator function for automatic activity logging
 * Usage: @LogsActivity('created', 'user')
 */
export function LogsActivity(action: string, entityType: string) {
  return function (
    target: unknown,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: unknown[]) {
      const result = await originalMethod.apply(this, args);

      // Try to extract request and entity from result or arguments
      // This is a basic implementation - customize based on your needs
      const req = args.find((arg) => arg && typeof arg === 'object' && 'user' in arg) as Request | undefined;

      if (req && result && typeof result === 'object' && 'id' in result) {
        const entity: Entity = {
          type: entityType,
          id: (result as { id: string }).id,
          name: 'name' in result ? (result as { name?: string }).name : undefined,
        };

        await logActivity(req, action, entity);
      }

      return result;
    };

    return descriptor;
  };
}
