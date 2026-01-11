import { apiClient } from './client';

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

export interface VitalReading {
  id: string;
  type: string;
  values: Record<string, number>;
  unit: string;
  status: string;
  recordedAt: string;
  notes?: string | null;
}

export interface Alert {
  id: string;
  type: string;
  severity: string;
  title: string;
  message: string | null;
  createdAt: string;
  read: boolean;
}

export interface CareTeamMember {
  id: string;
  name: string;
  role: string;
  specialty: string;
  email: string;
}

export interface CarePlan {
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

export interface DashboardStats {
  todayReadings: number;
  weekReadings: number;
  activeAlerts: number;
  complianceRate: number;
}

// Vital type units mapping
const vitalUnits: Record<string, string> = {
  BLOOD_PRESSURE: 'mmHg',
  BLOOD_GLUCOSE: 'mg/dL',
  WEIGHT: 'kg',
  OXYGEN_SATURATION: '%',
  PULSE_OXIMETRY: '%',
  HEART_RATE: 'bpm',
  TEMPERATURE: '°F',
  RESPIRATORY_RATE: 'breaths/min',
};

export const patientApi = {
  // Get current patient profile
  getProfile: async (): Promise<PatientProfile> => {
    return apiClient.get<PatientProfile>('/patient-portal/me');
  },

  // Get dashboard stats
  getDashboard: async (): Promise<DashboardStats> => {
    return apiClient.get<DashboardStats>('/patient-portal/dashboard');
  },

  // Get patient's vitals
  getVitals: async (params?: { type?: string; limit?: number }): Promise<VitalReading[]> => {
    const query = new URLSearchParams();
    if (params?.type) query.set('type', params.type);
    if (params?.limit) query.set('limit', params.limit.toString());
    const queryStr = query.toString();
    return apiClient.get<VitalReading[]>(`/patient-portal/vitals${queryStr ? `?${queryStr}` : ''}`);
  },

  // Record a vital reading
  recordVital: async (data: {
    type: string;
    values: Record<string, number>;
    notes?: string;
    mealContext?: 'fasting' | 'before_meal' | 'after_meal' | 'bedtime' | 'random';
  }): Promise<VitalReading> => {
    const payload = {
      type: data.type,
      values: data.values,
      unit: vitalUnits[data.type] || 'unit',
      recordedAt: new Date().toISOString(),
      notes: data.notes,
      mealContext: data.mealContext,
    };
    return apiClient.post<VitalReading>('/vitals/readings', payload);
  },

  // Get patient's alerts
  getAlerts: async (): Promise<Alert[]> => {
    return apiClient.get<Alert[]>('/patient-portal/alerts');
  },

  // Mark alert as read
  markAlertRead: async (alertId: string): Promise<void> => {
    return apiClient.post(`/patient-portal/alerts/${alertId}/read`);
  },

  // Mark all alerts as read
  markAllAlertsRead: async (): Promise<void> => {
    return apiClient.post('/patient-portal/alerts/read-all');
  },

  // Get patient's care team
  getCareTeam: async (): Promise<CareTeamMember[]> => {
    return apiClient.get<CareTeamMember[]>('/patient-portal/care-team');
  },

  // Get patient's active care plan
  getCarePlan: async (): Promise<CarePlan | null> => {
    return apiClient.get<CarePlan | null>('/patient-portal/care-plan');
  },
};

export default patientApi;
