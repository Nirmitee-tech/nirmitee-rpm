import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { Prisma, AlertType, AlertSeverity } from '@prisma/client';
import { prisma } from '../../utils/prisma';
import { authenticate } from '../../middleware/auth-middleware';
import { auditService } from '../../services/audit-service';
import { log } from '../../utils/logger';

const router = Router();

// Apply authentication middleware to all routes
router.use(authenticate);

// ============================================
// VALIDATION SCHEMAS
// ============================================

const ListAlertsQuerySchema = z.object({
  patientId: z.string().optional(),
  status: z.enum(['NEW', 'ACKNOWLEDGED', 'IN_PROGRESS', 'RESOLVED', 'ESCALATED']).optional(),
  severity: z.enum(['INFO', 'SIGNIFICANT', 'CRITICAL']).optional(),
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
});

const AcknowledgeAlertSchema = z.object({
  notes: z.string().optional(),
});

const ResolveAlertSchema = z.object({
  resolution: z.string().min(1, 'Resolution is required'),
});

const CreateAlertSchema = z.object({
  patientId: z.string().min(1),
  type: z.enum(['VITAL_THRESHOLD', 'MEDICATION_REMINDER', 'APPOINTMENT_REMINDER', 'CARE_PLAN', 'CUSTOM']),
  severity: z.enum(['INFO', 'SIGNIFICANT', 'CRITICAL']),
  message: z.string().min(1),
  metadata: z.record(z.unknown()).optional(),
});

// ============================================
// ROUTES
// ============================================

