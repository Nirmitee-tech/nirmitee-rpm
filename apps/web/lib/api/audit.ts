import { api } from './client';

export interface AuditLog {
  id: string;
  action: string;
  entity: string;
  entityId?: string;
  userId: string;
  user?: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
  };
  metadata?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
  createdAt: string;
}

export interface AuditLogsResponse {
  logs: AuditLog[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface AuditFilters {
  page?: number;
  limit?: number;
  action?: string;
  entity?: string;
  userId?: string;
  startDate?: string;
  endDate?: string;
}

export const auditApi = {
  getLogs: (filters?: AuditFilters) => {
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value) params.append(key, String(value));
      });
    }
    return api.get<AuditLogsResponse>(`/api/audit?${params.toString()}`);
  },

  getEntityLogs: (entityType: string, entityId: string) =>
    api.get<AuditLogsResponse>(`/api/audit/entity/${entityType}/${entityId}`),

  getUserLogs: (userId: string) =>
    api.get<AuditLogsResponse>(`/api/audit/user/${userId}`),
};
