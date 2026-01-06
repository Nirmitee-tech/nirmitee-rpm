import { prisma } from '../utils/prisma';
import { ApiError } from '../utils/api-error';
import { generateAccessToken, generateRefreshToken } from '../utils/jwt';

interface UpdateOrganizationData {
  name?: string;
  logo?: string;
  settings?: Record<string, any>;
}

interface CreateOrganizationData {
  name: string;
  logo?: string;
}

export class OrganizationService {
  async createOrganization(userId: string, data: CreateOrganizationData) {
    // Verify user exists
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw ApiError.notFound('User not found');
    }

    // Create organization with default roles in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Generate unique slug
      const slug = data.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

      const organization = await tx.organization.create({
        data: {
          name: data.name,
          slug: `${slug}-${Date.now().toString(36)}`,
          logo: data.logo,
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

      // Get or create default permissions and assign to owner role
      const permissions = await this.ensureDefaultPermissions(tx);

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

      return { organization, ownerRole };
    });

    // Generate new tokens for the new organization context
    const accessToken = generateAccessToken({
      userId: user.id,
      email: user.email,
      organizationId: result.organization.id,
    });

    const refreshToken = generateRefreshToken({
      userId: user.id,
      email: user.email,
      organizationId: result.organization.id,
    });

    // Create session for new org context
    await prisma.session.create({
      data: {
        userId: user.id,
        token: refreshToken,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
      },
    });

    return {
      organization: {
        id: result.organization.id,
        name: result.organization.name,
        slug: result.organization.slug,
        logo: result.organization.logo,
      },
      role: result.ownerRole.name,
      accessToken,
      refreshToken,
    };
  }

  private async ensureDefaultPermissions(tx: any) {
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

  async getOrganization(organizationId: string) {
    const org = await prisma.organization.findUnique({
      where: { id: organizationId },
      include: {
        _count: {
          select: {
            members: true,
            teams: true,
            roles: true,
          },
        },
      },
    });

    if (!org) {
      throw ApiError.notFound('Organization not found');
    }

    return {
      id: org.id,
      name: org.name,
      slug: org.slug,
      logo: org.logo,
      settings: org.settings,
      memberCount: org._count.members,
      teamCount: org._count.teams,
      roleCount: org._count.roles,
      createdAt: org.createdAt,
      updatedAt: org.updatedAt,
    };
  }

  async updateOrganization(organizationId: string, data: UpdateOrganizationData) {
    const org = await prisma.organization.findUnique({
      where: { id: organizationId },
    });

    if (!org) {
      throw ApiError.notFound('Organization not found');
    }

    const updated = await prisma.organization.update({
      where: { id: organizationId },
      data: {
        ...(data.name && { name: data.name }),
        ...(data.logo !== undefined && { logo: data.logo }),
        ...(data.settings !== undefined && { settings: data.settings }),
      },
    });

    return {
      id: updated.id,
      name: updated.name,
      slug: updated.slug,
      logo: updated.logo,
      settings: updated.settings,
      updatedAt: updated.updatedAt,
    };
  }

  async listUserOrganizations(userId: string) {
    const memberships = await prisma.organizationMember.findMany({
      where: {
        userId,
        status: 'ACTIVE',
      },
      include: {
        organization: true,
        role: true,
      },
      orderBy: {
        joinedAt: 'asc',
      },
    });

    return memberships.map((m) => ({
      id: m.organization.id,
      name: m.organization.name,
      slug: m.organization.slug,
      logo: m.organization.logo,
      role: m.role.name,
      joinedAt: m.joinedAt,
    }));
  }

  async switchOrganization(userId: string, organizationId: string) {
    const membership = await prisma.organizationMember.findUnique({
      where: {
        userId_organizationId: {
          userId,
          organizationId,
        },
      },
      include: {
        organization: true,
        role: {
          include: {
            permissions: {
              include: {
                permission: true,
              },
            },
          },
        },
      },
    });

    if (!membership || membership.status !== 'ACTIVE') {
      throw ApiError.forbidden('Not a member of this organization');
    }

    return {
      organization: {
        id: membership.organization.id,
        name: membership.organization.name,
        slug: membership.organization.slug,
        logo: membership.organization.logo,
      },
      role: {
        id: membership.role.id,
        name: membership.role.name,
        permissions: membership.role.permissions.map((rp) => rp.permission.code),
      },
    };
  }

  async getOrganizationStats(organizationId: string) {
    const [memberCount, teamCount, roleCount, activeMembers] = await Promise.all([
      prisma.organizationMember.count({
        where: { organizationId },
      }),
      prisma.team.count({
        where: { organizationId },
      }),
      prisma.role.count({
        where: { organizationId },
      }),
      prisma.organizationMember.count({
        where: {
          organizationId,
          status: 'ACTIVE',
        },
      }),
    ]);

    return {
      members: {
        total: memberCount,
        active: activeMembers,
      },
      teams: teamCount,
      roles: roleCount,
    };
  }
}

export const organizationService = new OrganizationService();
