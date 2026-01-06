import { Router, Request, Response, NextFunction } from 'express';
import { invitationService } from '../services/invitation-service';
import { authenticate, requirePermission } from '../middleware/auth-middleware';
import { z } from 'zod';
import { ApiError } from '../utils/api-error';

const router = Router();

// Validation schemas
const sendInvitationSchema = z.object({
  email: z.string().email('Invalid email address'),
  roleId: z.string().min(1, 'Role ID is required'),
});

const acceptInvitationSchema = z.object({
  password: z.string().min(8, 'Password must be at least 8 characters').optional(),
  firstName: z.string().min(1, 'First name is required').optional(),
  lastName: z.string().min(1, 'Last name is required').optional(),
});

// Public routes (no auth required)

// GET /api/invitations/:token - Get invitation details by token
router.get('/:token', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await invitationService.getInvitationByToken(req.params.token);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

// POST /api/invitations/:token/accept - Accept invitation
router.post('/:token/accept', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = acceptInvitationSchema.parse(req.body);
    const result = await invitationService.acceptInvitation(
      req.params.token,
      undefined,
      data.password && data.firstName && data.lastName
        ? { password: data.password, firstName: data.firstName, lastName: data.lastName }
        : undefined
    );
    res.json(result);
  } catch (error) {
    if (error instanceof z.ZodError) {
      next(ApiError.badRequest(error.errors[0].message));
    } else {
      next(error);
    }
  }
});

// Protected routes (auth required)

// GET /api/invitations - List pending invitations
router.get('/', authenticate, requirePermission('users:read', 'users:manage'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { page, limit } = req.query;
    const result = await invitationService.listInvitations(req.organizationId!, {
      page: page ? parseInt(page as string) : undefined,
      limit: limit ? parseInt(limit as string) : undefined,
    });
    res.json(result);
  } catch (error) {
    next(error);
  }
});

// POST /api/invitations - Send new invitation
router.post('/', authenticate, requirePermission('users:write', 'users:manage'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = sendInvitationSchema.parse(req.body);
    const result = await invitationService.sendInvitation({
      email: data.email,
      roleId: data.roleId,
      organizationId: req.organizationId!,
      invitedById: req.user!.userId,
    });
    res.status(201).json(result);
  } catch (error) {
    if (error instanceof z.ZodError) {
      next(ApiError.badRequest(error.errors[0].message));
    } else {
      next(error);
    }
  }
});

// POST /api/invitations/:id/resend - Resend invitation
router.post('/:id/resend', authenticate, requirePermission('users:write', 'users:manage'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await invitationService.resendInvitation(req.params.id, req.organizationId!);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

// DELETE /api/invitations/:id - Revoke invitation
router.delete('/:id', authenticate, requirePermission('users:write', 'users:manage'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await invitationService.revokeInvitation(req.params.id, req.organizationId!);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

export { router as invitationRouter };
