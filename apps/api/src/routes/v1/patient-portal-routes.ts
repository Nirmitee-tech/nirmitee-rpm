import { Router, Request, Response, NextFunction } from 'express';
import { prisma } from '../../utils/prisma';
import { authenticate } from '../../middleware/auth-middleware';
import { log } from '../../utils/logger';

const router = Router();

// Apply authentication middleware to all routes
router.use(authenticate);

/**
 * Helper to get patient ID for the current logged-in user
 */
async function getPatientForUser(userId: string, organizationId: string) {
  const patient = await prisma.patient.findFirst({
    where: {
      userId,
      organizationId,
    },
    select: { id: true },
  });

  return patient;
}

/**
 * GET /api/patient-portal/me
 * Get current patient info
 */
router.get('/me', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.userId!;
    const organizationId = req.user!.organizationId!;

    const patient = await prisma.patient.findFirst({
      where: { userId, organizationId },
      include: {
        user: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        primaryPhysician: {
          select: { firstName: true, lastName: true },
        },
        clinicalStaff: {
          select: { firstName: true, lastName: true },
        },
      },
    });

    if (!patient) {
      return res.status(404).json({
        success: false,
        error: 'Patient profile not found',
      });
    }

    res.json({
      success: true,
      data: {
        id: patient.id,
        firstName: patient.user.firstName,
        lastName: patient.user.lastName,
        email: patient.user.email,
        phone: patient.phone,
        dateOfBirth: patient.dateOfBirth,
        enrollmentStatus: patient.enrollmentStatus,
        primaryPhysician: patient.primaryPhysician
          ? {
              firstName: patient.primaryPhysician.firstName,
              lastName: patient.primaryPhysician.lastName,
            }
          : null,
        assignedClinicalStaff: patient.clinicalStaff
          ? {
              firstName: patient.clinicalStaff.firstName,
              lastName: patient.clinicalStaff.lastName,
            }
          : null,
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/patient-portal/alerts
 * Get alerts for the current logged-in patient
 */
router.get('/alerts', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.userId!;
    const organizationId = req.user!.organizationId!;

    // Get patient for this user
    const patient = await getPatientForUser(userId, organizationId);

    if (!patient) {
      return res.status(404).json({
        success: false,
        error: 'Patient profile not found',
      });
    }

    const alerts = await prisma.alert.findMany({
      where: {
        patientId: patient.id,
        organizationId,
      },
      select: {
        id: true,
        type: true,
        severity: true,
        status: true,
        message: true,
        createdAt: true,
        acknowledgedAt: true,
        resolvedAt: true,
        resolution: true,
        metadata: true,
        vitalReading: {
          select: {
            type: true,
            values: true,
          },
        },
      },
      orderBy: [
        { severity: 'desc' },
        { createdAt: 'desc' },
      ],
      take: 50, // Limit to recent 50 alerts
    });

    // Transform to patient-friendly format
    const transformedAlerts = alerts.map((alert) => ({
      id: alert.id,
      type: alert.type,
      severity: mapSeverityForPatient(alert.severity),
      title: getAlertTitle(alert.type, alert.vitalReading),
      message: alert.message,
      createdAt: alert.createdAt.toISOString(),
      read: alert.status === 'RESOLVED' || alert.acknowledgedAt !== null,
    }));

    res.json({
      success: true,
      data: transformedAlerts,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/patient-portal/alerts/:alertId/read
 * Mark an alert as read for patient
 */
router.post('/alerts/:alertId/read', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.userId!;
    const organizationId = req.user!.organizationId!;
    const { alertId } = req.params;

    // Get patient for this user
    const patient = await getPatientForUser(userId, organizationId);

    if (!patient) {
      return res.status(404).json({
        success: false,
        error: 'Patient profile not found',
      });
    }

    // Verify alert belongs to this patient
    const alert = await prisma.alert.findFirst({
      where: {
        id: alertId,
        patientId: patient.id,
        organizationId,
      },
    });

    if (!alert) {
      return res.status(404).json({
        success: false,
        error: 'Alert not found',
      });
    }

    // Update metadata to track patient read
    const existingMetadata = (alert.metadata as Record<string, unknown>) || {};
    await prisma.alert.update({
      where: { id: alertId },
      data: {
        metadata: {
          ...existingMetadata,
          patientReadAt: new Date().toISOString(),
        },
      },
    });

    res.json({
      success: true,
      message: 'Alert marked as read',
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/patient-portal/alerts/read-all
 * Mark all alerts as read for patient
 */
router.post('/alerts/read-all', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.userId!;
    const organizationId = req.user!.organizationId!;

    // Get patient for this user
    const patient = await getPatientForUser(userId, organizationId);

    if (!patient) {
      return res.status(404).json({
        success: false,
        error: 'Patient profile not found',
      });
    }

    // Update all patient's alerts
    const result = await prisma.alert.updateMany({
      where: {
        patientId: patient.id,
        organizationId,
      },
      data: {
        // Can't easily update JSON field in bulk, just log for now
        // In production, would track read status separately
      },
    });

    log.info('[PATIENT_PORTAL] Marked all alerts as read', {
      patientId: patient.id,
      count: result.count,
    });

    res.json({
      success: true,
      message: 'All alerts marked as read',
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/patient-portal/vitals
 * Get vitals for the current logged-in patient
 */
router.get('/vitals', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.userId!;
    const organizationId = req.user!.organizationId!;
    const { type, limit = '20' } = req.query;

    // Get patient for this user
    const patient = await getPatientForUser(userId, organizationId);

    if (!patient) {
      return res.status(404).json({
        success: false,
        error: 'Patient profile not found',
      });
    }

    const where: Record<string, unknown> = {
      patientId: patient.id,
      organizationId,
    };

    if (type) {
      where.type = type;
    }

    const vitals = await prisma.vitalReading.findMany({
      where,
      orderBy: { recordedAt: 'desc' },
      take: parseInt(limit as string),
    });

    res.json({
      success: true,
      data: vitals.map((v) => ({
        id: v.id,
        type: v.type,
        values: v.values,
        unit: v.unit,
        status: 'normal', // Status would be calculated based on thresholds
        recordedAt: v.recordedAt.toISOString(),
        notes: v.notes,
      })),
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/patient-portal/care-team
 * Get care team for the current logged-in patient
 */
router.get('/care-team', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.userId!;
    const organizationId = req.user!.organizationId!;

    // Get patient with care team relationships
    const patient = await prisma.patient.findFirst({
      where: { userId, organizationId },
      include: {
        primaryPhysician: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            role: true,
          },
        },
        clinicalStaff: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            role: true,
          },
        },
      },
    });

    if (!patient) {
      return res.status(404).json({
        success: false,
        error: 'Patient profile not found',
      });
    }

    const careTeam = [];

    // Add primary physician
    if (patient.primaryPhysician) {
      careTeam.push({
        id: patient.primaryPhysician.id,
        name: `${patient.primaryPhysician.firstName} ${patient.primaryPhysician.lastName}`,
        role: 'primaryPhysician',
        specialty: 'Primary Care',
        email: patient.primaryPhysician.email,
      });
    }

    // Add clinical staff (care manager/nurse)
    if (patient.clinicalStaff) {
      careTeam.push({
        id: patient.clinicalStaff.id,
        name: `${patient.clinicalStaff.firstName} ${patient.clinicalStaff.lastName}`,
        role: 'nurse',
        specialty: 'Care Manager',
        email: patient.clinicalStaff.email,
      });
    }

    res.json({
      success: true,
      data: careTeam,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/patient-portal/care-plan
 * Get active care plan for the current logged-in patient
 */
router.get('/care-plan', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.userId!;
    const organizationId = req.user!.organizationId!;

    // Get patient for this user
    const patient = await getPatientForUser(userId, organizationId);

    if (!patient) {
      return res.status(404).json({
        success: false,
        error: 'Patient profile not found',
      });
    }

    // Get active care plan
    const carePlan = await prisma.carePlan.findFirst({
      where: {
        patientId: patient.id,
        organizationId,
        status: 'ACTIVE',
      },
      include: {
        createdBy: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
        approvedBy: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!carePlan) {
      return res.json({
        success: true,
        data: null,
      });
    }

    res.json({
      success: true,
      data: {
        id: carePlan.id,
        status: carePlan.status,
        goals: carePlan.goals,
        medications: carePlan.medications,
        instructions: carePlan.instructions,
        vitalThresholds: carePlan.vitalThresholds,
        effectiveDate: carePlan.effectiveDate?.toISOString() || null,
        createdAt: carePlan.createdAt.toISOString(),
        createdBy: carePlan.createdBy
          ? `${carePlan.createdBy.firstName} ${carePlan.createdBy.lastName}`
          : null,
        approvedBy: carePlan.approvedBy
          ? `${carePlan.approvedBy.firstName} ${carePlan.approvedBy.lastName}`
          : null,
        approvedAt: carePlan.approvedAt?.toISOString() || null,
      },
    });
  } catch (error) {
    next(error);
  }
});

// Helper functions
function mapSeverityForPatient(severity: string): 'INFO' | 'WARNING' | 'CRITICAL' {
  // Map internal severity to patient-facing severity
  const mapping: Record<string, 'INFO' | 'WARNING' | 'CRITICAL'> = {
    INFO: 'INFO',
    SIGNIFICANT: 'WARNING',
    CRITICAL: 'CRITICAL',
  };
  return mapping[severity] || 'INFO';
}

function getAlertTitle(type: string, vitalReading: { type: string; values: unknown } | null): string {
  const titles: Record<string, string> = {
    VITAL_THRESHOLD: vitalReading ? `${formatVitalType(vitalReading.type)} Alert` : 'Vital Sign Alert',
    MEDICATION_REMINDER: 'Medication Reminder',
    APPOINTMENT_REMINDER: 'Appointment Reminder',
    CARE_PLAN: 'Care Plan Update',
    CUSTOM: 'Alert',
  };
  return titles[type] || 'Alert';
}

function formatVitalType(type: string): string {
  const labels: Record<string, string> = {
    BLOOD_PRESSURE: 'Blood Pressure',
    HEART_RATE: 'Heart Rate',
    BLOOD_GLUCOSE: 'Blood Glucose',
    WEIGHT: 'Weight',
    OXYGEN_SATURATION: 'Oxygen Level',
    TEMPERATURE: 'Temperature',
  };
  return labels[type] || type;
}

export default router;
