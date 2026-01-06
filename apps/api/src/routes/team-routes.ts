import { Router, Request, Response, NextFunction } from 'express';
import { teamService } from '../services/team-service';
import { authenticate, requirePermission } from '../middleware/auth-middleware';
import { z } from 'zod';
import { ApiError } from '../utils/api-error';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Validation schemas
const createTeamSchema = z.object({
  name: z.string().min(1, 'Team name is required').max(100),
  description: z.string().max(500).optional(),
});

const updateTeamSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional().nullable(),
});

const addMemberSchema = z.object({
  userId: z.string().uuid('Invalid user ID'),
  role: z.enum(['LEAD', 'MEMBER']).optional(),
});

const updateMemberRoleSchema = z.object({
  role: z.enum(['LEAD', 'MEMBER']),
});

// GET /api/teams - List teams
router.get('/', requirePermission('teams:read'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { page, limit, search } = req.query;
    const result = await teamService.listTeams(req.organizationId!, {
      page: page ? parseInt(page as string) : undefined,
      limit: limit ? parseInt(limit as string) : undefined,
      search: search as string,
    });
    res.json(result);
  } catch (error) {
    next(error);
  }
});

// GET /api/teams/:teamId - Get single team
router.get('/:teamId', requirePermission('teams:read'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await teamService.getTeam(req.params.teamId, req.organizationId!);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

// POST /api/teams - Create team
router.post('/', requirePermission('teams:write', 'teams:manage'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = createTeamSchema.parse(req.body);
    const result = await teamService.createTeam(req.organizationId!, data);
    res.status(201).json(result);
  } catch (error) {
    if (error instanceof z.ZodError) {
      next(ApiError.badRequest(error.errors[0].message));
    } else {
      next(error);
    }
  }
});

// PATCH /api/teams/:teamId - Update team
router.patch('/:teamId', requirePermission('teams:write', 'teams:manage'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = updateTeamSchema.parse(req.body);
    const result = await teamService.updateTeam(req.params.teamId, req.organizationId!, data);
    res.json(result);
  } catch (error) {
    if (error instanceof z.ZodError) {
      next(ApiError.badRequest(error.errors[0].message));
    } else {
      next(error);
    }
  }
});

// DELETE /api/teams/:teamId - Delete team
router.delete('/:teamId', requirePermission('teams:delete', 'teams:manage'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await teamService.deleteTeam(req.params.teamId, req.organizationId!);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

// POST /api/teams/:teamId/members - Add member to team
router.post('/:teamId/members', requirePermission('teams:write', 'teams:manage'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = addMemberSchema.parse(req.body);
    const result = await teamService.addMember(
      req.params.teamId,
      req.organizationId!,
      data.userId,
      data.role
    );
    res.status(201).json(result);
  } catch (error) {
    if (error instanceof z.ZodError) {
      next(ApiError.badRequest(error.errors[0].message));
    } else {
      next(error);
    }
  }
});

// DELETE /api/teams/:teamId/members/:userId - Remove member from team
router.delete('/:teamId/members/:userId', requirePermission('teams:write', 'teams:manage'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await teamService.removeMember(
      req.params.teamId,
      req.organizationId!,
      req.params.userId
    );
    res.json(result);
  } catch (error) {
    next(error);
  }
});

// PATCH /api/teams/:teamId/members/:userId - Update member role
router.patch('/:teamId/members/:userId', requirePermission('teams:write', 'teams:manage'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = updateMemberRoleSchema.parse(req.body);
    const result = await teamService.updateMemberRole(
      req.params.teamId,
      req.organizationId!,
      req.params.userId,
      data.role
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

export { router as teamRouter };
