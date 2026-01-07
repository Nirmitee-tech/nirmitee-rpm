import { Request, Response, NextFunction } from 'express';
import { apiKeyService } from '../services/api-key-service';
import { ApiError } from '../utils/api-error';
import logger from '../utils/logger';

/**
 * API Key Authentication Middleware
 * Authenticates requests using X-API-Key header
 *
 * Usage:
 * ```ts
 * router.get('/data', authenticateApiKey, handler);
 * router.get('/data', authenticateApiKey(['read:data']), handler);
 * ```
 */

declare global {
  namespace Express {
    interface Request {
      apiKey?: {
        organizationId: string;
        permissions: string[];
        apiKeyId: string;
      };
    }
  }
}

/**
 * Authenticate API Key
 * Validates X-API-Key header and attaches organization context
 */
export function authenticateApiKey(requiredPermissions: string[] = []) {
  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    try {
      // Get API key from header
      const apiKey = req.headers['x-api-key'] as string;

      if (!apiKey) {
        throw new ApiError(401, 'API key required', 'API_KEY_REQUIRED');
      }

      // Validate API key
      const validation = await apiKeyService.validateApiKey(apiKey);

      if (!validation) {
        logger.warn('Invalid API key used', {
          ip: req.ip,
          path: req.path,
        });
        throw new ApiError(401, 'Invalid API key', 'INVALID_API_KEY');
      }

      // Check required permissions
      if (requiredPermissions.length > 0) {
        const hasAllPermissions = requiredPermissions.every((permission) =>
          apiKeyService.hasPermission(validation.permissions, permission)
        );

        if (!hasAllPermissions) {
          logger.warn('API key missing required permissions', {
            apiKeyId: validation.apiKeyId,
            requiredPermissions,
            grantedPermissions: validation.permissions,
          });
          throw new ApiError(
            403,
            'Insufficient permissions',
            'INSUFFICIENT_PERMISSIONS'
          );
        }
      }

      // Attach API key context to request
      req.apiKey = {
        organizationId: validation.organizationId,
        permissions: validation.permissions,
        apiKeyId: validation.apiKeyId,
      };

      next();
    } catch (error) {
      next(error);
    }
  };
}

/**
 * Optional API Key Authentication
 * Allows both JWT and API key authentication
 * Useful for endpoints that support multiple auth methods
 */
export function optionalApiKey(req: Request, _res: Response, next: NextFunction): void {
  const apiKey = req.headers['x-api-key'] as string;

  // Skip if no API key provided (will use JWT auth instead)
  if (!apiKey) {
    return next();
  }

  // Validate API key
  apiKeyService
    .validateApiKey(apiKey)
    .then((validation) => {
      if (validation) {
        req.apiKey = {
          organizationId: validation.organizationId,
          permissions: validation.permissions,
          apiKeyId: validation.apiKeyId,
        };
      }
      next();
    })
    .catch(next);
}
