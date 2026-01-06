import { api } from './client';

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

export interface ActivityResponse {
  activity: RecentActivity[];
}

export const dashboardApi = {
  getStats: () =>
    api.get<DashboardStats>('/api/dashboard/stats'),

  getActivity: (limit = 10) =>
    api.get<ActivityResponse>(`/api/dashboard/activity?limit=${limit}`),
};
