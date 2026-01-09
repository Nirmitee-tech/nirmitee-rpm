import { api } from './client';

// ============================================
// TYPES
// ============================================

export type MedicationStatus = 'ACTIVE' | 'DISCONTINUED' | 'ON_HOLD' | 'COMPLETED';
export type AllergyType = 'DRUG' | 'FOOD' | 'ENVIRONMENTAL' | 'OTHER';
export type AllergySeverity = 'MILD' | 'MODERATE' | 'SEVERE' | 'LIFE_THREATENING';
export type AllergyStatus = 'ACTIVE' | 'INACTIVE' | 'RESOLVED';
export type ImmunizationStatus = 'COMPLETED' | 'NOT_DONE' | 'ENTERED_IN_ERROR';
export type LabResultStatus = 'PRELIMINARY' | 'FINAL' | 'CORRECTED' | 'CANCELLED';
export type LabInterpretation = 'NORMAL' | 'ABNORMAL' | 'CRITICAL' | 'HIGH' | 'LOW';
export type MedicalHistoryStatus = 'ACTIVE' | 'RESOLVED' | 'INACTIVE' | 'REMISSION';

export interface Medication {
  id: string;
  patientId: string;
  organizationId: string;
  name: string;
  genericName?: string;
  dosage: string;
  frequency: string;
  route?: string;
  prescribedBy?: string;
  prescribedDate?: string;
  startDate?: string;
  endDate?: string;
  status: MedicationStatus;
  refillsRemaining?: number;
  pharmacy?: string;
  instructions?: string;
  sideEffects?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Allergy {
  id: string;
  patientId: string;
  organizationId: string;
  allergen: string;
  type: AllergyType;
  severity: AllergySeverity;
  reaction?: string;
  onsetDate?: string;
  reportedBy?: string;
  verifiedBy?: string;
  verifiedDate?: string;
  status: AllergyStatus;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Immunization {
  id: string;
  patientId: string;
  organizationId: string;
  vaccineName: string;
  vaccineCode?: string;
  manufacturer?: string;
  lotNumber?: string;
  administeredDate: string;
  expirationDate?: string;
  site?: string;
  route?: string;
  dosage?: string;
  doseNumber?: number;
  series?: string;
  administeredBy?: string;
  location?: string;
  status: ImmunizationStatus;
  reaction?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface LabResult {
  id: string;
  patientId: string;
  organizationId: string;
  testName: string;
  testCode?: string;
  category?: string;
  value: string;
  unit?: string;
  referenceMin?: string;
  referenceMax?: string;
  referenceRange?: string;
  status: LabResultStatus;
  interpretation?: LabInterpretation;
  collectedAt?: string;
  resultedAt: string;
  orderedBy?: string;
  performedBy?: string;
  specimenType?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface MedicalHistoryItem {
  id: string;
  patientId: string;
  organizationId: string;
  condition: string;
  icdCode?: string;
  diagnosedDate?: string;
  resolvedDate?: string;
  status: MedicalHistoryStatus;
  severity?: string;
  treatedBy?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

interface MedicationListResponse {
  medications: Medication[];
  pagination: Pagination;
}

interface AllergyListResponse {
  allergies: Allergy[];
  pagination: Pagination;
}

interface ImmunizationListResponse {
  immunizations: Immunization[];
  pagination: Pagination;
}

interface LabResultListResponse {
  labResults: LabResult[];
  pagination: Pagination;
}

interface MedicalHistoryListResponse {
  medicalHistory: MedicalHistoryItem[];
  pagination: Pagination;
}

interface HealthSummary {
  medications: { active: number };
  allergies: { active: number };
  immunizations: { total: number };
  labResults: { total: number };
  conditions: { active: number };
}

// ============================================
// API FUNCTIONS
// ============================================

export const healthRecordsApi = {
  // Medications
  getMedications: async (
    patientId: string,
    params?: { status?: MedicationStatus; page?: number; limit?: number }
  ): Promise<MedicationListResponse> => {
    const queryParams = new URLSearchParams();
    if (params?.status) queryParams.append('status', params.status);
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());

    const query = queryParams.toString() ? `?${queryParams.toString()}` : '';
    return api.get(`/api/v1/health-records/patients/${patientId}/medications${query}`);
  },

  createMedication: async (
    patientId: string,
    data: Omit<Medication, 'id' | 'patientId' | 'organizationId' | 'createdAt' | 'updatedAt'>
  ): Promise<Medication> => {
    return api.post(`/api/v1/health-records/patients/${patientId}/medications`, data);
  },

  updateMedication: async (
    id: string,
    data: Partial<Omit<Medication, 'id' | 'patientId' | 'organizationId' | 'createdAt' | 'updatedAt'>>
  ): Promise<Medication> => {
    return api.put(`/api/v1/health-records/medications/${id}`, data);
  },

  deleteMedication: async (id: string): Promise<void> => {
    return api.delete(`/api/v1/health-records/medications/${id}`);
  },

  // Allergies
  getAllergies: async (
    patientId: string,
    params?: { type?: AllergyType; status?: AllergyStatus; page?: number; limit?: number }
  ): Promise<AllergyListResponse> => {
    const queryParams = new URLSearchParams();
    if (params?.type) queryParams.append('type', params.type);
    if (params?.status) queryParams.append('status', params.status);
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());

    const query = queryParams.toString() ? `?${queryParams.toString()}` : '';
    return api.get(`/api/v1/health-records/patients/${patientId}/allergies${query}`);
  },

  createAllergy: async (
    patientId: string,
    data: Omit<Allergy, 'id' | 'patientId' | 'organizationId' | 'createdAt' | 'updatedAt'>
  ): Promise<Allergy> => {
    return api.post(`/api/v1/health-records/patients/${patientId}/allergies`, data);
  },

  updateAllergy: async (
    id: string,
    data: Partial<Omit<Allergy, 'id' | 'patientId' | 'organizationId' | 'createdAt' | 'updatedAt'>>
  ): Promise<Allergy> => {
    return api.put(`/api/v1/health-records/allergies/${id}`, data);
  },

  deleteAllergy: async (id: string): Promise<void> => {
    return api.delete(`/api/v1/health-records/allergies/${id}`);
  },

  // Immunizations
  getImmunizations: async (
    patientId: string,
    params?: { status?: ImmunizationStatus; page?: number; limit?: number }
  ): Promise<ImmunizationListResponse> => {
    const queryParams = new URLSearchParams();
    if (params?.status) queryParams.append('status', params.status);
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());

    const query = queryParams.toString() ? `?${queryParams.toString()}` : '';
    return api.get(`/api/v1/health-records/patients/${patientId}/immunizations${query}`);
  },

  createImmunization: async (
    patientId: string,
    data: Omit<Immunization, 'id' | 'patientId' | 'organizationId' | 'createdAt' | 'updatedAt'>
  ): Promise<Immunization> => {
    return api.post(`/api/v1/health-records/patients/${patientId}/immunizations`, data);
  },

  updateImmunization: async (
    id: string,
    data: Partial<Omit<Immunization, 'id' | 'patientId' | 'organizationId' | 'createdAt' | 'updatedAt'>>
  ): Promise<Immunization> => {
    return api.put(`/api/v1/health-records/immunizations/${id}`, data);
  },

  deleteImmunization: async (id: string): Promise<void> => {
    return api.delete(`/api/v1/health-records/immunizations/${id}`);
  },

  // Lab Results
  getLabResults: async (
    patientId: string,
    params?: {
      category?: string;
      status?: LabResultStatus;
      interpretation?: LabInterpretation;
      page?: number;
      limit?: number
    }
  ): Promise<LabResultListResponse> => {
    const queryParams = new URLSearchParams();
    if (params?.category) queryParams.append('category', params.category);
    if (params?.status) queryParams.append('status', params.status);
    if (params?.interpretation) queryParams.append('interpretation', params.interpretation);
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());

    const query = queryParams.toString() ? `?${queryParams.toString()}` : '';
    return api.get(`/api/v1/health-records/patients/${patientId}/lab-results${query}`);
  },

  createLabResult: async (
    patientId: string,
    data: Omit<LabResult, 'id' | 'patientId' | 'organizationId' | 'createdAt' | 'updatedAt'>
  ): Promise<LabResult> => {
    return api.post(`/api/v1/health-records/patients/${patientId}/lab-results`, data);
  },

  updateLabResult: async (
    id: string,
    data: Partial<Omit<LabResult, 'id' | 'patientId' | 'organizationId' | 'createdAt' | 'updatedAt'>>
  ): Promise<LabResult> => {
    return api.put(`/api/v1/health-records/lab-results/${id}`, data);
  },

  deleteLabResult: async (id: string): Promise<void> => {
    return api.delete(`/api/v1/health-records/lab-results/${id}`);
  },

  // Medical History
  getMedicalHistory: async (
    patientId: string,
    params?: { status?: MedicalHistoryStatus; page?: number; limit?: number }
  ): Promise<MedicalHistoryListResponse> => {
    const queryParams = new URLSearchParams();
    if (params?.status) queryParams.append('status', params.status);
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());

    const query = queryParams.toString() ? `?${queryParams.toString()}` : '';
    return api.get(`/api/v1/health-records/patients/${patientId}/medical-history${query}`);
  },

  createMedicalHistoryItem: async (
    patientId: string,
    data: Omit<MedicalHistoryItem, 'id' | 'patientId' | 'organizationId' | 'createdAt' | 'updatedAt'>
  ): Promise<MedicalHistoryItem> => {
    return api.post(`/api/v1/health-records/patients/${patientId}/medical-history`, data);
  },

  updateMedicalHistoryItem: async (
    id: string,
    data: Partial<Omit<MedicalHistoryItem, 'id' | 'patientId' | 'organizationId' | 'createdAt' | 'updatedAt'>>
  ): Promise<MedicalHistoryItem> => {
    return api.put(`/api/v1/health-records/medical-history/${id}`, data);
  },

  deleteMedicalHistoryItem: async (id: string): Promise<void> => {
    return api.delete(`/api/v1/health-records/medical-history/${id}`);
  },

  // Health Summary
  getHealthSummary: async (patientId: string): Promise<HealthSummary> => {
    return api.get(`/api/v1/health-records/patients/${patientId}/health-summary`);
  },
};
