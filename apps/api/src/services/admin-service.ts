import { prisma } from '../utils/prisma';
import { Prisma } from '@prisma/client';

/**
 * Admin Service
 * Provides system-wide analytics and management for super admins
 */

// ============================================
// SYSTEM ANALYTICS
// ============================================

export interface SystemOverviewStats {
  organizations: {
    total: number;
    active: number;
    trialing: number;
    inactive: number;
  };
  users: {
    total: number;
    active: number;
    inactive: number;
    activeLastMonth: number;
    newThisMonth: number;
    newThisWeek: number;
    newToday: number;
  };
  subscriptions: {
    total: number;
    active: number;
    trialing: number;
    pastDue: number;
    cancelled: number;
  };
  storage: {
    totalFiles: number;
    totalSizeBytes: number;
    totalSizeGB: number;
  };
}

export async function getSystemOverview(): Promise<SystemOverviewStats> {
  const now = new Date();
  const monthAgo = new Date(now);
  monthAgo.setMonth(monthAgo.getMonth() - 1);
  const weekAgo = new Date(now);
  weekAgo.setDate(weekAgo.getDate() - 7);
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);

  // Organizations stats
  const [totalOrgs, activeOrgs] = await Promise.all([
    prisma.organization.count({
      where: { deletedAt: null },
    }),
    prisma.organization.count({
      where: {
        deletedAt: null,
        members: {
          some: {
            status: 'ACTIVE',
          },
        },
      },
    }),
  ]);

  // Users stats
  const [totalUsers, activeUsers, inactiveUsers, activeLastMonth, newThisMonth, newThisWeek, newToday] = await Promise.all([
    prisma.user.count({ where: { deletedAt: null } }),
    prisma.user.count({ where: { isActive: true, deletedAt: null } }),
    prisma.user.count({ where: { isActive: false, deletedAt: null } }),
    prisma.user.count({
      where: {
        lastLoginAt: { gte: monthAgo },
        deletedAt: null,
      },
    }),
    prisma.user.count({
      where: {
        createdAt: { gte: monthAgo },
        deletedAt: null,
      },
    }),
    prisma.user.count({
      where: {
        createdAt: { gte: weekAgo },
        deletedAt: null,
      },
    }),
    prisma.user.count({
      where: {
        createdAt: { gte: todayStart },
        deletedAt: null,
      },
    }),
  ]);

  // Subscription stats
  const subscriptionStats = await prisma.subscription.groupBy({
    by: ['status'],
    _count: true,
  });

  const subscriptions = {
    total: subscriptionStats.reduce((sum, item) => sum + item._count, 0),
    active: subscriptionStats.find(s => s.status === 'ACTIVE')?._count || 0,
    trialing: subscriptionStats.find(s => s.status === 'TRIALING')?._count || 0,
    pastDue: subscriptionStats.find(s => s.status === 'PAST_DUE')?._count || 0,
    cancelled: subscriptionStats.find(s => s.status === 'CANCELED')?._count || 0,
  };

  // Storage stats
  const storageAgg = await prisma.file.aggregate({
    where: { deletedAt: null },
    _count: true,
    _sum: { size: true },
  });

  const totalSizeBytes = storageAgg._sum.size || 0;

  return {
    organizations: {
      total: totalOrgs,
      active: activeOrgs,
      trialing: subscriptions.trialing,
      inactive: totalOrgs - activeOrgs,
    },
    users: {
      total: totalUsers,
      active: activeUsers,
      inactive: inactiveUsers,
      activeLastMonth,
      newThisMonth,
      newThisWeek,
      newToday,
    },
    subscriptions,
    storage: {
      totalFiles: storageAgg._count || 0,
      totalSizeBytes,
      totalSizeGB: Number((totalSizeBytes / (1024 ** 3)).toFixed(2)),
    },
  };
}

// ============================================
// USER GROWTH METRICS
// ============================================

export interface UserGrowthMetrics {
  daily: { date: string; count: number }[];
  weekly: { week: string; count: number }[];
  monthly: { month: string; count: number }[];
}