/**
 * GET /api/patient-alerts
 * List alerts for organization (with optional filters)
 */
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const organizationId = req.user!.organizationId!;
    const query = ListAlertsQuerySchema.parse(req.query);

    const where: Record<string, unknown> = {
      organizationId,
    };

    if (query.patientId) {
      where.patientId = query.patientId;
    }

    if (query.status) {
      where.status = query.status;
    }

    if (query.severity) {
      where.severity = query.severity;
    }

    const [alerts, total] = await Promise.all([
      prisma.alert.findMany({
        where,
        include: {
          patient: {
            include: {
              user: {
                select: { firstName: true, lastName: true },
              },
            },
          },
          vitalReading: {
            select: { type: true, values: true },
          },
          assignedTo: {
            select: { id: true, firstName: true, lastName: true },
          },
          acknowledgedBy: {
            select: { id: true, firstName: true, lastName: true },
          },
        },
        orderBy: [
          { severity: 'desc' }, // CRITICAL first
          { createdAt: 'desc' },
        ],
        skip: (query.page - 1) * query.limit,
        take: query.limit,
      }),
      prisma.alert.count({ where }),
    ]);

    res.json({
      success: true,
      data: alerts,
      pagination: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages: Math.ceil(total / query.limit),
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/patient-alerts/patient/:patientId
 * Get alerts for a specific patient
 */
router.get('/patient/:patientId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const organizationId = req.user!.organizationId!;
    const { patientId } = req.params;
    const { status, limit } = req.query;

    const where: Record<string, unknown> = {
      patientId,
      organizationId,
    };

    // Filter by status (can be comma-separated: "NEW,ACKNOWLEDGED")
    if (status) {
      const statuses = (status as string).split(',');
      where.status = { in: statuses };
    } else {
      // Default to non-resolved alerts
      where.status = { in: ['NEW', 'ACKNOWLEDGED', 'IN_PROGRESS', 'ESCALATED'] };
    }

    const alerts = await prisma.alert.findMany({
      where,
      include: {
        vitalReading: {
          select: { type: true, values: true, recordedAt: true },
        },
        assignedTo: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
      orderBy: [
        { severity: 'desc' },
        { createdAt: 'desc' },
      ],
      take: limit ? parseInt(limit as string) : 10,
    });

    res.json({
      success: true,
      data: alerts,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/patient-alerts/:alertId
 * Get single alert details
 */
router.get('/:alertId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const organizationId = req.user!.organizationId!;
    const { alertId } = req.params;

    const alert = await prisma.alert.findFirst({
      where: { id: alertId, organizationId },
      include: {
        patient: {
          include: {
            user: { select: { firstName: true, lastName: true, email: true } },
          },
        },
        vitalReading: true,
        assignedTo: { select: { id: true, firstName: true, lastName: true } },
        escalatedTo: { select: { id: true, firstName: true, lastName: true } },
        acknowledgedBy: { select: { id: true, firstName: true, lastName: true } },
        escalations: {
          orderBy: { executedAt: 'desc' },
          include: {
            fromUser: { select: { firstName: true, lastName: true } },
            toUser: { select: { firstName: true, lastName: true } },
          },
        },
      },
    });

    if (!alert) {
      return res.status(404).json({ success: false, error: 'Alert not found' });
    }

    res.json({ success: true, data: alert });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/patient-alerts
 * Create a manual alert
 */
router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.userId!;
    const organizationId = req.user!.organizationId!;
    const data = CreateAlertSchema.parse(req.body);

    // Verify patient exists in organization
    const patient = await prisma.patient.findFirst({
      where: { id: data.patientId, organizationId },
    });

    if (!patient) {
      return res.status(404).json({ success: false, error: 'Patient not found' });
    }

    const alert = await prisma.alert.create({
      data: {
        patientId: data.patientId,
        organizationId,
        type: data.type as AlertType,
        severity: data.severity as AlertSeverity,
        message: data.message,
        metadata: data.metadata as Prisma.InputJsonValue,
        assignedToId: userId, // Assign to creator by default
      },
      include: {
        patient: {
          include: { user: { select: { firstName: true, lastName: true } } },
        },
      },
    });

    // Audit log
    await auditService.log({
      userId,
      organizationId,
      action: 'alert.created',
      entity: 'alert',
      entityId: alert.id,
      metadata: { patientId: data.patientId, severity: data.severity, type: data.type },
    });

    log.info('[ALERT_ROUTES] Alert created', { alertId: alert.id, patientId: data.patientId });

    res.status(201).json({ success: true, data: alert });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/patient-alerts/:alertId/acknowledge
 * Acknowledge an alert
 */
router.post('/:alertId/acknowledge', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.userId!;
    const organizationId = req.user!.organizationId!;
    const { alertId } = req.params;
    const { notes } = AcknowledgeAlertSchema.parse(req.body);

    const alert = await prisma.alert.findFirst({
      where: { id: alertId, organizationId },
    });

    if (!alert) {
      return res.status(404).json({ success: false, error: 'Alert not found' });
    }

    if (alert.status === 'RESOLVED') {
      return res.status(400).json({ success: false, error: 'Alert is already resolved' });
    }

    const updated = await prisma.alert.update({
      where: { id: alertId },
      data: {
        status: 'ACKNOWLEDGED',
        acknowledgedAt: new Date(),
        acknowledgedById: userId,
        metadata: {
          ...(alert.metadata as Record<string, unknown> || {}),
          acknowledgeNotes: notes,
        },
      },
      include: {
        acknowledgedBy: { select: { firstName: true, lastName: true } },
      },
    });

    // Audit log
    await auditService.log({
      userId,
      organizationId,
      action: 'alert.acknowledged',
      entity: 'alert',
      entityId: alertId,
      metadata: { notes },
    });

    log.info('[ALERT_ROUTES] Alert acknowledged', { alertId, userId });

    res.json({ success: true, data: updated });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/patient-alerts/:alertId/resolve
 * Resolve an alert
 */
router.post('/:alertId/resolve', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.userId!;
    const organizationId = req.user!.organizationId!;
    const { alertId } = req.params;
    const { resolution } = ResolveAlertSchema.parse(req.body);

    const alert = await prisma.alert.findFirst({
      where: { id: alertId, organizationId },
    });

    if (!alert) {
      return res.status(404).json({ success: false, error: 'Alert not found' });
    }

    if (alert.status === 'RESOLVED') {
      return res.status(400).json({ success: false, error: 'Alert is already resolved' });
    }

    const updated = await prisma.alert.update({
      where: { id: alertId },
      data: {
        status: 'RESOLVED',
        resolvedAt: new Date(),
        resolution,
        // If not acknowledged yet, acknowledge now
        ...(!alert.acknowledgedAt && {
          acknowledgedAt: new Date(),
          acknowledgedById: userId,
        }),
      },
    });

    // Audit log
    await auditService.log({
      userId,
      organizationId,
      action: 'alert.resolved',
      entity: 'alert',
      entityId: alertId,
      metadata: { resolution },
    });

    log.info('[ALERT_ROUTES] Alert resolved', { alertId, userId });

    res.json({ success: true, data: updated });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/patient-alerts/:alertId/dismiss
 * Dismiss/close an alert (similar to resolve but for non-issues)
 */
router.post('/:alertId/dismiss', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.userId!;
    const organizationId = req.user!.organizationId!;
    const { alertId } = req.params;
    const { reason } = req.body;

    const alert = await prisma.alert.findFirst({
      where: { id: alertId, organizationId },
    });

    if (!alert) {
      return res.status(404).json({ success: false, error: 'Alert not found' });
    }

    const updated = await prisma.alert.update({
      where: { id: alertId },
      data: {
        status: 'RESOLVED',
        resolvedAt: new Date(),
        resolution: reason || 'Dismissed by provider',
        acknowledgedAt: alert.acknowledgedAt || new Date(),
        acknowledgedById: alert.acknowledgedById || userId,
      },
    });

    // Audit log
    await auditService.log({
      userId,
      organizationId,
      action: 'alert.dismissed',
      entity: 'alert',
      entityId: alertId,
      metadata: { reason },
    });

    log.info('[ALERT_ROUTES] Alert dismissed', { alertId, userId });

    res.json({ success: true, data: updated });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/patient-alerts/stats/summary
 * Get alert statistics
 */
router.get('/stats/summary', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const organizationId = req.user!.organizationId!;
    const { patientId } = req.query;

    const where: Record<string, unknown> = { organizationId };
    if (patientId) where.patientId = patientId as string;

    const [total, newCount, criticalCount, acknowledgedCount] = await Promise.all([
      prisma.alert.count({ where }),
      prisma.alert.count({ where: { ...where, status: 'NEW' } }),
      prisma.alert.count({ where: { ...where, severity: 'CRITICAL', status: { not: 'RESOLVED' } } }),
      prisma.alert.count({ where: { ...where, status: 'ACKNOWLEDGED' } }),
    ]);

    res.json({
      success: true,
      data: {
        total,
        new: newCount,
        critical: criticalCount,
        acknowledged: acknowledgedCount,
      },
    });
  } catch (error) {
    next(error);
  }
});

export default router;
