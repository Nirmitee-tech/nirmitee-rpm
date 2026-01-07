import { Request, Response, NextFunction } from 'express';
import { featureFlagService } from '../services/feature-flag-service';
import { ApiError } from '../utils/api-error';
import { log } from '../utils/logger';

/**
 * Feature Flag Middleware
 * Protects routes based on feature flag status
 */

/**
 * Require a feature flag to be enabled before allowing access to a route
 * Usage: app.get('/new-feature', requireFeature('new-dashboard'), handler)
 */
export function requireFeature(flagKey: string) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user?.userId;
      const organizationId = req.organizationId;

      const enabled = await featureFlagService.isEnabled(flagKey, {
        userId,
        organizationId,
      });

      if (!enabled) {
        throw new ApiError(
          403,
          `Feature '${flagKey}' is not available. Please contact your administrator.`
        );
      }

      next();
    } catch (error) {
      next(error);
    }
  };
}

/**
 * Check multiple feature flags (all must be enabled)
 * Usage: app.get('/route', requireFeatures(['feature1', 'feature2']), handler)
 */
export function requireFeatures(flagKeys: string[]) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user?.userId;
      const organizationId = req.organizationId;

      for (const flagKey of flagKeys) {
        const enabled = await featureFlagService.isEnabled(flagKey, {
          userId,
          organizationId,
        });

        if (!enabled) {
          throw new ApiError(
            403,
            `Feature '${flagKey}' is not available. Please contact your administrator.`
          );
        }
      }

      next();
    } catch (error) {
      next(error);
    }
  };
}

/**
 * Check if any of the feature flags are enabled (at least one must be enabled)
 * Usage: app.get('/route', requireAnyFeature(['feature1', 'feature2']), handler)
 */
export function requireAnyFeature(flagKeys: string[]) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user?.userId;
      const organizationId = req.organizationId;

      let anyEnabled = false;

      for (const flagKey of flagKeys) {
        const enabled = await featureFlagService.isEnabled(flagKey, {
          userId,
          organizationId,
        });

        if (enabled) {
          anyEnabled = true;
          break;
        }
      }

      if (!anyEnabled) {
        throw new ApiError(
          403,
          'None of the required features are available. Please contact your administrator.'
        );
      }

      next();
    } catch (error) {
      next(error);
    }
  };
}

/**
 * Attach feature flags to request object for use in handlers
 * Adds req.features object with enabled flags
 */
export async function attachFeatureFlags(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const userId = req.user?.userId;
    const organizationId = req.organizationId;

    const enabledFlags = await featureFlagService.getEnabledFlags({
      userId,
      organizationId,
    });

    // Create a features object on request
    (req as any).features = {
      enabled: enabledFlags,
      has: (key: string) => enabledFlags.includes(key),
    };

    next();
  } catch (error) {
    // Don't fail the request if feature flag check fails
    log.error('Error attaching feature flags:', error);
    (req as any).features = {
      enabled: [],
      has: () => false,
    };
    next();
  }
}

/**
 * Helper to check feature flag in route handlers
 * Usage: if (await checkFeature(req, 'new-feature')) { ... }
 */
export async function checkFeature(req: Request, flagKey: string): Promise<boolean> {
  const userId = req.user?.userId;
  const organizationId = req.organizationId;

  return await featureFlagService.isEnabled(flagKey, {
    userId,
    organizationId,
  });
}
