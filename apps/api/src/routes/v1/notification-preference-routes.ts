import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { authenticate } from '../../middleware/auth-middleware';
import { notificationPreferenceService } from '../../services/notification-preference-service';
import logger from '../../utils/logger';

const router = Router();

// Validation schemas
const UpdatePreferencesSchema = z.object({
  emailEnabled: z.boolean().optional(),
  pushEnabled: z.boolean().optional(),
  inAppEnabled: z.boolean().optional(),
  securityAlerts: z.boolean().optional(),
  teamUpdates: z.boolean().optional(),
  systemUpdates: z.boolean().optional(),
  marketingEmails: z.boolean().optional(),
  weeklyDigest: z.boolean().optional(),
  quietHoursEnabled: z.boolean().optional(),
  quietHoursStart: z
    .string()
    .regex(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format. Expected HH:mm')
    .nullable()
    .optional(),
  quietHoursEnd: z
    .string()
    .regex(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format. Expected HH:mm')
    .nullable()
    .optional(),
});

const TestNotificationSchema = z.object({
  channel: z.enum(['email', 'push']),
});

/**
 * @swagger
 * /api/v1/notification-preferences:
 *   get:
 *     summary: Get user's notification preferences
 *     tags: [Notification Preferences]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User's notification preferences
 *       401:
 *         description: Unauthorized
 */
router.get('/', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;

    const preferences = await notificationPreferenceService.getPreferences(userId);

    res.json(preferences);
  } catch (error) {
    logger.error('Error getting notification preferences', { error });
    res.status(500).json({ error: 'Failed to get notification preferences' });
  }
});

/**
 * @swagger
 * /api/v1/notification-preferences:
 *   patch:
 *     summary: Update user's notification preferences
 *     tags: [Notification Preferences]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               emailEnabled:
 *                 type: boolean
 *               pushEnabled:
 *                 type: boolean
 *               inAppEnabled:
 *                 type: boolean
 *               securityAlerts:
 *                 type: boolean
 *               teamUpdates:
 *                 type: boolean
 *               systemUpdates:
 *                 type: boolean
 *               marketingEmails:
 *                 type: boolean
 *               weeklyDigest:
 *                 type: boolean
 *               quietHoursEnabled:
 *                 type: boolean
 *               quietHoursStart:
 *                 type: string
 *                 pattern: "^([0-1][0-9]|2[0-3]):[0-5][0-9]$"
 *                 example: "22:00"
 *               quietHoursEnd:
 *                 type: string
 *                 pattern: "^([0-1][0-9]|2[0-3]):[0-5][0-9]$"
 *                 example: "08:00"
 *     responses:
 *       200:
 *         description: Updated notification preferences
 *       400:
 *         description: Invalid request data
 *       401:
 *         description: Unauthorized
 */
router.patch('/', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;

    // Validate request body
    const validation = UpdatePreferencesSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        error: 'Invalid request data',
        details: validation.error.flatten().fieldErrors,
      });
    }

    const preferences = await notificationPreferenceService.updatePreferences(
      userId,
      validation.data
    );

    res.json(preferences);
  } catch (error) {
    logger.error('Error updating notification preferences', { error });

    if (error instanceof Error && error.message.includes('Invalid')) {
      return res.status(400).json({ error: error.message });
    }

    res.status(500).json({ error: 'Failed to update notification preferences' });
  }
});

/**
 * @swagger
 * /api/v1/notification-preferences/test:
 *   post:
 *     summary: Send a test notification
 *     tags: [Notification Preferences]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - channel
 *             properties:
 *               channel:
 *                 type: string
 *                 enum: [email, push]
 *     responses:
 *       200:
 *         description: Test notification sent
 *       400:
 *         description: Invalid channel
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Failed to send test notification
 */
router.post('/test', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;

    // Validate request body
    const validation = TestNotificationSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        error: 'Invalid request data',
        details: validation.error.flatten().fieldErrors,
      });
    }

    const result = await notificationPreferenceService.sendTestNotification(
      userId,
      validation.data.channel
    );

    res.json(result);
  } catch (error) {
    logger.error('Error sending test notification', { error });

    if (error instanceof Error && error.message.includes('not yet implemented')) {
      return res.status(501).json({ error: error.message });
    }

    res.status(500).json({ error: 'Failed to send test notification' });
  }
});

export const notificationPreferenceRouter = router;