export async function getUserGrowthMetrics(
  days = 30
): Promise<UserGrowthMetrics> {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  // Get daily signups
  const dailySignups = await prisma.$queryRaw<{ date: Date; count: bigint }[]>`
    SELECT DATE(created_at) as date, COUNT(*)::int as count
    FROM users
    WHERE created_at >= ${startDate}
    AND deleted_at IS NULL
    GROUP BY DATE(created_at)
    ORDER BY date ASC
  `;

  return {
    daily: dailySignups.map(row => ({
      date: row.date.toISOString().split('T')[0],
      count: Number(row.count),
    })),
    weekly: [],
    monthly: [],
  };
}

// ============================================
// ORGANIZATION METRICS
// ============================================

export interface OrganizationMetrics {
  total: number;
  byStatus: { status: string; count: number }[];
  topByMembers: {
    id: string;
    name: string;
    memberCount: number;
  }[];
  topByStorage: {
    id: string;
    name: string;
    storageGB: number;
  }[];
}

export async function getOrganizationMetrics(): Promise<OrganizationMetrics> {
  const total = await prisma.organization.count({
    where: { deletedAt: null },
  });

  // Top orgs by members
  const topByMembers = await prisma.organization.findMany({
    where: { deletedAt: null },
    select: {
      id: true,
      name: true,
      _count: {
        select: { members: true },
      },
    },
    orderBy: {
      members: {
        _count: 'desc',
      },
    },
    take: 10,
  });

  // Top orgs by storage
  const topByStorageRaw = await prisma.$queryRaw<
    { id: string; name: string; total_size: bigint }[]
  >`
    SELECT o.id, o.name, COALESCE(SUM(f.size), 0) as total_size
    FROM organizations o
    LEFT JOIN files f ON f.organization_id = o.id AND f.deleted_at IS NULL
    WHERE o.deleted_at IS NULL
    GROUP BY o.id, o.name
    ORDER BY total_size DESC
    LIMIT 10
  `;

  return {
    total,
    byStatus: [],
    topByMembers: topByMembers.map(org => ({
      id: org.id,
      name: org.name,
      memberCount: org._count.members,
    })),
    topByStorage: topByStorageRaw.map(org => ({
      id: org.id,
      name: org.name,
      storageGB: Number((Number(org.total_size) / (1024 ** 3)).toFixed(2)),
    })),
  };
}

// ============================================
// API USAGE STATISTICS
// ============================================

export interface ApiUsageStats {
  totalRequests: number;
  requestsByEndpoint: { endpoint: string; count: number }[];
  errorRate: number;
}

export async function getApiUsageStats(): Promise<ApiUsageStats> {
  // This would typically come from metrics service
  // For now, return mock data structure
  return {
    totalRequests: 0,
    requestsByEndpoint: [],
    errorRate: 0,
  };
}

// ============================================
// USER MANAGEMENT
// ============================================

export interface AdminUserListParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: 'active' | 'inactive' | 'all';
  sortBy?: 'createdAt' | 'lastLoginAt' | 'email';
  sortOrder?: 'asc' | 'desc';
}

export interface AdminUserListResult {
  users: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    isActive: boolean;
    isSuperAdmin: boolean;
    emailVerified: boolean;
    lastLoginAt: Date | null;
    createdAt: Date;
    _count: {
      organizations: number;
    };
  }[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export async function getAllUsers(
  params: AdminUserListParams
): Promise<AdminUserListResult> {
  const {
    page = 1,
    limit = 50,
    search,
    status = 'all',
    sortBy = 'createdAt',
    sortOrder = 'desc',
  } = params;

  const where: Prisma.UserWhereInput = {
    deletedAt: null,
    ...(status === 'active' && { isActive: true }),
    ...(status === 'inactive' && { isActive: false }),
    ...(search && {
      OR: [
        { email: { contains: search, mode: 'insensitive' } },
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
      ],
    }),
  };

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        isActive: true,
        isSuperAdmin: true,
        emailVerified: true,
        lastLoginAt: true,
        createdAt: true,
        _count: {
          select: { organizations: true },
        },
      },
      orderBy: { [sortBy]: sortOrder },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.user.count({ where }),
  ]);

  return {
    users,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
}

export async function getUserDetails(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      organizations: {
        include: {
          organization: true,
          role: true,
        },
      },
      sessions: {
        where: {
          expiresAt: { gt: new Date() },
        },
        orderBy: { createdAt: 'desc' },
        take: 10,
      },
      _count: {
        select: {
          notifications: true,
          uploadedFiles: true,
        },
      },
    },
  });

  if (!user) {
    return null;
  }

  return user;
}

