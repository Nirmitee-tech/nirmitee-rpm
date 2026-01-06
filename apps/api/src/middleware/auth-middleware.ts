import { Request, Response, NextFunction } from 'express';
import { verifyToken, TokenPayload } from '../utils/jwt';
import { ApiError } from '../utils/api-error';
import { prisma } from '../utils/prisma';

// Extend Express Request type
declare global {
  namespace Express {
    interface Request {
      user?: TokenPayload & { permissions?: string[] };
      organizationId?: string;
    }
  }
}

export async function authenticate(req: Request, _res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;

    if (!token) {
      throw ApiError.unauthorized('No token provided');
    }

    const payload = verifyToken(token);
    req.user = payload;
    req.organizationId = payload.organizationId;

    next();
  } catch (error) {
    next(error);
  }
}

// Middleware to check if user has required permission
export function requirePermission(...requiredPermissions: string[]) {
  return async (req: Request, _res: Response, next: NextFunction) => {
    try {
      if (!req.user || !req.organizationId) {
        throw ApiError.unauthorized();
      }

      // Get user's role and permissions in the organization
      const member = await prisma.organizationMember.findUnique({
        where: {
          userId_organizationId: {
            userId: req.user.userId,
            organizationId: req.organizationId,
          },
        },
        include: {
          role: {
            include: {
              permissions: {
                include: {
                  permission: true,
                },
              },
            },
          },
        },
      });

      if (!member || member.status !== 'ACTIVE') {
        throw ApiError.forbidden('Not a member of this organization');
      }

      const userPermissions = member.role.permissions.map(
        (rp) => rp.permission.code
      );

      // Check if user has any of the required permissions
      const hasPermission = requiredPermissions.some((perm) =>
        userPermissions.includes(perm)
      );

      if (!hasPermission) {
        throw ApiError.forbidden('Insufficient permissions');
      }

      req.user.permissions = userPermissions;
      next();
    } catch (error) {
      next(error);
    }
  };
}

// Check if user is organization owner or admin
export async function requireOrgAdmin(req: Request, _res: Response, next: NextFunction) {
  try {
    if (!req.user || !req.organizationId) {
      throw ApiError.unauthorized();
    }

    const member = await prisma.organizationMember.findUnique({
      where: {
        userId_organizationId: {
          userId: req.user.userId,
          organizationId: req.organizationId,
        },
      },
      include: {
        role: true,
      },
    });

    if (!member || member.status !== 'ACTIVE') {
      throw ApiError.forbidden('Not a member of this organization');
    }

    // Check if role is owner or admin (by convention)
    const isAdmin = ['owner', 'admin'].includes(member.role.name.toLowerCase());

    if (!isAdmin) {
      throw ApiError.forbidden('Admin access required');
    }

    next();
  } catch (error) {
    next(error);
  }
}
