import { Router, Request, Response, NextFunction } from 'express';
import { AlertSeverity, VitalType, EscalationReason } from '@prisma/client';
import { escalationService } from '../../services/escalation-service';
import { auditService } from '../../services/audit-service';
import { authenticate } from '../../middleware/auth-middleware';
import { log } from '../../utils/logger';

const router = Router();

// Apply authentication middleware to all routes
router.use(authenticate);

// ============================================
// ESCALATION RULES
// ============================================

/**
 * GET /api/escalation-rules
 * List all escalation rules for organization
 */
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const organizationId = req.user!.organizationId!;

    const rules = await escalationService.getRules(organizationId);

    res.json({
      success: true,
      data: rules,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/escalation-rules
 * Create a new escalation rule
 */
router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.userId!;
    const organizationId = req.user!.organizationId!;
    const { name, description, severity, vitalTypes, escalationChain, isActive, autoAssign, priority } = req.body;

    // Validate required fields
    if (!name || !severity || !escalationChain) {
      return res.status(400).json({
        success: false,
        error: 'name, severity, and escalationChain are required',
      });
    }

    // Validate severity
    if (!Object.values(AlertSeverity).includes(severity)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid severity value',
      });
    }

    // Validate vital types if provided
    if (vitalTypes && vitalTypes.length > 0) {
      const invalidTypes = vitalTypes.filter((t: string) => !Object.values(VitalType).includes(t as VitalType));
      if (invalidTypes.length > 0) {
        return res.status(400).json({
          success: false,
          error: `Invalid vital types: ${invalidTypes.join(', ')}`,
        });
      }
    }

    // Validate escalation chain
    if (!Array.isArray(escalationChain) || escalationChain.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'escalationChain must be a non-empty array',
      });
    }

    const rule = await escalationService.createRule(organizationId, {
      name,
      description,
      severity,
      vitalTypes: vitalTypes || [],
      escalationChain,
      isActive,
      autoAssign,
      priority,
    });

    // Audit log
    await auditService.log({
      userId,
      organizationId,
      action: 'escalation_rule.created',
      entity: 'escalation_rule',
      entityId: rule.id,
      newValues: rule,
    });

    log.info('[ESCALATION_ROUTES] Escalation rule created', {
      ruleId: rule.id,
      name: rule.name,
      userId,
    });

    res.status(201).json({
      success: true,
      data: rule,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/escalation-rules/:ruleId
 * Get a specific escalation rule
 */
router.get('/:ruleId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const organizationId = req.user!.organizationId!;
    const { ruleId } = req.params;

    const rules = await escalationService.getRules(organizationId);
    const rule = rules.find(r => r.id === ruleId);

    if (!rule) {
      return res.status(404).json({
        success: false,
        error: 'Escalation rule not found',
      });
    }

    res.json({
      success: true,
      data: rule,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /api/escalation-rules/:ruleId
 * Update an escalation rule
 */
router.put('/:ruleId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.userId!;
    const organizationId = req.user!.organizationId!;
    const { ruleId } = req.params;
    const data = req.body;

    // Validate severity if provided
    if (data.severity && !Object.values(AlertSeverity).includes(data.severity)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid severity value',
      });
    }

    // Validate vital types if provided
    if (data.vitalTypes && data.vitalTypes.length > 0) {
      const invalidTypes = data.vitalTypes.filter((t: string) => !Object.values(VitalType).includes(t as VitalType));
      if (invalidTypes.length > 0) {
        return res.status(400).json({
          success: false,
          error: `Invalid vital types: ${invalidTypes.join(', ')}`,
        });
      }
    }

    const rule = await escalationService.updateRule(ruleId, organizationId, data);

    // Audit log
    await auditService.log({
      userId,
      organizationId,
      action: 'escalation_rule.updated',
      entity: 'escalation_rule',
      entityId: ruleId,
      newValues: data,
    });

    log.info('[ESCALATION_ROUTES] Escalation rule updated', {
      ruleId,
      name: rule.name,
      userId,
    });

    res.json({
      success: true,
      data: rule,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /api/escalation-rules/:ruleId
 * Delete an escalation rule
 */
router.delete('/:ruleId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.userId!;
    const organizationId = req.user!.organizationId!;
    const { ruleId } = req.params;

    await escalationService.deleteRule(ruleId, organizationId);

    // Audit log
    await auditService.log({
      userId,
      organizationId,
      action: 'escalation_rule.deleted',
      entity: 'escalation_rule',
      entityId: ruleId,
    });

    log.info('[ESCALATION_ROUTES] Escalation rule deleted', {
      ruleId,
      userId,
    });

    res.json({
      success: true,
      message: 'Escalation rule deleted',
    });
  } catch (error) {
    next(error);
  }
});

// ============================================
// ALERT ESCALATION ACTIONS
// ============================================

/**
 * POST /api/alerts/:alertId/escalate
 * Manually escalate an alert
 */
router.post('/alerts/:alertId/escalate', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.userId!;
    const organizationId = req.user!.organizationId!;
    const { alertId } = req.params;
    const { reason, notes } = req.body;

    // Validate reason if provided
    if (reason && !Object.values(EscalationReason).includes(reason)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid escalation reason',
      });
    }

    const result = await escalationService.escalateAlert(
      alertId,
      reason || EscalationReason.MANUAL_ESCALATION,
      notes
    );

    if (!result.success) {
      return res.status(400).json({
        success: false,
        error: result.error,
      });
    }

    // Audit log
    await auditService.log({
      userId,
      organizationId,
      action: 'alert.escalated',
      entity: 'alert',
      entityId: alertId,
      metadata: { reason, notes },
      newValues: result.alert,
    });

    log.info('[ESCALATION_ROUTES] Alert manually escalated', {
      alertId,
      newLevel: result.alert?.escalationLevel,
      userId,
    });

    res.json({
      success: true,
      data: result.alert,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/alerts/:alertId/escalations
 * Get escalation history for an alert
 */
router.get('/alerts/:alertId/escalations', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { alertId } = req.params;

    const history = await escalationService.getEscalationHistory(alertId);

    res.json({
      success: true,
      data: history,
    });
  } catch (error) {
    next(error);
  }
});

export default router;
