/**
 * Messaging Routes
 * API endpoints for secure patient-provider messaging
 */

import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { messagingService } from '../../services/messaging-service';
import { authenticate, requirePermission } from '../../middleware/auth-middleware';
import { ApiError } from '../../utils/api-error';
import { ConversationStatus, MessageType } from '@prisma/client';

const router = Router();

// All routes require authentication
router.use(authenticate);

// ============================================
// VALIDATION SCHEMAS
// ============================================

const createConversationSchema = z.object({
  patientId: z.string().min(1, 'Patient ID is required'),
  subject: z.string().optional(),
  initialMessage: z.string().optional(),
  participantUserIds: z.array(z.string()).default([]),
});

const sendMessageSchema = z.object({
  content: z.string().min(1, 'Message content is required'),
  messageType: z.nativeEnum(MessageType).optional(),
  attachments: z.any().optional(),
});

// ============================================
// CONVERSATION ROUTES
// ============================================

/**
 * GET /api/v1/messages/conversations
 * Get user's conversations
 */
router.get(
  '/conversations',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { patientId, status, page, limit } = req.query;

      const result = await messagingService.getConversations(
        req.user!.userId,
        req.organizationId!,
        {
          patientId: patientId as string | undefined,
          status: status as ConversationStatus | undefined,
          page: page ? parseInt(page as string, 10) : undefined,
          limit: limit ? parseInt(limit as string, 10) : undefined,
        }
      );

      res.json(result);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/v1/messages/conversations/:id
 * Get conversation details
 */
router.get(
  '/conversations/:id',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;

      const conversation = await messagingService.getConversation(
        id,
        req.user!.userId,
        req.organizationId!
      );

      res.json(conversation);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/v1/messages/conversations
 * Create new conversation
 */
router.post(
  '/conversations',
  requirePermission('patients:read'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = createConversationSchema.parse(req.body);

      const conversation = await messagingService.createConversation(
        req.organizationId!,
        data,
        req.user!.userId
      );

      res.status(201).json(conversation);
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
 * PUT /api/v1/messages/conversations/:id/archive
 * Archive conversation
 */
router.put(
  '/conversations/:id/archive',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;

      const conversation = await messagingService.archiveConversation(
        id,
        req.organizationId!,
        req.user!.userId
      );

      res.json(conversation);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/v1/messages/patients/:patientId/conversations
 * Get all conversations for a patient
 */
router.get(
  '/patients/:patientId/conversations',
  requirePermission('patients:read'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { patientId } = req.params;

      const result = await messagingService.getPatientConversations(
        patientId,
        req.organizationId!
      );

      res.json(result);
    } catch (error) {
      next(error);
    }
  }
);

// ============================================
// MESSAGE ROUTES
// ============================================

/**
 * GET /api/v1/messages/conversations/:id/messages
 * Get messages in conversation
 */
router.get(
  '/conversations/:id/messages',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const { before, limit } = req.query;

      const result = await messagingService.getMessages(
        id,
        req.user!.userId,
        req.organizationId!,
        {
          before: before as string | undefined,
          limit: limit ? parseInt(limit as string, 10) : undefined,
        }
      );

      res.json(result);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/v1/messages/conversations/:id/messages
 * Send message in conversation
 */
router.post(
  '/conversations/:id/messages',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const data = sendMessageSchema.parse(req.body);

      const message = await messagingService.sendMessage(
        id,
        req.user!.userId,
        req.organizationId!,
        data
      );

      res.status(201).json(message);
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
 * PUT /api/v1/messages/conversations/:id/read
 * Mark conversation as read
 */
router.put(
  '/conversations/:id/read',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;

      await messagingService.markAsRead(
        id,
        req.user!.userId,
        req.organizationId!
      );

      res.json({ success: true });
    } catch (error) {
      next(error);
    }
  }
);

// ============================================
// UNREAD COUNT
// ============================================

/**
 * GET /api/v1/messages/unread-count
 * Get total unread message count for user
 */
router.get(
  '/unread-count',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await messagingService.getUnreadCount(
        req.user!.userId,
        req.organizationId!
      );

      res.json(result);
    } catch (error) {
      next(error);
    }
  }
);

export default router;
