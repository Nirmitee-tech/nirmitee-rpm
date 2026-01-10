import { apiClient } from './client';

// API response wrapper type
interface ApiResponse<T> {
  success: boolean;
  data: T;
}

export interface CaregiverProfile {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  relationship: string | null;
}

export interface LinkedPatient {
  id: string;
  firstName: string;
  lastName: string;
  relationship: string;
  accessLevel: string;
  consentGrantedAt: string | null;
}

export interface PatientVitalReading {
  id: string;
  type: string;
  values: Record<string, number>;
  status: string;
  source: string;
  recordedAt: string;
}

export interface PatientAlert {
  id: string;
  type: string;
  severity: string;
  status: string;
  message: string | null;
  vitalType: string | null;
  vitalValues: Record<string, number> | null;
  createdAt: string;
}

export interface PatientMedication {
  id: string;
  name: string;
  genericName: string | null;
  dosage: string;
  frequency: string;
  route: string | null;
  instructions: string | null;
}

export interface PatientCarePlan {
  id: string;
  name: string;
  goals: string | string[];
  instructions: string | null;
  vitalThresholds: Record<string, unknown> | null;
  effectiveDate: string | null;
  createdBy: string | null;
}

export interface PatientSummary {
  patient: {
    id: string;
    firstName: string;
    lastName: string;
    conditions: string[];
    enrollmentStatus: string;
  };
  careTeam: {
    primaryPhysician: string | null;
    clinicalStaff: string | null;
  };
  stats: {
    todayReadings: number;
    weekReadings: number;
    activeAlerts: number;
    activeMedications: number;
  };
  latestVitals: Array<{
    type: string;
    values: Record<string, number>;
    status: string;
    recordedAt: string;
  }>;
}

export const caregiverApi = {
  /**
   * Get caregiver profile
   */
  getProfile: async (): Promise<CaregiverProfile> => {
    const response = await apiClient.get<ApiResponse<CaregiverProfile>>('/caregiver-portal/me');
    return response.data;
  },

  /**
   * Get linked patients
   */
  getLinkedPatients: async (): Promise<LinkedPatient[]> => {
    const response = await apiClient.get<ApiResponse<LinkedPatient[]>>('/caregiver-portal/linked-patients');
    return response.data;
  },

  /**
   * Get vitals for a linked patient
   */
  getPatientVitals: async (patientId: string, days?: number): Promise<PatientVitalReading[]> => {
    const query = days ? `?days=${days}` : '';
    const response = await apiClient.get<ApiResponse<PatientVitalReading[]>>(`/caregiver-portal/patients/${patientId}/vitals${query}`);
    return response.data;
  },

  /**
   * Get alerts for a linked patient
   */
  getPatientAlerts: async (patientId: string): Promise<PatientAlert[]> => {
    const response = await apiClient.get<ApiResponse<PatientAlert[]>>(`/caregiver-portal/patients/${patientId}/alerts`);
    return response.data;
  },

  /**
   * Get medications for a linked patient
   */
  getPatientMedications: async (patientId: string): Promise<PatientMedication[]> => {
    const response = await apiClient.get<ApiResponse<PatientMedication[]>>(`/caregiver-portal/patients/${patientId}/medications`);
    return response.data;
  },

  /**
   * Get care plan for a linked patient
   */
  getPatientCarePlan: async (patientId: string): Promise<PatientCarePlan | null> => {
    const response = await apiClient.get<ApiResponse<PatientCarePlan | null>>(`/caregiver-portal/patients/${patientId}/care-plan`);
    return response.data;
  },

  /**
   * Get summary for a linked patient
   */
  getPatientSummary: async (patientId: string): Promise<PatientSummary> => {
    const response = await apiClient.get<ApiResponse<PatientSummary>>(`/caregiver-portal/patients/${patientId}/summary`);
    return response.data;
  },
};
