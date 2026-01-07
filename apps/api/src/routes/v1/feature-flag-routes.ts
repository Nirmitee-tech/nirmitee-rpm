import { Router } from 'express';
import { featureFlagService } from '../../services/feature-flag-service';
import { authenticate } from '../../middleware/auth-middleware';
import { requirePermission } from '../../middleware/permission-middleware';
import { ApiError } from '../../utils/api-error';

const router = Router();

/**
 * GET /api/features
 * List all feature flags (admin only)
 */
router.get(
  '/',
  authenticate,
  requirePermission('features:manage'),
  async (req, res, next) => {
    try {
      const flags = await featureFlagService.getAllFlags();
      res.json({ flags });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/features/:key
 * Get a specific feature flag
 */
router.get(
  '/:key',
  authenticate,
  requirePermission('features:read'),
  async (req, res, next) => {
    try {
      const { key } = req.params;
      const flag = await featureFlagService.getFlag(key);

      if (!flag) {
        throw new ApiError(404, `Feature flag ${key} not found`);
      }

      res.json({ flag });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/features/check/:key
 * Check if a feature is enabled for the current user/organization
 */
router.get(
  '/check/:key',
  authenticate,
  async (req, res, next) => {
    try {
      const { key } = req.params;
      const userId = req.user?.userId;
      const organizationId = req.organizationId;

      const enabled = await featureFlagService.isEnabled(key, {
        userId,
        organizationId,
      });

      res.json({ enabled, key });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/features/enabled/all
 * Get all enabled features for the current user/organization
 */
router.get(
  '/enabled/all',
  authenticate,
  async (req, res, next) => {
    try {
      const userId = req.user?.userId;
      const organizationId = req.organizationId;

      const enabledFlags = await featureFlagService.getEnabledFlags({
        userId,
        organizationId,
      });

      res.json({ enabledFlags });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/features
 * Create a new feature flag (admin only)
 */
router.post(
  '/',
  authenticate,
  requirePermission('features:manage'),
  async (req, res, next) => {
    try {
      const { key, name, description, enabled, targetType, targetIds, percentage, metadata } = req.body;

      if (!key || !name) {
        throw new ApiError(400, 'Key and name are required');
      }

      const flag = await featureFlagService.createFlag({
        key,
        name,
        description,
        enabled,
        targetType,
        targetIds,
        percentage,
        metadata,
      });

      res.status(201).json({ flag });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * PATCH /api/features/:key
 * Update a feature flag (admin only)
 */
router.patch(
  '/:key',
  authenticate,
  requirePermission('features:manage'),
  async (req, res, next) => {
    try {
      const { key } = req.params;
      const { name, description, enabled, targetType, targetIds, percentage, metadata } = req.body;

      const flag = await featureFlagService.updateFlag(key, {
        name,
        description,
        enabled,
        targetType,
        targetIds,
        percentage,
        metadata,
      });

      res.json({ flag });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * DELETE /api/features/:key
 * Delete a feature flag (admin only)
 */
router.delete(
  '/:key',
  authenticate,
  requirePermission('features:manage'),
  async (req, res, next) => {
    try {
      const { key } = req.params;
      await featureFlagService.deleteFlag(key);
      res.json({ message: 'Feature flag deleted successfully' });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/features/:key/organizations/:orgId/enable
 * Enable a feature for a specific organization
 */
router.post(
  '/:key/organizations/:orgId/enable',
  authenticate,
  requirePermission('features:manage'),
  async (req, res, next) => {
    try {
      const { key, orgId } = req.params;
      await featureFlagService.enableForOrg(key, orgId);
      res.json({ message: 'Feature enabled for organization' });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/features/:key/organizations/:orgId/disable
 * Disable a feature for a specific organization
 */
router.post(
  '/:key/organizations/:orgId/disable',
  authenticate,
  requirePermission('features:manage'),
  async (req, res, next) => {
    try {
      const { key, orgId } = req.params;
      await featureFlagService.disableForOrg(key, orgId);
      res.json({ message: 'Feature disabled for organization' });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/features/:key/percentage
 * Set percentage rollout for a feature
 */
router.post(
  '/:key/percentage',
  authenticate,
  requirePermission('features:manage'),
  async (req, res, next) => {
    try {
      const { key } = req.params;
      const { percentage } = req.body;

      if (typeof percentage !== 'number' || percentage < 0 || percentage > 100) {
        throw new ApiError(400, 'Percentage must be a number between 0 and 100');
      }

      await featureFlagService.setPercentage(key, percentage);
      res.json({ message: 'Percentage rollout updated' });
    } catch (error) {
      next(error);
    }
  }
);

export const featureFlagRouter = router;
