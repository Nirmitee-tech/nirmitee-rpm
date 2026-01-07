import { apiClient } from './index';

// ============================================
// TYPES
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

export interface UserGrowthMetrics {
  daily: { date: string; count: number }[];
  weekly: { week: string; count: number }[];
  monthly: { month: string; count: number }[];
}

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

export interface ApiUsageStats {
  totalRequests: number;
  requestsByEndpoint: { endpoint: string; count: number }[];
  errorRate: number;
}

export interface AdminUser {
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
}

export interface AdminUserListResult {
  users: AdminUser[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface AdminOrganization {
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
}

export interface AdminOrgListResult {
  organizations: AdminOrganization[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

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

export interface FeatureFlag {
  id: string;
  key: string;
  name: string;
  description: string | null;
  enabled: boolean;
  targetType: 'GLOBAL' | 'ORGANIZATION' | 'USER' | 'PERCENTAGE';
  targetIds: string[];
  percentage: number | null;
  metadata: Record<string, unknown> | null;
  createdAt: Date;
  updatedAt: Date;
}

// ============================================
// SYSTEM ANALYTICS
// ============================================

export const adminApi = {
  // Stats
  getSystemOverview: async (): Promise<SystemOverviewStats> => {
    return apiClient.get<SystemOverviewStats>('/api/v1/admin/stats/overview');
  },

  getUserGrowthMetrics: async (days = 30): Promise<UserGrowthMetrics> => {
    return apiClient.get<UserGrowthMetrics>(`/api/v1/admin/stats/users?days=${days}`);
  },

  getOrganizationMetrics: async (): Promise<OrganizationMetrics> => {
    return apiClient.get<OrganizationMetrics>('/api/v1/admin/stats/organizations');
  },

  getApiUsageStats: async (): Promise<ApiUsageStats> => {
    return apiClient.get<ApiUsageStats>('/api/v1/admin/stats/api-usage');
  },

  // ============================================
  // USER MANAGEMENT
  // ============================================

  getUsers: async (params?: {
    page?: number;
    limit?: number;
    search?: string;
    status?: 'active' | 'inactive' | 'all';
    sortBy?: 'createdAt' | 'lastLoginAt' | 'email';
    sortOrder?: 'asc' | 'desc';
  }): Promise<AdminUserListResult> => {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.set('page', params.page.toString());
    if (params?.limit) queryParams.set('limit', params.limit.toString());
    if (params?.search) queryParams.set('search', params.search);
    if (params?.status) queryParams.set('status', params.status);
    if (params?.sortBy) queryParams.set('sortBy', params.sortBy);
    if (params?.sortOrder) queryParams.set('sortOrder', params.sortOrder);

    return apiClient.get<AdminUserListResult>(
      `/api/v1/admin/users${queryParams.toString() ? `?${queryParams}` : ''}`
    );
  },

  getUserDetails: async (userId: string): Promise<AdminUser> => {
    return apiClient.get<AdminUser>(`/api/v1/admin/users/${userId}`);
  },

  updateUserStatus: async (
    userId: string,
    data: { isActive?: boolean; isSuperAdmin?: boolean }
  ): Promise<AdminUser> => {
    return apiClient.put<AdminUser>(`/api/v1/admin/users/${userId}`, data);
  },

  deleteUser: async (userId: string): Promise<{ success: boolean; message: string }> => {
    return apiClient.delete<{ success: boolean; message: string }>(`/api/v1/admin/users/${userId}`);
  },

  // ============================================
  // ORGANIZATION MANAGEMENT
  // ============================================

  getOrganizations: async (params?: {
    page?: number;
    limit?: number;
    search?: string;
    sortBy?: 'createdAt' | 'name';
    sortOrder?: 'asc' | 'desc';
  }): Promise<AdminOrgListResult> => {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.set('page', params.page.toString());
    if (params?.limit) queryParams.set('limit', params.limit.toString());
    if (params?.search) queryParams.set('search', params.search);
    if (params?.sortBy) queryParams.set('sortBy', params.sortBy);
    if (params?.sortOrder) queryParams.set('sortOrder', params.sortOrder);

    return apiClient.get<AdminOrgListResult>(
      `/api/v1/admin/organizations${queryParams.toString() ? `?${queryParams}` : ''}`
    );
  },

  getOrganizationDetails: async (orgId: string): Promise<AdminOrganization> => {
    return apiClient.get<AdminOrganization>(`/api/v1/admin/organizations/${orgId}`);
  },

  deleteOrganization: async (
    orgId: string
  ): Promise<{ success: boolean; message: string }> => {
    return apiClient.delete<{ success: boolean; message: string }>(`/api/v1/admin/organizations/${orgId}`);
  },

  // ============================================
  // SYSTEM HEALTH
  // ============================================

  getSystemHealth: async (): Promise<SystemHealthStatus> => {
    return apiClient.get<SystemHealthStatus>('/api/v1/admin/health/detailed');
  },

  // ============================================
  // FEATURE FLAGS
  // ============================================

  getFeatureFlags: async (): Promise<FeatureFlag[]> => {
    return apiClient.get<FeatureFlag[]>('/api/v1/admin/feature-flags');
  },

  createFeatureFlag: async (data: {
    key: string;
    name: string;
    description?: string;
    enabled?: boolean;
    targetType?: 'GLOBAL' | 'ORGANIZATION' | 'USER' | 'PERCENTAGE';
    targetIds?: string[];
    percentage?: number;
    metadata?: Record<string, unknown>;
  }): Promise<FeatureFlag> => {
    return apiClient.post<FeatureFlag>('/api/v1/admin/feature-flags', data);
  },

  updateFeatureFlag: async (
    id: string,
    data: {
      name?: string;
      description?: string;
      enabled?: boolean;
      targetType?: 'GLOBAL' | 'ORGANIZATION' | 'USER' | 'PERCENTAGE';
      targetIds?: string[];
      percentage?: number;
      metadata?: Record<string, unknown>;
    }
  ): Promise<FeatureFlag> => {
    return apiClient.put<FeatureFlag>(`/api/v1/admin/feature-flags/${id}`, data);
  },

  deleteFeatureFlag: async (
    id: string
  ): Promise<{ success: boolean; message: string }> => {
    return apiClient.delete<{ success: boolean; message: string }>(`/api/v1/admin/feature-flags/${id}`);
  },
};
