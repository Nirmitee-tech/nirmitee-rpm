/**
 * Device Model Routes
 * API endpoints for device model master data
 */

import { Router, Request, Response, NextFunction } from 'express';
import { prisma } from '../../utils/prisma';
import { authenticate, requirePermission } from '../../middleware/auth-middleware';

const router = Router();

// All routes require authentication
router.use(authenticate);

/**
 * GET /api/v1/device-models
 * List all active device models for the organization
 * Permissions: patients:read, rpm:read
 */
router.get(
  '/',
  requirePermission('patients:read', 'rpm:read'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const organizationId = req.organizationId!;

      const deviceModels = await prisma.deviceModel.findMany({
        where: {
          organizationId,
          isActive: true,
        },
        orderBy: [
          { sortOrder: 'asc' },
          { name: 'asc' },
        ],
        select: {
          id: true,
          code: true,
          name: true,
          manufacturer: true,
          modelNumber: true,
          category: true,
          description: true,
        },
      });

      res.json(deviceModels);
    } catch (error) {
      next(error);
    }
  }
);

export { router as deviceModelRouter };
