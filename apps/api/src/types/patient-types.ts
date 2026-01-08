/**
 * Patient Registration & Enrollment Types
 * TypeScript interfaces for RPM-004
 */

import { EnrollmentStatus } from '@prisma/client';

// Address interface
export interface PatientAddress {
  street: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
}

// Insurance information
export interface InsuranceInfo {
  providerId: string;
  planName: string;
  memberId: string;
  groupNumber?: string;
}

// Create patient request - supports enrollment wizard flow
export interface CreatePatientRequest {
  email: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string; // YYYY-MM-DD format
  gender?: string;
  phone: string;
  // Flat address fields
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  emergencyContact?: string;
  emergencyPhone?: string;
  // Medical
  conditions?: string[];
  additionalNotes?: string;
  // Insurance - optional for enrollment
  isSelfPay?: boolean;
  insuranceProvider?: string;
  policyNumber?: string;
  groupNumber?: string;
  subscriberName?: string;
  subscriberRelationship?: string;
  // Care team - optional for initial enrollment
  primaryPhysicianId?: string;
  careCoordinatorId?: string;
  additionalProviderIds?: string[];
  assignedClinicalStaffId?: string;
  // Consent
  consentObtained?: boolean;
  consentSignature?: string;
  consentWitnessName?: string;
  hipaaAcknowledged?: boolean;
}

// Update patient request
export interface UpdatePatientRequest {
  firstName?: string;
  lastName?: string;
  phone?: string;
  address?: PatientAddress;
  conditions?: string[];
  insurance?: InsuranceInfo;
  primaryPhysicianId?: string;
  assignedClinicalStaffId?: string;
}

// Update enrollment status request
export interface UpdateEnrollmentStatusRequest {
  status: EnrollmentStatus;
  notes?: string;
}

// Patient search/filter options
export interface PatientFilterOptions {
  page?: number;
  limit?: number;
  search?: string;
  enrollmentStatus?: EnrollmentStatus;
  conditions?: string[];
  primaryPhysicianId?: string;
  assignedClinicalStaffId?: string;
}

// Patient response (safe to return to API)
export interface PatientResponse {
  id: string;
  userId: string;
  email: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  phone: string | null;
  address: PatientAddress | null;
  conditions: string[];
  insurance: {
    providerId: string | null;
    planName: string | null;
    memberId: string | null;
    groupNumber: string | null;
  };
  enrollmentStatus: EnrollmentStatus;
  enrollmentDate: string | null;
  consentDate: string | null;
  primaryPhysician: {
    id: string;
    name: string;
  } | null;
  assignedClinicalStaff: {
    id: string;
    name: string;
  } | null;
  createdAt: string;
  updatedAt: string;
}

// Eligibility validation result
export interface EligibilityValidationResult {
  eligible: boolean;
  reasons: string[];
  warnings: string[];
}

// Patient search result (lightweight for search/autocomplete)
export interface SearchPatientResult {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  dateOfBirth: string;
}

// Enrollment draft types
export interface EnrollmentDraftData {
  step: number;
  data: Partial<CreatePatientRequest>;
}

export interface EnrollmentDraftResponse {
  id: string;
  step: number;
  data: Partial<CreatePatientRequest>;
  createdAt: string;
  updatedAt: string;
}

// Device types
export type DeviceType =
  | 'BLOOD_PRESSURE_MONITOR'
  | 'WEIGHT_SCALE'
  | 'PULSE_OXIMETER'
  | 'GLUCOSE_MONITOR'
  | 'CONTINUOUS_GLUCOSE_MONITOR'
  | 'THERMOMETER'
  | 'ACTIVITY_TRACKER'
  | 'ECG_MONITOR'
  | 'OTHER';

export interface AssignDeviceRequest {
  type: DeviceType;
  serialNumber: string;
  manufacturer?: string;
  model?: string;
}

export interface DeviceResponse {
  id: string;
  patientId: string;
  type: DeviceType;
  serialNumber: string;
  manufacturer: string | null;
  model: string | null;
  status: string;
  lastSyncAt: string | null;
  assignedAt: string;
  createdAt: string;
  updatedAt: string;
}
