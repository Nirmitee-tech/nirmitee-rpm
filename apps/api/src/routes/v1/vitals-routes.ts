import { Router, Request, Response, NextFunction } from 'express';
import { authenticate } from '../../middleware/auth-middleware';
import { vitalsService } from '../../services/vitals-service';
import { z } from 'zod';

const router = Router();

// Validation schemas
const CreateVitalReadingSchema = z.object({
  type: z.enum([
    'BLOOD_PRESSURE',
    'WEIGHT',
    'BLOOD_GLUCOSE',
    'PULSE_OXIMETRY',
    'HEART_RATE',
    'TEMPERATURE',
    'RESPIRATORY_RATE',
    'BMI',
  ]),
  values: z.record(z.number()),
  unit: z.string(),
  recordedAt: z.string().datetime(),
  symptoms: z.array(z.string()).optional(),
  mealContext: z
    .enum(['fasting', 'before_meal', 'after_meal', 'bedtime', 'random'])
    .optional(),
  notes: z.string().optional(),
});

const GetReadingsQuerySchema = z.object({
  type: z
    .enum([
      'BLOOD_PRESSURE',
      'WEIGHT',
      'BLOOD_GLUCOSE',
      'PULSE_OXIMETRY',
      'HEART_RATE',
      'TEMPERATURE',
      'RESPIRATORY_RATE',
      'BMI',
    ])
    .optional(),
  page: z.string().optional().transform((val) => (val ? parseInt(val, 10) : 1)),
  limit: z.string().optional().transform((val) => (val ? parseInt(val, 10) : 10)),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
});

/**
 * POST /api/vitals/readings
 * Create a new vital reading
 */
router.post(
  '/readings',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = CreateVitalReadingSchema.parse(req.body);
      const userId = req.user!.userId;
      const organizationId = req.user!.organizationId!;

      const reading = await vitalsService.createReading(userId, organizationId, {
        type: data.type,
        values: data.values,
        unit: data.unit,
        recordedAt: data.recordedAt,
        symptoms: data.symptoms,
        mealContext: data.mealContext,
        notes: data.notes,
      });

      res.status(201).json(reading);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/vitals/readings
 * Get list of vital readings with filters
 */
router.get(
  '/readings',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const query = GetReadingsQuerySchema.parse(req.query);
      const userId = req.user!.userId;
      const organizationId = req.user!.organizationId!;

      const result = await vitalsService.getReadings(userId, organizationId, {
        type: query.type,
        page: query.page || 1,
        limit: query.limit || 10,
        startDate: query.startDate,
        endDate: query.endDate,
      });

      res.json(result);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/vitals/readings/:id
 * Get a single vital reading by ID
 */
router.get(
  '/readings/:id',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const userId = req.user!.userId;
      const organizationId = req.user!.organizationId!;

      const reading = await vitalsService.getReadingById(id, userId, organizationId);

      if (!reading) {
        return res.status(404).json({ error: 'Reading not found' });
      }

      res.json(reading);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * PUT /api/vitals/readings/:id
 * Update a vital reading
 */
router.put(
  '/readings/:id',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const data = CreateVitalReadingSchema.partial().parse(req.body);
      const userId = req.user!.userId;
      const organizationId = req.user!.organizationId!;

      const reading = await vitalsService.updateReading(id, userId, organizationId, data);

      if (!reading) {
        return res.status(404).json({ error: 'Reading not found' });
      }

      res.json(reading);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * DELETE /api/vitals/readings/:id
 * Delete a vital reading
 */
router.delete(
  '/readings/:id',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const userId = req.user!.userId;
      const organizationId = req.user!.organizationId!;

      await vitalsService.deleteReading(id, userId, organizationId);

      res.status(204).send();
    } catch (error) {
      next(error);
    }
  }
);

export { router as vitalsRouter };
