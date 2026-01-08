/**
 * Staff Routes
 * API endpoints for searching organization staff members (for care team assignment)
 */

import { Router, Request, Response, NextFunction } from 'express';
import { prisma } from '../../utils/prisma';
import { authenticate, requirePermission } from '../../middleware/auth-middleware';

const router = Router();

// All routes require authentication
router.use(authenticate);

/**
 * GET /api/v1/staff/search
 * Search staff members in organization
 * Query params:
 *  - q: string (search query for name or email)
 * Returns: Array of staff members with basic info
 * Permissions: patients:read or rpm:read
 */
router.get(
  '/search',
  requirePermission('patients:read', 'rpm:read'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const query = (req.query.q as string) || '';
      const organizationId = req.organizationId!;

      const members = await prisma.organizationMember.findMany({
        where: {
          organizationId,
          status: 'ACTIVE',
          user: {
            OR: [
              { firstName: { contains: query, mode: 'insensitive' } },
              { lastName: { contains: query, mode: 'insensitive' } },
              { email: { contains: query, mode: 'insensitive' } },
            ],
          },
        },
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
          role: {
            select: {
              name: true,
            },
          },
        },
        take: 20,
        orderBy: [
          { user: { firstName: 'asc' } },
          { user: { lastName: 'asc' } },
        ],
      });

      const result = members.map((m) => ({
        id: m.user.id,
        name: `${m.user.firstName} ${m.user.lastName}`,
        email: m.user.email,
        role: m.role.name,
      }));

      res.json(result);
    } catch (error) {
      next(error);
    }
  }
);

export { router as staffRouter };
