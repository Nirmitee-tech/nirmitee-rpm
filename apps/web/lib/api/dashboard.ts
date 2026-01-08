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
  patients: {
    total: number;
    active: number;
    pending: number;
    changePercent: number;
  };
  alerts: {
    new: number;
    critical: number;
  };
  vitals: {
    todayCount: number;
    weekCount: number;
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

export interface VitalsTrendPoint {
  date: string;
  bpReadings: number;
  glucoseReadings: number;
  weightReadings: number;
  totalReadings: number;
}

export interface VitalsTrendResponse {
  trend: VitalsTrendPoint[];
}

export interface AlertDistribution {
  critical: number;
  significant: number;
  informational: number;
  total: number;
}

export interface PatientAttention {
  id: string;
  firstName: string;
  lastName: string;
  conditions: string[];
  lastVital?: {
    type: string;
    value: string;
    status: 'normal' | 'warning' | 'critical';
    time: string;
  };
  alertCount: number;
  alertSeverity: 'warning' | 'critical';
  phone?: string;
}

export interface PatientsAttentionResponse {
  patients: PatientAttention[];
}

export const dashboardApi = {
  getStats: () =>
    api.get<DashboardStats>('/api/dashboard/stats'),

  getActivity: (limit = 10) =>
    api.get<ActivityResponse>(`/api/dashboard/activity?limit=${limit}`),

  getVitalsTrend: (days = 7) =>
    api.get<VitalsTrendResponse>(`/api/dashboard/vitals-trend?days=${days}`),

  getAlertDistribution: () =>
    api.get<AlertDistribution>('/api/dashboard/alert-distribution'),

  getPatientsAttention: (limit = 10) =>
    api.get<PatientsAttentionResponse>(`/api/dashboard/patients-attention?limit=${limit}`),
};
