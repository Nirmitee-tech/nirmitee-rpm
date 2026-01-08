/**
 * Patient Validation Schemas
 * Zod schemas for RPM-004 patient registration & enrollment
 */

import { z } from 'zod';
import { EnrollmentStatus } from '@prisma/client';

// Address schema
export const addressSchema = z.object({
  street: z.string().min(1, 'Street address is required'),
  city: z.string().min(1, 'City is required'),
  state: z.string().min(2, 'State is required').max(2, 'State must be 2 characters'),
  zipCode: z.string().regex(/^\d{5}(-\d{4})?$/, 'Invalid ZIP code format'),
  country: z.string().min(2, 'Country is required').default('US'),
});

// Insurance schema
export const insuranceSchema = z.object({
  providerId: z.string().min(1, 'Insurance provider ID is required'),
  planName: z.string().min(1, 'Insurance plan name is required'),
  memberId: z.string().min(1, 'Insurance member ID is required'),
  groupNumber: z.string().optional(),
});

// Phone number validation (basic US format)
const phoneRegex = /^[\d\s()+-]+$/;

// Create patient schema - relaxed for enrollment wizard
export const createPatientSchema = z.object({
  email: z.string().email('Invalid email address'),
  firstName: z.string().min(1, 'First name is required').max(100, 'First name too long'),
  lastName: z.string().min(1, 'Last name is required').max(100, 'Last name too long'),
  dateOfBirth: z.string().refine(
    (val) => !isNaN(Date.parse(val)),
    'Invalid date format'
  ),
  gender: z.string().optional(),
  phone: z.string().regex(phoneRegex, 'Invalid phone number format'),
  address: z.string().optional(), // Simple address string for now
  city: z.string().optional(),
  state: z.string().optional(),
  zipCode: z.string().optional(),
  emergencyContact: z.string().optional(),
  emergencyPhone: z.string().optional(),
  conditions: z.array(z.string()).optional().default([]),
  additionalNotes: z.string().optional(),
  // Insurance - all optional for enrollment
  isSelfPay: z.boolean().optional().default(false),
  insuranceProvider: z.string().optional(),
  policyNumber: z.string().optional(),
  groupNumber: z.string().optional(),
  subscriberName: z.string().optional(),
  subscriberRelationship: z.string().optional(),
  // Care team - optional for initial enrollment
  primaryPhysicianId: z.string().optional(),
  careCoordinatorId: z.string().optional(),
  additionalProviderIds: z.array(z.string()).optional().default([]),
  assignedClinicalStaffId: z.string().optional(),
  // Consent
  consentObtained: z.boolean().optional().default(false),
  consentSignature: z.string().optional(),
  consentWitnessName: z.string().optional(),
  hipaaAcknowledged: z.boolean().optional().default(false),
}).refine(
  (data) => {
    // Validate date of birth is not in the future
    const dob = new Date(data.dateOfBirth);
    return dob < new Date();
  },
  {
    message: 'Date of birth cannot be in the future',
    path: ['dateOfBirth'],
  }
).refine(
  (data) => {
    // Validate patient age is reasonable
    const dob = new Date(data.dateOfBirth);
    const age = Math.floor((Date.now() - dob.getTime()) / (365.25 * 24 * 60 * 60 * 1000));
    return age >= 0 && age <= 150;
  },
  {
    message: 'Invalid date of birth',
    path: ['dateOfBirth'],
  }
);

// Update patient schema
export const updatePatientSchema = z.object({
  firstName: z.string().min(1).max(100).optional(),
  lastName: z.string().min(1).max(100).optional(),
  phone: z.string().regex(phoneRegex, 'Invalid phone number format').optional(),
  address: addressSchema.optional(),
  conditions: z.array(z.string())
    .max(10, 'Maximum 10 conditions allowed')
    .optional(),
  insurance: insuranceSchema.optional(),
  primaryPhysicianId: z.string().cuid('Invalid physician ID format').optional(),
  assignedClinicalStaffId: z.string().cuid('Invalid staff ID format').optional(),
});

// Update enrollment status schema
export const updateEnrollmentStatusSchema = z.object({
  status: z.nativeEnum(EnrollmentStatus, {
    errorMap: () => ({ message: 'Invalid enrollment status' }),
  }),
  notes: z.string().max(1000, 'Notes too long').optional(),
});

// Patient search/filter schema
export const patientFilterSchema = z.object({
  page: z.number().int().positive().optional(),
  limit: z.number().int().positive().max(100).optional(),
  search: z.string().optional(),
  enrollmentStatus: z.nativeEnum(EnrollmentStatus).optional(),
  conditions: z.array(z.string()).optional(),
  primaryPhysicianId: z.string().cuid().optional(),
  assignedClinicalStaffId: z.string().cuid().optional(),
});

// Patient ID param validation
export const patientIdSchema = z.string().cuid('Invalid patient ID format');

// Patient search query schema
export const patientSearchSchema = z.object({
  q: z.string().min(1, 'Search query is required').max(100, 'Search query too long'),
});

// Enrollment draft schemas
export const saveDraftSchema = z.object({
  step: z.number().int().min(1).max(10, 'Invalid step number'),
  data: z.record(z.unknown()), // Flexible JSON object for partial data
});

export const draftIdSchema = z.string().cuid('Invalid draft ID format');

// Add condition schema
export const addConditionSchema = z.object({
  condition: z.string().min(1, 'Condition is required').max(100, 'Condition too long'),
  icdCode: z.string().optional(),
});

// Condition name param validation
export const conditionNameSchema = z.string().min(1, 'Condition name is required');

// Device validators
export const deviceIdSchema = z.string().cuid('Invalid device ID format');

export const assignDeviceSchema = z.object({
  type: z.enum([
    'BLOOD_PRESSURE_MONITOR',
    'WEIGHT_SCALE',
    'PULSE_OXIMETER',
    'GLUCOSE_MONITOR',
    'CONTINUOUS_GLUCOSE_MONITOR',
    'THERMOMETER',
    'ACTIVITY_TRACKER',
    'ECG_MONITOR',
    'OTHER',
  ], {
    errorMap: () => ({ message: 'Invalid device type' }),
  }),
  serialNumber: z.string().min(1, 'Serial number is required').max(100, 'Serial number too long'),
  manufacturer: z.string().max(100, 'Manufacturer name too long').optional(),
  model: z.string().max(100, 'Model name too long').optional(),
});
