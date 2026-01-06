import { Router, Request, Response, NextFunction } from 'express';
import { roleService } from '../services/role-service';
import { authenticate, requirePermission } from '../middleware/auth-middleware';
import { z } from 'zod';
import { ApiError } from '../utils/api-error';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Validation schemas
const createRoleSchema = z.object({
  name: z.string().min(1, 'Role name is required').max(50),
  description: z.string().max(200).optional(),
  permissions: z.array(z.string()).min(1, 'At least one permission is required'),
});

const updateRoleSchema = z.object({
  name: z.string().min(1).max(50).optional(),
  description: z.string().max(200).optional().nullable(),
  permissions: z.array(z.string()).optional(),
});

// GET /api/roles - List roles in organization
router.get('/', requirePermission('roles:read'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await roleService.listRoles(req.organizationId!);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

// GET /api/roles/permissions - List all available permissions
router.get('/permissions', requirePermission('roles:read'), async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await roleService.listPermissions();
    res.json(result);
  } catch (error) {
    next(error);
  }
});

// GET /api/roles/:roleId - Get single role
router.get('/:roleId', requirePermission('roles:read'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await roleService.getRole(req.params.roleId, req.organizationId!);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

// POST /api/roles - Create custom role
router.post('/', requirePermission('roles:write', 'roles:manage'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = createRoleSchema.parse(req.body);
    const result = await roleService.createRole(req.organizationId!, data);
    res.status(201).json(result);
  } catch (error) {
    if (error instanceof z.ZodError) {
      next(ApiError.badRequest(error.errors[0].message));
    } else {
      next(error);
    }
  }
});

// PATCH /api/roles/:roleId - Update role
router.patch('/:roleId', requirePermission('roles:write', 'roles:manage'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = updateRoleSchema.parse(req.body);
    const result = await roleService.updateRole(req.params.roleId, req.organizationId!, data);
    res.json(result);
  } catch (error) {
    if (error instanceof z.ZodError) {
      next(ApiError.badRequest(error.errors[0].message));
    } else {
      next(error);
    }
  }
});

// DELETE /api/roles/:roleId - Delete role
router.delete('/:roleId', requirePermission('roles:delete', 'roles:manage'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await roleService.deleteRole(req.params.roleId, req.organizationId!);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

export { router as roleRouter };
