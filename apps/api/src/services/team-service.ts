import { prisma } from '../utils/prisma';
import { ApiError } from '../utils/api-error';

interface CreateTeamData {
  name: string;
  description?: string;
}

interface UpdateTeamData {
  name?: string;
  description?: string;
}

export class TeamService {
  async listTeams(organizationId: string, options?: {
    page?: number;
    limit?: number;
    search?: string;
  }) {
    const page = options?.page || 1;
    const limit = options?.limit || 20;
    const skip = (page - 1) * limit;

    const where: any = {
      organizationId,
      ...(options?.search && {
        name: { contains: options.search, mode: 'insensitive' },
      }),
    };

    const [teams, total] = await Promise.all([
      prisma.team.findMany({
        where,
        skip,
        take: limit,
        include: {
          members: {
            include: {
              user: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  avatar: true,
                },
              },
            },
          },
          _count: {
            select: { members: true },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.team.count({ where }),
    ]);

    return {
      teams: teams.map((t) => ({
        id: t.id,
        name: t.name,
        description: t.description,
        memberCount: t._count.members,
        members: t.members.slice(0, 5).map((m) => ({
          id: m.user.id,
          firstName: m.user.firstName,
          lastName: m.user.lastName,
          avatar: m.user.avatar,
          role: m.role,
        })),
        createdAt: t.createdAt,
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getTeam(teamId: string, organizationId: string) {
    const team = await prisma.team.findFirst({
      where: {
        id: teamId,
        organizationId,
      },
      include: {
        members: {
          include: {
            user: {
              select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true,
                avatar: true,
              },
            },
          },
        },
      },
    });

    if (!team) {
      throw ApiError.notFound('Team not found');
    }

    return {
      id: team.id,
      name: team.name,
      description: team.description,
      members: team.members.map((m) => ({
        id: m.user.id,
        email: m.user.email,
        firstName: m.user.firstName,
        lastName: m.user.lastName,
        avatar: m.user.avatar,
        role: m.role,
        joinedAt: m.joinedAt,
      })),
      createdAt: team.createdAt,
      updatedAt: team.updatedAt,
    };
  }

  async createTeam(organizationId: string, data: CreateTeamData) {
    // Check for duplicate name
    const existing = await prisma.team.findFirst({
      where: {
        name: data.name,
        organizationId,
      },
    });

    if (existing) {
      throw ApiError.conflict('A team with this name already exists');
    }

    const team = await prisma.team.create({
      data: {
        name: data.name,
        description: data.description,
        organizationId,
      },
    });

    return {
      id: team.id,
      name: team.name,
      description: team.description,
      createdAt: team.createdAt,
    };
  }

  async updateTeam(teamId: string, organizationId: string, data: UpdateTeamData) {
    const team = await prisma.team.findFirst({
      where: {
        id: teamId,
        organizationId,
      },
    });

    if (!team) {
      throw ApiError.notFound('Team not found');
    }

    // Check for duplicate name
    if (data.name && data.name !== team.name) {
      const existing = await prisma.team.findFirst({
        where: {
          name: data.name,
          organizationId,
          NOT: { id: teamId },
        },
      });

      if (existing) {
        throw ApiError.conflict('A team with this name already exists');
      }
    }

    const updated = await prisma.team.update({
      where: { id: teamId },
      data,
    });

    return {
      id: updated.id,
      name: updated.name,
      description: updated.description,
      updatedAt: updated.updatedAt,
    };
  }

  async deleteTeam(teamId: string, organizationId: string) {
    const team = await prisma.team.findFirst({
      where: {
        id: teamId,
        organizationId,
      },
    });

    if (!team) {
      throw ApiError.notFound('Team not found');
    }

    await prisma.team.delete({
      where: { id: teamId },
    });

    return { message: 'Team deleted successfully' };
  }

  async addMember(teamId: string, organizationId: string, userId: string, role: 'LEAD' | 'MEMBER' = 'MEMBER') {
    const team = await prisma.team.findFirst({
      where: { id: teamId, organizationId },
    });

    if (!team) {
      throw ApiError.notFound('Team not found');
    }

    // Verify user is member of organization
    const orgMember = await prisma.organizationMember.findUnique({
      where: {
        userId_organizationId: {
          userId,
          organizationId,
        },
      },
    });

    if (!orgMember || orgMember.status !== 'ACTIVE') {
      throw ApiError.badRequest('User is not a member of this organization');
    }

    // Check if already a member
    const existing = await prisma.teamMember.findUnique({
      where: {
        teamId_userId: {
          teamId,
          userId,
        },
      },
    });

    if (existing) {
      throw ApiError.conflict('User is already a member of this team');
    }

    const member = await prisma.teamMember.create({
      data: {
        teamId,
        userId,
        role,
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            avatar: true,
          },
        },
      },
    });

    return {
      id: member.user.id,
      email: member.user.email,
      firstName: member.user.firstName,
      lastName: member.user.lastName,
      role: member.role,
      joinedAt: member.joinedAt,
    };
  }

  async removeMember(teamId: string, organizationId: string, userId: string) {
    const team = await prisma.team.findFirst({
      where: { id: teamId, organizationId },
    });

    if (!team) {
      throw ApiError.notFound('Team not found');
    }

    const member = await prisma.teamMember.findUnique({
      where: {
        teamId_userId: {
          teamId,
          userId,
        },
      },
    });

    if (!member) {
      throw ApiError.notFound('User is not a member of this team');
    }

    await prisma.teamMember.delete({
      where: { id: member.id },
    });

    return { message: 'Member removed from team' };
  }

  async updateMemberRole(teamId: string, organizationId: string, userId: string, role: 'LEAD' | 'MEMBER') {
    const team = await prisma.team.findFirst({
      where: { id: teamId, organizationId },
    });

    if (!team) {
      throw ApiError.notFound('Team not found');
    }

    const member = await prisma.teamMember.findUnique({
      where: {
        teamId_userId: {
          teamId,
          userId,
        },
      },
    });

    if (!member) {
      throw ApiError.notFound('User is not a member of this team');
    }

    const updated = await prisma.teamMember.update({
      where: { id: member.id },
      data: { role },
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
    });

    return {
      id: updated.user.id,
      email: updated.user.email,
      firstName: updated.user.firstName,
      lastName: updated.user.lastName,
      role: updated.role,
    };
  }
}

export const teamService = new TeamService();
