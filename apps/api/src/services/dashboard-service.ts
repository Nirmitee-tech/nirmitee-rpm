import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export interface DashboardStats {
  users: {
    total: number;
    active: number;
    pending: number;
    changePercent: number;
  };
  teams: {
    total: number;
    changePercent: number;
  };
  roles: {
    total: number;
  };
  invitations: {
    pending: number;
    sent: number;
  };
}

export interface RecentActivity {
  id: string;
  user: string;
  action: string;
  entityType: string;
  time: string;
  type: 'create' | 'update' | 'delete';
}

export const dashboardService = {
  async getStats(organizationId: string): Promise<DashboardStats> {
    // Get current period stats
    const [
      totalUsers,
      activeUsers,
      pendingUsers,
      totalTeams,
      totalRoles,
      pendingInvitations,
      sentInvitations,
    ] = await Promise.all([
      prisma.organizationMember.count({
        where: { organizationId },
      }),
      prisma.organizationMember.count({
        where: {
          organizationId,
          status: 'ACTIVE',
        },
      }),
      prisma.organizationMember.count({
        where: {
          organizationId,
          status: 'INACTIVE',
        },
      }),
      prisma.team.count({
        where: { organizationId },
      }),
      prisma.role.count({
        where: { organizationId },
      }),
      prisma.invitation.count({
        where: {
          organizationId,
          status: 'PENDING',
        },
      }),
      prisma.invitation.count({
        where: {
          organizationId,
          status: { in: ['PENDING', 'ACCEPTED'] },
        },
      }),
    ]);

    // Calculate change percentage (compare with 30 days ago)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const previousUsers = await prisma.organizationMember.count({
      where: {
        organizationId,
        joinedAt: { lt: thirtyDaysAgo },
      },
    });

    const previousTeams = await prisma.team.count({
      where: {
        organizationId,
        createdAt: { lt: thirtyDaysAgo },
      },
    });

    const userChangePercent = previousUsers > 0
      ? Math.round(((totalUsers - previousUsers) / previousUsers) * 100 * 10) / 10
      : 0;

    const teamChangePercent = previousTeams > 0
      ? Math.round(((totalTeams - previousTeams) / previousTeams) * 100 * 10) / 10
      : 0;

    return {
      users: {
        total: totalUsers,
        active: activeUsers,
        pending: pendingUsers,
        changePercent: userChangePercent,
      },
      teams: {
        total: totalTeams,
        changePercent: teamChangePercent,
      },
      roles: {
        total: totalRoles,
      },
      invitations: {
        pending: pendingInvitations,
        sent: sentInvitations,
      },
    };
  },

  async getRecentActivity(organizationId: string, limit = 10): Promise<RecentActivity[]> {
    const logs = await prisma.auditLog.findMany({
      where: { organizationId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    // Fetch user names for logs that have userId
    const userIds = logs.map(log => log.userId).filter((id): id is string => id !== null);
    const users = await prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, firstName: true, lastName: true },
    });
    const userMap = new Map(users.map(u => [u.id, `${u.firstName} ${u.lastName}`]));

    return logs.map(log => ({
      id: log.id,
      user: log.userId ? userMap.get(log.userId) || 'Unknown User' : 'System',
      action: formatAction(log.action, log.entity),
      entityType: log.entity,
      time: formatTimeAgo(log.createdAt),
      type: mapActionType(log.action),
    }));
  },
};

function formatAction(action: string, entity: string): string {
  const actions: Record<string, string> = {
    CREATE: 'Created',
    UPDATE: 'Updated',
    DELETE: 'Deleted',
    LOGIN: 'Logged in',
    LOGOUT: 'Logged out',
    INVITE: 'Invited user',
    ACCEPT: 'Accepted invitation',
    ASSIGN: 'Assigned',
    REMOVE: 'Removed',
  };
  return `${actions[action] || action} ${entity.toLowerCase()}`;
}

function mapActionType(action: string): 'create' | 'update' | 'delete' {
  if (action === 'CREATE' || action === 'INVITE' || action === 'ACCEPT') return 'create';
  if (action === 'DELETE' || action === 'REMOVE') return 'delete';
  return 'update';
}

function formatTimeAgo(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins} min ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
  if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
  return date.toLocaleDateString();
}
