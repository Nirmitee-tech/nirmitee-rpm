import { Router, Request, Response, NextFunction } from 'express';
import { auditService } from '../services/audit-service';
import { authenticate, requirePermission } from '../middleware/auth-middleware';

const router = Router();

// All routes require authentication
router.use(authenticate);

// GET /api/audit - Get audit logs for organization
router.get('/', requirePermission('security:read', 'security:manage'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { page, limit, userId, action, entity, startDate, endDate } = req.query;
    const result = await auditService.getOrganizationLogs(req.organizationId!, {
      page: page ? parseInt(page as string) : undefined,
      limit: limit ? parseInt(limit as string) : undefined,
      userId: userId as string,
      action: action as string,
      entity: entity as string,
      startDate: startDate ? new Date(startDate as string) : undefined,
      endDate: endDate ? new Date(endDate as string) : undefined,
    });
    res.json(result);
  } catch (error) {
    next(error);
  }
});

// GET /api/audit/entity/:entity/:entityId - Get logs for specific entity
router.get('/entity/:entity/:entityId', requirePermission('security:read'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { entity, entityId } = req.params;
    const { limit } = req.query;
    const logs = await auditService.getEntityLogs(
      entity as any,
      entityId,
      limit ? parseInt(limit as string) : undefined
    );
    res.json(logs);
  } catch (error) {
    next(error);
  }
});

// GET /api/audit/user/:userId - Get activity logs for a user
router.get('/user/:userId', requirePermission('security:read', 'users:manage'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { limit } = req.query;
    const logs = await auditService.getUserActivityLogs(
      req.params.userId,
      limit ? parseInt(limit as string) : undefined
    );
    res.json(logs);
  } catch (error) {
    next(error);
  }
});

export { router as auditRouter };
