import { Router, Request, Response, NextFunction } from 'express';
import { notificationService } from '../services/notification-service';
import { authenticate } from '../middleware/auth-middleware';

const router = Router();

// All routes require authentication
router.use(authenticate);

// GET /api/notifications - Get user's notifications
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { page, limit, unreadOnly } = req.query;
    const result = await notificationService.getUserNotifications(req.user!.userId, {
      page: page ? parseInt(page as string) : undefined,
      limit: limit ? parseInt(limit as string) : undefined,
      unreadOnly: unreadOnly === 'true',
    });
    res.json(result);
  } catch (error) {
    next(error);
  }
});

// POST /api/notifications/:id/read - Mark notification as read
router.post('/:id/read', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const success = await notificationService.markAsRead(req.params.id, req.user!.userId);
    res.json({ success });
  } catch (error) {
    next(error);
  }
});

// POST /api/notifications/read-all - Mark all notifications as read
router.post('/read-all', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const count = await notificationService.markAllAsRead(req.user!.userId);
    res.json({ count });
  } catch (error) {
    next(error);
  }
});

// DELETE /api/notifications/:id - Delete a notification
router.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    await notificationService.delete(req.params.id, req.user!.userId);
    res.json({ message: 'Notification deleted' });
  } catch (error) {
    next(error);
  }
});

export { router as notificationRouter };
