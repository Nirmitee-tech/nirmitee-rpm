import { api } from './client';

// Types
export interface PatientProfile {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  dateOfBirth: string;
  enrollmentStatus: string;
  primaryPhysician: {
    firstName: string;
    lastName: string;
  } | null;
  assignedClinicalStaff: {
    firstName: string;
    lastName: string;
  } | null;
}

export type AlertSeverity = 'INFO' | 'WARNING' | 'CRITICAL';
export type AlertType = 'VITAL_THRESHOLD' | 'MEDICATION_REMINDER' | 'APPOINTMENT_REMINDER' | 'CARE_PLAN' | 'CUSTOM';

export interface PatientAlert {
  id: string;
  type: AlertType;
  severity: AlertSeverity;
  title: string;
  message: string;
  createdAt: string;
  read: boolean;
}

export interface PatientVital {
  id: string;
  type: string;
  values: Record<string, number>;
  unit: string;
  status: 'normal' | 'warning' | 'critical';
  recordedAt: string;
  notes: string | null;
}

export interface CareTeamMember {
  id: string;
  name: string;
  role: 'primaryPhysician' | 'nurse' | 'specialist';
  specialty: string;
  email: string;
}

export interface PatientCarePlan {
  id: string;
  status: string;
  goals: Array<{ description: string; targetDate?: string; status: string }>;
  medications: Array<{ name: string; dosage: string; frequency: string }>;
  instructions: string | null;
  vitalThresholds: Record<string, unknown> | null;
  effectiveDate: string | null;
  createdAt: string;
  createdBy: string | null;
  approvedBy: string | null;
  approvedAt: string | null;
}

// API functions
export const patientPortalApi = {
  // Get current patient profile
  getProfile: () =>
    api.get<{ success: boolean; data: PatientProfile }>('/api/patient-portal/me'),

  // Get patient's alerts
  getAlerts: () =>
    api.get<{ success: boolean; data: PatientAlert[] }>('/api/patient-portal/alerts'),

  // Mark single alert as read
  markAlertRead: (alertId: string) =>
    api.post<{ success: boolean; message: string }>(`/api/patient-portal/alerts/${alertId}/read`),

  // Mark all alerts as read
  markAllAlertsRead: () =>
    api.post<{ success: boolean; message: string }>('/api/patient-portal/alerts/read-all'),

  // Get patient's vitals
  getVitals: (params?: { type?: string; limit?: number }) => {
    const query = new URLSearchParams();
    if (params?.type) query.set('type', params.type);
    if (params?.limit) query.set('limit', params.limit.toString());
    const queryStr = query.toString();
    return api.get<{ success: boolean; data: PatientVital[] }>(
      `/api/patient-portal/vitals${queryStr ? `?${queryStr}` : ''}`
    );
  },

  // Get patient's care team
  getCareTeam: () =>
    api.get<{ success: boolean; data: CareTeamMember[] }>('/api/patient-portal/care-team'),

  // Get patient's active care plan
  getCarePlan: () =>
    api.get<{ success: boolean; data: PatientCarePlan | null }>('/api/patient-portal/care-plan'),
};
