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
  addConditionSchema,
  conditionNameSchema,
  deviceIdSchema,
  assignDeviceSchema,
} from '../../validators/patient-validators';
import type {
  CreatePatientRequest,
  UpdatePatientRequest,
  UpdateEnrollmentStatusRequest,
  PatientFilterOptions,
  EnrollmentDraftData,
  AssignDeviceRequest,
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

/**
 * POST /api/v1/patients/:patientId/time-logs
 * Log time for patient interaction
 * Permissions: patients:write
 */
router.post(
  '/:patientId/time-logs',
  requirePermission('patients:write', 'rpm:manage'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const patientId = patientIdSchema.parse(req.params.patientId);
      const { durationSeconds, type, notes } = req.body;

      if (!durationSeconds || durationSeconds < 1) {
        throw ApiError.badRequest('Duration must be at least 1 second');
      }

      const result = await patientService.logTime(
        patientId,
        req.organizationId!,
        req.user!.userId,
        durationSeconds,
        type || 'INTERACTION',
        notes
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
 * GET /api/v1/patients/:patientId/metrics
 * Get monthly billing metrics for patient
 * Permissions: patients:read
 */
router.get(
  '/:patientId/metrics',
  requirePermission('patients:read', 'rpm:manage'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const patientId = patientIdSchema.parse(req.params.patientId);
      const result = await patientService.getMonthlyMetrics(
        patientId,
        req.organizationId!
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
 * POST /api/v1/patients/:patientId/conditions
 * Add a condition to patient
 * Permissions: patients:write
 */
router.post(
  '/:patientId/conditions',
  requirePermission('patients:write', 'rpm:manage'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const patientId = patientIdSchema.parse(req.params.patientId);
      const { condition } = addConditionSchema.parse(req.body);

      const result = await patientService.addCondition(
        patientId,
        req.organizationId!,
        condition,
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
 * DELETE /api/v1/patients/:patientId/conditions/:conditionName
 * Remove a condition from patient
 * Permissions: patients:write
 */
router.delete(
  '/:patientId/conditions/:conditionName',
  requirePermission('patients:write', 'rpm:manage'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const patientId = patientIdSchema.parse(req.params.patientId);
      const conditionName = conditionNameSchema.parse(decodeURIComponent(req.params.conditionName));

      const result = await patientService.removeCondition(
        patientId,
        req.organizationId!,
        conditionName,
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
 * GET /api/v1/patients/:patientId/devices
 * List patient's devices
 * Permissions: patients:read
 */
router.get(
  '/:patientId/devices',
  requirePermission('patients:read', 'rpm:read'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const patientId = patientIdSchema.parse(req.params.patientId);
      const devices = await patientService.getPatientDevices(
        patientId,
        req.organizationId!
      );
      res.json(devices);
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
 * POST /api/v1/patients/:patientId/devices
 * Assign a new device to patient
 * Permissions: patients:write, rpm:manage
 */
router.post(
  '/:patientId/devices',
  requirePermission('patients:write', 'rpm:manage'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const patientId = patientIdSchema.parse(req.params.patientId);
      const deviceData = assignDeviceSchema.parse(req.body) as AssignDeviceRequest;
      const device = await patientService.assignDevice(
        patientId,
        req.organizationId!,
        deviceData,
        req.user!.userId
      );
      res.status(201).json(device);
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
 * DELETE /api/v1/patients/:patientId/devices/:deviceId
 * Remove device from patient
 * Permissions: patients:write, rpm:manage
 */
router.delete(
  '/:patientId/devices/:deviceId',
  requirePermission('patients:write', 'rpm:manage'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const patientId = patientIdSchema.parse(req.params.patientId);
      const deviceId = deviceIdSchema.parse(req.params.deviceId);
      await patientService.removeDevice(
        patientId,
        deviceId,
        req.organizationId!,
        req.user!.userId
      );
      res.status(204).send();
    } catch (error) {
      if (error instanceof z.ZodError) {
        next(ApiError.badRequest('Invalid ID format'));
      } else {
        next(error);
      }
    }
  }
);

/**
 * GET /api/v1/patients/:patientId/care-plans
 * Get patient's care plans with versions
 * Permissions: patients:read
 */
router.get(
  '/:patientId/care-plans',
  requirePermission('patients:read', 'rpm:read'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const patientId = patientIdSchema.parse(req.params.patientId);
      const carePlans = await patientService.getPatientCarePlans(
        patientId,
        req.organizationId!
      );
      res.json(carePlans);
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
 * POST /api/v1/patients/:patientId/care-plans
 * Create a new care plan for patient
 * Permissions: patients:write
 */
router.post(
  '/:patientId/care-plans',
  requirePermission('patients:write', 'rpm:manage'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const patientId = patientIdSchema.parse(req.params.patientId);
      const { goals, vitalThresholds, medications, instructions, activateImmediately } = req.body;

      const carePlan = await patientService.createCarePlan(
        patientId,
        req.organizationId!,
        req.user!.userId,
        { goals, vitalThresholds, medications, instructions, activateImmediately }
      );
      res.status(201).json(carePlan);
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
 * GET /api/v1/patients/:patientId/alerts
 * Get patient's alerts (filterable by status)
 * Permissions: patients:read
 */
router.get(
  '/:patientId/alerts',
  requirePermission('patients:read', 'rpm:read'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const patientId = patientIdSchema.parse(req.params.patientId);
      const status = req.query.status as string | undefined;

      // Validate status if provided
      if (status && !['NEW', 'ACKNOWLEDGED', 'ESCALATED', 'RESOLVED', 'DISMISSED'].includes(status)) {
        throw ApiError.badRequest('Invalid status value');
      }

      const alerts = await patientService.getPatientAlerts(
        patientId,
        req.organizationId!,
        status
      );
      res.json(alerts);
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
 * POST /api/v1/patients/:patientId/alerts/:alertId/acknowledge
 * Acknowledge an alert
 * Permissions: patients:write
 */
router.post(
  '/:patientId/alerts/:alertId/acknowledge',
  requirePermission('patients:write', 'rpm:manage'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const patientId = patientIdSchema.parse(req.params.patientId);
      const alertId = req.params.alertId;

      if (!alertId || typeof alertId !== 'string') {
        throw ApiError.badRequest('Invalid alert ID');
      }

      const result = await patientService.acknowledgeAlert(
        alertId,
        req.organizationId!,
        req.user!.userId
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
 * POST /api/v1/patients/:patientId/alerts/:alertId/resolve
 * Resolve an alert
 * Permissions: patients:write
 */
router.post(
  '/:patientId/alerts/:alertId/resolve',
  requirePermission('patients:write', 'rpm:manage'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const patientId = patientIdSchema.parse(req.params.patientId);
      const alertId = req.params.alertId;
      const { resolution } = req.body;

      if (!alertId || typeof alertId !== 'string') {
        throw ApiError.badRequest('Invalid alert ID');
      }

      if (!resolution || typeof resolution !== 'string') {
        throw ApiError.badRequest('Resolution text is required');
      }

      const result = await patientService.resolveAlert(
        alertId,
        req.organizationId!,
        req.user!.userId,
        resolution
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
 * GET /api/v1/patients/:patientId/vitals
 * Get patient's vital readings with optional filtering
 * Permissions: patients:read
 */
router.get(
  '/:patientId/vitals',
  requirePermission('patients:read', 'rpm:read'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const patientId = patientIdSchema.parse(req.params.patientId);
      const type = req.query.type as string | undefined;
      const page = req.query.page ? parseInt(req.query.page as string) : 1;
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 100;
      const startDate = req.query.startDate as string | undefined;
      const endDate = req.query.endDate as string | undefined;

      const vitals = await patientService.getPatientVitals(
        patientId,
        req.organizationId!,
        { type, page, limit, startDate, endDate }
      );
      res.json(vitals);
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
 * GET /api/v1/patients/:patientId/assessments
 * Get patient's assessments (filterable by status)
 * Permissions: patients:read
 */
router.get(
  '/:patientId/assessments',
  requirePermission('patients:read', 'rpm:read'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const patientId = patientIdSchema.parse(req.params.patientId);
      const status = req.query.status as string | undefined;

      // Validate status if provided
      if (status && !['SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'].includes(status)) {
        throw ApiError.badRequest('Invalid status value');
      }

      const assessments = await patientService.getPatientAssessments(
        patientId,
        req.organizationId!,
        status
      );
      res.json(assessments);
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
 * POST /api/v1/patients/:patientId/assessments
 * Create a new assessment for patient
 * Permissions: patients:write
 */
router.post(
  '/:patientId/assessments',
  requirePermission('patients:write', 'rpm:manage'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const patientId = patientIdSchema.parse(req.params.patientId);
      const { type, responses, notes, dueDate } = req.body;

      // Validate assessment type
      const validTypes = ['PHQ9', 'GAD7', 'FALLS_RISK', 'NUTRITION', 'PAIN_SCALE', 'ADL'];
      if (!type || !validTypes.includes(type)) {
        throw ApiError.badRequest(`Invalid assessment type. Valid types: ${validTypes.join(', ')}`);
      }

      const assessment = await patientService.createAssessment(
        patientId,
        req.organizationId!,
        req.user!.userId,
        { type, responses, notes, dueDate }
      );
      res.status(201).json(assessment);
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
 * POST /api/v1/patients/:patientId/assessments/:assessmentId/complete
 * Complete an assessment with responses and score
 * Permissions: patients:write
 */
router.post(
  '/:patientId/assessments/:assessmentId/complete',
  requirePermission('patients:write', 'rpm:manage'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const patientId = patientIdSchema.parse(req.params.patientId);
      const assessmentId = req.params.assessmentId;
      const { responses, score, notes } = req.body;

      if (!assessmentId || typeof assessmentId !== 'string') {
        throw ApiError.badRequest('Invalid assessment ID');
      }

      if (!responses || typeof responses !== 'object') {
        throw ApiError.badRequest('Responses object is required');
      }

      if (typeof score !== 'number' || score < 0) {
        throw ApiError.badRequest('Valid score is required');
      }

      const result = await patientService.completeAssessment(
        assessmentId,
        req.organizationId!,
        req.user!.userId,
        { responses, score, notes }
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
