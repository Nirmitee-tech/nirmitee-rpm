/**
 * Alert Rule Routes
 * API endpoints for managing custom alert rules
 */

import { Router, Request, Response, NextFunction } from 'express';
import { alertRuleService } from '../../services/alert-rule-service';
import { authenticate } from '../../middleware/auth-middleware';

const router = Router();

// All routes require authentication
router.use(authenticate);

/**
 * GET /api/alert-rules
 * Get all alert rules for the organization
 */
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const organizationId = req.organizationId!;
    const { severity, isEnabled, page, limit } = req.query;

    const result = await alertRuleService.getAlertRules(organizationId, {
      severity: severity as 'CRITICAL' | 'SIGNIFICANT' | 'INFORMATIONAL' | undefined,
      isEnabled: isEnabled !== undefined ? isEnabled === 'true' : undefined,
      page: page ? parseInt(page as string, 10) : undefined,
      limit: limit ? parseInt(limit as string, 10) : undefined,
    });

    res.json({
      success: true,
      data: result.rules,
      pagination: result.pagination,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/alert-rules/:id
 * Get a specific alert rule
 */
router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const organizationId = req.organizationId!;
    const { id } = req.params;

    const rule = await alertRuleService.getAlertRule(id, organizationId);

    res.json({
      success: true,
      data: rule,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/alert-rules
 * Create a new alert rule
 */
router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const organizationId = req.organizationId!;
    const userId = req.user!.userId;

    const rule = await alertRuleService.createAlertRule(
      organizationId,
      req.body,
      userId
    );

    res.status(201).json({
      success: true,
      data: rule,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /api/alert-rules/:id
 * Update an alert rule
 */
router.put('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const organizationId = req.organizationId!;
    const userId = req.user!.userId;
    const { id } = req.params;

    const rule = await alertRuleService.updateAlertRule(
      id,
      organizationId,
      req.body,
      userId
    );

    res.json({
      success: true,
      data: rule,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /api/alert-rules/:id
 * Delete an alert rule
 */
router.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const organizationId = req.organizationId!;
    const userId = req.user!.userId;
    const { id } = req.params;

    await alertRuleService.deleteAlertRule(id, organizationId, userId);

    res.json({
      success: true,
      message: 'Alert rule deleted',
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/alert-rules/:id/toggle
 * Toggle an alert rule's enabled status
 */
router.post('/:id/toggle', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const organizationId = req.organizationId!;
    const userId = req.user!.userId;
    const { id } = req.params;

    const rule = await alertRuleService.toggleAlertRule(id, organizationId, userId);

    res.json({
      success: true,
      data: rule,
    });
  } catch (error) {
    next(error);
  }
});

export default router;
