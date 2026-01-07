import { Router, Request, Response, NextFunction } from 'express';
import { userService } from '../../services/user-service';
import { authenticate, requirePermission } from '../../middleware/auth-middleware';
import { uploadImage, validateUploadedFile, generateUniqueFilename } from '../../middleware/upload-middleware';
import { storageService } from '../../services/storage-service';
import { z } from 'zod';
import { ApiError } from '../../utils/api-error';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Validation schemas
const createUserSchema = z.object({
  email: z.string().email('Invalid email address'),
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  roleId: z.string().uuid('Invalid role ID'),
});

const updateUserSchema = z.object({
  firstName: z.string().min(1).optional(),
  lastName: z.string().min(1).optional(),
  avatar: z.string().url().optional().transform(v => v ?? undefined),
  isActive: z.boolean().optional(),
});

const updateRoleSchema = z.object({
  roleId: z.string().uuid('Invalid role ID'),
});

// GET /api/users - List users in organization
router.get('/', requirePermission('users:read'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { page, limit, search, status } = req.query;
    const result = await userService.listUsers(req.organizationId!, {
      page: page ? parseInt(page as string) : undefined,
      limit: limit ? parseInt(limit as string) : undefined,
      search: search as string,
      status: status as string,
    });
    res.json(result);
  } catch (error) {
    next(error);
  }
});

// GET /api/users/:userId - Get single user
router.get('/:userId', requirePermission('users:read'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await userService.getUser(req.params.userId, req.organizationId!);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

// POST /api/users - Create/invite user
router.post('/', requirePermission('users:write', 'users:manage'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = createUserSchema.parse(req.body);
    const result = await userService.createUser(req.organizationId!, data);
    res.status(201).json(result);
  } catch (error) {
    if (error instanceof z.ZodError) {
      next(ApiError.badRequest(error.errors[0].message));
    } else {
      next(error);
    }
  }
});

// PATCH /api/users/:userId - Update user
router.patch('/:userId', requirePermission('users:write', 'users:manage'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = updateUserSchema.parse(req.body);
    const result = await userService.updateUser(req.params.userId, req.organizationId!, data);
    res.json(result);
  } catch (error) {
    if (error instanceof z.ZodError) {
      next(ApiError.badRequest(error.errors[0].message));
    } else {
      next(error);
    }
  }
});

// PATCH /api/users/:userId/role - Update user's role
router.patch('/:userId/role', requirePermission('users:manage'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = updateRoleSchema.parse(req.body);
    const result = await userService.updateUserRole(req.params.userId, req.organizationId!, data.roleId);
    res.json(result);
  } catch (error) {
    if (error instanceof z.ZodError) {
      next(ApiError.badRequest(error.errors[0].message));
    } else {
      next(error);
    }
  }
});

// DELETE /api/users/:userId - Remove user from organization
router.delete('/:userId', requirePermission('users:delete', 'users:manage'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await userService.removeUser(req.params.userId, req.organizationId!);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

// POST /api/users/me/avatar - Upload avatar (current user)
router.post('/me/avatar', uploadImage('avatar'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const file = validateUploadedFile(req.file);
    const userId = req.user!.userId;
    const organizationId = req.organizationId!;

    // Generate unique filename
    const filename = generateUniqueFilename(organizationId, `avatar-${userId}-${file.originalname}`);

    // Upload to S3
    const uploadResult = await storageService.upload(file.buffer, filename, file.mimetype);

    // Update user avatar
    const result = await userService.updateUser(userId, organizationId, {
      avatar: uploadResult.url,
    });

    res.json(result);
  } catch (error) {
    next(error);
  }
});

// DELETE /api/users/me/avatar - Remove avatar (current user)
router.delete('/me/avatar', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.userId;
    const organizationId = req.organizationId!;

    // Update user avatar to null
    const result = await userService.updateUser(userId, organizationId, {
      avatar: null,
    });

    res.json(result);
  } catch (error) {
    next(error);
  }
});

export { router as userRouter };
