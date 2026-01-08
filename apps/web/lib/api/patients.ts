import { api } from './client';

export interface PatientAddress {
  street: string;
  city: string;
  state: string;
  zipCode: string;
  country?: string;
}

export interface PatientInsurance {
  providerId: string | null;
  planName: string | null;
  memberId: string | null;
  groupNumber: string | null;
}

export interface CareTeamMember {
  id: string;
  name: string;
}

// Patient response from backend
export interface Patient {
  id: string;
  userId: string;
  email: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  phone: string | null;
  address: PatientAddress | null;
  conditions: string[];
  insurance: PatientInsurance;
  enrollmentStatus: 'PENDING' | 'CONSENTED' | 'ACTIVE' | 'INACTIVE' | 'DISCHARGED';
  enrollmentDate: string | null;
  consentDate: string | null;
  primaryPhysician: CareTeamMember | null;
  assignedClinicalStaff: CareTeamMember | null;
  createdAt: string;
  updatedAt: string;
  // Fields to be added to backend later - frontend ready
  gender?: string;
  emergencyContact?: string;
  emergencyPhone?: string;
  additionalNotes?: string;
}

export interface CreatePatientData {
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  gender: string;
  phone: string;
  email: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  emergencyContact: string;
  emergencyPhone: string;
  conditions: string[];
  additionalNotes?: string;
  isSelfPay: boolean;
  insuranceProvider?: string;
  policyNumber?: string;
  groupNumber?: string;
  subscriberName?: string;
  subscriberRelationship?: string;
  primaryPhysicianId: string;
  careCoordinatorId: string;
  additionalProviderIds?: string[];
  consentObtained: boolean;
  consentDate?: string;
  consentSignature?: string;
  consentWitnessName?: string;
  hipaaAcknowledged: boolean;
}

export interface EnrollmentDraft {
  id?: string;
  step: number;
  data: Partial<CreatePatientData>;
  createdAt?: string;
  updatedAt?: string;
}

export interface SearchPatientResult {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  dateOfBirth: string;
}

export interface ListPatientsResponse {
  patients: Patient[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface Provider {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  specialty?: string;
}

export const patientsApi = {
  list: (params?: { page?: number; limit?: number; search?: string; status?: string }) => {
    const query = new URLSearchParams();
    if (params?.page) query.set('page', params.page.toString());
    if (params?.limit) query.set('limit', params.limit.toString());
    if (params?.search) query.set('search', params.search);
    if (params?.status) query.set('status', params.status);
    return api.get<ListPatientsResponse>(`/api/patients?${query.toString()}`);
  },

  get: (patientId: string) =>
    api.get<Patient>(`/api/patients/${patientId}`),

  search: (query: string) =>
    api.get<SearchPatientResult[]>(`/api/patients/search?q=${encodeURIComponent(query)}`),

  create: (data: CreatePatientData) =>
    api.post<Patient>('/api/patients', data),

  update: (patientId: string, data: Partial<CreatePatientData>) =>
    api.patch<Patient>(`/api/patients/${patientId}`, data),

  delete: (patientId: string) =>
    api.delete<{ message: string }>(`/api/patients/${patientId}`),

  // Draft management
  saveDraft: (draft: EnrollmentDraft) =>
    api.post<EnrollmentDraft>('/api/patients/drafts', draft),

  getDraft: (draftId: string) =>
    api.get<EnrollmentDraft>(`/api/patients/drafts/${draftId}`),

  deleteDraft: (draftId: string) =>
    api.delete<{ message: string }>(`/api/patients/drafts/${draftId}`),

  // Care team providers
  getProviders: (params?: { search?: string; role?: string }) => {
    const query = new URLSearchParams();
    if (params?.search) query.set('search', params.search);
    if (params?.role) query.set('role', params.role);
    return api.get<Provider[]>(`/api/providers?${query.toString()}`);
  },
};
