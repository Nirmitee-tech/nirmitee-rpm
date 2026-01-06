/**
 * Permission Middleware
 * Route-level permission checking and patient access validation
 */

import { Request, Response, NextFunction } from 'express';
import { ApiError } from '../utils/api-error';
import { permissionService, AccessContext } from '../services/permission-service';

// Import type extensions from auth-middleware
import type {} from './auth-middleware';

/**
 * Require specific permission(s) to access route
 * User must have at least ONE of the specified permissions
 */
export function requirePermission(...permissionCodes: string[]) {
  return async (req: Request, _res: Response, next: NextFunction) => {
    try {
      if (!req.user || !req.organizationId) {
        throw ApiError.unauthorized('Authentication required');
      }

      const hasPermission = await permissionService.hasAnyPermission(
        req.user.userId,
        req.organizationId,
        permissionCodes
      );

      if (!hasPermission) {
        throw ApiError.forbidden(
          `Insufficient permissions. Required: ${permissionCodes.join(' OR ')}`
        );
      }

      // Attach permissions to request for downstream use
      if (!req.user.permissions) {
        req.user.permissions = await permissionService.getUserPermissions(
          req.user.userId,
          req.organizationId
        );
      }

      next();
    } catch (error) {
      next(error);
    }
  };
}

/**
 * Require ALL specified permissions to access route
 */
export function requireAllPermissions(...permissionCodes: string[]) {
  return async (req: Request, _res: Response, next: NextFunction) => {
    try {
      if (!req.user || !req.organizationId) {
        throw ApiError.unauthorized('Authentication required');
      }

      const hasAllPermissions = await permissionService.hasAllPermissions(
        req.user.userId,
        req.organizationId,
        permissionCodes
      );

      if (!hasAllPermissions) {
        throw ApiError.forbidden(
          `Insufficient permissions. Required: ${permissionCodes.join(' AND ')}`
        );
      }

      // Attach permissions to request
      if (!req.user.permissions) {
        req.user.permissions = await permissionService.getUserPermissions(
          req.user.userId,
          req.organizationId
        );
      }

      next();
    } catch (error) {
      next(error);
    }
  };
}

/**
 * Validate access to a specific patient
 * Checks patient assignment, caregiver consent, or ownership
 */
export function requirePatientAccess(patientIdParam: string = 'patientId') {
  return async (req: Request, _res: Response, next: NextFunction) => {
    try {
      if (!req.user || !req.organizationId) {
        throw ApiError.unauthorized('Authentication required');
      }

      const patientId = req.params[patientIdParam] || req.body?.patientId;

      if (!patientId) {
        throw ApiError.badRequest(
          `Patient ID not found in params.${patientIdParam} or body.patientId`
        );
      }

      const context: AccessContext = {
        userId: req.user.userId,
        organizationId: req.organizationId,
        permissions: req.user.permissions,
      };

      const hasAccess = await permissionService.validatePatientAccess(
        context,
        patientId
      );

      if (!hasAccess) {
        // Log unauthorized access attempt
        await permissionService.logAccessAttempt(
          req.user.userId,
          req.organizationId,
          'patient',
          patientId,
          'access_denied',
          false,
          {
            path: req.path,
            method: req.method,
          }
        );

        throw ApiError.forbidden('Access denied to patient data');
      }

      // Log successful access
      await permissionService.logAccessAttempt(
        req.user.userId,
        req.organizationId,
        'patient',
        patientId,
        'access_granted',
        true,
        {
          path: req.path,
          method: req.method,
        }
      );

      next();
    } catch (error) {
      next(error);
    }
  };
}

/**
 * Validate access to vital reading
 */
