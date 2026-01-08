/**
 * Patient Routes
 * API endpoints for patient registration & enrollment (RPM-004)
 */

import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { patientService } from '../../services/patient-service';
import { authenticate, requirePermission } from '../../middleware/auth-middleware';
import { ApiError } from '../../utils/api-error';
import {
  createPatientSchema,
  updatePatientSchema,
  updateEnrollmentStatusSchema,
  patientFilterSchema,
  patientIdSchema,
  patientSearchSchema,
  saveDraftSchema,
  draftIdSchema,
} from '../../validators/patient-validators';
import type {
  CreatePatientRequest,
  UpdatePatientRequest,
  UpdateEnrollmentStatusRequest,
  PatientFilterOptions,
  EnrollmentDraftData,
} from '../../types/patient-types';

const router = Router();

// All routes require authentication
router.use(authenticate);

/**
 * POST /api/v1/patients
 * Register a new patient
 * Permissions: patients:write
 */
router.post(
  '/',
  requirePermission('patients:write', 'rpm:manage'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = createPatientSchema.parse(req.body) as CreatePatientRequest;
      const result = await patientService.createPatient(
        req.organizationId!,
        data,
        req.user!.userId
      );
      res.status(201).json(result);
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
 * GET /api/v1/patients/search
 * Quick search patients by name, email, or phone
 * Permissions: patients:read
 */
router.get(
  '/search',
  requirePermission('patients:read', 'rpm:read'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { q } = patientSearchSchema.parse(req.query);
      const result = await patientService.quickSearch(
        req.organizationId!,
        q
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
 * POST /api/v1/patients/drafts
 * Save enrollment draft
 * Permissions: patients:write, rpm:manage
 */
router.post(
  '/drafts',
  requirePermission('patients:write', 'rpm:manage'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = saveDraftSchema.parse(req.body) as EnrollmentDraftData;
      const result = await patientService.saveDraft(
        req.user!.userId,
        req.organizationId!,
        data
      );
      res.status(201).json(result);
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
 * GET /api/v1/patients/drafts/latest
 * Get user's latest enrollment draft
 * Permissions: patients:write, rpm:manage
 */
router.get(
  '/drafts/latest',
  requirePermission('patients:write', 'rpm:manage'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await patientService.getLatestDraft(
        req.user!.userId,
        req.organizationId!
      );
      if (!result) {
        res.status(404).json({ message: 'No draft found' });
      } else {
        res.json(result);
      }
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/v1/patients/drafts/:draftId
 * Get enrollment draft by ID
 * Permissions: patients:write, rpm:manage
 */
router.get(
  '/drafts/:draftId',
  requirePermission('patients:write', 'rpm:manage'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const draftId = draftIdSchema.parse(req.params.draftId);
      const result = await patientService.getDraftById(
        draftId,
        req.user!.userId,
        req.organizationId!
      );
      res.json(result);
    } catch (error) {
      if (error instanceof z.ZodError) {
        next(ApiError.badRequest('Invalid draft ID format'));
      } else {
        next(error);
      }
    }
  }
);

/**
 * DELETE /api/v1/patients/drafts/:draftId
 * Delete enrollment draft
 * Permissions: patients:write, rpm:manage
 */
router.delete(
  '/drafts/:draftId',
  requirePermission('patients:write', 'rpm:manage'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const draftId = draftIdSchema.parse(req.params.draftId);
      await patientService.deleteDraft(
        draftId,
        req.user!.userId,
        req.organizationId!
      );
      res.status(204).send();
    } catch (error) {
      if (error instanceof z.ZodError) {
        next(ApiError.badRequest('Invalid draft ID format'));
      } else {
        next(error);
      }
    }
  }
);

/**
 * GET /api/v1/patients
 * List and search patients
 * Permissions: patients:read
 */
router.get(
  '/',
  requirePermission('patients:read', 'rpm:read'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const options: PatientFilterOptions = {
        page: req.query.page ? parseInt(req.query.page as string) : undefined,
        limit: req.query.limit ? parseInt(req.query.limit as string) : undefined,
        search: req.query.search as string,
        enrollmentStatus: req.query.enrollmentStatus as any,
        primaryPhysicianId: req.query.primaryPhysicianId as string,
        assignedClinicalStaffId: req.query.assignedClinicalStaffId as string,
      };

      // Parse conditions array from query string
      if (req.query.conditions) {
        const conditionsStr = req.query.conditions as string;
        options.conditions = conditionsStr.split(',') as any[];
      }

      const validated = patientFilterSchema.parse(options);
      const result = await patientService.searchPatients(
        req.organizationId!,
        validated
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
 * GET /api/v1/patients/:patientId
 * Get patient details
 * Permissions: patients:read
 */
router.get(
  '/:patientId',
  requirePermission('patients:read', 'rpm:read'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const patientId = patientIdSchema.parse(req.params.patientId);
      const result = await patientService.getPatientById(
        patientId,
        req.organizationId!
      );
      res.json(result);
    } catch (error) {
      if (error instanceof z.ZodError) {
        next(ApiError.badRequest('Invalid patient ID format'));
      } else {
        next(error);
      }
    }
  }
);

/**
 * PATCH /api/v1/patients/:patientId
 * Update patient information
 * Permissions: patients:write
 */
router.patch(
  '/:patientId',
  requirePermission('patients:write', 'rpm:manage'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const patientId = patientIdSchema.parse(req.params.patientId);
      const data = updatePatientSchema.parse(req.body) as UpdatePatientRequest;
      const result = await patientService.updatePatient(
        patientId,
        req.organizationId!,
        data,
        req.user!.userId
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
 * PATCH /api/v1/patients/:patientId/enrollment-status
 * Update patient enrollment status
 * Permissions: patients:write
 */
router.patch(
  '/:patientId/enrollment-status',
  requirePermission('patients:write', 'rpm:manage'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const patientId = patientIdSchema.parse(req.params.patientId);
      const data = updateEnrollmentStatusSchema.parse(req.body) as UpdateEnrollmentStatusRequest;
      const result = await patientService.updateEnrollmentStatus(
        patientId,
        req.organizationId!,
        data,
        req.user!.userId
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
 * POST /api/v1/patients/:patientId/care-team
 * Assign care team (physician and/or clinical staff)
 * Permissions: patients:write
 */
router.post(
  '/:patientId/care-team',
  requirePermission('patients:write', 'rpm:manage'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const patientId = patientIdSchema.parse(req.params.patientId);
      const { primaryPhysicianId, assignedClinicalStaffId } = req.body;

      // Validate IDs if provided
      if (primaryPhysicianId && typeof primaryPhysicianId !== 'string') {
        throw ApiError.badRequest('Invalid primaryPhysicianId');
      }
      if (assignedClinicalStaffId && typeof assignedClinicalStaffId !== 'string') {
        throw ApiError.badRequest('Invalid assignedClinicalStaffId');
      }

      const result = await patientService.assignCareTeam(
        patientId,
        req.organizationId!,
        primaryPhysicianId,
        assignedClinicalStaffId,
        req.user!.userId
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
 * GET /api/v1/patients/:patientId/eligibility
 * Validate patient eligibility for RPM
 * Permissions: patients:read
 */
router.get(
  '/:patientId/eligibility',
  requirePermission('patients:read', 'rpm:read'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const patientId = patientIdSchema.parse(req.params.patientId);
      const result = await patientService.checkEligibility(
        patientId,
        req.organizationId!
      );
      res.json(result);
    } catch (error) {
      if (error instanceof z.ZodError) {
        next(ApiError.badRequest('Invalid patient ID format'));
      } else {
        next(error);
      }
    }
  }
);

export { router as patientRouter };
