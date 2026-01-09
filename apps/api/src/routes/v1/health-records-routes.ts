/**
 * Health Records Routes
 * API endpoints for patient health records (medications, allergies, immunizations, labs, history)
 */

import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { healthRecordsService } from '../../services/health-records-service';
import { authenticate, requirePermission } from '../../middleware/auth-middleware';
import { ApiError } from '../../utils/api-error';
import {
  MedicationStatus,
  AllergyType,
  AllergySeverity,
  AllergyStatus,
  ImmunizationStatus,
  LabResultStatus,
  LabInterpretation,
  MedicalHistoryStatus,
} from '@prisma/client';

const router = Router();

// All routes require authentication
router.use(authenticate);

// ============================================
// VALIDATION SCHEMAS
// ============================================

const patientIdSchema = z.object({
  patientId: z.string().min(1, 'Patient ID is required'),
});

const recordIdSchema = z.object({
  id: z.string().min(1, 'Record ID is required'),
});

// Medications
const createMedicationSchema = z.object({
  name: z.string().min(1, 'Medication name is required'),
  genericName: z.string().optional(),
  dosage: z.string().min(1, 'Dosage is required'),
  frequency: z.string().min(1, 'Frequency is required'),
  route: z.string().optional(),
  prescribedBy: z.string().optional(),
  prescribedDate: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  status: z.nativeEnum(MedicationStatus).optional(),
  refillsRemaining: z.number().optional(),
  pharmacy: z.string().optional(),
  instructions: z.string().optional(),
  sideEffects: z.string().optional(),
  notes: z.string().optional(),
});

const updateMedicationSchema = createMedicationSchema.partial();

// Allergies
const createAllergySchema = z.object({
  allergen: z.string().min(1, 'Allergen is required'),
  type: z.nativeEnum(AllergyType).optional(),
  severity: z.nativeEnum(AllergySeverity).optional(),
  reaction: z.string().optional(),
  onsetDate: z.string().optional(),
  reportedBy: z.string().optional(),
  verifiedBy: z.string().optional(),
  verifiedDate: z.string().optional(),
  status: z.nativeEnum(AllergyStatus).optional(),
  notes: z.string().optional(),
});

const updateAllergySchema = createAllergySchema.partial();

// Immunizations
const createImmunizationSchema = z.object({
  vaccineName: z.string().min(1, 'Vaccine name is required'),
  vaccineCode: z.string().optional(),
  manufacturer: z.string().optional(),
  lotNumber: z.string().optional(),
  administeredDate: z.string().min(1, 'Administered date is required'),
  expirationDate: z.string().optional(),
  site: z.string().optional(),
  route: z.string().optional(),
  dosage: z.string().optional(),
  doseNumber: z.number().optional(),
  series: z.string().optional(),
  administeredBy: z.string().optional(),
  location: z.string().optional(),
  status: z.nativeEnum(ImmunizationStatus).optional(),
  reaction: z.string().optional(),
  notes: z.string().optional(),
});

const updateImmunizationSchema = createImmunizationSchema.partial();

// Lab Results
const createLabResultSchema = z.object({
  testName: z.string().min(1, 'Test name is required'),
  testCode: z.string().optional(),
  category: z.string().optional(),
  value: z.string().min(1, 'Value is required'),
  unit: z.string().optional(),
  referenceMin: z.string().optional(),
  referenceMax: z.string().optional(),
  referenceRange: z.string().optional(),
  status: z.nativeEnum(LabResultStatus).optional(),
  interpretation: z.nativeEnum(LabInterpretation).optional(),
  collectedAt: z.string().optional(),
  resultedAt: z.string().min(1, 'Result date is required'),
  orderedBy: z.string().optional(),
  performedBy: z.string().optional(),
  specimenType: z.string().optional(),
  notes: z.string().optional(),
});

const updateLabResultSchema = createLabResultSchema.partial();

// Medical History
const createMedicalHistorySchema = z.object({
  condition: z.string().min(1, 'Condition is required'),
  icdCode: z.string().optional(),
  diagnosedDate: z.string().optional(),
  resolvedDate: z.string().optional(),
  status: z.nativeEnum(MedicalHistoryStatus).optional(),
  severity: z.string().optional(),
  treatedBy: z.string().optional(),
  notes: z.string().optional(),
});

const updateMedicalHistorySchema = createMedicalHistorySchema.partial();

// ============================================
// MEDICATIONS ROUTES
// ============================================

/**
 * GET /api/v1/patients/:patientId/medications
 * Get patient's medications
 */
