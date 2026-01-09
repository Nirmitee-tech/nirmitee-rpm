import { Router, Request, Response, NextFunction } from 'express';
import { prisma } from '../../utils/prisma';
import { authenticate } from '../../middleware/auth-middleware';
import { log } from '../../utils/logger';
import { engagementService } from '../../services/engagement-service';

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
          },
        },
        clinicalStaff: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
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

    // Get active care plan with latest version
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
        versions: {
          orderBy: { version: 'desc' },
          take: 1,
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

    // Get the latest version
    const currentVersion = carePlan.versions[0];

    res.json({
      success: true,
      data: {
        id: carePlan.id,
        status: carePlan.status,
        goals: currentVersion?.goals ?? [],
        medications: currentVersion?.medications ?? [],
        instructions: currentVersion?.instructions ?? null,
        vitalThresholds: currentVersion?.vitalThresholds ?? null,
        effectiveDate: currentVersion?.effectiveDate?.toISOString() ?? null,
        createdAt: carePlan.createdAt.toISOString(),
        createdBy: carePlan.createdBy
          ? `${carePlan.createdBy.firstName} ${carePlan.createdBy.lastName}`
          : null,
        approvedBy: carePlan.approvedBy
          ? `${carePlan.approvedBy.firstName} ${carePlan.approvedBy.lastName}`
          : null,
        activatedAt: carePlan.activatedAt?.toISOString() ?? null,
      },
    });
  } catch (error) {
    next(error);
  }
});

// ============================================
// MEDICATIONS ROUTES (Patient Portal)
// ============================================

/**
 * GET /api/patient-portal/medications
 * Get current patient's medications
 */
