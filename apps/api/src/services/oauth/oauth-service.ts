/**
 * OAuth Service
 * Orchestrates OAuth authentication flow, user creation/linking, and token management
 */

import { prisma } from '../../utils/prisma';
import { generateAccessToken, generateRefreshToken } from '../../utils/jwt';
import { ApiError } from '../../utils/api-error';
import { oauthProviderRegistry, OAuthConfig, OAuthUserProfile } from './oauth-provider.interface';
import { OAuthProviderType, Prisma } from '@prisma/client';
import crypto from 'crypto';

// Import providers to register them
import './google-oauth-provider';
import './microsoft-oauth-provider';

interface OAuthState {
  organizationId?: string;
  invitationToken?: string;
  redirectUrl?: string;
  codeVerifier?: string;
}

// In-memory state store (use Redis in production)
const stateStore = new Map<string, OAuthState>();

export class OAuthService {
  /**
   * Get available OAuth providers for an organization
   */
  async getAvailableProviders(organizationId?: string) {
    const providers = await prisma.authProvider.findMany({
      where: {
        enabled: true,
        OR: [
          { organizationId: null }, // Global providers
          { organizationId }, // Org-specific providers
        ],
      },
      select: {
        id: true,
        provider: true,
        name: true,
        organizationId: true,
      },
    });

    return providers.map((p) => ({
      id: p.id,
      type: p.provider,
      name: p.name,
      isGlobal: p.organizationId === null,
    }));
  }

  /**
   * Initiate OAuth flow - returns URL to redirect user to
   */
  async initiateOAuth(
    providerId: string,
    redirectUri: string,
    options?: {
      organizationId?: string;
      invitationToken?: string;
      redirectUrl?: string;
    }
  ) {
    const authProvider = await prisma.authProvider.findUnique({
      where: { id: providerId },
    });

    if (!authProvider || !authProvider.enabled) {
      throw ApiError.notFound('OAuth provider not found or disabled');
    }

    const provider = oauthProviderRegistry.get(authProvider.provider);
    if (!provider) {
      throw ApiError.internal(`Provider ${authProvider.provider} not implemented`);
    }

    // Generate state for CSRF protection
    const state = crypto.randomBytes(32).toString('hex');

    const config: OAuthConfig = {
      clientId: authProvider.clientId,
      clientSecret: authProvider.clientSecret,
      redirectUri,
      scopes: authProvider.scopes,
      tenantId: authProvider.tenantId || undefined,
      domain: authProvider.domain || undefined,
      settings: authProvider.settings as Record<string, unknown> || undefined,
    };

    const authUrl = await provider.getAuthorizationUrl(config, state);

    // Store state with code verifier for PKCE
    stateStore.set(state, {
      organizationId: options?.organizationId,
      invitationToken: options?.invitationToken,
      redirectUrl: options?.redirectUrl,
      codeVerifier: authUrl.codeVerifier,
    });

    // Clean up old states after 10 minutes
    setTimeout(() => stateStore.delete(state), 10 * 60 * 1000);

    return {
      authorizationUrl: authUrl.url,
      state,
    };
  }

  /**
   * Handle OAuth callback - exchange code for tokens and create/link user
   */
  async handleCallback(
    providerId: string,
    code: string,
    state: string,
    redirectUri: string
  ) {
    // Validate state
    const storedState = stateStore.get(state);
    if (!storedState) {
      throw ApiError.badRequest('Invalid or expired OAuth state');
    }
    stateStore.delete(state);

    const authProvider = await prisma.authProvider.findUnique({
      where: { id: providerId },
      include: {
        defaultRole: true,
        organization: true,
      },
    });

    if (!authProvider || !authProvider.enabled) {
      throw ApiError.notFound('OAuth provider not found or disabled');
    }

    const provider = oauthProviderRegistry.get(authProvider.provider);
    if (!provider) {
      throw ApiError.internal(`Provider ${authProvider.provider} not implemented`);
    }

    const config: OAuthConfig = {
      clientId: authProvider.clientId,
      clientSecret: authProvider.clientSecret,
      redirectUri,
      scopes: authProvider.scopes,
      tenantId: authProvider.tenantId || undefined,
      domain: authProvider.domain || undefined,
    };

    // Exchange code for tokens
    const tokens = await provider.exchangeCodeForTokens(config, {
      code,
      state,
      codeVerifier: storedState.codeVerifier,
    });

    // Get user profile from provider
    const profile = await provider.getUserProfile(tokens);

    // Domain restriction check
    if (authProvider.domain) {
      const emailDomain = profile.email.split('@')[1];
      if (emailDomain !== authProvider.domain) {
        throw ApiError.forbidden(`Only ${authProvider.domain} email addresses are allowed`);
      }
    }

    // Find or create user
    const result = await this.findOrCreateUser(
      profile,
      authProvider,
      tokens,
      storedState
    );

    return {
      ...result,
      redirectUrl: storedState.redirectUrl,
    };
  }