router.get(
  '/patients/:patientId/medications',
  requirePermission('patients:read'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { patientId } = patientIdSchema.parse(req.params);
      const { status, page, limit } = req.query;

      const result = await healthRecordsService.getMedications(
        patientId,
        req.organizationId!,
        {
          status: status as MedicationStatus | undefined,
          page: page ? parseInt(page as string, 10) : undefined,
          limit: limit ? parseInt(limit as string, 10) : undefined,
        }
      );

      res.json(result);
    } catch (error) {
      if (error instanceof z.ZodError) {
        next(ApiError.badRequest(error.errors[0].message));
      } else {
        next(error);
      }
    }
  }
);

/**
 * POST /api/v1/patients/:patientId/medications
 * Add medication to patient
 */
router.post(
  '/patients/:patientId/medications',
  requirePermission('patients:write'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { patientId } = patientIdSchema.parse(req.params);
      const data = createMedicationSchema.parse(req.body);

      const medication = await healthRecordsService.createMedication(
        patientId,
        req.organizationId!,
        data,
        req.user!.userId
      );

      res.status(201).json(medication);
    } catch (error) {
      if (error instanceof z.ZodError) {
        next(ApiError.badRequest(error.errors[0].message));
      } else {
        next(error);
      }
    }
  }
);

/**
 * PUT /api/v1/medications/:id
 * Update medication
 */
router.put(
  '/medications/:id',
  requirePermission('patients:write'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = recordIdSchema.parse(req.params);
      const data = updateMedicationSchema.parse(req.body);

      const medication = await healthRecordsService.updateMedication(
        id,
        req.organizationId!,
        data,
        req.user!.userId
      );

      res.json(medication);
    } catch (error) {
      if (error instanceof z.ZodError) {
        next(ApiError.badRequest(error.errors[0].message));
      } else {
        next(error);
      }
    }
  }
);

/**
 * DELETE /api/v1/medications/:id
 * Delete medication
 */
router.delete(
  '/medications/:id',
  requirePermission('patients:write'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = recordIdSchema.parse(req.params);

      await healthRecordsService.deleteMedication(
        id,
        req.organizationId!,
        req.user!.userId
      );

      res.status(204).send();
    } catch (error) {
      if (error instanceof z.ZodError) {
        next(ApiError.badRequest(error.errors[0].message));
      } else {
        next(error);
      }
    }
  }
);

// ============================================
// ALLERGIES ROUTES
// ============================================

/**
 * GET /api/v1/patients/:patientId/allergies
 * Get patient's allergies
 */
router.get(
  '/patients/:patientId/allergies',
  requirePermission('patients:read'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { patientId } = patientIdSchema.parse(req.params);
      const { type, status, page, limit } = req.query;

      const result = await healthRecordsService.getAllergies(
        patientId,
        req.organizationId!,
        {
          type: type as AllergyType | undefined,
          status: status as AllergyStatus | undefined,
          page: page ? parseInt(page as string, 10) : undefined,
          limit: limit ? parseInt(limit as string, 10) : undefined,
        }
      );

      res.json(result);
    } catch (error) {
      if (error instanceof z.ZodError) {
        next(ApiError.badRequest(error.errors[0].message));
      } else {
        next(error);
      }
    }
  }
);

/**
 * POST /api/v1/patients/:patientId/allergies
 * Add allergy to patient
 */
router.post(
  '/patients/:patientId/allergies',
  requirePermission('patients:write'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { patientId } = patientIdSchema.parse(req.params);
      const data = createAllergySchema.parse(req.body);

      const allergy = await healthRecordsService.createAllergy(
        patientId,
        req.organizationId!,
        data,
        req.user!.userId
      );

      res.status(201).json(allergy);
    } catch (error) {
      if (error instanceof z.ZodError) {
        next(ApiError.badRequest(error.errors[0].message));
      } else {
        next(error);
      }
    }
  }
);

/**
 * PUT /api/v1/allergies/:id
 * Update allergy
 */
router.put(
  '/allergies/:id',
  requirePermission('patients:write'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = recordIdSchema.parse(req.params);
      const data = updateAllergySchema.parse(req.body);

      const allergy = await healthRecordsService.updateAllergy(
        id,
        req.organizationId!,
        data,
        req.user!.userId
      );

      res.json(allergy);
    } catch (error) {
      if (error instanceof z.ZodError) {
        next(ApiError.badRequest(error.errors[0].message));
      } else {
        next(error);
      }
    }
  }
);

/**
 * DELETE /api/v1/allergies/:id
 * Delete allergy
 */
