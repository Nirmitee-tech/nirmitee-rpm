import { prisma } from '../utils/prisma';
import { hashPassword } from '../utils/password';
import { ApiError } from '../utils/api-error';

interface CreateUserData {
  email: string;
  firstName: string;
  lastName: string;
  password: string;
  roleId: string;
}

interface UpdateUserData {
  firstName?: string;
  lastName?: string;
  avatar?: string | null;
  isActive?: boolean;
}

export class UserService {
  async listUsers(organizationId: string, options?: {
    page?: number;
    limit?: number;
    search?: string;
    status?: string;
  }) {
    const page = options?.page || 1;
    const limit = options?.limit || 20;
    const skip = (page - 1) * limit;

    const where: any = {
      organizationId,
      ...(options?.status && { status: options.status }),
    };

    if (options?.search) {
      where.user = {
        OR: [
          { firstName: { contains: options.search, mode: 'insensitive' } },
          { lastName: { contains: options.search, mode: 'insensitive' } },
          { email: { contains: options.search, mode: 'insensitive' } },
        ],
      };
    }

    const [members, total] = await Promise.all([
      prisma.organizationMember.findMany({
        where,
        skip,
        take: limit,
        include: {
          user: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
              avatar: true,
              isActive: true,
              lastLoginAt: true,
              createdAt: true,
            },
          },
          role: {
            select: {
              id: true,
              name: true,
            },
          },
        },
        orderBy: { joinedAt: 'desc' },
      }),
      prisma.organizationMember.count({ where }),
    ]);

    return {
      users: members.map((m) => ({
        id: m.user.id,
        email: m.user.email,
        firstName: m.user.firstName,
        lastName: m.user.lastName,
        avatar: m.user.avatar,
        isActive: m.user.isActive,
        lastLoginAt: m.user.lastLoginAt,
        createdAt: m.user.createdAt,
        status: m.status,
        role: m.role,
        joinedAt: m.joinedAt,
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getUser(userId: string, organizationId: string) {
    const member = await prisma.organizationMember.findUnique({
      where: {
        userId_organizationId: {
          userId,
          organizationId,
        },
      },
      include: {
        user: true,
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

    if (!member) {
      throw ApiError.notFound('User not found in this organization');
    }

    return {
      id: member.user.id,
      email: member.user.email,
      firstName: member.user.firstName,
      lastName: member.user.lastName,
      avatar: member.user.avatar,
      isActive: member.user.isActive,
      lastLoginAt: member.user.lastLoginAt,
      createdAt: member.user.createdAt,
      status: member.status,
      role: {
        id: member.role.id,
        name: member.role.name,
        permissions: member.role.permissions.map((rp) => rp.permission.code),
      },
      joinedAt: member.joinedAt,
    };
  }

  async createUser(organizationId: string, data: CreateUserData) {
    // Check if user already exists
    let user = await prisma.user.findUnique({
      where: { email: data.email },
    });

    if (user) {
      // Check if already member
      const existingMember = await prisma.organizationMember.findUnique({
        where: {
          userId_organizationId: {
            userId: user.id,
            organizationId,
          },
        },
      });

      if (existingMember) {
        throw ApiError.conflict('User is already a member of this organization');
      }
    } else {
      // Create new user
      const passwordHash = await hashPassword(data.password);
      user = await prisma.user.create({
        data: {
          email: data.email,
          firstName: data.firstName,
          lastName: data.lastName,
          passwordHash,
        },
      });
    }

    // Verify role exists in organization
    const role = await prisma.role.findFirst({
      where: {
        id: data.roleId,
        organizationId,
      },
    });

    if (!role) {
      throw ApiError.badRequest('Invalid role for this organization');
    }

    // Add to organization
    const member = await prisma.organizationMember.create({
      data: {
        userId: user.id,
        organizationId,
        roleId: data.roleId,
        status: 'ACTIVE',
      },
      include: {
        user: true,
        role: true,
      },
    });

    return {
      id: member.user.id,
      email: member.user.email,
      firstName: member.user.firstName,
      lastName: member.user.lastName,
      role: member.role.name,
      status: member.status,
    };
  }

  async updateUser(userId: string, organizationId: string, data: UpdateUserData) {
    const member = await prisma.organizationMember.findUnique({
      where: {
        userId_organizationId: {
          userId,
          organizationId,
        },
      },
    });

    if (!member) {
      throw ApiError.notFound('User not found in this organization');
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data,
    });

    return {
      id: updatedUser.id,
      email: updatedUser.email,
      firstName: updatedUser.firstName,
      lastName: updatedUser.lastName,
      avatar: updatedUser.avatar,
      isActive: updatedUser.isActive,
    };
  }

  async updateUserRole(userId: string, organizationId: string, roleId: string) {
    const member = await prisma.organizationMember.findUnique({
      where: {
        userId_organizationId: {
          userId,
          organizationId,
        },
      },
    });

    if (!member) {
      throw ApiError.notFound('User not found in this organization');
    }

    const role = await prisma.role.findFirst({
      where: {
        id: roleId,
        organizationId,
      },
    });

    if (!role) {
      throw ApiError.badRequest('Invalid role for this organization');
    }

    const updated = await prisma.organizationMember.update({
      where: { id: member.id },
      data: { roleId },
      include: {
        user: true,
        role: true,
      },
    });

    return {
      id: updated.user.id,
      email: updated.user.email,
      role: updated.role.name,
    };
  }

  async removeUser(userId: string, organizationId: string) {
    const member = await prisma.organizationMember.findUnique({
      where: {
        userId_organizationId: {
          userId,
          organizationId,
        },
      },
      include: {
        role: true,
      },
    });

    if (!member) {
      throw ApiError.notFound('User not found in this organization');
    }

    // Prevent removing owner
    if (member.role.name.toLowerCase() === 'owner') {
      throw ApiError.badRequest('Cannot remove the organization owner');
    }

    await prisma.organizationMember.delete({
      where: { id: member.id },
    });

    return { message: 'User removed from organization' };
  }
}

export const userService = new UserService();