  /**
   * Find existing user or create new one based on OAuth profile
   */
  private async findOrCreateUser(
    profile: OAuthUserProfile,
    authProvider: {
      id: string;
      organizationId: string | null;
      autoProvision: boolean;
      defaultRoleId: string | null;
      organization: { id: string; name: string; slug: string } | null;
    },
    tokens: { accessToken: string; refreshToken?: string; expiresAt?: Date },
    storedState: OAuthState
  ) {
    // Check if user already linked with this provider
    const existingLink = await prisma.userAuthProvider.findUnique({
      where: {
        providerId_providerUserId: {
          providerId: authProvider.id,
          providerUserId: profile.id,
        },
      },
      include: {
        user: {
          include: {
            organizations: {
              where: { status: 'ACTIVE' },
              include: {
                organization: true,
                role: {
                  include: {
                    permissions: {
                      include: { permission: true },
                    },
                  },
                },
              },
              take: 1,
            },
          },
        },
      },
    });

    if (existingLink) {
      // Update tokens
      await prisma.userAuthProvider.update({
        where: { id: existingLink.id },
        data: {
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken,
          tokenExpiresAt: tokens.expiresAt,
          profile: profile.rawProfile as Prisma.InputJsonValue,
        },
      });

      // Update last login
      await prisma.user.update({
        where: { id: existingLink.userId },
        data: { lastLoginAt: new Date() },
      });

      return this.generateAuthResponse(existingLink.user);
    }

    // Check if user exists by email
    let user = await prisma.user.findUnique({
      where: { email: profile.email },
      include: {
        organizations: {
          where: { status: 'ACTIVE' },
          include: {
            organization: true,
            role: {
              include: {
                permissions: {
                  include: { permission: true },
                },
              },
            },
          },
          take: 1,
        },
      },
    });

    if (user) {
      // Link existing user to OAuth provider
      await prisma.userAuthProvider.create({
        data: {
          userId: user.id,
          providerId: authProvider.id,
          providerUserId: profile.id,
          email: profile.email,
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken,
          tokenExpiresAt: tokens.expiresAt,
          profile: profile.rawProfile as Prisma.InputJsonValue,
        },
      });

      await prisma.user.update({
        where: { id: user.id },
        data: {
          lastLoginAt: new Date(),
          emailVerified: profile.emailVerified || user.emailVerified,
          avatar: user.avatar || profile.avatar,
        },
      });

      return this.generateAuthResponse(user);
    }

    // Auto-provision new user if enabled
    if (!authProvider.autoProvision) {
      throw ApiError.forbidden('User not found. Contact your administrator to be added.');
    }

    if (!authProvider.organizationId || !authProvider.defaultRoleId) {
      throw ApiError.internal('OAuth provider not properly configured for auto-provisioning');
    }

    // Create new user with organization membership
    const newUser = await prisma.$transaction(async (tx) => {
      const createdUser = await tx.user.create({
        data: {
          email: profile.email,
          firstName: profile.firstName,
          lastName: profile.lastName,
          avatar: profile.avatar,
          emailVerified: profile.emailVerified,
          passwordHash: null, // OAuth-only user
        },
      });

      // Add to organization
      await tx.organizationMember.create({
        data: {
          userId: createdUser.id,
          organizationId: authProvider.organizationId!,
          roleId: authProvider.defaultRoleId!,
          status: 'ACTIVE',
        },
      });

      // Link OAuth provider
      await tx.userAuthProvider.create({
        data: {
          userId: createdUser.id,
          providerId: authProvider.id,
          providerUserId: profile.id,
          email: profile.email,
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken,
          tokenExpiresAt: tokens.expiresAt,
          profile: profile.rawProfile as Prisma.InputJsonValue,
        },
      });

      return createdUser;
    });

    // Fetch full user with relations
    const fullUser = await prisma.user.findUnique({
      where: { id: newUser.id },
      include: {
        organizations: {
          where: { status: 'ACTIVE' },
          include: {
            organization: true,
            role: {
              include: {
                permissions: {
                  include: { permission: true },
                },
              },
            },
          },
          take: 1,
        },
      },
    });

    return this.generateAuthResponse(fullUser!);
  }