router.delete(
  '/allergies/:id',
  requirePermission('patients:write'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = recordIdSchema.parse(req.params);

      await healthRecordsService.deleteAllergy(
        id,
        req.organizationId!,
        req.user!.userId
      );

      res.status(204).send();
    } catch (error) {
      if (error instanceof z.ZodError) {
        next(ApiError.badRequest(error.errors[0].message));
      } else {
        next(error);
      }
    }
  }
);

// ============================================
// IMMUNIZATIONS ROUTES
// ============================================

/**
 * GET /api/v1/patients/:patientId/immunizations
 * Get patient's immunizations
 */
router.get(
  '/patients/:patientId/immunizations',
  requirePermission('patients:read'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { patientId } = patientIdSchema.parse(req.params);
      const { status, page, limit } = req.query;

      const result = await healthRecordsService.getImmunizations(
        patientId,
        req.organizationId!,
        {
          status: status as ImmunizationStatus | undefined,
          page: page ? parseInt(page as string, 10) : undefined,
          limit: limit ? parseInt(limit as string, 10) : undefined,
        }
      );

      res.json(result);
    } catch (error) {
      if (error instanceof z.ZodError) {
        next(ApiError.badRequest(error.errors[0].message));
      } else {
        next(error);
      }
    }
  }
);

/**
 * POST /api/v1/patients/:patientId/immunizations
 * Add immunization to patient
 */
router.post(
  '/patients/:patientId/immunizations',
  requirePermission('patients:write'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { patientId } = patientIdSchema.parse(req.params);
      const data = createImmunizationSchema.parse(req.body);

      const immunization = await healthRecordsService.createImmunization(
        patientId,
        req.organizationId!,
        data,
        req.user!.userId
      );

      res.status(201).json(immunization);
    } catch (error) {
      if (error instanceof z.ZodError) {
        next(ApiError.badRequest(error.errors[0].message));
      } else {
        next(error);
      }
    }
  }
);

/**
 * PUT /api/v1/immunizations/:id
 * Update immunization
 */
router.put(
  '/immunizations/:id',
  requirePermission('patients:write'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = recordIdSchema.parse(req.params);
      const data = updateImmunizationSchema.parse(req.body);

      const immunization = await healthRecordsService.updateImmunization(
        id,
        req.organizationId!,
        data,
        req.user!.userId
      );

      res.json(immunization);
    } catch (error) {
      if (error instanceof z.ZodError) {
        next(ApiError.badRequest(error.errors[0].message));
      } else {
        next(error);
      }
    }
  }
);

/**
 * DELETE /api/v1/immunizations/:id
 * Delete immunization
 */
router.delete(
  '/immunizations/:id',
  requirePermission('patients:write'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = recordIdSchema.parse(req.params);

      await healthRecordsService.deleteImmunization(
        id,
        req.organizationId!,
        req.user!.userId
      );

      res.status(204).send();
    } catch (error) {
      if (error instanceof z.ZodError) {
        next(ApiError.badRequest(error.errors[0].message));
      } else {
        next(error);
      }
    }
  }
);

// ============================================
// LAB RESULTS ROUTES
// ============================================

/**
 * GET /api/v1/patients/:patientId/lab-results
 * Get patient's lab results
 */
router.get(
  '/patients/:patientId/lab-results',
  requirePermission('patients:read'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { patientId } = patientIdSchema.parse(req.params);
      const { category, status, interpretation, page, limit } = req.query;

      const result = await healthRecordsService.getLabResults(
        patientId,
        req.organizationId!,
        {
          category: category as string | undefined,
          status: status as LabResultStatus | undefined,
          interpretation: interpretation as LabInterpretation | undefined,
          page: page ? parseInt(page as string, 10) : undefined,
          limit: limit ? parseInt(limit as string, 10) : undefined,
        }
      );

      res.json(result);
    } catch (error) {
      if (error instanceof z.ZodError) {
        next(ApiError.badRequest(error.errors[0].message));
      } else {
        next(error);
      }
    }
  }
);

/**
 * POST /api/v1/patients/:patientId/lab-results
 * Add lab result to patient
 */
router.post(
  '/patients/:patientId/lab-results',
  requirePermission('patients:write'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { patientId } = patientIdSchema.parse(req.params);
      const data = createLabResultSchema.parse(req.body);

      const labResult = await healthRecordsService.createLabResult(
        patientId,
        req.organizationId!,
        data,
        req.user!.userId
      );

      res.status(201).json(labResult);
    } catch (error) {
      if (error instanceof z.ZodError) {
        next(ApiError.badRequest(error.errors[0].message));
      } else {
        next(error);
      }
    }
  }
);

