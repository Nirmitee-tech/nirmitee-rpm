import { Router, Request, Response, NextFunction } from 'express';
import { authenticate } from '../../middleware/auth-middleware';
import { sessionService } from '../../services/session-service';
import { z } from 'zod';
import { ApiError } from '../../utils/api-error';

const router = Router();

// Validation schemas
const revokeSessionSchema = z.object({
  sessionId: z.string().min(1, 'Session ID is required'),
});

/**
 * @openapi
 * /sessions:
 *   get:
 *     summary: Get all active sessions
 *     description: Get all active sessions for the authenticated user
 *     tags: [Sessions]
 *     responses:
 *       200:
 *         description: List of active sessions
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 sessions:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                       deviceType:
 *                         type: string
 *                       browser:
 *                         type: string
 *                       os:
 *                         type: string
 *                       ipAddress:
 *                         type: string
 *                       location:
 *                         type: string
 *                       lastActive:
 *                         type: string
 *                         format: date-time
 *                       createdAt:
 *                         type: string
 *                         format: date-time
 *                       isCurrent:
 *                         type: boolean
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.userId;
    const currentToken = req.headers.authorization?.split(' ')[1]; // Extract token from Bearer

    // Get refresh token from body (if provided for accurate current session detection)
    const refreshToken = req.body?.refreshToken;

    const sessions = await sessionService.getUserSessions(userId, refreshToken);

    // Remove sensitive token data before sending to client
    const sanitizedSessions = sessions.map((session) => ({
      id: session.id,
      deviceType: session.deviceType,
      browser: session.browser,
      os: session.os,
      ipAddress: session.ipAddress,
      location: session.location,
      lastActive: session.lastActive,
      createdAt: session.createdAt,
      expiresAt: session.expiresAt,
      isCurrent: session.isCurrent,
    }));

    res.json({ sessions: sanitizedSessions });
  } catch (error) {
    next(error);
  }
});

/**
 * @openapi
 * /sessions/current:
 *   post:
 *     summary: Get current session info
 *     description: Get information about the current active session
 *     tags: [Sessions]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [refreshToken]
 *             properties:
 *               refreshToken:
 *                 type: string
 *     responses:
 *       200:
 *         description: Current session information
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 session:
 *                   type: object
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/current', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.userId;
    const { refreshToken } = req.body;

    if (!refreshToken) {
      throw ApiError.badRequest('Refresh token is required');
    }

    const session = await sessionService.getCurrentSession(userId, refreshToken);

    if (!session) {
      throw ApiError.notFound('Current session not found');
    }

    // Remove sensitive token data
    const sanitizedSession = {
      id: session.id,
      deviceType: session.deviceType,
      browser: session.browser,
      os: session.os,
      ipAddress: session.ipAddress,
      location: session.location,
      lastActive: session.lastActive,
      createdAt: session.createdAt,
      expiresAt: session.expiresAt,
      isCurrent: session.isCurrent,
    };

    res.json({ session: sanitizedSession });
  } catch (error) {
    next(error);
  }
});

/**
 * @openapi
 * /sessions/{sessionId}:
 *   delete:
 *     summary: Revoke a specific session
 *     description: Revoke a specific session by ID
 *     tags: [Sessions]
 *     parameters:
 *       - in: path
 *         name: sessionId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Session revoked successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Session not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.delete('/:sessionId', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.userId;
    const { sessionId } = req.params;

    await sessionService.revokeSession(userId, sessionId);

    res.json({ message: 'Session revoked successfully' });
  } catch (error) {
    next(error);
  }
});

/**
 * @openapi
 * /sessions/revoke-all:
 *   post:
 *     summary: Revoke all other sessions
 *     description: Revoke all sessions except the current one (logout from all other devices)
 *     tags: [Sessions]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [refreshToken]
 *             properties:
 *               refreshToken:
 *                 type: string
 *     responses:
 *       200:
 *         description: All other sessions revoked
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 revokedCount:
 *                   type: number
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/revoke-all', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.userId;
    const { refreshToken } = req.body;

    if (!refreshToken) {
      throw ApiError.badRequest('Refresh token is required');
    }

    const revokedCount = await sessionService.revokeAllOtherSessions(userId, refreshToken);

    res.json({
      message: 'All other sessions revoked successfully',
      revokedCount,
    });
  } catch (error) {
    next(error);
  }
});

export { router as sessionRouter };
