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

export interface Device {
  id: string;
  patientId: string;
  type: string;
  serialNumber: string;
  manufacturer: string | null;
  model: string | null;
  assignedDate: string;
  status: 'ACTIVE' | 'INACTIVE' | 'MAINTENANCE';
  lastSyncDate: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AssignDeviceData {
  type: string;
  serialNumber: string;
  manufacturer?: string;
  model?: string;
}

export interface UpdateCareTeamData {
  primaryPhysicianId?: string;
  assignedClinicalStaffId?: string;
}

export interface StaffMember {
  id: string;
  name: string;
  role: string;
}

// Care Plans
export interface CarePlanGoal {
  id: string;
  description: string;
  targetDate?: string;
  status?: 'pending' | 'in_progress' | 'achieved';
}

export interface CarePlanVersion {
  id: string;
  version: number;
  goals: CarePlanGoal[];
  vitalThresholds: Record<string, { min?: number; max?: number; critical?: number }>;
  medications: { name: string; dosage: string; frequency: string }[];
  instructions?: string;
  effectiveDate: string;
}

export interface CarePlan {
  id: string;
  status: 'DRAFT' | 'PENDING_APPROVAL' | 'ACTIVE' | 'INACTIVE';
  currentVersion: number;
  createdAt: string;
  activatedAt?: string;
  createdBy: { firstName: string; lastName: string };
  approvedBy?: { firstName: string; lastName: string };
  versions: CarePlanVersion[];
}

// Alerts
export interface Alert {
  id: string;
  type: string;
  severity: 'LOW' | 'MODERATE' | 'SIGNIFICANT' | 'CRITICAL';
  status: 'NEW' | 'ACKNOWLEDGED' | 'ESCALATED' | 'RESOLVED';
  message: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
  acknowledgedAt?: string;
  resolvedAt?: string;
  resolution?: string;
}

// Vitals
export interface VitalReading {
  id: string;
  type: string;
  values: Record<string, number>;
  unit: string;
  status: string;
  recordedAt: string;
  symptoms?: string[];
  mealContext?: string;
  notes?: string;
  createdAt: string;
}

export interface VitalSummary {
  totalReadings: number;
  latestReading: {
    values: Record<string, number>;
    recordedAt: string;
    status: string;
  } | null;
  averageValues?: Record<string, number>;
  statusCounts: {
    normal: number;
    warning: number;
    critical: number;
  };
}

export interface PatientVitalsResponse {
  readings: VitalReading[];
  summary: Record<string, VitalSummary>;
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface PatientMetrics {
  totalReadings: {
    current: number;
    required: number;
  };
  totalMinutes: {
    current: number;
    required: number;
  };
  lastCall: string | null;
  callStatus: 'successful' | 'missed' | 'no_answer' | null;
  billingPeriod: {
    start: string;
    end: string;
  };
}

// Assessment types
export type AssessmentType = 'PHQ9' | 'GAD7' | 'FALLS_RISK' | 'NUTRITION' | 'PAIN_SCALE' | 'ADL';
export type AssessmentStatus = 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';

export interface Assessment {
  id: string;
  type: AssessmentType;
  status: AssessmentStatus;
  score: number | null;
  maxScore: number | null;
  responses: Record<string, unknown> | null;
  notes: string | null;
  dueDate: string | null;
  completedAt: string | null;
  completedBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateAssessmentData {
  type: AssessmentType;
  responses?: Record<string, unknown>;
  notes?: string;
  dueDate?: string;
}

export interface CompleteAssessmentData {
  responses: Record<string, unknown>;
  score: number;
  notes?: string;
}

export const patientsApi = {
  list: (params?: { page?: number; limit?: number; search?: string; enrollmentStatus?: string }) => {
    const query = new URLSearchParams();
    if (params?.page) query.set('page', params.page.toString());
    if (params?.limit) query.set('limit', params.limit.toString());
    if (params?.search) query.set('search', params.search);
    if (params?.enrollmentStatus) query.set('enrollmentStatus', params.enrollmentStatus);
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

  // Conditions API
  addCondition: (patientId: string, condition: string) =>
    api.post<Patient>(`/api/patients/${patientId}/conditions`, { condition }),

  removeCondition: (patientId: string, condition: string) =>
    api.delete<Patient>(`/api/patients/${patientId}/conditions/${encodeURIComponent(condition)}`),

  // Devices API
  getDevices: (patientId: string) =>
    api.get<Device[]>(`/api/patients/${patientId}/devices`),

  assignDevice: (patientId: string, data: AssignDeviceData) =>
    api.post<Device>(`/api/patients/${patientId}/devices`, data),

  removeDevice: (patientId: string, deviceId: string) =>
    api.delete<void>(`/api/patients/${patientId}/devices/${deviceId}`),

  // Care Team API
  updateCareTeam: (patientId: string, data: UpdateCareTeamData) =>
    api.post<Patient>(`/api/patients/${patientId}/care-team`, data),

  // Staff Search API
  searchStaff: (query: string) =>
    api.get<StaffMember[]>(`/api/staff/search?q=${encodeURIComponent(query)}`),

  // Care Plans API
  getCarePlans: (patientId: string) =>
    api.get<CarePlan[]>(`/api/patients/${patientId}/care-plans`),

  createCarePlan: (patientId: string, data: {
    goals?: { description: string; targetDate?: string; status?: string }[];
    vitalThresholds?: Record<string, { min?: number; max?: number; critical?: number }>;
    medications?: { name: string; dosage: string; frequency: string }[];
    instructions?: string;
    activateImmediately?: boolean;
  }) => api.post<CarePlan>(`/api/patients/${patientId}/care-plans`, data),

  // Alerts API
  getAlerts: (patientId: string, status?: string) =>
    api.get<Alert[]>(`/api/patients/${patientId}/alerts${status ? `?status=${status}` : ''}`),

  acknowledgeAlert: (patientId: string, alertId: string) =>
    api.post<Alert>(`/api/patients/${patientId}/alerts/${alertId}/acknowledge`),

  resolveAlert: (patientId: string, alertId: string, resolution: string) =>
    api.post<Alert>(`/api/patients/${patientId}/alerts/${alertId}/resolve`, { resolution }),

  // Vitals API
  getVitals: (patientId: string, params?: { type?: string; page?: number; limit?: number; startDate?: string; endDate?: string }) => {
    const query = new URLSearchParams();
    if (params?.type) query.set('type', params.type);
    if (params?.page) query.set('page', params.page.toString());
    if (params?.limit) query.set('limit', params.limit.toString());
    if (params?.startDate) query.set('startDate', params.startDate);
    if (params?.endDate) query.set('endDate', params.endDate);
    const queryStr = query.toString();
    return api.get<PatientVitalsResponse>(`/api/patients/${patientId}/vitals${queryStr ? `?${queryStr}` : ''}`);
  },

  // Metrics API - Monthly billing metrics
  getMetrics: (patientId: string) =>
    api.get<PatientMetrics>(`/api/patients/${patientId}/metrics`),

  // Assessments API
  getAssessments: (patientId: string, status?: AssessmentStatus) =>
    api.get<Assessment[]>(`/api/patients/${patientId}/assessments${status ? `?status=${status}` : ''}`),

  createAssessment: (patientId: string, data: CreateAssessmentData) =>
    api.post<Assessment>(`/api/patients/${patientId}/assessments`, data),

  completeAssessment: (patientId: string, assessmentId: string, data: CompleteAssessmentData) =>
    api.post<Assessment>(`/api/patients/${patientId}/assessments/${assessmentId}/complete`, data),

  // Billing API - RPM billing records
  getBillingRecords: (patientId: string) =>
    api.get<{ success: boolean; data: BillingPeriod[] }>(`/api/patients/${patientId}/billing`),

  getCurrentBillingPeriod: (patientId: string) =>
    api.get<{ success: boolean; data: BillingPeriod | null }>(`/api/patients/${patientId}/billing/current`),
};

// Billing types
export interface BillingPeriod {
  id: string;
  patientId: string;
  periodStart: string;
  periodEnd: string;
  dataTransmissionDays: number;
  interactionMinutes: number;
  status: 'pending' | 'eligible' | 'submitted' | 'paid' | 'denied';
  eligibleCodes: string[];
  claimId: string | null;
  amount: number | null;
}
