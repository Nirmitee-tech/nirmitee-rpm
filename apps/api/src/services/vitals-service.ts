import { prisma } from '../utils/prisma';
import { VitalType, DataSource, Prisma } from '@prisma/client';
import { auditService } from './audit-service';

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
 */
function calculateVitalStatus(
  type: VitalType,
  values: Record<string, number>
): 'normal' | 'warning' | 'critical' {
  // Blood Pressure thresholds
  if (type === 'BLOOD_PRESSURE') {
    const systolic = values.systolic || 0;
    const diastolic = values.diastolic || 0;

    if (systolic >= 180 || diastolic >= 120) return 'critical';
    if (systolic < 90 || diastolic < 60) return 'critical';
    if (systolic >= 140 || diastolic >= 90) return 'warning';

    return 'normal';
  }

  // Blood Glucose thresholds
  if (type === 'BLOOD_GLUCOSE') {
    const glucose = values.glucose || 0;

    if (glucose < 54 || glucose > 250) return 'critical';
    if (glucose < 70 || glucose > 140) return 'warning';

    return 'normal';
  }

  // Pulse Oximetry (SpO2) thresholds
  if (type === 'PULSE_OXIMETRY') {
    const oxygen = values.oxygen || 0;

    if (oxygen < 88) return 'critical';
    if (oxygen < 92) return 'warning';

    return 'normal';
  }

  // Heart Rate thresholds
  if (type === 'HEART_RATE') {
    const heartRate = values.heartRate || 0;

    if (heartRate < 40 || heartRate > 150) return 'critical';
    if (heartRate < 60 || heartRate > 100) return 'warning';

    return 'normal';
  }

  // Weight - no automatic thresholds, always normal unless manually flagged
  if (type === 'WEIGHT') {
    return 'normal';
  }

  // Temperature thresholds
  if (type === 'TEMPERATURE') {
    const temp = values.temperature || 0;

    if (temp < 95 || temp > 103) return 'critical';
    if (temp < 97 || temp > 100.4) return 'warning';

    return 'normal';
  }

  return 'normal';
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

  // Calculate status based on values
  const status = calculateVitalStatus(data.type, data.values);

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

  // If critical, create an alert
  if (status === 'critical') {
    await prisma.alert.create({
      data: {
        patientId: patient.id,
        organizationId,
        vitalReadingId: reading.id,
        type: 'CRITICAL_VALUE',
        severity: 'CRITICAL',
        message: `Critical ${data.type} reading detected: ${JSON.stringify(data.values)}`,
        metadata: {
          vitalType: data.type,
          values: data.values,
        } as Prisma.InputJsonValue,
      },
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
  // Get patient record
  const patient = await prisma.patient.findUnique({
    where: {
      userId,
      organizationId,
    },
  });

  if (!patient) {
    throw new Error('Patient record not found for this user');
  }

  const page = filters.page || 1;
  const limit = filters.limit || 10;
  const skip = (page - 1) * limit;

  // Build where clause
  const where: Prisma.VitalReadingWhereInput = {
    patientId: patient.id,
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
