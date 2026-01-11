import { apiClient } from './client';

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
  getProfile: async (): Promise<CaregiverProfile> => {
    return apiClient.get<CaregiverProfile>('/caregiver-portal/me');
  },

  getLinkedPatients: async (): Promise<LinkedPatient[]> => {
    return apiClient.get<LinkedPatient[]>('/caregiver-portal/linked-patients');
  },

  getPatientVitals: async (patientId: string, days?: number): Promise<PatientVitalReading[]> => {
    const query = days ? `?days=${days}` : '';
    return apiClient.get<PatientVitalReading[]>(`/caregiver-portal/patients/${patientId}/vitals${query}`);
  },

  getPatientAlerts: async (patientId: string): Promise<PatientAlert[]> => {
    return apiClient.get<PatientAlert[]>(`/caregiver-portal/patients/${patientId}/alerts`);
  },

  getPatientMedications: async (patientId: string): Promise<PatientMedication[]> => {
    return apiClient.get<PatientMedication[]>(`/caregiver-portal/patients/${patientId}/medications`);
  },

  getPatientCarePlan: async (patientId: string): Promise<PatientCarePlan | null> => {
    return apiClient.get<PatientCarePlan | null>(`/caregiver-portal/patients/${patientId}/care-plan`);
  },

  getPatientSummary: async (patientId: string): Promise<PatientSummary> => {
    return apiClient.get<PatientSummary>(`/caregiver-portal/patients/${patientId}/summary`);
  },
};

export default caregiverApi;
