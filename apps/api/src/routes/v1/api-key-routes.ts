import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { apiKeyService } from '../../services/api-key-service';
import { authenticate } from '../../middleware/auth-middleware';
import { ApiError } from '../../utils/api-error';

const router = Router();

// All API key routes require authentication
router.use(authenticate);

// Validation schemas
const createApiKeySchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name too long'),
  permissions: z.array(z.string()).optional().default([]),
  expiresAt: z.string().datetime().optional(),
  metadata: z.record(z.any()).optional(),
});

/**
 * @openapi
 * /api-keys:
 *   post:
 *     summary: Create API key
 *     description: Generate a new API key for programmatic access. Key is only shown once.
 *     tags: [API Keys]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name]
 *             properties:
 *               name:
 *                 type: string
 *                 example: "Production API"
 *               permissions:
 *                 type: array
 *                 items:
 *                   type: string
 *                 example: ["read:users", "write:patients"]
 *               expiresAt:
 *                 type: string
 *                 format: date-time
 *                 example: "2025-12-31T23:59:59Z"
 *               metadata:
 *                 type: object
 *                 additionalProperties: true
 *     responses:
 *       201:
 *         description: API key created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: string
 *                 apiKey:
 *                   type: string
 *                   description: The actual API key - SAVE THIS, it will not be shown again
 *                 name:
 *                   type: string
 *                 keyPrefix:
 *                   type: string
 *                 permissions:
 *                   type: array
 *                   items:
 *                     type: string
 *                 expiresAt:
 *                   type: string
 *                   format: date-time
 *                   nullable: true
 *       400:
 *         description: Invalid input
 *       401:
 *         description: Unauthorized
 */
router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = createApiKeySchema.parse(req.body);

    const apiKey = await apiKeyService.generateApiKey({
      organizationId: req.user!.organizationId!,
      createdBy: req.user!.userId!,
      name: data.name,
      permissions: data.permissions,
      expiresAt: data.expiresAt ? new Date(data.expiresAt) : undefined,
      metadata: data.metadata,
    });

    res.status(201).json(apiKey);
  } catch (error) {
    if (error instanceof z.ZodError) {
      next(ApiError.badRequest(error.errors[0].message));
    } else {
      next(error);
    }
  }
});

/**
 * @openapi
 * /api-keys:
 *   get:
 *     summary: List API keys
 *     description: Get all API keys for the organization (without secrets)
 *     tags: [API Keys]
 *     responses:
 *       200:
 *         description: List of API keys
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: string
 *                   name:
 *                     type: string
 *                   keyPrefix:
 *                     type: string
 *                   permissions:
 *                     type: array
 *                     items:
 *                       type: string
 *                   lastUsedAt:
 *                     type: string
 *                     format: date-time
 *                     nullable: true
 *                   expiresAt:
 *                     type: string
 *                     format: date-time
 *                     nullable: true
 *                   isActive:
 *                     type: boolean
 *                   createdAt:
 *                     type: string
 *                     format: date-time
 *       401:
 *         description: Unauthorized
 */
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const apiKeys = await apiKeyService.listApiKeys(req.user!.organizationId!);
    res.json(apiKeys);
  } catch (error) {
    next(error);
  }
});

/**
 * @openapi
 * /api-keys/{id}:
 *   delete:
 *     summary: Revoke API key
 *     description: Deactivate an API key (soft delete)
 *     tags: [API Keys]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: API key ID
 *     responses:
 *       200:
 *         description: API key revoked successfully
 *       404:
 *         description: API key not found
 *       401:
 *         description: Unauthorized
 */
router.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    await apiKeyService.revokeApiKey(req.params.id, req.user!.organizationId!);
    res.json({ message: 'API key revoked successfully' });
  } catch (error) {
    next(error);
  }
});

/**
 * @openapi
 * /api-keys/{id}/rotate:
 *   post:
 *     summary: Rotate API key
 *     description: Generate new API key and revoke the old one
 *     tags: [API Keys]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: API key ID
 *     responses:
 *       200:
 *         description: API key rotated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: string
 *                 apiKey:
 *                   type: string
 *                   description: The new API key - SAVE THIS
 *                 name:
 *                   type: string
 *                 keyPrefix:
 *                   type: string
 *       404:
 *         description: API key not found
 *       401:
 *         description: Unauthorized
 */
router.post('/:id/rotate', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const newKey = await apiKeyService.rotateApiKey(
      req.params.id,
      req.user!.organizationId!,
      req.user!.userId!
    );
    res.json(newKey);
  } catch (error) {
    next(error);
  }
});

export { router as apiKeyRouter };
