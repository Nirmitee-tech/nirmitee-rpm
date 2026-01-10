/**
 * Alert Intelligence Routes
 * AI prioritization, workload balancing, and SLA management
 */

import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { alertIntelligenceService } from '../../services/alert-intelligence-service';
import { AlertSeverity, AlertStatus, VitalType } from '@prisma/client';
import { prisma } from '../../utils/prisma';

const router = Router();

// ==========================================
// ALERT SCORING
// ==========================================

router.post('/score/:alertId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const alert = await prisma.alert.findFirst({
      where: { id: req.params.alertId, organizationId: req.user!.organizationId! },
    });
    if (!alert) {
      return res.status(404).json({ error: 'Alert not found' });
    }
    const score = await alertIntelligenceService.calculateAlertScore(
      alert,
      req.user!.organizationId!
    );
    res.json(score);
  } catch (error) {
    next(error);
  }
});

// ==========================================
// PRIORITY QUEUE
// ==========================================

router.get('/priority-queue', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { limit, status, severity } = req.query;
    const alerts = await alertIntelligenceService.getPrioritizedAlerts(
      req.user!.organizationId!,
      {
        limit: limit ? parseInt(limit as string, 10) : undefined,
        status: status as AlertStatus | undefined,
        severity: severity as AlertSeverity | undefined,
      }
    );
    res.json(alerts);
  } catch (error) {
    next(error);
  }
});

// ==========================================
// WORKLOAD MANAGEMENT
// ==========================================

router.get('/workload', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const workload = await alertIntelligenceService.getOrCreateWorkload(
      req.user!.userId,
      req.user!.organizationId!
    );
    res.json(workload);
  } catch (error) {
    next(error);
  }
});

router.get('/available-staff', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const staff = await alertIntelligenceService.getAvailableStaff(
      req.user!.organizationId!
    );
    res.json(staff);
  } catch (error) {
    next(error);
  }
});

router.post('/assign/:alertId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const alert = await alertIntelligenceService.autoAssignAlert(
      req.params.alertId,
      req.user!.organizationId!
    );
    if (!alert) {
      return res.status(404).json({ error: 'No available staff for assignment' });
    }
    res.json(alert);
  } catch (error) {
    next(error);
  }
});

// ==========================================
// SLA MANAGEMENT
// ==========================================

const createSlaSchema = z.object({
  name: z.string().min(1),
  severity: z.nativeEnum(AlertSeverity),
  vitalTypes: z.array(z.nativeEnum(VitalType)),
  acknowledgeSla: z.number().min(1),
  resolveSla: z.number().min(1),
  escalateSla: z.number().min(1),
  warningThreshold: z.number().min(1),
  priority: z.number().optional(),
});

router.post('/sla', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = createSlaSchema.parse(req.body);
    const config = await alertIntelligenceService.createSlaConfig(
      data,
      req.user!.organizationId!,
      req.user!.userId
    );
    res.status(201).json(config);
  } catch (error) {
    next(error);
  }
});

router.get('/sla', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const configs = await alertIntelligenceService.getSlaConfigs(
      req.user!.organizationId!
    );
    res.json(configs);
  } catch (error) {
    next(error);
  }
});

router.get('/sla/breaches', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const alerts = await alertIntelligenceService.getAlertsNearingSlaBreach(
      req.user!.organizationId!
    );
    res.json(alerts);
  } catch (error) {
    next(error);
  }
});

router.get('/sla/:alertId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await alertIntelligenceService.checkSlaBreach(req.params.alertId);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

// ==========================================
// DEDUPLICATION
// ==========================================

router.get('/similar/:alertId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const alert = await prisma.alert.findFirst({
      where: { id: req.params.alertId, organizationId: req.user!.organizationId! },
    });
    if (!alert) {
      return res.status(404).json({ error: 'Alert not found' });
    }
    const similar = await alertIntelligenceService.findSimilarAlert(
      alert.patientId,
      req.user!.organizationId!,
      alert.type
    );
    res.json({ similar });
  } catch (error) {
    next(error);
  }
});

export default router;