  /**
   * Generate authentication response with tokens
   */
  private async generateAuthResponse(user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    avatar: string | null;
    organizations: Array<{
      organization: { id: string; name: string; slug: string };
      role: {
        name: string;
        permissions: Array<{ permission: { code: string } }>;
      };
    }>;
  }) {
    const defaultOrg = user.organizations[0];
    if (!defaultOrg) {
      throw ApiError.notFound('No organization found for user');
    }

    const accessToken = generateAccessToken({
      userId: user.id,
      email: user.email,
      organizationId: defaultOrg.organization.id,
    });

    const refreshToken = generateRefreshToken({
      userId: user.id,
      email: user.email,
      organizationId: defaultOrg.organization.id,
    });

    // Create session
    await prisma.session.create({
      data: {
        userId: user.id,
        token: refreshToken,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      },
    });

    const permissions = defaultOrg.role.permissions.map((p) => p.permission.code);

    return {
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        avatar: user.avatar,
      },
      organization: {
        id: defaultOrg.organization.id,
        name: defaultOrg.organization.name,
        slug: defaultOrg.organization.slug,
        role: defaultOrg.role.name,
      },
      permissions,
      accessToken,
      refreshToken,
    };
  }

  /**
   * Admin: Create or update OAuth provider configuration
   */
  async configureProvider(
    organizationId: string,
    data: {
      provider: OAuthProviderType;
      name: string;
      clientId: string;
      clientSecret: string;
      tenantId?: string;
      domain?: string;
      scopes?: string[];
      enabled?: boolean;
      autoProvision?: boolean;
      defaultRoleId?: string;
      settings?: Record<string, unknown>;
    }
  ) {
    const existing = await prisma.authProvider.findUnique({
      where: {
        organizationId_provider: {
          organizationId,
          provider: data.provider,
        },
      },
    });

    if (existing) {
      return prisma.authProvider.update({
        where: { id: existing.id },
        data: {
          name: data.name,
          clientId: data.clientId,
          clientSecret: data.clientSecret,
          tenantId: data.tenantId,
          domain: data.domain,
          scopes: data.scopes,
          enabled: data.enabled,
          autoProvision: data.autoProvision,
          defaultRoleId: data.defaultRoleId,
          settings: data.settings as Prisma.InputJsonValue,
        },
      });
    }

    return prisma.authProvider.create({
      data: {
        organizationId,
        provider: data.provider,
        name: data.name,
        clientId: data.clientId,
        clientSecret: data.clientSecret,
        tenantId: data.tenantId,
        domain: data.domain,
        scopes: data.scopes || ['openid', 'email', 'profile'],
        enabled: data.enabled ?? true,
        autoProvision: data.autoProvision ?? false,
        defaultRoleId: data.defaultRoleId,
        settings: data.settings as Prisma.InputJsonValue,
      },
    });
  }

  /**
   * Admin: Delete OAuth provider configuration
   */
  async deleteProvider(organizationId: string, providerId: string) {
    const provider = await prisma.authProvider.findFirst({
      where: {
        id: providerId,
        organizationId,
      },
    });

    if (!provider) {
      throw ApiError.notFound('OAuth provider not found');
    }

    await prisma.authProvider.delete({
      where: { id: providerId },
    });

    return { message: 'OAuth provider deleted' };
  }

  /**
   * Get OAuth providers for organization (admin view)
   */
  async getOrganizationProviders(organizationId: string) {
    return prisma.authProvider.findMany({
      where: { organizationId },
      select: {
        id: true,
        provider: true,
        name: true,
        clientId: true,
        tenantId: true,
        domain: true,
        scopes: true,
        enabled: true,
        autoProvision: true,
        defaultRoleId: true,
        defaultRole: {
          select: { id: true, name: true },
        },
        createdAt: true,
        updatedAt: true,
      },
    });
  }
}

export const oauthService = new OAuthService();
