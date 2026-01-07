import { Router, Request, Response, NextFunction } from 'express';
import { organizationService } from '../../services/organization-service';
import { authenticate, requirePermission } from '../../middleware/auth-middleware';
import { z } from 'zod';
import { ApiError } from '../../utils/api-error';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Validation schemas
const createOrganizationSchema = z.object({
  name: z.string().min(1, 'Organization name is required').max(100),
  logo: z.string().url().optional().nullable(),
});

const updateOrganizationSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  logo: z.string().url().optional().transform(v => v ?? undefined),
  settings: z.record(z.any()).optional(),
});

const switchOrganizationSchema = z.object({
  organizationId: z.string().min(1, 'Organization ID is required'),
});

// GET /api/organizations - List user's organizations
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await organizationService.listUserOrganizations(req.user!.userId);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

// POST /api/organizations - Create a new organization (workspace/tenant)
router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = createOrganizationSchema.parse(req.body);
    const result = await organizationService.createOrganization(req.user!.userId, {
      name: data.name,
      logo: data.logo || undefined,
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

// GET /api/organizations/current - Get current organization
router.get('/current', requirePermission('organization:read'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await organizationService.getOrganization(req.organizationId!);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

// GET /api/organizations/current/stats - Get organization stats
router.get('/current/stats', requirePermission('dashboard:view'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await organizationService.getOrganizationStats(req.organizationId!);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

// PATCH /api/organizations/current - Update current organization
router.patch('/current', requirePermission('organization:write', 'organization:manage'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = updateOrganizationSchema.parse(req.body);
    const result = await organizationService.updateOrganization(req.organizationId!, data);
    res.json(result);
  } catch (error) {
    if (error instanceof z.ZodError) {
      next(ApiError.badRequest(error.errors[0].message));
    } else {
      next(error);
    }
  }
});

// POST /api/organizations/switch - Switch to another organization
router.post('/switch', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = switchOrganizationSchema.parse(req.body);
    const result = await organizationService.switchOrganization(req.user!.userId, data.organizationId);
    res.json(result);
  } catch (error) {
    if (error instanceof z.ZodError) {
      next(ApiError.badRequest(error.errors[0].message));
    } else {
      next(error);
    }
  }
});

// Branding validation schema
const updateBrandingSchema = z.object({
  logo: z.string().url().optional().nullable(),
  favicon: z.string().url().optional().nullable(),
  primaryColor: z.string().regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, 'Invalid hex color').optional(),
  accentColor: z.string().regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, 'Invalid hex color').optional(),
  darkMode: z.boolean().optional(),
});

// PATCH /api/organizations/current/branding - Update organization branding
router.patch('/current/branding', requirePermission('organization:write', 'organization:manage'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = updateBrandingSchema.parse(req.body);
    const result = await organizationService.updateBranding(req.organizationId!, data);
    res.json(result);
  } catch (error) {
    if (error instanceof z.ZodError) {
      next(ApiError.badRequest(error.errors[0].message));
    } else {
      next(error);
    }
  }
});

// POST /api/organizations/current/logo - Upload organization logo (uses file upload)
// This endpoint would typically use multipart/form-data with multer
// For now, we'll accept a URL from the upload service
router.post('/current/logo', requirePermission('organization:write', 'organization:manage'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { logoUrl, type } = req.body;
    if (!logoUrl || typeof logoUrl !== 'string') {
      throw ApiError.badRequest('Logo URL is required');
    }
    if (!type || !['logo', 'favicon'].includes(type)) {
      throw ApiError.badRequest('Type must be "logo" or "favicon"');
    }

    const result = await organizationService.updateBranding(req.organizationId!, {
      [type]: logoUrl,
    });
    res.json(result);
  } catch (error) {
    next(error);
  }
});

// DELETE /api/organizations/current/logo - Remove organization logo
router.delete('/current/logo', requirePermission('organization:write', 'organization:manage'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { type } = req.query;
    if (!type || !['logo', 'favicon'].includes(type as string)) {
      throw ApiError.badRequest('Type query parameter must be "logo" or "favicon"');
    }

    const result = await organizationService.updateBranding(req.organizationId!, {
      [type as string]: null,
    });
    res.json(result);
  } catch (error) {
    next(error);
  }
});

export { router as organizationRouter };
