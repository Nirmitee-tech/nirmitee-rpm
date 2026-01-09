import { Router, Request, Response, NextFunction } from 'express';
import { prisma } from '../../utils/prisma';
import { authenticate } from '../../middleware/auth-middleware';
import { log } from '../../utils/logger';

const router = Router();

// Apply authentication middleware to all routes
router.use(authenticate);

/**
 * Helper to get caregiver for the current logged-in user
 */
async function getCaregiverForUser(userId: string, organizationId: string) {
  const caregiver = await prisma.caregiver.findFirst({
    where: {
      userId,
      organizationId,
    },
    include: {
      user: {
        select: { firstName: true, lastName: true, email: true },
      },
    },
  });

  return caregiver;
}

/**
 * GET /api/caregiver-portal/me
 * Get caregiver profile info
 */
router.get('/me', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.userId!;
    const organizationId = req.user!.organizationId!;

    const caregiver = await getCaregiverForUser(userId, organizationId);
    if (!caregiver) {
      return res.status(404).json({
        success: false,
        error: 'Caregiver profile not found',
      });
    }

    res.json({
      success: true,
      data: {
        id: caregiver.id,
        firstName: caregiver.user.firstName,
        lastName: caregiver.user.lastName,
        email: caregiver.user.email,
        phone: caregiver.phone,
        relationship: caregiver.relationship,
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/caregiver-portal/linked-patients
 * Get all patients linked to this caregiver
 */
router.get('/linked-patients', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.userId!;
    const organizationId = req.user!.organizationId!;

    const caregiver = await getCaregiverForUser(userId, organizationId);
    if (!caregiver) {
      return res.status(404).json({
        success: false,
        error: 'Caregiver profile not found',
      });
    }

    const links = await prisma.caregiverLink.findMany({
      where: {
        caregiverId: caregiver.id,
        organizationId,
        status: 'ACTIVE',
      },
      include: {
        patient: {
          include: {
            user: {
              select: { firstName: true, lastName: true },
            },
          },
        },
      },
    });

    const linkedPatients = links.map((link) => ({
      id: link.patient.id,
      firstName: link.patient.user.firstName,
      lastName: link.patient.user.lastName,
      relationship: link.relationshipType,
      accessLevel: link.accessLevel,
      consentGrantedAt: link.consentGrantedAt?.toISOString() || null,
    }));

    res.json({
      success: true,
      data: linkedPatients,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/caregiver-portal/patients/:patientId/vitals
 * Get vitals for a linked patient
 */
router.get('/patients/:patientId/vitals', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.userId!;
    const organizationId = req.user!.organizationId!;
    const { patientId } = req.params;
    const { days = '7' } = req.query;

    const caregiver = await getCaregiverForUser(userId, organizationId);
    if (!caregiver) {
      return res.status(404).json({
        success: false,
        error: 'Caregiver profile not found',
      });
    }

    // Verify caregiver has access to this patient
    const link = await prisma.caregiverLink.findFirst({
      where: {
        caregiverId: caregiver.id,
        patientId,
        organizationId,
        status: 'ACTIVE',
      },
    });

    if (!link) {
      return res.status(403).json({
        success: false,
        error: 'No access to this patient',
      });
    }

    const daysNum = parseInt(days as string, 10) || 7;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - daysNum);

    const readings = await prisma.vitalReading.findMany({
      where: {
        patientId,
        organizationId,
        recordedAt: { gte: startDate },
      },
      orderBy: { recordedAt: 'desc' },
      take: 100,
    });

    const formattedReadings = readings.map((r) => ({
      id: r.id,
      type: r.type,
      values: r.values,
      source: r.source,
      recordedAt: r.recordedAt.toISOString(),
    }));

    res.json({
      success: true,
      data: formattedReadings,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/caregiver-portal/patients/:patientId/alerts
 * Get alerts for a linked patient
 */
router.get('/patients/:patientId/alerts', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.userId!;
    const organizationId = req.user!.organizationId!;
    const { patientId } = req.params;

    const caregiver = await getCaregiverForUser(userId, organizationId);
    if (!caregiver) {
      return res.status(404).json({
        success: false,
        error: 'Caregiver profile not found',
      });
    }

    // Verify caregiver has access
    const link = await prisma.caregiverLink.findFirst({
      where: {
        caregiverId: caregiver.id,
        patientId,
        organizationId,
        status: 'ACTIVE',
      },
    });

    if (!link) {
      return res.status(403).json({
        success: false,
        error: 'No access to this patient',
      });
    }

    const alerts = await prisma.alert.findMany({
      where: {
        patientId,
        organizationId,
        status: { in: ['NEW', 'ACKNOWLEDGED'] },
      },
      orderBy: { createdAt: 'desc' },
      take: 20,
      include: {
        vitalReading: {
          select: { type: true, values: true },
        },
      },
    });

    const formattedAlerts = alerts.map((a) => ({
      id: a.id,
      type: a.type,
      severity: a.severity,
      status: a.status,
      message: a.message,
      vitalType: a.vitalReading?.type ?? null,
      vitalValues: a.vitalReading?.values ?? null,
      createdAt: a.createdAt.toISOString(),
    }));

    res.json({
      success: true,
      data: formattedAlerts,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/caregiver-portal/patients/:patientId/medications
 * Get medications for a linked patient
 */
router.get('/patients/:patientId/medications', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.userId!;
    const organizationId = req.user!.organizationId!;
    const { patientId } = req.params;

    const caregiver = await getCaregiverForUser(userId, organizationId);
    if (!caregiver) {
      return res.status(404).json({
        success: false,
        error: 'Caregiver profile not found',
      });
    }

    // Verify access
    const link = await prisma.caregiverLink.findFirst({
      where: {
        caregiverId: caregiver.id,
        patientId,
        organizationId,
        status: 'ACTIVE',
      },
    });

    if (!link) {
      return res.status(403).json({
        success: false,
        error: 'No access to this patient',
      });
    }

    const medications = await prisma.patientMedication.findMany({
      where: {
        patientId,
        organizationId,
        status: 'ACTIVE',
      },
      orderBy: { name: 'asc' },
    });

    const formattedMeds = medications.map((m) => ({
      id: m.id,
      name: m.name,
      genericName: m.genericName,
      dosage: m.dosage,
      frequency: m.frequency,
      route: m.route,
      instructions: m.instructions,
    }));

    res.json({
      success: true,
      data: formattedMeds,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/caregiver-portal/patients/:patientId/care-plan
 * Get active care plan for a linked patient
 */
router.get('/patients/:patientId/care-plan', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.userId!;
    const organizationId = req.user!.organizationId!;
    const { patientId } = req.params;

    const caregiver = await getCaregiverForUser(userId, organizationId);
    if (!caregiver) {
      return res.status(404).json({
        success: false,
        error: 'Caregiver profile not found',
      });
    }

    // Verify access
    const link = await prisma.caregiverLink.findFirst({
      where: {
        caregiverId: caregiver.id,
        patientId,
        organizationId,
        status: 'ACTIVE',
      },
    });

    if (!link) {
      return res.status(403).json({
        success: false,
        error: 'No access to this patient',
      });
    }

    const carePlan = await prisma.carePlan.findFirst({
      where: {
        patientId,
        organizationId,
        status: 'ACTIVE',
      },
      include: {
        createdBy: {
          select: { firstName: true, lastName: true },
        },
        versions: {
          orderBy: { version: 'desc' },
          take: 1,
        },
      },
    });

    if (!carePlan) {
      return res.json({
        success: true,
        data: null,
      });
    }

    // Get the latest version
    const currentVersion = carePlan.versions[0];

    res.json({
      success: true,
      data: {
        id: carePlan.id,
        name: `Care Plan v${carePlan.currentVersion}`,
        goals: currentVersion?.goals ?? [],
        instructions: currentVersion?.instructions ?? null,
        vitalThresholds: currentVersion?.vitalThresholds ?? null,
        effectiveDate: currentVersion?.effectiveDate?.toISOString() ?? null,
        createdBy: carePlan.createdBy
          ? `Dr. ${carePlan.createdBy.firstName} ${carePlan.createdBy.lastName}`
          : null,
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/caregiver-portal/patients/:patientId/summary
 * Get health summary for a linked patient
 */
router.get('/patients/:patientId/summary', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.userId!;
    const organizationId = req.user!.organizationId!;
    const { patientId } = req.params;

    const caregiver = await getCaregiverForUser(userId, organizationId);
    if (!caregiver) {
      return res.status(404).json({
        success: false,
        error: 'Caregiver profile not found',
      });
    }

    // Verify access
    const link = await prisma.caregiverLink.findFirst({
      where: {
        caregiverId: caregiver.id,
        patientId,
        organizationId,
        status: 'ACTIVE',
      },
    });

    if (!link) {
      return res.status(403).json({
        success: false,
        error: 'No access to this patient',
      });
    }

    // Get patient with care team
    const patient = await prisma.patient.findUnique({
      where: { id: patientId },
      include: {
        user: { select: { firstName: true, lastName: true } },
        primaryPhysician: { select: { firstName: true, lastName: true } },
        clinicalStaff: { select: { firstName: true, lastName: true } },
      },
    });

    if (!patient) {
      return res.status(404).json({
        success: false,
        error: 'Patient not found',
      });
    }

    // Get recent vitals count
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const weekAgo = new Date(today);
    weekAgo.setDate(weekAgo.getDate() - 7);

    const [todayReadings, weekReadings, activeAlerts, activeMeds] = await Promise.all([
      prisma.vitalReading.count({
        where: { patientId, recordedAt: { gte: today } },
      }),
      prisma.vitalReading.count({
        where: { patientId, recordedAt: { gte: weekAgo } },
      }),
      prisma.alert.count({
        where: { patientId, status: { in: ['NEW', 'ACKNOWLEDGED'] } },
      }),
      prisma.patientMedication.count({
        where: { patientId, status: 'ACTIVE' },
      }),
    ]);

    // Get latest readings by type
    const latestByType = await prisma.vitalReading.findMany({
      where: { patientId, organizationId },
      orderBy: { recordedAt: 'desc' },
      take: 10,
      distinct: ['type'],
    });

    res.json({
      success: true,
      data: {
        patient: {
          id: patient.id,
          firstName: patient.user.firstName,
          lastName: patient.user.lastName,
          conditions: patient.conditions,
          enrollmentStatus: patient.enrollmentStatus,
        },
        careTeam: {
          primaryPhysician: patient.primaryPhysician
            ? `Dr. ${patient.primaryPhysician.firstName} ${patient.primaryPhysician.lastName}`
            : null,
          clinicalStaff: patient.clinicalStaff
            ? `${patient.clinicalStaff.firstName} ${patient.clinicalStaff.lastName}`
            : null,
        },
        stats: {
          todayReadings,
          weekReadings,
          activeAlerts,
          activeMedications: activeMeds,
        },
        latestVitals: latestByType.map((v) => ({
          type: v.type,
          values: v.values,
          recordedAt: v.recordedAt.toISOString(),
        })),
      },
    });
  } catch (error) {
    next(error);
  }
});

export default router;
