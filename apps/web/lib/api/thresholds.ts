import { api } from './client';

// Types matching backend
export type VitalType =
  | 'BLOOD_PRESSURE'
  | 'WEIGHT'
  | 'BLOOD_GLUCOSE'
  | 'PULSE_OXIMETRY'
  | 'HEART_RATE'
  | 'TEMPERATURE';

export interface ThresholdConfig {
  warningMin?: number;
  warningMax?: number;
  criticalMin?: number;
  criticalMax?: number;
  warningMinSecondary?: number;
  warningMaxSecondary?: number;
  criticalMinSecondary?: number;
  criticalMaxSecondary?: number;
  unit: string;
}

export interface VitalThreshold {
  id: string;
  organizationId: string;
  vitalType: VitalType;
  warningMin?: number;
  warningMax?: number;
  criticalMin?: number;
  criticalMax?: number;
  warningMinSecondary?: number;
  warningMaxSecondary?: number;
  criticalMinSecondary?: number;
  criticalMaxSecondary?: number;
  unit: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PatientVitalThreshold {
  id: string;
  patientId: string;
  organizationId: string;
  vitalType: VitalType;
  warningMin?: number;
  warningMax?: number;
  criticalMin?: number;
  criticalMax?: number;
  warningMinSecondary?: number;
  warningMaxSecondary?: number;
  criticalMinSecondary?: number;
  criticalMaxSecondary?: number;
  useCustom: boolean;
  notes?: string;
  createdById?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SystemDefault {
  vitalType: VitalType;
  config: ThresholdConfig;
}

export interface SetThresholdInput {
  warningMin?: number;
  warningMax?: number;
  criticalMin?: number;
  criticalMax?: number;
  warningMinSecondary?: number;
  warningMaxSecondary?: number;
  criticalMinSecondary?: number;
  criticalMaxSecondary?: number;
  unit?: string;
  notes?: string;
}

// Vital type display names
export const VITAL_TYPE_LABELS: Record<VitalType, string> = {
  BLOOD_PRESSURE: 'Blood Pressure',
  WEIGHT: 'Weight',
  BLOOD_GLUCOSE: 'Blood Glucose',
  PULSE_OXIMETRY: 'Pulse Oximetry (SpO2)',
  HEART_RATE: 'Heart Rate',
  TEMPERATURE: 'Temperature',
};

// Vital type units
export const VITAL_TYPE_UNITS: Record<VitalType, string> = {
  BLOOD_PRESSURE: 'mmHg',
  WEIGHT: 'lbs',
  BLOOD_GLUCOSE: 'mg/dL',
  PULSE_OXIMETRY: '%',
  HEART_RATE: 'bpm',
  TEMPERATURE: '°F',
};

export const thresholdsApi = {
  /**
   * Get all organization thresholds
   */
  getOrganizationThresholds: async (): Promise<VitalThreshold[]> => {
    const response = await api.get<{ success: boolean; data: VitalThreshold[] }>(
      '/api/thresholds'
    );
    return response.data;
  },

  /**
   * Get system default thresholds
   */
  getSystemDefaults: async (): Promise<SystemDefault[]> => {
    const response = await api.get<{ success: boolean; data: SystemDefault[] }>(
      '/api/thresholds/defaults'
    );
    return response.data;
  },

  /**
   * Get organization threshold for specific vital type
   */
  getOrganizationThreshold: async (vitalType: VitalType): Promise<VitalThreshold> => {
    const response = await api.get<{ success: boolean; data: VitalThreshold }>(
      `/api/thresholds/${vitalType}`
    );
    return response.data;
  },

  /**
   * Set organization threshold for specific vital type
   */
  setOrganizationThreshold: async (
    vitalType: VitalType,
    data: SetThresholdInput
  ): Promise<VitalThreshold> => {
    const response = await api.put<{ success: boolean; data: VitalThreshold }>(
      `/api/thresholds/${vitalType}`,
      data
    );
    return response.data;
  },

  /**
   * Reset organization threshold to system defaults
   */
  resetOrganizationThreshold: async (vitalType: VitalType): Promise<void> => {
    await api.delete(`/api/thresholds/${vitalType}`);
  },

  /**
   * Get all patient thresholds
   */
  getPatientThresholds: async (patientId: string): Promise<PatientVitalThreshold[]> => {
    const response = await api.get<{ success: boolean; data: PatientVitalThreshold[] }>(
      `/api/thresholds/patients/${patientId}`
    );
    return response.data;
  },

  /**
   * Get effective threshold for patient and vital type
   */
  getPatientEffectiveThreshold: async (
    patientId: string,
    vitalType: VitalType
  ): Promise<{ vitalType: VitalType; config: ThresholdConfig }> => {
    const response = await api.get<{
      success: boolean;
      data: { vitalType: VitalType; config: ThresholdConfig };
    }>(`/api/thresholds/patients/${patientId}/${vitalType}`);
    return response.data;
  },

  /**
   * Set patient-specific threshold
   */
  setPatientThreshold: async (
    patientId: string,
    vitalType: VitalType,
    data: SetThresholdInput
  ): Promise<PatientVitalThreshold> => {
    const response = await api.put<{ success: boolean; data: PatientVitalThreshold }>(
      `/api/thresholds/patients/${patientId}/${vitalType}`,
      data
    );
    return response.data;
  },

  /**
   * Reset patient threshold to organization default
   */
  resetPatientThreshold: async (patientId: string, vitalType: VitalType): Promise<void> => {
    await api.delete(`/api/thresholds/patients/${patientId}/${vitalType}`);
  },
};
