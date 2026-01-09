import { prisma } from '../utils/prisma';
import { VitalType, DataSource, Prisma } from '@prisma/client';
import { auditService } from './audit-service';
import { thresholdService, VitalStatus } from './threshold-service';
import { realtimeVitalsService } from './realtime-vitals-service';
import { alertNotificationService } from './alert-notification-service';
import { escalationService } from './escalation-service';
import { rpmBillingService } from './rpm-billing-service';

interface CreateVitalReadingData {
  type: VitalType;
  values: Record<string, number>;
  unit: string;
  recordedAt: string;
  symptoms?: string[];
  mealContext?: string;
  notes?: string;
  patientId?: string; // Optional: for clinicians recording on behalf of patient
}

interface GetReadingsFilters {
  type?: VitalType;
  patientId?: string; // For clinicians viewing specific patient's readings
  page?: number;
  limit?: number;
  startDate?: string;
  endDate?: string;
}

interface VitalReading {
  id: string;
  type: VitalType;
  values: Record<string, number>;
  unit: string;
  recordedAt: Date;
  symptoms?: string[];
  mealContext?: string;
  status: 'normal' | 'warning' | 'critical';
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Calculate vital status based on values and thresholds
 * @deprecated Use thresholdService.evaluateReading() for configurable thresholds
 */
function calculateVitalStatus(
  type: VitalType,
  values: Record<string, number>
): 'normal' | 'warning' | 'critical' {
  // Use system defaults for backward compatibility
  const defaults = thresholdService.getSystemDefaults(type);
  return thresholdService.evaluateWithThresholds(type, values, defaults);
}

/**
 * Create a new vital reading
 */
async function createReading(
  userId: string,
  organizationId: string,
  data: CreateVitalReadingData
): Promise<VitalReading> {
  let patient;

  // If patientId is provided, use it directly (clinician recording for patient)
  if (data.patientId) {
    patient = await prisma.patient.findFirst({
      where: {
        id: data.patientId,
        organizationId,
        deletedAt: null,
      },
    });

    if (!patient) {
      throw new Error('Patient not found');
    }
  } else {
    // Otherwise, get patient record for the logged-in user (self-recording)
    patient = await prisma.patient.findFirst({
      where: {
        userId,
        organizationId,
        deletedAt: null,
      },
    });

    if (!patient) {
      throw new Error('Patient record not found for this user');
    }
  }

  // Calculate status using configurable thresholds
  const status = await thresholdService.evaluateReading(
    patient.id,
    organizationId,
    data.type,
    data.values
  );

  // Create the vital reading
  const reading = await prisma.vitalReading.create({
    data: {
      patientId: patient.id,
      organizationId,
      type: data.type,
      values: data.values as Prisma.InputJsonValue,
      unit: data.unit,
      source: DataSource.MANUAL,
      recordedAt: new Date(data.recordedAt),
      notes: data.notes,
    },
  });

  // Get patient details for notifications
  const patientUser = await prisma.user.findUnique({
    where: { id: patient.userId },
    select: { firstName: true, lastName: true },
  });
  const patientName = patientUser
    ? `${patientUser.firstName} ${patientUser.lastName}`
    : 'Unknown Patient';

  // Emit real-time event
  realtimeVitalsService.emitNewReading(organizationId, {
    id: reading.id,
    patientId: patient.id,
    patientName,
    type: reading.type,
    values: data.values,
    unit: reading.unit,
    status,
    recordedAt: reading.recordedAt,
    source: 'MANUAL',
  });

  // Create audit log
  await auditService.log({
    userId,
    organizationId,
    action: 'patient.created', // Using existing audit action type
    entity: 'patient',
    entityId: reading.id,
    metadata: {
      vitalType: reading.type,
      vitalReadingId: reading.id,
    },
    newValues: {
      type: reading.type,
      values: reading.values,
      status,
      recordedAt: reading.recordedAt,
    },
  });

  // Update billing - increment data transmission day for CPT 99454 eligibility
  // This tracks days with vital data to determine if patient qualifies for billing code (16+ days/month)
  try {
    await rpmBillingService.incrementDataTransmissionDay(
      patient.id,
      organizationId,
      new Date(data.recordedAt)
    );
  } catch (billingError) {
    // Log but don't fail vital recording if billing update fails
    console.error('Failed to update billing data transmission day:', billingError);
  }

  // If critical or warning, create an alert with escalation
  if (status === 'critical' || status === 'warning') {
    const severity = status === 'critical' ? 'CRITICAL' : 'SIGNIFICANT';
    const alertType = status === 'critical' ? 'CRITICAL_VALUE' : 'THRESHOLD_EXCEEDED';

    // Create alert with auto-assignment via escalation service
    const { alert, assignedUser } = await escalationService.createAlertWithAssignment({
      patientId: patient.id,
      organizationId,
      vitalReadingId: reading.id,
      type: alertType,
      severity,
      message: `${status === 'critical' ? 'Critical' : 'Warning'} ${data.type} reading: ${JSON.stringify(data.values)}`,
      metadata: {
        vitalType: data.type,
        values: data.values,
      },
    });

    // Send notifications to assigned user and care team
    const recipientIds: string[] = [];
    if (assignedUser) recipientIds.push(assignedUser.id);
    if (patient.primaryPhysicianId && patient.primaryPhysicianId !== assignedUser?.id) {
      recipientIds.push(patient.primaryPhysicianId);
    }
    if (patient.assignedClinicalStaffId && patient.assignedClinicalStaffId !== assignedUser?.id) {
      recipientIds.push(patient.assignedClinicalStaffId);
    }

    if (recipientIds.length > 0) {
      await alertNotificationService.sendAlertNotifications(
        {
          alertId: alert.id,
          patientId: patient.id,
          patientName,
          organizationId,
          severity,
          message: `${status === 'critical' ? 'Critical' : 'Warning'} ${data.type} reading detected`,
          vitalType: data.type,
          values: data.values,
        },
        recipientIds
      );
    }

    // Emit real-time alert
    realtimeVitalsService.emitNewAlert(organizationId, {
      id: alert.id,
      patientId: patient.id,
      patientName,
      severity,
      type: alertType,
      message: `${status === 'critical' ? 'Critical' : 'Warning'} ${data.type} reading`,
      status: 'NEW',
      assignedToId: assignedUser?.id,
      assignedToName: assignedUser ? `${assignedUser.firstName} ${assignedUser.lastName}` : undefined,
      createdAt: new Date(),
      vitalType: data.type,
      values: data.values,
    });
  }

  return {
    id: reading.id,
    type: reading.type,
    values: reading.values as Record<string, number>,
    unit: reading.unit,
    recordedAt: reading.recordedAt,
    symptoms: data.symptoms,
    mealContext: data.mealContext,
    status,
    notes: reading.notes || undefined,
    createdAt: reading.createdAt,
    updatedAt: reading.createdAt,
  };
}

/**
 * Get list of vital readings with filters and pagination
 */
async function getReadings(
  userId: string,
  organizationId: string,
  filters: GetReadingsFilters
): Promise<{
  readings: VitalReading[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}> {
  let patientId: string;

  // If patientId is provided, use it (clinician viewing patient readings)
  if (filters.patientId) {
    // Verify the patient exists in this organization
    const patient = await prisma.patient.findFirst({
      where: {
        id: filters.patientId,
        organizationId,
        deletedAt: null,
      },
    });

    if (!patient) {
      throw new Error('Patient not found');
    }
    patientId = patient.id;
  } else {
    // Otherwise get readings for the logged-in user's patient record
    const patient = await prisma.patient.findFirst({
      where: {
        userId,
        organizationId,
        deletedAt: null,
      },
    });

    if (!patient) {
      throw new Error('Patient record not found for this user');
    }
    patientId = patient.id;
  }

  const page = filters.page || 1;
  const limit = filters.limit || 10;
  const skip = (page - 1) * limit;

  // Build where clause
  const where: Prisma.VitalReadingWhereInput = {
    patientId,
    organizationId,
  };

  if (filters.type) {
    where.type = filters.type;
  }

  if (filters.startDate || filters.endDate) {
    where.recordedAt = {};
    if (filters.startDate) {
      where.recordedAt.gte = new Date(filters.startDate);
    }
    if (filters.endDate) {
      where.recordedAt.lte = new Date(filters.endDate);
    }
  }

  // Get total count
  const total = await prisma.vitalReading.count({ where });

  // Get readings
  const readings = await prisma.vitalReading.findMany({
    where,
    orderBy: {
      recordedAt: 'desc',
    },
    skip,
    take: limit,
  });

  return {
    readings: readings.map((reading: any) => ({
      id: reading.id,
      type: reading.type,
      values: reading.values as Record<string, number>,
      unit: reading.unit,
      recordedAt: reading.recordedAt,
      status: calculateVitalStatus(reading.type, reading.values as Record<string, number>),
      notes: reading.notes || undefined,
      createdAt: reading.createdAt,
      updatedAt: reading.createdAt,
    })),
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

/**
 * Get a single vital reading by ID
 */
async function getReadingById(
  id: string,
  userId: string,
  organizationId: string
): Promise<VitalReading | null> {
  // Get patient record
  const patient = await prisma.patient.findUnique({
    where: {
      userId,
      organizationId,
    },
  });

  if (!patient) {
    return null;
  }

  const reading = await prisma.vitalReading.findFirst({
    where: {
      id,
      patientId: patient.id,
      organizationId,
    },
  });

  if (!reading) {
    return null;
  }

  return {
    id: reading.id,
    type: reading.type,
    values: reading.values as Record<string, number>,
    unit: reading.unit,
    recordedAt: reading.recordedAt,
    status: calculateVitalStatus(reading.type, reading.values as Record<string, number>),
    notes: reading.notes || undefined,
    createdAt: reading.createdAt,
    updatedAt: reading.createdAt,
  };
}

/**
 * Update a vital reading
 */
async function updateReading(
  id: string,
  userId: string,
  organizationId: string,
  data: Partial<CreateVitalReadingData>
): Promise<VitalReading | null> {
  // Get patient record
  const patient = await prisma.patient.findUnique({
    where: {
      userId,
      organizationId,
    },
  });

  if (!patient) {
    return null;
  }

  // Check if reading exists
  const existing = await prisma.vitalReading.findFirst({
    where: {
      id,
      patientId: patient.id,
      organizationId,
    },
  });

  if (!existing) {
    return null;
  }

  // Update reading
  const updated = await prisma.vitalReading.update({
    where: { id },
    data: {
      ...(data.type && { type: data.type }),
      ...(data.values && { values: data.values as Prisma.InputJsonValue }),
      ...(data.unit && { unit: data.unit }),
      ...(data.recordedAt && { recordedAt: new Date(data.recordedAt) }),
      ...(data.notes !== undefined && { notes: data.notes }),
    },
  });

  // Create audit log
  await auditService.log({
    userId,
    organizationId,
    action: 'patient.updated',
    entity: 'patient',
    entityId: id,
    metadata: {
      vitalReadingId: id,
      vitalType: updated.type,
    },
    oldValues: {
      type: existing.type,
      values: existing.values,
      recordedAt: existing.recordedAt,
    },
    newValues: {
      type: updated.type,
      values: updated.values,
      recordedAt: updated.recordedAt,
    },
  });

  return {
    id: updated.id,
    type: updated.type,
    values: updated.values as Record<string, number>,
    unit: updated.unit,
    recordedAt: updated.recordedAt,
    status: calculateVitalStatus(updated.type, updated.values as Record<string, number>),
    notes: updated.notes || undefined,
    createdAt: updated.createdAt,
    updatedAt: updated.createdAt,
  };
}

/**
 * Delete a vital reading
 */
async function deleteReading(
  id: string,
  userId: string,
  organizationId: string
): Promise<void> {
  // Get patient record
  const patient = await prisma.patient.findUnique({
    where: {
      userId,
      organizationId,
    },
  });

  if (!patient) {
    throw new Error('Patient record not found');
  }

  // Check if reading exists
  const existing = await prisma.vitalReading.findFirst({
    where: {
      id,
      patientId: patient.id,
      organizationId,
    },
  });

  if (!existing) {
    throw new Error('Reading not found');
  }

  // Delete reading
  await prisma.vitalReading.delete({
    where: { id },
  });

  // Create audit log
  await auditService.log({
    userId,
    organizationId,
    action: 'patient.deleted',
    entity: 'patient',
    entityId: id,
    metadata: {
      vitalReadingId: id,
      vitalType: existing.type,
    },
    oldValues: {
      type: existing.type,
      values: existing.values,
      recordedAt: existing.recordedAt,
    },
  });
}

export const vitalsService = {
  createReading,
  getReadings,
  getReadingById,
  updateReading,
  deleteReading,
};
