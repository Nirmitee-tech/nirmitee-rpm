import { Router, Request, Response, NextFunction } from 'express';
import { activityService } from '../../services/activity-service';
import { authenticate, requirePermission } from '../../middleware/auth-middleware';

const router = Router();

// All routes require authentication
router.use(authenticate);

// GET /api/activities - Get organization activity feed
router.get('/', requirePermission('activities:read'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const {
      page,
      limit,
      entityTypes,
      actions,
      actorId,
      startDate,
      endDate,
      includeSystem
    } = req.query;

    const result = await activityService.getTimeline(req.organizationId!, {
      page: page ? parseInt(page as string) : undefined,
      limit: limit ? parseInt(limit as string) : undefined,
      entityTypes: entityTypes ? (entityTypes as string).split(',') : undefined,
      actions: actions ? (actions as string).split(',') : undefined,
      actorId: actorId as string,
      startDate: startDate ? new Date(startDate as string) : undefined,
      endDate: endDate ? new Date(endDate as string) : undefined,
      includeSystem: includeSystem === 'true',
    });

    res.json(result);
  } catch (error) {
    next(error);
  }
});

// GET /api/activities/user/:userId - Get user's activities
router.get('/user/:userId', requirePermission('activities:read'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { userId } = req.params;
    const { page, limit, entityTypes, startDate, endDate } = req.query;

    const result = await activityService.getByUser(userId, {
      page: page ? parseInt(page as string) : undefined,
      limit: limit ? parseInt(limit as string) : undefined,
      entityTypes: entityTypes ? (entityTypes as string).split(',') : undefined,
      startDate: startDate ? new Date(startDate as string) : undefined,
      endDate: endDate ? new Date(endDate as string) : undefined,
    });

    res.json(result);
  } catch (error) {
    next(error);
  }
});

// GET /api/activities/entity/:type/:id - Get entity's activity history
router.get('/entity/:type/:id', requirePermission('activities:read'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { type, id } = req.params;
    const { limit } = req.query;

    const activities = await activityService.getByEntity(
      type,
      id,
      limit ? parseInt(limit as string) : undefined
    );

    res.json({ activities });
  } catch (error) {
    next(error);
  }
});

export { router as activityRouter };