export async function updateUserStatus(
  userId: string,
  data: { isActive?: boolean; isSuperAdmin?: boolean }
) {
  return prisma.user.update({
    where: { id: userId },
    data,
    select: {
      id: true,
      email: true,
      isActive: true,
      isSuperAdmin: true,
    },
  });
}

export async function deleteUser(userId: string) {
  // Soft delete
  return prisma.user.update({
    where: { id: userId },
    data: { deletedAt: new Date() },
  });
}

// ============================================
// ORGANIZATION MANAGEMENT
// ============================================

export interface AdminOrgListParams {
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: 'createdAt' | 'name';
  sortOrder?: 'asc' | 'desc';
}

export interface AdminOrgListResult {
  organizations: {
    id: string;
    name: string;
    slug: string;
    createdAt: Date;
    _count: {
      members: number;
      teams: number;
      files: number;
    };
    subscription: {
      status: string;
    } | null;
  }[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export async function getAllOrganizations(
  params: AdminOrgListParams
): Promise<AdminOrgListResult> {
  const {
    page = 1,
    limit = 50,
    search,
    sortBy = 'createdAt',
    sortOrder = 'desc',
  } = params;

  const where: Prisma.OrganizationWhereInput = {
    deletedAt: null,
    ...(search && {
      OR: [
        { name: { contains: search, mode: 'insensitive' } },
        { slug: { contains: search, mode: 'insensitive' } },
      ],
    }),
  };

  const [organizations, total] = await Promise.all([
    prisma.organization.findMany({
      where,
      select: {
        id: true,
        name: true,
        slug: true,
        createdAt: true,
        _count: {
          select: {
            members: true,
            teams: true,
            files: true,
          },
        },
        subscription: {
          select: { status: true },
        },
      },
      orderBy: { [sortBy]: sortOrder },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.organization.count({ where }),
  ]);

  return {
    organizations,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
}

export async function getOrganizationDetails(orgId: string) {
  const org = await prisma.organization.findUnique({
    where: { id: orgId },
    include: {
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
          role: true,
        },
      },
      teams: {
        include: {
          _count: {
            select: { members: true },
          },
        },
      },
      subscription: true,
      _count: {
        select: {
          files: true,
          roles: true,
        },
      },
    },
  });

  return org;
}

export async function deleteOrganization(orgId: string) {
  // Soft delete
  return prisma.organization.update({
    where: { id: orgId },
    data: { deletedAt: new Date() },
  });
}

// ============================================
// SYSTEM HEALTH
// ============================================

export interface SystemHealthStatus {
  status: 'healthy' | 'degraded' | 'down';
  services: {
    database: ServiceStatus;
    redis: ServiceStatus;
    storage: ServiceStatus;
  };
  uptime: number;
  timestamp: Date;
}

interface ServiceStatus {
  status: 'healthy' | 'degraded' | 'down';
  responseTime?: number;
  message?: string;
}

export async function getSystemHealth(): Promise<SystemHealthStatus> {
  const startTime = Date.now();

  // Check database
  const dbStatus = await checkDatabaseHealth();

  // Check Redis (if available)
  const redisStatus = await checkRedisHealth();

  // Check storage (if available)
  const storageStatus = await checkStorageHealth();

  const overallStatus =
    dbStatus.status === 'down' || redisStatus.status === 'down'
      ? 'down'
      : dbStatus.status === 'degraded' || redisStatus.status === 'degraded'
      ? 'degraded'
      : 'healthy';

  return {
    status: overallStatus,
    services: {
      database: dbStatus,
      redis: redisStatus,
      storage: storageStatus,
    },
    uptime: process.uptime(),
    timestamp: new Date(),
  };
}

async function checkDatabaseHealth(): Promise<ServiceStatus> {
  try {
    const start = Date.now();
    await prisma.$queryRaw`SELECT 1`;
    const responseTime = Date.now() - start;

    return {
      status: responseTime < 100 ? 'healthy' : 'degraded',
      responseTime,
    };
  } catch (error) {
    return {
      status: 'down',
      message: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

async function checkRedisHealth(): Promise<ServiceStatus> {
  // Placeholder - implement if Redis is configured
  return {
    status: 'healthy',
    message: 'Redis not configured',
  };
}

async function checkStorageHealth(): Promise<ServiceStatus> {
  // Placeholder - implement if S3/storage is configured
  return {
    status: 'healthy',
    message: 'Storage not configured',
  };
}