/**
 * PUT /api/v1/lab-results/:id
 * Update lab result
 */
router.put(
  '/lab-results/:id',
  requirePermission('patients:write'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = recordIdSchema.parse(req.params);
      const data = updateLabResultSchema.parse(req.body);

      const labResult = await healthRecordsService.updateLabResult(
        id,
        req.organizationId!,
        data,
        req.user!.userId
      );

      res.json(labResult);
    } catch (error) {
      if (error instanceof z.ZodError) {
        next(ApiError.badRequest(error.errors[0].message));
      } else {
        next(error);
      }
    }
  }
);

/**
 * DELETE /api/v1/lab-results/:id
 * Delete lab result
 */
router.delete(
  '/lab-results/:id',
  requirePermission('patients:write'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = recordIdSchema.parse(req.params);

      await healthRecordsService.deleteLabResult(
        id,
        req.organizationId!,
        req.user!.userId
      );

      res.status(204).send();
    } catch (error) {
      if (error instanceof z.ZodError) {
        next(ApiError.badRequest(error.errors[0].message));
      } else {
        next(error);
      }
    }
  }
);

// ============================================
// MEDICAL HISTORY ROUTES
// ============================================

/**
 * GET /api/v1/patients/:patientId/medical-history
 * Get patient's medical history
 */
router.get(
  '/patients/:patientId/medical-history',
  requirePermission('patients:read'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { patientId } = patientIdSchema.parse(req.params);
      const { status, page, limit } = req.query;

      const result = await healthRecordsService.getMedicalHistory(
        patientId,
        req.organizationId!,
        {
          status: status as MedicalHistoryStatus | undefined,
          page: page ? parseInt(page as string, 10) : undefined,
          limit: limit ? parseInt(limit as string, 10) : undefined,
        }
      );

      res.json(result);
    } catch (error) {
      if (error instanceof z.ZodError) {
        next(ApiError.badRequest(error.errors[0].message));
      } else {
        next(error);
      }
    }
  }
);

/**
 * POST /api/v1/patients/:patientId/medical-history
 * Add medical history item to patient
 */
router.post(
  '/patients/:patientId/medical-history',
  requirePermission('patients:write'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { patientId } = patientIdSchema.parse(req.params);
      const data = createMedicalHistorySchema.parse(req.body);

      const item = await healthRecordsService.createMedicalHistoryItem(
        patientId,
        req.organizationId!,
        data,
        req.user!.userId
      );

      res.status(201).json(item);
    } catch (error) {
      if (error instanceof z.ZodError) {
        next(ApiError.badRequest(error.errors[0].message));
      } else {
        next(error);
      }
    }
  }
);

/**
 * PUT /api/v1/medical-history/:id
 * Update medical history item
 */
router.put(
  '/medical-history/:id',
  requirePermission('patients:write'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = recordIdSchema.parse(req.params);
      const data = updateMedicalHistorySchema.parse(req.body);

      const item = await healthRecordsService.updateMedicalHistoryItem(
        id,
        req.organizationId!,
        data,
        req.user!.userId
      );

      res.json(item);
    } catch (error) {
      if (error instanceof z.ZodError) {
        next(ApiError.badRequest(error.errors[0].message));
      } else {
        next(error);
      }
    }
  }
);

/**
 * DELETE /api/v1/medical-history/:id
 * Delete medical history item
 */
router.delete(
  '/medical-history/:id',
  requirePermission('patients:write'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = recordIdSchema.parse(req.params);

      await healthRecordsService.deleteMedicalHistoryItem(
        id,
        req.organizationId!,
        req.user!.userId
      );

      res.status(204).send();
    } catch (error) {
      if (error instanceof z.ZodError) {
        next(ApiError.badRequest(error.errors[0].message));
      } else {
        next(error);
      }
    }
  }
);

// ============================================
// HEALTH SUMMARY ROUTE
// ============================================

/**
 * GET /api/v1/patients/:patientId/health-summary
 * Get aggregated health summary for patient
 */
router.get(
  '/patients/:patientId/health-summary',
  requirePermission('patients:read'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { patientId } = patientIdSchema.parse(req.params);

      const summary = await healthRecordsService.getPatientHealthSummary(
        patientId,
        req.organizationId!
      );

      res.json(summary);
    } catch (error) {
      if (error instanceof z.ZodError) {
        next(ApiError.badRequest(error.errors[0].message));
      } else {
        next(error);
      }
    }
  }
);

export default router;
