/**
 * OAuth Routes
 * Handles OAuth authentication flow and provider management
 */

import { Router, Request, Response, NextFunction } from 'express';
import { oauthService } from '../../services/oauth';
import { authenticate, requirePermission } from '../../middleware/auth-middleware';
import { z } from 'zod';
import { ApiError } from '../../utils/api-error';
import { OAuthProviderType } from '@prisma/client';

const router = Router();

// Validation schemas
const initiateOAuthSchema = z.object({
  providerId: z.string().min(1),
  redirectUrl: z.string().url().optional(),
  invitationToken: z.string().optional(),
});

const configureProviderSchema = z.object({
  provider: z.nativeEnum(OAuthProviderType),
  name: z.string().min(1),
  clientId: z.string().min(1),
  clientSecret: z.string().min(1),
  tenantId: z.string().optional(),
  domain: z.string().optional(),
  scopes: z.array(z.string()).optional(),
  enabled: z.boolean().optional(),
  autoProvision: z.boolean().optional(),
  defaultRoleId: z.string().optional(),
  settings: z.record(z.unknown()).optional(),
});

// ================================
// Public Routes (no auth required)
// ================================

// GET /api/oauth/providers - Get available OAuth providers
router.get('/providers', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const organizationId = req.query.organizationId as string | undefined;
    const providers = await oauthService.getAvailableProviders(organizationId);
    res.json({ providers });
  } catch (error) {
    next(error);
  }
});

// POST /api/oauth/initiate - Start OAuth flow
router.post('/initiate', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = initiateOAuthSchema.parse(req.body);

    // Build redirect URI based on request
    const protocol = req.secure ? 'https' : 'http';
    const host = req.get('host');
    const redirectUri = `${protocol}://${host}/api/oauth/callback`;

    const result = await oauthService.initiateOAuth(
      data.providerId,
      redirectUri,
      {
        redirectUrl: data.redirectUrl,
        invitationToken: data.invitationToken,
      }
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

// GET /api/oauth/callback - OAuth callback handler
router.get('/callback', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { code, state, error, error_description } = req.query;

    if (error) {
      // Redirect to frontend with error
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
      return res.redirect(`${frontendUrl}/login?error=${encodeURIComponent(error_description as string || error as string)}`);
    }

    if (!code || !state) {
      throw ApiError.badRequest('Missing code or state parameter');
    }

    // Extract provider ID from state or use a default lookup
    // In production, store provider ID in the state
    const providerId = req.query.provider_id as string;

    if (!providerId) {
      throw ApiError.badRequest('Missing provider ID');
    }

    // Build redirect URI
    const protocol = req.secure ? 'https' : 'http';
    const host = req.get('host');
    const redirectUri = `${protocol}://${host}/api/oauth/callback`;

    const result = await oauthService.handleCallback(
      providerId,
      code as string,
      state as string,
      redirectUri
    );

    // Redirect to frontend with tokens
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const redirectPath = result.redirectUrl || '/dashboard';

    // Pass tokens via URL fragment (more secure than query params)
    const tokenData = encodeURIComponent(JSON.stringify({
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
      user: result.user,
      organization: result.organization,
      permissions: result.permissions,
    }));

    res.redirect(`${frontendUrl}/auth/callback#data=${tokenData}`);
  } catch (error) {
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const errorMessage = error instanceof Error ? error.message : 'Authentication failed';
    res.redirect(`${frontendUrl}/login?error=${encodeURIComponent(errorMessage)}`);
  }
});

// ================================
// Admin Routes (auth required)
// ================================

// GET /api/oauth/admin/providers - Get organization's OAuth providers
router.get(
  '/admin/providers',
  authenticate,
  requirePermission('settings:read', 'security:manage'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const providers = await oauthService.getOrganizationProviders(req.organizationId!);
      res.json({ providers });
    } catch (error) {
      next(error);
    }
  }
);

// POST /api/oauth/admin/providers - Configure OAuth provider
router.post(
  '/admin/providers',
  authenticate,
  requirePermission('security:manage'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = configureProviderSchema.parse(req.body);
      const provider = await oauthService.configureProvider(req.organizationId!, data);
      res.status(201).json({ provider });
    } catch (error) {
      if (error instanceof z.ZodError) {
        next(ApiError.badRequest(error.errors[0].message));
      } else {
        next(error);
      }
    }
  }
);

// PUT /api/oauth/admin/providers/:id - Update OAuth provider
router.put(
  '/admin/providers/:id',
  authenticate,
  requirePermission('security:manage'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = configureProviderSchema.partial().parse(req.body);

      // Get existing provider to merge data
      const existing = await oauthService.getOrganizationProviders(req.organizationId!);
      const provider = existing.find(p => p.id === req.params.id);

      if (!provider) {
        throw ApiError.notFound('OAuth provider not found');
      }

      const updated = await oauthService.configureProvider(req.organizationId!, {
        provider: data.provider || provider.provider,
        name: data.name || provider.name,
        clientId: data.clientId || provider.clientId,
        clientSecret: data.clientSecret || '', // Must be provided for update
        tenantId: data.tenantId ?? provider.tenantId ?? undefined,
        domain: data.domain ?? provider.domain ?? undefined,
        scopes: data.scopes || provider.scopes,
        enabled: data.enabled ?? provider.enabled,
        autoProvision: data.autoProvision ?? provider.autoProvision,
        defaultRoleId: data.defaultRoleId ?? provider.defaultRoleId ?? undefined,
        settings: data.settings,
      });

      res.json({ provider: updated });
    } catch (error) {
      if (error instanceof z.ZodError) {
        next(ApiError.badRequest(error.errors[0].message));
      } else {
        next(error);
      }
    }
  }
);

// DELETE /api/oauth/admin/providers/:id - Delete OAuth provider
router.delete(
  '/admin/providers/:id',
  authenticate,
  requirePermission('security:manage'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await oauthService.deleteProvider(req.organizationId!, req.params.id);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }
);

// GET /api/oauth/supported-providers - Get list of supported OAuth provider types
router.get('/supported-providers', (_req: Request, res: Response) => {
  res.json({
    providers: [
      {
        type: 'GOOGLE',
        name: 'Google',
        description: 'Sign in with Google or Google Workspace',
        configFields: ['clientId', 'clientSecret', 'domain'],
      },
      {
        type: 'MICROSOFT',
        name: 'Microsoft',
        description: 'Sign in with Microsoft or Microsoft Entra ID (Azure AD)',
        configFields: ['clientId', 'clientSecret', 'tenantId'],
      },
      {
        type: 'GITHUB',
        name: 'GitHub',
        description: 'Sign in with GitHub',
        configFields: ['clientId', 'clientSecret'],
        comingSoon: true,
      },
      {
        type: 'OKTA',
        name: 'Okta',
        description: 'Sign in with Okta',
        configFields: ['clientId', 'clientSecret', 'domain'],
        comingSoon: true,
      },
    ],
  });
});

export { router as oauthRouter };
