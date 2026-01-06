import { prisma } from '../utils/prisma';
import { ApiError } from '../utils/api-error';

interface CreateRoleData {
  name: string;
  description?: string;
  permissions: string[]; // Array of permission codes
}

interface UpdateRoleData {
  name?: string;
  description?: string;
  permissions?: string[];
}

export class RoleService {
  async listRoles(organizationId: string) {
    const roles = await prisma.role.findMany({
      where: { organizationId },
      include: {
        permissions: {
          include: {
            permission: true,
          },
        },
        _count: {
          select: { members: true },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    return roles.map((r) => ({
      id: r.id,
      name: r.name,
      description: r.description,
      isSystem: r.isSystem,
      memberCount: r._count.members,
      permissions: r.permissions.map((rp) => ({
        code: rp.permission.code,
        name: rp.permission.name,
        module: rp.permission.module,
      })),
      createdAt: r.createdAt,
    }));
  }

  async getRole(roleId: string, organizationId: string) {
    const role = await prisma.role.findFirst({
      where: {
        id: roleId,
        organizationId,
      },
      include: {
        permissions: {
          include: {
            permission: true,
          },
        },
        members: {
          include: {
            user: {
              select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true,
              },
            },
          },
          take: 10,
        },
      },
    });

    if (!role) {
      throw ApiError.notFound('Role not found');
    }

    return {
      id: role.id,
      name: role.name,
      description: role.description,
      isSystem: role.isSystem,
      permissions: role.permissions.map((rp) => ({
        id: rp.permission.id,
        code: rp.permission.code,
        name: rp.permission.name,
        module: rp.permission.module,
        action: rp.permission.action,
      })),
      members: role.members.map((m) => ({
        id: m.user.id,
        email: m.user.email,
        firstName: m.user.firstName,
        lastName: m.user.lastName,
      })),
      createdAt: role.createdAt,
      updatedAt: role.updatedAt,
    };
  }

  async createRole(organizationId: string, data: CreateRoleData) {
    // Check for duplicate name
    const existing = await prisma.role.findFirst({
      where: {
        name: data.name,
        organizationId,
      },
    });

    if (existing) {
      throw ApiError.conflict('A role with this name already exists');
    }

    // Get permission IDs from codes
    const permissions = await prisma.permission.findMany({
      where: {
        code: { in: data.permissions },
      },
    });

    const role = await prisma.role.create({
      data: {
        name: data.name,
        description: data.description,
        organizationId,
        isSystem: false,
        permissions: {
          create: permissions.map((p) => ({
            permissionId: p.id,
          })),
        },
      },
      include: {
        permissions: {
          include: {
            permission: true,
          },
        },
      },
    });

    return {
      id: role.id,
      name: role.name,
      description: role.description,
      permissions: role.permissions.map((rp) => rp.permission.code),
      createdAt: role.createdAt,
    };
  }

  async updateRole(roleId: string, organizationId: string, data: UpdateRoleData) {
    const role = await prisma.role.findFirst({
      where: {
        id: roleId,
        organizationId,
      },
    });

    if (!role) {
      throw ApiError.notFound('Role not found');
    }

    // Prevent modifying system roles
    if (role.isSystem) {
      throw ApiError.badRequest('Cannot modify system roles');
    }

    // Check for duplicate name
    if (data.name && data.name !== role.name) {
      const existing = await prisma.role.findFirst({
        where: {
          name: data.name,
          organizationId,
          NOT: { id: roleId },
        },
      });

      if (existing) {
        throw ApiError.conflict('A role with this name already exists');
      }
    }

    // Update role with permissions
    const updateData: any = {
      ...(data.name && { name: data.name }),
      ...(data.description !== undefined && { description: data.description }),
    };

    // Handle permissions update
    if (data.permissions) {
      const permissions = await prisma.permission.findMany({
        where: {
          code: { in: data.permissions },
        },
      });

      // Delete existing permissions and create new ones
      await prisma.rolePermission.deleteMany({
        where: { roleId },
      });

      await prisma.rolePermission.createMany({
        data: permissions.map((p) => ({
          roleId,
          permissionId: p.id,
        })),
      });
    }

    const updated = await prisma.role.update({
      where: { id: roleId },
      data: updateData,
      include: {
        permissions: {
          include: {
            permission: true,
          },
        },
      },
    });

    return {
      id: updated.id,
      name: updated.name,
      description: updated.description,
      permissions: updated.permissions.map((rp) => rp.permission.code),
      updatedAt: updated.updatedAt,
    };
  }

  async deleteRole(roleId: string, organizationId: string) {
    const role = await prisma.role.findFirst({
      where: {
        id: roleId,
        organizationId,
      },
      include: {
        _count: {
          select: { members: true },
        },
      },
    });

    if (!role) {
      throw ApiError.notFound('Role not found');
    }

    // Prevent deleting system roles
    if (role.isSystem) {
      throw ApiError.badRequest('Cannot delete system roles');
    }

    // Prevent deleting roles with members
    if (role._count.members > 0) {
      throw ApiError.badRequest('Cannot delete role with assigned members. Please reassign members first.');
    }

    await prisma.role.delete({
      where: { id: roleId },
    });

    return { message: 'Role deleted successfully' };
  }

  async listPermissions() {
    const permissions = await prisma.permission.findMany({
      orderBy: [{ module: 'asc' }, { action: 'asc' }],
    });

    // Group by module
    const grouped: Record<string, any[]> = {};
    for (const perm of permissions) {
      if (!grouped[perm.module]) {
        grouped[perm.module] = [];
      }
      grouped[perm.module].push({
        id: perm.id,
        code: perm.code,
        name: perm.name,
        action: perm.action,
        description: perm.description,
      });
    }

    return grouped;
  }
}

export const roleService = new RoleService();
