/**
 * Assessment Routes
 * API endpoints for patient assessments (PHQ-9, GAD-7, etc.)
 */

import { Router, Request, Response, NextFunction } from 'express';
import { assessmentService } from '../../services/assessment-service';
import { authenticate } from '../../middleware/auth-middleware';
import { AssessmentType, AssessmentStatus, Prisma } from '@prisma/client';

const router = Router();

// All routes require authentication
router.use(authenticate);

/**
 * GET /api/assessments
 * Get all assessments for organization (with filters)
 */
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { patientId, type, status, page, limit } = req.query;

    const result = await assessmentService.getAssessments(
      req.organizationId!,
      {
        patientId: patientId as string,
        type: type as AssessmentType,
        status: status as AssessmentStatus,
        page: page ? parseInt(page as string) : undefined,
        limit: limit ? parseInt(limit as string) : undefined,
      }
    );

    res.json({
      success: true,
      data: result.assessments,
      pagination: result.pagination,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/assessments/patient/:patientId
 * Get all assessments for a specific patient
 */
router.get('/patient/:patientId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { patientId } = req.params;
    const { type, status } = req.query;

    const assessments = await assessmentService.getPatientAssessments(
      patientId,
      req.organizationId!,
      {
        type: type as AssessmentType,
        status: status as AssessmentStatus,
      }
    );

    res.json({
      success: true,
      data: assessments,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/assessments/overdue
 * Get overdue assessments
 */
router.get('/overdue', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const assessments = await assessmentService.getOverdueAssessments(
      req.organizationId!
    );

    res.json({
      success: true,
      data: assessments,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/assessments/pending/count
 * Get pending assessments count
 */
router.get('/pending/count', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const count = await assessmentService.getPendingCount(
      req.organizationId!
    );

    res.json({
      success: true,
      data: { count },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/assessments/:id
 * Get a single assessment
 */
router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const assessment = await assessmentService.getAssessment(
      req.params.id,
      req.organizationId!
    );

    if (!assessment) {
      return res.status(404).json({
        success: false,
        error: 'Assessment not found',
      });
    }

    res.json({
      success: true,
      data: assessment,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/assessments
 * Create a new assessment (schedule)
 */
router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { patientId, type, dueDate, notes } = req.body;

    if (!patientId || !type) {
      return res.status(400).json({
        success: false,
        error: 'patientId and type are required',
      });
    }

    const assessment = await assessmentService.createAssessment(
      req.organizationId!,
      req.user!.userId,
      {
        patientId,
        type,
        dueDate: dueDate ? new Date(dueDate) : undefined,
        notes,
      }
    );

    res.status(201).json({
      success: true,
      data: assessment,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /api/assessments/:id
 * Update an assessment
 */
router.put('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { score, maxScore, responses, notes, status } = req.body;

    const assessment = await assessmentService.updateAssessment(
      req.params.id,
      req.organizationId!,
      req.user!.userId,
      {
        score,
        maxScore,
        responses: responses as Prisma.InputJsonValue,
        notes,
        status,
      }
    );

    res.json({
      success: true,
      data: assessment,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/assessments/:id/complete
 * Complete an assessment with score
 */
router.post('/:id/complete', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { score, maxScore, responses, notes } = req.body;

    if (score === undefined || maxScore === undefined) {
      return res.status(400).json({
        success: false,
        error: 'score and maxScore are required',
      });
    }

    const assessment = await assessmentService.completeAssessment(
      req.params.id,
      req.organizationId!,
      req.user!.userId,
      {
        score,
        maxScore,
        responses: responses as Prisma.InputJsonValue,
        notes,
      }
    );

    res.json({
      success: true,
      data: assessment,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/assessments/:id/cancel
 * Cancel an assessment
 */
router.post('/:id/cancel', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { reason } = req.body;

    const assessment = await assessmentService.cancelAssessment(
      req.params.id,
      req.organizationId!,
      req.user!.userId,
      reason
    );

    res.json({
      success: true,
      data: assessment,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /api/assessments/:id
 * Delete an assessment
 */
router.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    await assessmentService.deleteAssessment(
      req.params.id,
      req.organizationId!,
      req.user!.userId
    );

    res.json({
      success: true,
      message: 'Assessment deleted',
    });
  } catch (error) {
    next(error);
  }
});

export const assessmentRouter = router;
