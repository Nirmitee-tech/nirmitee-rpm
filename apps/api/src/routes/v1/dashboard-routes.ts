import { Router, Request, Response } from 'express';
import { authenticate } from '../../middleware/auth-middleware';
import { dashboardService } from '../../services/dashboard-service';
import { log } from '../../utils/logger';

const router = Router();

// All dashboard routes require authentication
router.use(authenticate);

// GET /api/dashboard/stats - Get dashboard statistics
router.get('/stats', async (req: Request, res: Response) => {
  try {
    const organizationId = req.organizationId!;
    const stats = await dashboardService.getStats(organizationId);
    res.json(stats);
  } catch (error) {
    log.error('Failed to get dashboard stats:', error);
    res.status(500).json({ error: 'Failed to get dashboard stats' });
  }
});

// GET /api/dashboard/activity - Get recent activity
router.get('/activity', async (req: Request, res: Response) => {
  try {
    const organizationId = req.organizationId!;
    const limit = parseInt(req.query.limit as string) || 10;
    const activity = await dashboardService.getRecentActivity(organizationId, limit);
    res.json({ activity });
  } catch (error) {
    log.error('Failed to get recent activity:', error);
    res.status(500).json({ error: 'Failed to get recent activity' });
  }
});

// GET /api/dashboard/vitals-trend - Get vitals trend data for charts
router.get('/vitals-trend', async (req: Request, res: Response) => {
  try {
    const organizationId = req.organizationId!;
    const days = parseInt(req.query.days as string) || 7;
    const trend = await dashboardService.getVitalsTrend(organizationId, days);
    res.json({ trend });
  } catch (error) {
    log.error('Failed to get vitals trend:', error);
    res.status(500).json({ error: 'Failed to get vitals trend' });
  }
});

// GET /api/dashboard/alert-distribution - Get alert distribution for charts
router.get('/alert-distribution', async (req: Request, res: Response) => {
  try {
    const organizationId = req.organizationId!;
    const distribution = await dashboardService.getAlertDistribution(organizationId);
    res.json(distribution);
  } catch (error) {
    log.error('Failed to get alert distribution:', error);
    res.status(500).json({ error: 'Failed to get alert distribution' });
  }
});

// GET /api/dashboard/patients-attention - Get patients requiring attention
router.get('/patients-attention', async (req: Request, res: Response) => {
  try {
    const organizationId = req.organizationId!;
    const limit = parseInt(req.query.limit as string) || 10;
    const patients = await dashboardService.getPatientsRequiringAttention(organizationId, limit);
    res.json({ patients });
  } catch (error) {
    log.error('Failed to get patients requiring attention:', error);
    res.status(500).json({ error: 'Failed to get patients requiring attention' });
  }
});

export { router as dashboardRouter };
