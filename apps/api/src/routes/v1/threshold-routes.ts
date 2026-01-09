import { Router, Request, Response, NextFunction } from 'express';
import { VitalType } from '@prisma/client';
import { thresholdService } from '../../services/threshold-service';
import { auditService } from '../../services/audit-service';
import { authenticate } from '../../middleware/auth-middleware';
import { log } from '../../utils/logger';

const router = Router();

// Apply authentication middleware to all routes
router.use(authenticate);

// ============================================
// ORGANIZATION THRESHOLDS
// ============================================

/**
 * GET /api/thresholds
 * List all organization thresholds
 */
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const organizationId = req.user!.organizationId!;

    const thresholds = await thresholdService.getOrganizationThresholds(organizationId);

    res.json({
      success: true,
      data: thresholds,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/thresholds/defaults
 * Get system default thresholds
 */
router.get('/defaults', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const vitalTypes = Object.values(VitalType);
    const defaults = vitalTypes.map(vitalType => ({
      vitalType,
      config: thresholdService.getSystemDefaults(vitalType),
    }));

    res.json({
      success: true,
      data: defaults,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/thresholds/:vitalType
 * Get organization threshold for specific vital type
 */
router.get('/:vitalType', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const organizationId = req.user!.organizationId!;
    const { vitalType } = req.params;

    // Validate vital type
    if (!Object.values(VitalType).includes(vitalType as VitalType)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid vital type',
      });
    }

    const thresholds = await thresholdService.getOrganizationThresholds(organizationId);
    const threshold = thresholds.find(t => t.vitalType === vitalType);

    if (!threshold) {
      return res.status(404).json({
        success: false,
        error: 'Threshold not found',
      });
    }

    res.json({
      success: true,
      data: threshold,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /api/thresholds/:vitalType
 * Set organization threshold for specific vital type
 */
router.put('/:vitalType', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.userId!;
    const organizationId = req.user!.organizationId!;
    const { vitalType } = req.params;
    const data = req.body;

    // Validate vital type
    if (!Object.values(VitalType).includes(vitalType as VitalType)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid vital type',
      });
    }

    const threshold = await thresholdService.setOrganizationThresholds(
      organizationId,
      vitalType as VitalType,
      data
    );

    // Audit log
    await auditService.log({
      userId,
      organizationId,
      action: 'threshold.updated',
      entity: 'threshold',
      entityId: vitalType,
      newValues: threshold as unknown as Record<string, unknown>,
    });

    log.info('[THRESHOLD_ROUTES] Organization threshold updated', {
      organizationId,
      vitalType,
      userId,
    });

    res.json({
      success: true,
      data: threshold,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /api/thresholds/:vitalType
 * Reset organization threshold to system defaults
 */
router.delete('/:vitalType', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.userId!;
    const organizationId = req.user!.organizationId!;
    const { vitalType } = req.params;

    // Validate vital type
    if (!Object.values(VitalType).includes(vitalType as VitalType)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid vital type',
      });
    }

    await thresholdService.resetOrganizationThreshold(organizationId, vitalType as VitalType);

    // Audit log
    await auditService.log({
      userId,
      organizationId,
      action: 'threshold.reset',
      entity: 'threshold',
      entityId: vitalType,
    });

    log.info('[THRESHOLD_ROUTES] Organization threshold reset', {
      organizationId,
      vitalType,
      userId,
    });

    res.json({
      success: true,
      message: 'Threshold reset to system defaults',
    });
  } catch (error) {
    next(error);
  }
});

// ============================================
// PATIENT THRESHOLDS
// ============================================

/**
 * GET /api/thresholds/patients/:patientId
 * Get all thresholds for a patient
 */
router.get('/patients/:patientId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const organizationId = req.user!.organizationId!;
    const { patientId } = req.params;

    const thresholds = await thresholdService.getPatientThresholds(patientId, organizationId);

    res.json({
      success: true,
      data: thresholds,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/thresholds/patients/:patientId/:vitalType
 * Get effective threshold for a patient and vital type
 */
router.get(
  '/patients/:patientId/:vitalType',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const organizationId = req.user!.organizationId!;
      const { patientId, vitalType } = req.params;

      // Validate vital type
      if (!Object.values(VitalType).includes(vitalType as VitalType)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid vital type',
        });
      }

      const threshold = await thresholdService.getEffectiveThresholds(
        patientId,
        organizationId,
        vitalType as VitalType
      );

      res.json({
        success: true,
        data: {
          vitalType,
          config: threshold,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * PUT /api/thresholds/patients/:patientId/:vitalType
 * Set patient-specific threshold
 */
router.put(
  '/patients/:patientId/:vitalType',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.userId!;
      const organizationId = req.user!.organizationId!;
      const { patientId, vitalType } = req.params;
      const data = req.body;

      // Validate vital type
      if (!Object.values(VitalType).includes(vitalType as VitalType)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid vital type',
        });
      }

      const threshold = await thresholdService.setPatientThresholds(
        patientId,
        organizationId,
        vitalType as VitalType,
        data,
        userId
      );

      // Audit log
      await auditService.log({
        userId,
        organizationId,
        action: 'patient.threshold.updated',
        entity: 'patient',
        entityId: patientId,
        metadata: { vitalType },
        newValues: threshold as unknown as Record<string, unknown>,
      });

      log.info('[THRESHOLD_ROUTES] Patient threshold updated', {
        patientId,
        vitalType,
        userId,
      });

      res.json({
        success: true,
        data: threshold,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * DELETE /api/thresholds/patients/:patientId/:vitalType
 * Reset patient threshold to organization default
 */
router.delete(
  '/patients/:patientId/:vitalType',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.userId!;
      const organizationId = req.user!.organizationId!;
      const { patientId, vitalType } = req.params;

      // Validate vital type
      if (!Object.values(VitalType).includes(vitalType as VitalType)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid vital type',
        });
      }

      await thresholdService.resetPatientThreshold(patientId, vitalType as VitalType);

      // Audit log
      await auditService.log({
        userId,
        organizationId,
        action: 'patient.threshold.reset',
        entity: 'patient',
        entityId: patientId,
        metadata: { vitalType },
      });

      log.info('[THRESHOLD_ROUTES] Patient threshold reset', {
        patientId,
        vitalType,
        userId,
      });

      res.json({
        success: true,
        message: 'Patient threshold reset to organization default',
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
