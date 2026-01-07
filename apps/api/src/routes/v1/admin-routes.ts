import { Router } from 'express';
import { authenticate } from '../../middleware/auth-middleware';
import { requireSuperAdmin, auditAdminAction } from '../../middleware/admin-middleware';
import * as adminService from '../../services/admin-service';
import { featureFlagService } from '../../services/feature-flag-service';
import { ApiError } from '../../utils/api-error';

const router = Router();

// All admin routes require authentication and super admin role
router.use(authenticate);
router.use(requireSuperAdmin);
router.use(auditAdminAction);

// ============================================
// SYSTEM ANALYTICS
// ============================================

/**
 * GET /api/v1/admin/stats/overview
 * Get system-wide overview statistics
 */
router.get('/stats/overview', async (_req, res, next) => {
  try {
    const stats = await adminService.getSystemOverview();
    res.json(stats);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/v1/admin/stats/users
 * Get user growth metrics
 */
router.get('/stats/users', async (req, res, next) => {
  try {
    const days = req.query.days ? parseInt(req.query.days as string) : 30;
    const metrics = await adminService.getUserGrowthMetrics(days);
    res.json(metrics);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/v1/admin/stats/organizations
 * Get organization metrics
 */
router.get('/stats/organizations', async (_req, res, next) => {
  try {
    const metrics = await adminService.getOrganizationMetrics();
    res.json(metrics);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/v1/admin/stats/api-usage
 * Get API usage statistics
 */
router.get('/stats/api-usage', async (_req, res, next) => {
  try {
    const stats = await adminService.getApiUsageStats();
    res.json(stats);
  } catch (error) {
    next(error);
  }
});

// ============================================
// PLATFORM USER MANAGEMENT
// ============================================

/**
 * GET /api/v1/admin/users
 * List all platform users (paginated)
 */
router.get('/users', async (req, res, next) => {
  try {
    const params: adminService.AdminUserListParams = {
      page: req.query.page ? parseInt(req.query.page as string) : 1,
      limit: req.query.limit ? parseInt(req.query.limit as string) : 50,
      search: req.query.search as string,
      status: req.query.status as 'active' | 'inactive' | 'all',
      sortBy: req.query.sortBy as 'createdAt' | 'lastLoginAt' | 'email',
      sortOrder: req.query.sortOrder as 'asc' | 'desc',
    };

    const result = await adminService.getAllUsers(params);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/v1/admin/users/:id
 * Get detailed user information
 */
router.get('/users/:id', async (req, res, next) => {
  try {
    const user = await adminService.getUserDetails(req.params.id);

    if (!user) {
      throw ApiError.notFound('User not found');
    }

    res.json(user);
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /api/v1/admin/users/:id
 * Update user (suspend, activate, grant super admin)
 */
router.put('/users/:id', async (req, res, next) => {
  try {
    const { isActive, isSuperAdmin } = req.body;

    const updated = await adminService.updateUserStatus(req.params.id, {
      isActive,
      isSuperAdmin,
    });

    res.json(updated);
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /api/v1/admin/users/:id
 * Soft delete a user
 */
router.delete('/users/:id', async (req, res, next) => {
  try {
    // Prevent deleting self
    if (req.params.id === req.user?.userId) {
      throw ApiError.badRequest('Cannot delete your own account');
    }

    await adminService.deleteUser(req.params.id);
    res.json({ success: true, message: 'User deleted successfully' });
  } catch (error) {
    next(error);
  }
});

// ============================================
// PLATFORM ORGANIZATION MANAGEMENT
// ============================================

/**
 * GET /api/v1/admin/organizations
 * List all organizations (paginated)
 */
router.get('/organizations', async (req, res, next) => {
  try {
    const params: adminService.AdminOrgListParams = {
      page: req.query.page ? parseInt(req.query.page as string) : 1,
      limit: req.query.limit ? parseInt(req.query.limit as string) : 50,
      search: req.query.search as string,
      sortBy: req.query.sortBy as 'createdAt' | 'name',
      sortOrder: req.query.sortOrder as 'asc' | 'desc',
    };

    const result = await adminService.getAllOrganizations(params);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/v1/admin/organizations/:id
 * Get detailed organization information
 */
router.get('/organizations/:id', async (req, res, next) => {
  try {
    const org = await adminService.getOrganizationDetails(req.params.id);

    if (!org) {
      throw ApiError.notFound('Organization not found');
    }

    res.json(org);
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /api/v1/admin/organizations/:id
 * Soft delete an organization
 */
router.delete('/organizations/:id', async (req, res, next) => {
  try {
    await adminService.deleteOrganization(req.params.id);
    res.json({ success: true, message: 'Organization deleted successfully' });
  } catch (error) {
    next(error);
  }
});

// ============================================
// SYSTEM HEALTH
// ============================================

/**
 * GET /api/v1/admin/health/detailed
 * Get detailed system health status
 */
router.get('/health/detailed', async (_req, res, next) => {
  try {
    const health = await adminService.getSystemHealth();
    res.json(health);
  } catch (error) {
    next(error);
  }
});

// ============================================
// FEATURE FLAGS MANAGEMENT
// ============================================

/**
 * GET /api/v1/admin/feature-flags
 * List all feature flags
 */
router.get('/feature-flags', async (_req, res, next) => {
  try {
    const flags = await featureFlagService.getAllFlags();
    res.json(flags);
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/v1/admin/feature-flags
 * Create a new feature flag
 */
router.post('/feature-flags', async (req, res, next) => {
  try {
    const { key, name, description, enabled, targetType, targetIds, percentage, metadata } = req.body;

    if (!key || !name) {
      throw ApiError.badRequest('Key and name are required');
    }

    const flag = await featureFlagService.createFlag({
      key,
      name,
      description,
      enabled: enabled ?? false,
      targetType: targetType ?? 'GLOBAL',
      targetIds: targetIds ?? [],
      percentage,
      metadata,
    });

    res.status(201).json(flag);
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /api/v1/admin/feature-flags/:id
 * Update a feature flag
 */
router.put('/feature-flags/:id', async (req, res, next) => {
  try {
    const { name, description, enabled, targetType, targetIds, percentage, metadata } = req.body;

    const flag = await featureFlagService.updateFlag(req.params.id, {
      name,
      description,
      enabled,
      targetType,
      targetIds,
      percentage,
      metadata,
    });

    res.json(flag);
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /api/v1/admin/feature-flags/:id
 * Delete a feature flag
 */
router.delete('/feature-flags/:id', async (req, res, next) => {
  try {
    await featureFlagService.deleteFlag(req.params.id);
    res.json({ success: true, message: 'Feature flag deleted successfully' });
  } catch (error) {
    next(error);
  }
});

export default router;