export function requireVitalAccess(vitalIdParam: string = 'vitalId') {
  return async (req: Request, _res: Response, next: NextFunction) => {
    try {
      if (!req.user || !req.organizationId) {
        throw ApiError.unauthorized('Authentication required');
      }

      const vitalId = req.params[vitalIdParam] || req.body?.vitalId;

      if (!vitalId) {
        throw ApiError.badRequest(`Vital reading ID not found`);
      }

      const context: AccessContext = {
        userId: req.user.userId,
        organizationId: req.organizationId,
        permissions: req.user.permissions,
      };

      const hasAccess = await permissionService.validateVitalAccess(
        context,
        vitalId
      );

      if (!hasAccess) {
        await permissionService.logAccessAttempt(
          req.user.userId,
          req.organizationId,
          'vital_reading',
          vitalId,
          'access_denied',
          false
        );

        throw ApiError.forbidden('Access denied to vital reading');
      }

      await permissionService.logAccessAttempt(
        req.user.userId,
        req.organizationId,
        'vital_reading',
        vitalId,
        'access_granted',
        true
      );

      next();
    } catch (error) {
      next(error);
    }
  };
}

/**
 * Validate access to alert
 */
export function requireAlertAccess(alertIdParam: string = 'alertId') {
  return async (req: Request, _res: Response, next: NextFunction) => {
    try {
      if (!req.user || !req.organizationId) {
        throw ApiError.unauthorized('Authentication required');
      }

      const alertId = req.params[alertIdParam] || req.body?.alertId;

      if (!alertId) {
        throw ApiError.badRequest(`Alert ID not found`);
      }

      const context: AccessContext = {
        userId: req.user.userId,
        organizationId: req.organizationId,
        permissions: req.user.permissions,
      };

      const hasAccess = await permissionService.validateAlertAccess(
        context,
        alertId
      );

      if (!hasAccess) {
        await permissionService.logAccessAttempt(
          req.user.userId,
          req.organizationId,
          'alert',
          alertId,
          'access_denied',
          false
        );

        throw ApiError.forbidden('Access denied to alert');
      }

      await permissionService.logAccessAttempt(
        req.user.userId,
        req.organizationId,
        'alert',
        alertId,
        'access_granted',
        true
      );

      next();
    } catch (error) {
      next(error);
    }
  };
}

/**
 * Require MFA for sensitive operations
 * Validates that user's role requires MFA and MFA is enabled
 */
export function requireMFA() {
  return async (req: Request, _res: Response, next: NextFunction) => {
    try {
      if (!req.user || !req.organizationId) {
        throw ApiError.unauthorized('Authentication required');
      }

      const requiresMFA = await permissionService.requiresMFA(
        req.user.userId,
        req.organizationId
      );

      if (requiresMFA) {
        // TODO: Check if user has MFA enabled and verified
        // For now, we'll just check the requirement
        // In production, verify MFA token in request headers

        const mfaToken = req.headers['x-mfa-token'] as string;

        if (!mfaToken) {
          throw ApiError.forbidden(
            'MFA required for this operation. Please provide MFA token.'
          );
        }

        // TODO: Verify MFA token
        // const isValidMFA = await mfaService.verifyToken(
        //   req.user.userId,
        //   mfaToken
        // );
        //
        // if (!isValidMFA) {
        //   throw ApiError.forbidden('Invalid MFA token');
        // }
      }

      next();
    } catch (error) {
      next(error);
    }
  };
}

/**
 * Helper to check permission in route handler
 * Returns boolean instead of throwing error
 */
export async function checkPermission(
  req: Request,
  permissionCode: string
): Promise<boolean> {
  if (!req.user || !req.organizationId) {
    return false;
  }

  return permissionService.hasPermission(
    req.user.userId,
    req.organizationId,
    permissionCode
  );
}

/**
 * Helper to get all user permissions
 */
export async function getUserPermissions(req: Request): Promise<string[]> {
  if (!req.user || !req.organizationId) {
    return [];
  }

  if (req.user.permissions) {
    return req.user.permissions;
  }

  const permissions = await permissionService.getUserPermissions(
    req.user.userId,
    req.organizationId
  );

  req.user.permissions = permissions;
  return permissions;
}
