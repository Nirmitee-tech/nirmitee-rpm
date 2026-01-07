import { prisma } from './prisma';
import { auditService } from '../services/audit-service';

/**
 * Soft Delete Utilities
 * Provides functions for soft delete operations with audit logging
 */

interface SoftDeleteOptions {
  userId?: string;
  organizationId?: string;
  metadata?: Record<string, any>;
}

/**
 * Soft delete a record by setting deletedAt timestamp
 */
export async function softDelete<T>(
  model: keyof typeof prisma,
  id: string,
  options?: SoftDeleteOptions
): Promise<T> {
  const modelDelegate = prisma[model] as any;

  if (!modelDelegate || typeof modelDelegate.update !== 'function') {
    throw new Error(`Model ${String(model)} does not support soft delete`);
  }

  const result = await modelDelegate.update({
    where: { id },
    data: { deletedAt: new Date() },
  });

  // Log audit event
  if (options?.userId) {
    await auditService.log({
      userId: options.userId,
      organizationId: options.organizationId,
      action: `${String(model)}.deleted` as any,
      entity: String(model) as any,
      entityId: id,
      metadata: { ...options.metadata, softDelete: true },
    });
  }

  return result;
}

/**
 * Restore a soft-deleted record by clearing deletedAt
 */
export async function restore<T>(
  model: keyof typeof prisma,
  id: string,
  options?: SoftDeleteOptions
): Promise<T> {
  const modelDelegate = prisma[model] as any;

  if (!modelDelegate || typeof modelDelegate.update !== 'function') {
    throw new Error(`Model ${String(model)} does not support restore`);
  }

  // First check if record exists and is deleted
  const existing = await modelDelegate.findFirst({
    where: {
      id,
      deletedAt: { not: null },
    },
  });

  if (!existing) {
    throw new Error(`No deleted record found with id ${id}`);
  }

  const result = await modelDelegate.update({
    where: { id },
    data: { deletedAt: null },
  });

  // Log audit event
  if (options?.userId) {
    await auditService.log({
      userId: options.userId,
      organizationId: options.organizationId,
      action: `${String(model)}.updated` as any,
      entity: String(model) as any,
      entityId: id,
      metadata: { ...options.metadata, restored: true },
    });
  }

  return result;
}

/**
 * Permanently delete a record (hard delete)
 * Should be used with caution and proper authorization
 */
export async function hardDelete(
  model: keyof typeof prisma,
  id: string,
  options?: SoftDeleteOptions
): Promise<void> {
  const modelDelegate = prisma[model] as any;

  if (!modelDelegate || typeof modelDelegate.delete !== 'function') {
    throw new Error(`Model ${String(model)} does not support hard delete`);
  }

  // Get record data before deletion for audit log
  const record = await modelDelegate.findUnique({
    where: { id },
  });

  if (!record) {
    throw new Error(`Record not found with id ${id}`);
  }

  await modelDelegate.delete({
    where: { id },
  });

  // Log audit event
  if (options?.userId) {
    await auditService.log({
      userId: options.userId,
      organizationId: options.organizationId,
      action: `${String(model)}.deleted` as any,
      entity: String(model) as any,
      entityId: id,
      oldValues: record,
      metadata: {
        ...options.metadata,
        hardDelete: true,
        warning: 'PERMANENT_DELETE',
      },
    });
  }
}

/**
 * Get all soft-deleted records for a model
 */
export async function getDeleted<T>(
  model: keyof typeof prisma,
  where?: Record<string, any>
): Promise<T[]> {
  const modelDelegate = prisma[model] as any;

  if (!modelDelegate || typeof modelDelegate.findMany !== 'function') {
    throw new Error(`Model ${String(model)} does not support findMany`);
  }

  return await modelDelegate.findMany({
    where: {
      ...where,
      deletedAt: { not: null },
    },
    orderBy: { deletedAt: 'desc' },
  });
}

/**
 * Check if a record is soft deleted
 */
export async function isDeleted(
  model: keyof typeof prisma,
  id: string
): Promise<boolean> {
  const modelDelegate = prisma[model] as any;

  if (!modelDelegate || typeof modelDelegate.findUnique !== 'function') {
    throw new Error(`Model ${String(model)} does not support findUnique`);
  }

  const record = await modelDelegate.findUnique({
    where: { id },
    select: { deletedAt: true },
  });

  return record?.deletedAt !== null;
}

/**
 * Bulk soft delete multiple records
 */
export async function softDeleteMany(
  model: keyof typeof prisma,
  ids: string[],
  options?: SoftDeleteOptions
): Promise<number> {
  const modelDelegate = prisma[model] as any;

  if (!modelDelegate || typeof modelDelegate.updateMany !== 'function') {
    throw new Error(`Model ${String(model)} does not support soft delete`);
  }

  const result = await modelDelegate.updateMany({
    where: {
      id: { in: ids },
    },
    data: { deletedAt: new Date() },
  });

  // Log audit event
  if (options?.userId) {
    await auditService.log({
      userId: options.userId,
      organizationId: options.organizationId,
      action: `${String(model)}.deleted` as any,
      entity: String(model) as any,
      metadata: {
        ...options.metadata,
        softDelete: true,
        bulk: true,
        deletedCount: result.count,
        ids,
      },
    });
  }

  return result.count;
}
