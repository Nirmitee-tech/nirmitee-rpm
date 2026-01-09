import { api } from './client';

export type AlertSeverity = 'INFO' | 'SIGNIFICANT' | 'CRITICAL';
export type AlertStatus = 'NEW' | 'ACKNOWLEDGED' | 'IN_PROGRESS' | 'RESOLVED' | 'ESCALATED';
export type AlertType = 'VITAL_THRESHOLD' | 'MEDICATION_REMINDER' | 'APPOINTMENT_REMINDER' | 'CARE_PLAN' | 'CUSTOM';

export interface Alert {
  id: string;
  patientId: string;
  organizationId: string;
  vitalReadingId?: string;
  type: AlertType;
  severity: AlertSeverity;
  status: AlertStatus;
  message: string;
  metadata?: Record<string, unknown>;
  assignedToId?: string;
  escalatedToId?: string;
  acknowledgedAt?: string;
  acknowledgedById?: string;
  escalatedAt?: string;
  resolvedAt?: string;
  resolution?: string;
  createdAt: string;
  updatedAt: string;
  patient?: {
    id: string;
    user: {
      firstName: string;
      lastName: string;
      email?: string;
    };
  };
  vitalReading?: {
    type: string;
    values: Record<string, unknown>;
    status: string;
    recordedAt?: string;
  };
  assignedTo?: {
    id: string;
    firstName: string;
    lastName: string;
  };
  acknowledgedBy?: {
    id: string;
    firstName: string;
    lastName: string;
  };
  escalatedTo?: {
    id: string;
    firstName: string;
    lastName: string;
  };
  escalations?: Array<{
    id: string;
    fromLevel: number;
    toLevel: number;
    executedAt: string;
    fromUser?: { firstName: string; lastName: string };
    toUser?: { firstName: string; lastName: string };
  }>;
}

export interface CreateAlertInput {
  patientId: string;
  type: AlertType;
  severity: AlertSeverity;
  message: string;
  metadata?: Record<string, unknown>;
}

export interface ListAlertsParams {
  patientId?: string;
  status?: AlertStatus;
  severity?: AlertSeverity;
  page?: number;
  limit?: number;
}

export interface AlertStats {
  total: number;
  new: number;
  critical: number;
  acknowledged: number;
}

interface ApiResponse<T> {
  success: boolean;
  data: T;
}

interface ListAlertsApiResponse {
  success: boolean;
  data: Alert[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface ListAlertsResponse {
  alerts: Alert[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

function buildQueryString(params?: Record<string, unknown>): string {
  if (!params) return '';
  const searchParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      searchParams.append(key, String(value));
    }
  });
  const query = searchParams.toString();
  return query ? `?${query}` : '';
}

export const alertsApi = {
  /**
   * List alerts for organization with optional filters
   */
  async listAlerts(params?: ListAlertsParams): Promise<ListAlertsResponse> {
    const query = buildQueryString(params as Record<string, unknown>);
    const response = await api.get<ListAlertsApiResponse>(`/api/patient-alerts${query}`);
    return {
      alerts: response.data,
      pagination: response.pagination,
    };
  },

  /**
   * Get alerts for a specific patient
   */
  async getPatientAlerts(
    patientId: string,
    options?: { status?: string; limit?: number }
  ): Promise<Alert[]> {
    const query = buildQueryString(options as Record<string, unknown>);
    const response = await api.get<ApiResponse<Alert[]>>(
      `/api/patient-alerts/patient/${patientId}${query}`
    );
    return response.data;
  },

  /**
   * Get single alert details
   */
  async getAlert(alertId: string): Promise<Alert> {
    const response = await api.get<ApiResponse<Alert>>(`/api/patient-alerts/${alertId}`);
    return response.data;
  },

  /**
   * Create a manual alert
   */
  async createAlert(data: CreateAlertInput): Promise<Alert> {
    const response = await api.post<ApiResponse<Alert>>('/api/patient-alerts', data);
    return response.data;
  },

  /**
   * Acknowledge an alert
   */
  async acknowledgeAlert(alertId: string, notes?: string): Promise<Alert> {
    const response = await api.post<ApiResponse<Alert>>(
      `/api/patient-alerts/${alertId}/acknowledge`,
      { notes }
    );
    return response.data;
  },

  /**
   * Resolve an alert
   */
  async resolveAlert(alertId: string, resolution: string): Promise<Alert> {
    const response = await api.post<ApiResponse<Alert>>(
      `/api/patient-alerts/${alertId}/resolve`,
      { resolution }
    );
    return response.data;
  },

  /**
   * Dismiss an alert (close without full resolution)
   */
  async dismissAlert(alertId: string, reason?: string): Promise<Alert> {
    const response = await api.post<ApiResponse<Alert>>(
      `/api/patient-alerts/${alertId}/dismiss`,
      { reason }
    );
    return response.data;
  },

  /**
   * Get alert statistics
   */
  async getAlertStats(patientId?: string): Promise<AlertStats> {
    const query = patientId ? `?patientId=${patientId}` : '';
    const response = await api.get<ApiResponse<AlertStats>>(`/api/patient-alerts/stats/summary${query}`);
    return response.data;
  },
};

export default alertsApi;
