import { Request, Response, NextFunction } from 'express';
import { ApiError } from '../utils/api-error';
import { prisma } from '../utils/prisma';
import { logAudit } from '../utils/activity-logger';

/**
 * Middleware to check if user is a platform super admin
 * Super admins have access to system-wide operations across all organizations
 */
export async function requireSuperAdmin(
  req: Request,
  _res: Response,
  next: NextFunction
) {
  try {
    if (!req.user) {
      throw ApiError.unauthorized('Authentication required');
    }

    // Check if user is super admin
    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
      select: { isSuperAdmin: true, isActive: true },
    });

    if (!user || !user.isActive) {
      throw ApiError.forbidden('User is not active');
    }

    if (!user.isSuperAdmin) {
      // Log unauthorized admin access attempt
      await logAudit({
        userId: req.user.userId,
        action: 'admin.access_denied',
        entity: 'admin',
        entityId: req.user.userId,
        metadata: {
          path: req.path,
          method: req.method,
          ip: req.ip,
        },
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
      });

      throw ApiError.forbidden('Super admin access required');
    }

    next();
  } catch (error) {
    next(error);
  }
}

/**
 * Middleware to audit all admin actions
 * Must be used after requireSuperAdmin
 */
export async function auditAdminAction(
  req: Request,
  _res: Response,
  next: NextFunction
) {
  try {
    if (!req.user) {
      throw ApiError.unauthorized('Authentication required');
    }

    // Log all admin actions for security audit
    await logAudit({
      userId: req.user.userId,
      action: `admin.${req.method.toLowerCase()}`,
      entity: 'admin_action',
      entityId: req.path,
      metadata: {
        path: req.path,
        method: req.method,
        query: req.query,
        body: sanitizeBody(req.body),
      },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });

    next();
  } catch (error) {
    next(error);
  }
}

/**
 * Sanitize request body for audit logging
 * Remove sensitive data like passwords, tokens
 */
function sanitizeBody(body: any): any {
  if (!body || typeof body !== 'object') return body;

  const sanitized = { ...body };
  const sensitiveFields = [
    'password',
    'passwordHash',
    'token',
    'accessToken',
    'refreshToken',
    'mfaSecret',
  ];

  for (const field of sensitiveFields) {
    if (field in sanitized) {
      sanitized[field] = '[REDACTED]';
    }
  }

  return sanitized;
}
