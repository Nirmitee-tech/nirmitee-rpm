import { prisma } from '../utils/prisma';
import { hashPassword, comparePassword, generateResetToken } from '../utils/password';
import { generateAccessToken, generateRefreshToken, verifyRefreshToken } from '../utils/jwt';
import { ApiError } from '../utils/api-error';

interface SignupData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  organizationName?: string;
}

interface LoginData {
  email: string;
  password: string;
}

export class AuthService {
  async signup(data: SignupData) {
    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { email: data.email },
    });

    if (existingUser) {
      throw ApiError.conflict('Email already registered');
    }

    const passwordHash = await hashPassword(data.password);

    // Create user, organization, and assign owner role in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create user
      const user = await tx.user.create({
        data: {
          email: data.email,
          passwordHash,
          firstName: data.firstName,
          lastName: data.lastName,
        },
      });

      // Create organization
      const orgName = data.organizationName || `${data.firstName}'s Organization`;
      const slug = orgName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

      const organization = await tx.organization.create({
        data: {
          name: orgName,
          slug: `${slug}-${Date.now().toString(36)}`,
        },
      });

      // Create default roles for the organization
      const ownerRole = await tx.role.create({
        data: {
          name: 'Owner',
          description: 'Full access to all features',
          organizationId: organization.id,
          isSystem: false,
        },
      });

      await tx.role.create({
        data: {
          name: 'Admin',
          description: 'Administrative access',
          organizationId: organization.id,
          isSystem: false,
        },
      });

      await tx.role.create({
        data: {
          name: 'Member',
          description: 'Standard member access',
          organizationId: organization.id,
          isSystem: false,
        },
      });

      await tx.role.create({
        data: {
          name: 'Viewer',
          description: 'Read-only access',
          organizationId: organization.id,
          isSystem: false,
        },
      });

      // Create default permissions and assign to owner role
      const permissions = await this.createDefaultPermissions(tx);

      // Assign all permissions to owner role
      await tx.rolePermission.createMany({
        data: permissions.map((p) => ({
          roleId: ownerRole.id,
          permissionId: p.id,
        })),
      });

      // Add user as organization member with owner role
      await tx.organizationMember.create({
        data: {
          userId: user.id,
          organizationId: organization.id,
          roleId: ownerRole.id,
          status: 'ACTIVE',
        },
      });

      return { user, organization };
    });

    // Generate tokens
    const accessToken = generateAccessToken({
      userId: result.user.id,
      email: result.user.email,
      organizationId: result.organization.id,
    });

    const refreshToken = generateRefreshToken({
      userId: result.user.id,
      email: result.user.email,
      organizationId: result.organization.id,
    });

    // Create session
    await prisma.session.create({
      data: {
        userId: result.user.id,
        token: refreshToken,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
      },
    });

    return {
      user: {
        id: result.user.id,
        email: result.user.email,
        firstName: result.user.firstName,
        lastName: result.user.lastName,
      },
      organization: {
        id: result.organization.id,
        name: result.organization.name,
        slug: result.organization.slug,
      },
      accessToken,
      refreshToken,
    };
  }

  async login(data: LoginData) {
    const user = await prisma.user.findUnique({
      where: { email: data.email },
      include: {
        organizations: {
          where: { status: 'ACTIVE' },
          include: {
            organization: true,
            role: true,
          },
          take: 1,
        },
      },
    });

    if (!user || !user.isActive) {
      throw ApiError.unauthorized('Invalid email or password');
    }

    const isValidPassword = await comparePassword(data.password, user.passwordHash);
    if (!isValidPassword) {
      throw ApiError.unauthorized('Invalid email or password');
    }

    // Get first organization (default)
    const defaultOrg = user.organizations[0];
    if (!defaultOrg) {
      throw ApiError.notFound('No organization found for this user');
    }

    // Update last login
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    // Generate tokens
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
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
    });

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
      accessToken,
      refreshToken,
    };
  }

  async forgotPassword(email: string) {
    const user = await prisma.user.findUnique({
      where: { email },
    });

    // Always return success to prevent email enumeration
    if (!user) {
      return { message: 'If an account exists, a reset link has been sent.' };
    }

    // Invalidate existing reset tokens
    await prisma.passwordReset.updateMany({
      where: { userId: user.id, usedAt: null },
      data: { usedAt: new Date() },
    });

    // Create new reset token
    const token = generateResetToken();
    await prisma.passwordReset.create({
      data: {
        userId: user.id,
        token,
        expiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1 hour
      },
    });

    // TODO: Send email with reset link
    console.log(`Password reset token for ${email}: ${token}`);

    return { message: 'If an account exists, a reset link has been sent.' };
  }

  async resetPassword(token: string, newPassword: string) {
    const resetRecord = await prisma.passwordReset.findUnique({
      where: { token },
      include: { user: true },
    });

    if (!resetRecord || resetRecord.usedAt || resetRecord.expiresAt < new Date()) {
      throw ApiError.badRequest('Invalid or expired reset token');
    }

    const passwordHash = await hashPassword(newPassword);

    await prisma.$transaction([
      prisma.user.update({
        where: { id: resetRecord.userId },
        data: { passwordHash },
      }),
      prisma.passwordReset.update({
        where: { id: resetRecord.id },
        data: { usedAt: new Date() },
      }),
      // Invalidate all sessions
      prisma.session.deleteMany({
        where: { userId: resetRecord.userId },
      }),
    ]);

    return { message: 'Password reset successful' };
  }

  async logout(userId: string, token?: string) {
    if (token) {
      await prisma.session.deleteMany({
        where: { userId, token },
      });
    } else {
      await prisma.session.deleteMany({
        where: { userId },
      });
    }

    return { message: 'Logged out successfully' };
  }

  async refreshToken(refreshToken: string) {
    // Verify the refresh token
    let payload;
    try {
      payload = verifyRefreshToken(refreshToken);
    } catch {
      throw ApiError.unauthorized('Invalid or expired refresh token');
    }

    // Verify session exists in database
    const session = await prisma.session.findFirst({
      where: {
        token: refreshToken,
        userId: payload.userId,
        expiresAt: { gt: new Date() },
      },
    });

    if (!session) {
      throw ApiError.unauthorized('Session not found or expired');
    }

    // Get user with organization
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
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

    if (!user || !user.isActive) {
      throw ApiError.unauthorized('User not found or inactive');
    }

    const defaultOrg = user.organizations[0];
    if (!defaultOrg) {
      throw ApiError.notFound('No organization found');
    }

    // Generate new access token (refresh token stays the same)
    const newAccessToken = generateAccessToken({
      userId: user.id,
      email: user.email,
      organizationId: defaultOrg.organization.id,
    });

    // Get permissions
    const permissions = defaultOrg.role.permissions.map(p => p.permission.code);

    return {
      accessToken: newAccessToken,
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
    };
  }

  private async createDefaultPermissions(tx: any) {
    const permissionData = [
      // Dashboard
      { code: 'dashboard:view', name: 'View Dashboard', module: 'dashboard', action: 'view' },

      // Users
      { code: 'users:read', name: 'View Users', module: 'users', action: 'read' },
      { code: 'users:write', name: 'Create/Edit Users', module: 'users', action: 'write' },
      { code: 'users:delete', name: 'Delete Users', module: 'users', action: 'delete' },
      { code: 'users:manage', name: 'Manage Users', module: 'users', action: 'manage' },

      // Teams
      { code: 'teams:read', name: 'View Teams', module: 'teams', action: 'read' },
      { code: 'teams:write', name: 'Create/Edit Teams', module: 'teams', action: 'write' },
      { code: 'teams:delete', name: 'Delete Teams', module: 'teams', action: 'delete' },
      { code: 'teams:manage', name: 'Manage Teams', module: 'teams', action: 'manage' },

      // Roles & Permissions
      { code: 'roles:read', name: 'View Roles', module: 'roles', action: 'read' },
      { code: 'roles:write', name: 'Create/Edit Roles', module: 'roles', action: 'write' },
      { code: 'roles:delete', name: 'Delete Roles', module: 'roles', action: 'delete' },
      { code: 'roles:manage', name: 'Manage Roles', module: 'roles', action: 'manage' },

      // Reports
      { code: 'reports:read', name: 'View Reports', module: 'reports', action: 'read' },
      { code: 'reports:write', name: 'Create Reports', module: 'reports', action: 'write' },

      // Analytics
      { code: 'analytics:read', name: 'View Analytics', module: 'analytics', action: 'read' },

      // Security
      { code: 'security:read', name: 'View Security', module: 'security', action: 'read' },
      { code: 'security:manage', name: 'Manage Security', module: 'security', action: 'manage' },

      // Settings
      { code: 'settings:read', name: 'View Settings', module: 'settings', action: 'read' },
      { code: 'settings:write', name: 'Edit Settings', module: 'settings', action: 'write' },

      // Organization
      { code: 'organization:read', name: 'View Organization', module: 'organization', action: 'read' },
      { code: 'organization:write', name: 'Edit Organization', module: 'organization', action: 'write' },
      { code: 'organization:manage', name: 'Manage Organization', module: 'organization', action: 'manage' },
    ];

    const permissions = [];
    for (const perm of permissionData) {
      const existing = await tx.permission.findUnique({
        where: { code: perm.code },
      });

      if (existing) {
        permissions.push(existing);
      } else {
        const created = await tx.permission.create({ data: perm });
        permissions.push(created);
      }
    }

    return permissions;
  }
}

export const authService = new AuthService();
