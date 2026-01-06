import { Router, Request, Response } from 'express';
import { authenticate } from '../middleware/auth-middleware';
import { dashboardService } from '../services/dashboard-service';

const router = Router();

// All dashboard routes require authentication
router.use(authenticate);

// GET /api/dashboard/stats - Get dashboard statistics
router.get('/stats', async (req: Request, res: Response) => {
  try {
    const { organizationId } = req.user!;
    const stats = await dashboardService.getStats(organizationId);
    res.json(stats);
  } catch (error) {
    console.error('Failed to get dashboard stats:', error);
    res.status(500).json({ error: 'Failed to get dashboard stats' });
  }
});

// GET /api/dashboard/activity - Get recent activity
router.get('/activity', async (req: Request, res: Response) => {
  try {
    const { organizationId } = req.user!;
    const limit = parseInt(req.query.limit as string) || 10;
    const activity = await dashboardService.getRecentActivity(organizationId, limit);
    res.json({ activity });
  } catch (error) {
    console.error('Failed to get recent activity:', error);
    res.status(500).json({ error: 'Failed to get recent activity' });
  }
});

export { router as dashboardRouter };