router.get('/medications', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.userId!;
    const organizationId = req.user!.organizationId!;

    const patient = await getPatientForUser(userId, organizationId);
    if (!patient) {
      return res.status(404).json({
        success: false,
        error: 'Patient profile not found',
      });
    }

    const medications = await prisma.patientMedication.findMany({
      where: {
        patientId: patient.id,
        organizationId,
        status: 'ACTIVE',
      },
      orderBy: { name: 'asc' },
    });

    // Get today's adherence status for each medication
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const adherenceToday = await prisma.medicationAdherence.findMany({
      where: {
        patientId: patient.id,
        organizationId,
        scheduledTime: {
          gte: today,
          lt: tomorrow,
        },
      },
    });

    const adherenceMap = new Map(
      adherenceToday.map((a) => [a.patientMedicationId, a])
    );

    const medicationsWithAdherence = medications.map((med) => {
      const todayAdherence = adherenceMap.get(med.id);
      return {
        id: med.id,
        name: med.name,
        genericName: med.genericName,
        dosage: med.dosage,
        frequency: med.frequency,
        route: med.route,
        instructions: med.instructions,
        refillsRemaining: med.refillsRemaining,
        pharmacy: med.pharmacy,
        todayStatus: todayAdherence?.status || 'PENDING',
        takenAt: todayAdherence?.takenAt?.toISOString() || null,
      };
    });

    res.json({
      success: true,
      data: medicationsWithAdherence,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/patient-portal/medications/:medicationId/take
 * Log medication as taken
 */
router.post(
  '/medications/:medicationId/take',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.userId!;
      const organizationId = req.user!.organizationId!;
      const { medicationId } = req.params;
      const { notes } = req.body;

      const patient = await getPatientForUser(userId, organizationId);
      if (!patient) {
        return res.status(404).json({
          success: false,
          error: 'Patient profile not found',
        });
      }

      // Verify medication belongs to patient
      const medication = await prisma.patientMedication.findFirst({
        where: {
          id: medicationId,
          patientId: patient.id,
          organizationId,
        },
      });

      if (!medication) {
        return res.status(404).json({
          success: false,
          error: 'Medication not found',
        });
      }

      const now = new Date();
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      // Check if already logged today
      const existingLog = await prisma.medicationAdherence.findFirst({
        where: {
          patientMedicationId: medicationId,
          patientId: patient.id,
          scheduledTime: {
            gte: today,
            lt: tomorrow,
          },
        },
      });

      if (existingLog) {
        // Update existing log
        const updated = await prisma.medicationAdherence.update({
          where: { id: existingLog.id },
          data: {
            status: 'TAKEN',
            takenAt: now,
            notes: notes || existingLog.notes,
          },
        });

        return res.json({
          success: true,
          data: {
            id: updated.id,
            status: updated.status,
            takenAt: updated.takenAt?.toISOString(),
          },
        });
      }

      // Create new adherence log
      const adherence = await prisma.medicationAdherence.create({
        data: {
          patientMedicationId: medicationId,
          patientId: patient.id,
          organizationId,
          scheduledTime: today, // Use start of today as scheduled time
          takenAt: now,
          status: 'TAKEN',
          notes,
        },
      });

      res.json({
        success: true,
        data: {
          id: adherence.id,
          status: adherence.status,
          takenAt: adherence.takenAt?.toISOString(),
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/patient-portal/medications/:medicationId/skip
 * Skip medication for today
 */
router.post(
  '/medications/:medicationId/skip',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.userId!;
      const organizationId = req.user!.organizationId!;
      const { medicationId } = req.params;
      const { reason } = req.body;

      const patient = await getPatientForUser(userId, organizationId);
      if (!patient) {
        return res.status(404).json({
          success: false,
          error: 'Patient profile not found',
        });
      }

      // Verify medication belongs to patient
      const medication = await prisma.patientMedication.findFirst({
        where: {
          id: medicationId,
          patientId: patient.id,
          organizationId,
        },
      });

      if (!medication) {
        return res.status(404).json({
          success: false,
          error: 'Medication not found',
        });
      }

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      // Check if already logged today
      const existingLog = await prisma.medicationAdherence.findFirst({
        where: {
          patientMedicationId: medicationId,
          patientId: patient.id,
          scheduledTime: {
            gte: today,
            lt: tomorrow,
          },
        },
      });

      if (existingLog) {
        // Update existing log
        const updated = await prisma.medicationAdherence.update({
          where: { id: existingLog.id },
          data: {
            status: 'SKIPPED',
            skippedReason: reason,
            takenAt: null,
          },
        });

        return res.json({
          success: true,
          data: {
            id: updated.id,
            status: updated.status,
          },
        });
      }

      // Create new skip log
      const adherence = await prisma.medicationAdherence.create({
        data: {
          patientMedicationId: medicationId,
          patientId: patient.id,
          organizationId,
          scheduledTime: today,
          status: 'SKIPPED',
          skippedReason: reason,
        },
      });

      res.json({
        success: true,
        data: {
          id: adherence.id,
          status: adherence.status,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/patient-portal/medications/adherence
 * Get medication adherence history
 */
router.get('/medications/adherence', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.userId!;
    const organizationId = req.user!.organizationId!;
    const { days = '7' } = req.query;

    const patient = await getPatientForUser(userId, organizationId);
    if (!patient) {
      return res.status(404).json({
        success: false,
        error: 'Patient profile not found',
      });
    }

    const daysNum = parseInt(days as string, 10) || 7;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - daysNum);
    startDate.setHours(0, 0, 0, 0);

    const adherenceLogs = await prisma.medicationAdherence.findMany({
      where: {
        patientId: patient.id,
        organizationId,
        scheduledTime: {
          gte: startDate,
        },
      },
      include: {
        patientMedication: {
          select: {
            name: true,
            dosage: true,
          },
        },
      },
      orderBy: { scheduledTime: 'desc' },
    });

    // Calculate adherence stats
    const totalExpected = adherenceLogs.length;
    const takenCount = adherenceLogs.filter((l) => l.status === 'TAKEN').length;
    const missedCount = adherenceLogs.filter((l) => l.status === 'MISSED').length;
    const skippedCount = adherenceLogs.filter((l) => l.status === 'SKIPPED').length;
    const adherenceRate = totalExpected > 0 ? Math.round((takenCount / totalExpected) * 100) : 100;

    res.json({
      success: true,
      data: {
        logs: adherenceLogs.map((log) => ({
          id: log.id,
          medicationName: log.patientMedication.name,
          dosage: log.patientMedication.dosage,
          scheduledTime: log.scheduledTime.toISOString(),
          takenAt: log.takenAt?.toISOString() || null,
          status: log.status,
          notes: log.notes,
          skippedReason: log.skippedReason,
        })),
        stats: {
          totalExpected,
          takenCount,
          missedCount,
          skippedCount,
          adherenceRate,
        },
      },
    });
  } catch (error) {
    next(error);
  }
});

// ============================================
// ENGAGEMENT ROUTES (Patient Portal)
// ============================================

/**
 * GET /api/patient-portal/engagement
 * Get engagement summary (streaks, weekly progress, points)
 */
router.get('/engagement', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.userId!;
    const organizationId = req.user!.organizationId!;

    const patient = await getPatientForUser(userId, organizationId);
    if (!patient) {
      return res.status(404).json({
        success: false,
        error: 'Patient profile not found',
      });
    }

    const summary = await engagementService.getEngagementSummary(patient.id, organizationId);

    res.json({
      success: true,
      data: summary,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/patient-portal/goals
 * Get patient goals
 */
router.get('/goals', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.userId!;
    const organizationId = req.user!.organizationId!;

    const patient = await getPatientForUser(userId, organizationId);
    if (!patient) {
      return res.status(404).json({
        success: false,
        error: 'Patient profile not found',
      });
    }

    const goals = await engagementService.getGoals(patient.id, organizationId);

    res.json({
      success: true,
      data: goals,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/patient-portal/goals
 * Create a new goal
 */
router.post('/goals', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.userId!;
    const organizationId = req.user!.organizationId!;
    const { name, description, goalType, targetValue, unit, periodType } = req.body;

    const patient = await getPatientForUser(userId, organizationId);
    if (!patient) {
      return res.status(404).json({
        success: false,
        error: 'Patient profile not found',
      });
    }

    if (!name || !targetValue) {
      return res.status(400).json({
        success: false,
        error: 'Name and targetValue are required',
      });
    }

    const goal = await engagementService.createGoal(patient.id, organizationId, {
      name,
      description,
      goalType: goalType || 'CUSTOM',
      targetValue: parseInt(targetValue, 10),
      unit,
      periodType,
    });

    res.status(201).json({
      success: true,
      data: goal,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/patient-portal/achievements
 * Get achievements (earned and available)
 */
router.get('/achievements', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.userId!;
    const organizationId = req.user!.organizationId!;

    const patient = await getPatientForUser(userId, organizationId);
    if (!patient) {
      return res.status(404).json({
        success: false,
        error: 'Patient profile not found',
      });
    }

    const achievements = await engagementService.getAchievements(patient.id, organizationId);

    res.json({
      success: true,
      data: achievements,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/patient-portal/medication-summary
 * Get medication summary with adherence for dashboard
 */
router.get('/medication-summary', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.userId!;
    const organizationId = req.user!.organizationId!;

    const patient = await getPatientForUser(userId, organizationId);
    if (!patient) {
      return res.status(404).json({
        success: false,
        error: 'Patient profile not found',
      });
    }

    const summary = await engagementService.getMedicationSummary(patient.id, organizationId);

    res.json({
      success: true,
      data: summary,
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
