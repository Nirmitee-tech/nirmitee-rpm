import { prisma } from '../utils/prisma';
import {
  MedicationStatus,
  AllergyType,
  AllergySeverity,
  AllergyStatus,
  ImmunizationStatus,
  LabResultStatus,
  LabInterpretation,
  MedicalHistoryStatus,
  Prisma,
} from '@prisma/client';
import { auditService } from './audit-service';

// ============================================
// MEDICATIONS
// ============================================

interface CreateMedicationData {
  name: string;
  genericName?: string;
  dosage: string;
  frequency: string;
  route?: string;
  prescribedBy?: string;
  prescribedDate?: string;
  startDate?: string;
  endDate?: string;
  status?: MedicationStatus;
  refillsRemaining?: number;
  pharmacy?: string;
  instructions?: string;
  sideEffects?: string;
  notes?: string;
}

interface UpdateMedicationData extends Partial<CreateMedicationData> {}

interface MedicationFilters {
  status?: MedicationStatus;
  page?: number;
  limit?: number;
}

async function getMedications(
  patientId: string,
  organizationId: string,
  filters: MedicationFilters = {}
) {
  const { status, page = 1, limit = 50 } = filters;
  const skip = (page - 1) * limit;

  const where: Prisma.PatientMedicationWhereInput = {
    patientId,
    organizationId,
    ...(status && { status }),
  };

  const [medications, total] = await Promise.all([
    prisma.patientMedication.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    }),
    prisma.patientMedication.count({ where }),
  ]);

  return {
    medications,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    },
  };
}

async function createMedication(
  patientId: string,
  organizationId: string,
  data: CreateMedicationData,
  createdBy: string
) {
  const medication = await prisma.patientMedication.create({
    data: {
      patientId,
      organizationId,
      name: data.name,
      genericName: data.genericName,
      dosage: data.dosage,
      frequency: data.frequency,
      route: data.route,
      prescribedBy: data.prescribedBy,
      prescribedDate: data.prescribedDate ? new Date(data.prescribedDate) : null,
      startDate: data.startDate ? new Date(data.startDate) : null,
      endDate: data.endDate ? new Date(data.endDate) : null,
      status: data.status || 'ACTIVE',
      refillsRemaining: data.refillsRemaining,
      pharmacy: data.pharmacy,
      instructions: data.instructions,
      sideEffects: data.sideEffects,
      notes: data.notes,
    },
  });

  await auditService.log({
    userId: createdBy,
    organizationId,
    action: 'medication.created',
    entity: 'medication',
    entityId: medication.id,
    metadata: { patientId, medicationName: data.name },
  });

  return medication;
}

async function updateMedication(
  id: string,
  organizationId: string,
  data: UpdateMedicationData,
  updatedBy: string
) {
  const existing = await prisma.patientMedication.findFirst({
    where: { id, organizationId },
  });

  if (!existing) {
    throw new Error('Medication not found');
  }

  const medication = await prisma.patientMedication.update({
    where: { id },
    data: {
      ...data,
      prescribedDate: data.prescribedDate ? new Date(data.prescribedDate) : undefined,
      startDate: data.startDate ? new Date(data.startDate) : undefined,
      endDate: data.endDate ? new Date(data.endDate) : undefined,
    },
  });

  await auditService.log({
    userId: updatedBy,
    organizationId,
    action: 'medication.updated',
    entity: 'medication',
    entityId: id,
    newValues: data as Record<string, unknown>,
  });

  return medication;
}

async function deleteMedication(id: string, organizationId: string, deletedBy: string) {
  const existing = await prisma.patientMedication.findFirst({
    where: { id, organizationId },
  });

  if (!existing) {
    throw new Error('Medication not found');
  }

  await prisma.patientMedication.delete({ where: { id } });

  await auditService.log({
    userId: deletedBy,
    organizationId,
    action: 'medication.deleted',
    entity: 'medication',
    entityId: id,
    metadata: { medicationName: existing.name },
  });
}

// ============================================
// ALLERGIES
// ============================================

interface CreateAllergyData {
  allergen: string;
  type?: AllergyType;
  severity?: AllergySeverity;
  reaction?: string;
  onsetDate?: string;
  reportedBy?: string;
  verifiedBy?: string;
  verifiedDate?: string;
  status?: AllergyStatus;
  notes?: string;
}

interface UpdateAllergyData extends Partial<CreateAllergyData> {}

interface AllergyFilters {
  type?: AllergyType;
  status?: AllergyStatus;
  page?: number;
  limit?: number;
}

async function getAllergies(
  patientId: string,
  organizationId: string,
  filters: AllergyFilters = {}
) {
  const { type, status, page = 1, limit = 50 } = filters;
  const skip = (page - 1) * limit;

  const where: Prisma.PatientAllergyWhereInput = {
    patientId,
    organizationId,
    ...(type && { type }),
    ...(status && { status }),
  };

  const [allergies, total] = await Promise.all([
    prisma.patientAllergy.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    }),
    prisma.patientAllergy.count({ where }),
  ]);

  return {
    allergies,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    },
  };
}

async function createAllergy(
  patientId: string,
  organizationId: string,
  data: CreateAllergyData,
  createdBy: string
) {
  const allergy = await prisma.patientAllergy.create({
    data: {
      patientId,
      organizationId,
      allergen: data.allergen,
      type: data.type || 'DRUG',
      severity: data.severity || 'MODERATE',
      reaction: data.reaction,
      onsetDate: data.onsetDate ? new Date(data.onsetDate) : null,
      reportedBy: data.reportedBy,
      verifiedBy: data.verifiedBy,
      verifiedDate: data.verifiedDate ? new Date(data.verifiedDate) : null,
      status: data.status || 'ACTIVE',
      notes: data.notes,
    },
  });

  await auditService.log({
    userId: createdBy,
    organizationId,
    action: 'allergy.created',
    entity: 'allergy',
    entityId: allergy.id,
    metadata: { patientId, allergen: data.allergen },
  });

  return allergy;
}

async function updateAllergy(
  id: string,
  organizationId: string,
  data: UpdateAllergyData,
  updatedBy: string
) {
  const existing = await prisma.patientAllergy.findFirst({
    where: { id, organizationId },
  });

  if (!existing) {
    throw new Error('Allergy not found');
  }

  const allergy = await prisma.patientAllergy.update({
    where: { id },
    data: {
      ...data,
      onsetDate: data.onsetDate ? new Date(data.onsetDate) : undefined,
      verifiedDate: data.verifiedDate ? new Date(data.verifiedDate) : undefined,
    },
  });

  await auditService.log({
    userId: updatedBy,
    organizationId,
    action: 'allergy.updated',
    entity: 'allergy',
    entityId: id,
    newValues: data as Record<string, unknown>,
  });

  return allergy;
}

async function deleteAllergy(id: string, organizationId: string, deletedBy: string) {
  const existing = await prisma.patientAllergy.findFirst({
    where: { id, organizationId },
  });

  if (!existing) {
    throw new Error('Allergy not found');
  }

  await prisma.patientAllergy.delete({ where: { id } });

  await auditService.log({
    userId: deletedBy,
    organizationId,
    action: 'allergy.deleted',
    entity: 'allergy',
    entityId: id,
    metadata: { allergen: existing.allergen },
  });
}

// ============================================
// IMMUNIZATIONS
// ============================================

interface CreateImmunizationData {
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
  status?: ImmunizationStatus;
  reaction?: string;
  notes?: string;
}

interface UpdateImmunizationData extends Partial<CreateImmunizationData> {}

interface ImmunizationFilters {
  status?: ImmunizationStatus;
  page?: number;
  limit?: number;
}

async function getImmunizations(
  patientId: string,
  organizationId: string,
  filters: ImmunizationFilters = {}
) {
  const { status, page = 1, limit = 50 } = filters;
  const skip = (page - 1) * limit;

  const where: Prisma.ImmunizationWhereInput = {
    patientId,
    organizationId,
    ...(status && { status }),
  };

  const [immunizations, total] = await Promise.all([
    prisma.immunization.findMany({
      where,
      orderBy: { administeredDate: 'desc' },
      skip,
      take: limit,
    }),
    prisma.immunization.count({ where }),
  ]);

  return {
    immunizations,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    },
  };
}

async function createImmunization(
  patientId: string,
  organizationId: string,
  data: CreateImmunizationData,
  createdBy: string
) {
  const immunization = await prisma.immunization.create({
    data: {
      patientId,
      organizationId,
      vaccineName: data.vaccineName,
      vaccineCode: data.vaccineCode,
      manufacturer: data.manufacturer,
      lotNumber: data.lotNumber,
      administeredDate: new Date(data.administeredDate),
      expirationDate: data.expirationDate ? new Date(data.expirationDate) : null,
      site: data.site,
      route: data.route,
      dosage: data.dosage,
      doseNumber: data.doseNumber,
      series: data.series,
      administeredBy: data.administeredBy,
      location: data.location,
      status: data.status || 'COMPLETED',
      reaction: data.reaction,
      notes: data.notes,
    },
  });

  await auditService.log({
    userId: createdBy,
    organizationId,
    action: 'immunization.created',
    entity: 'immunization',
    entityId: immunization.id,
    metadata: { patientId, vaccine: data.vaccineName },
  });

  return immunization;
}

async function updateImmunization(
  id: string,
  organizationId: string,
  data: UpdateImmunizationData,
  updatedBy: string
) {
  const existing = await prisma.immunization.findFirst({
    where: { id, organizationId },
  });

  if (!existing) {
    throw new Error('Immunization not found');
  }

  const immunization = await prisma.immunization.update({
    where: { id },
    data: {
      ...data,
      administeredDate: data.administeredDate ? new Date(data.administeredDate) : undefined,
      expirationDate: data.expirationDate ? new Date(data.expirationDate) : undefined,
    },
  });

  await auditService.log({
    userId: updatedBy,
    organizationId,
    action: 'immunization.updated',
    entity: 'immunization',
    entityId: id,
    newValues: data as Record<string, unknown>,
  });

  return immunization;
}

async function deleteImmunization(id: string, organizationId: string, deletedBy: string) {
  const existing = await prisma.immunization.findFirst({
    where: { id, organizationId },
  });

  if (!existing) {
    throw new Error('Immunization not found');
  }

  await prisma.immunization.delete({ where: { id } });

  await auditService.log({
    userId: deletedBy,
    organizationId,
    action: 'immunization.deleted',
    entity: 'immunization',
    entityId: id,
    metadata: { vaccine: existing.vaccineName },
  });
}

// ============================================
// LAB RESULTS
// ============================================

interface CreateLabResultData {
  testName: string;
  testCode?: string;
  category?: string;
  value: string;
  unit?: string;
  referenceMin?: string;
  referenceMax?: string;
  referenceRange?: string;
  status?: LabResultStatus;
  interpretation?: LabInterpretation;
  collectedAt?: string;
  resultedAt: string;
  orderedBy?: string;
  performedBy?: string;
  specimenType?: string;
  notes?: string;
}

interface UpdateLabResultData extends Partial<CreateLabResultData> {}

interface LabResultFilters {
  category?: string;
  status?: LabResultStatus;
  interpretation?: LabInterpretation;
  page?: number;
  limit?: number;
}

async function getLabResults(
  patientId: string,
  organizationId: string,
  filters: LabResultFilters = {}
) {
  const { category, status, interpretation, page = 1, limit = 50 } = filters;
  const skip = (page - 1) * limit;

  const where: Prisma.LabResultWhereInput = {
    patientId,
    organizationId,
    ...(category && { category }),
    ...(status && { status }),
    ...(interpretation && { interpretation }),
  };

  const [labResults, total] = await Promise.all([
    prisma.labResult.findMany({
      where,
      orderBy: { resultedAt: 'desc' },
      skip,
      take: limit,
    }),
    prisma.labResult.count({ where }),
  ]);

  return {
    labResults,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    },
  };
}

async function createLabResult(
  patientId: string,
  organizationId: string,
  data: CreateLabResultData,
  createdBy: string
) {
  const labResult = await prisma.labResult.create({
    data: {
      patientId,
      organizationId,
      testName: data.testName,
      testCode: data.testCode,
      category: data.category,
      value: data.value,
      unit: data.unit,
      referenceMin: data.referenceMin,
      referenceMax: data.referenceMax,
      referenceRange: data.referenceRange,
      status: data.status || 'FINAL',
      interpretation: data.interpretation,
      collectedAt: data.collectedAt ? new Date(data.collectedAt) : null,
      resultedAt: new Date(data.resultedAt),
      orderedBy: data.orderedBy,
      performedBy: data.performedBy,
      specimenType: data.specimenType,
      notes: data.notes,
    },
  });

  await auditService.log({
    userId: createdBy,
    organizationId,
    action: 'lab_result.created',
    entity: 'lab_result',
    entityId: labResult.id,
    metadata: { patientId, testName: data.testName },
  });

  return labResult;
}

async function updateLabResult(
  id: string,
  organizationId: string,
  data: UpdateLabResultData,
  updatedBy: string
) {
  const existing = await prisma.labResult.findFirst({
    where: { id, organizationId },
  });

  if (!existing) {
    throw new Error('Lab result not found');
  }

  const labResult = await prisma.labResult.update({
    where: { id },
    data: {
      ...data,
      collectedAt: data.collectedAt ? new Date(data.collectedAt) : undefined,
      resultedAt: data.resultedAt ? new Date(data.resultedAt) : undefined,
    },
  });

  await auditService.log({
    userId: updatedBy,
    organizationId,
    action: 'lab_result.updated',
    entity: 'lab_result',
    entityId: id,
    newValues: data as Record<string, unknown>,
  });

  return labResult;
}

async function deleteLabResult(id: string, organizationId: string, deletedBy: string) {
  const existing = await prisma.labResult.findFirst({
    where: { id, organizationId },
  });

  if (!existing) {
    throw new Error('Lab result not found');
  }

  await prisma.labResult.delete({ where: { id } });

  await auditService.log({
    userId: deletedBy,
    organizationId,
    action: 'lab_result.deleted',
    entity: 'lab_result',
    entityId: id,
    metadata: { testName: existing.testName },
  });
}

// ============================================
// MEDICAL HISTORY
// ============================================

interface CreateMedicalHistoryData {
  condition: string;
  icdCode?: string;
  diagnosedDate?: string;
  resolvedDate?: string;
  status?: MedicalHistoryStatus;
  severity?: string;
  treatedBy?: string;
  notes?: string;
}

interface UpdateMedicalHistoryData extends Partial<CreateMedicalHistoryData> {}

interface MedicalHistoryFilters {
  status?: MedicalHistoryStatus;
  page?: number;
  limit?: number;
}

async function getMedicalHistory(
  patientId: string,
  organizationId: string,
  filters: MedicalHistoryFilters = {}
) {
  const { status, page = 1, limit = 50 } = filters;
  const skip = (page - 1) * limit;

  const where: Prisma.MedicalHistoryItemWhereInput = {
    patientId,
    organizationId,
    ...(status && { status }),
  };

  const [medicalHistory, total] = await Promise.all([
    prisma.medicalHistoryItem.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    }),
    prisma.medicalHistoryItem.count({ where }),
  ]);

  return {
    medicalHistory,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    },
  };
}

async function createMedicalHistoryItem(
  patientId: string,
  organizationId: string,
  data: CreateMedicalHistoryData,
  createdBy: string
) {
  const item = await prisma.medicalHistoryItem.create({
    data: {
      patientId,
      organizationId,
      condition: data.condition,
      icdCode: data.icdCode,
      diagnosedDate: data.diagnosedDate ? new Date(data.diagnosedDate) : null,
      resolvedDate: data.resolvedDate ? new Date(data.resolvedDate) : null,
      status: data.status || 'ACTIVE',
      severity: data.severity,
      treatedBy: data.treatedBy,
      notes: data.notes,
    },
  });

  await auditService.log({
    userId: createdBy,
    organizationId,
    action: 'medical_history.created',
    entity: 'medical_history',
    entityId: item.id,
    metadata: { patientId, condition: data.condition },
  });

  return item;
}

async function updateMedicalHistoryItem(
  id: string,
  organizationId: string,
  data: UpdateMedicalHistoryData,
  updatedBy: string
) {
  const existing = await prisma.medicalHistoryItem.findFirst({
    where: { id, organizationId },
  });

  if (!existing) {
    throw new Error('Medical history item not found');
  }

  const item = await prisma.medicalHistoryItem.update({
    where: { id },
    data: {
      ...data,
      diagnosedDate: data.diagnosedDate ? new Date(data.diagnosedDate) : undefined,
      resolvedDate: data.resolvedDate ? new Date(data.resolvedDate) : undefined,
    },
  });

  await auditService.log({
    userId: updatedBy,
    organizationId,
    action: 'medical_history.updated',
    entity: 'medical_history',
    entityId: id,
    newValues: data as Record<string, unknown>,
  });

  return item;
}

async function deleteMedicalHistoryItem(id: string, organizationId: string, deletedBy: string) {
  const existing = await prisma.medicalHistoryItem.findFirst({
    where: { id, organizationId },
  });

  if (!existing) {
    throw new Error('Medical history item not found');
  }

  await prisma.medicalHistoryItem.delete({ where: { id } });

  await auditService.log({
    userId: deletedBy,
    organizationId,
    action: 'medical_history.deleted',
    entity: 'medical_history',
    entityId: id,
    metadata: { condition: existing.condition },
  });
}

// ============================================
// AGGREGATE HEALTH RECORDS
// ============================================

async function getPatientHealthSummary(patientId: string, organizationId: string) {
  const [
    activeMedications,
    activeAllergies,
    recentImmunizations,
    recentLabResults,
    activeConditions,
  ] = await Promise.all([
    prisma.patientMedication.count({
      where: { patientId, organizationId, status: 'ACTIVE' },
    }),
    prisma.patientAllergy.count({
      where: { patientId, organizationId, status: 'ACTIVE' },
    }),
    prisma.immunization.count({
      where: { patientId, organizationId },
    }),
    prisma.labResult.count({
      where: { patientId, organizationId },
    }),
    prisma.medicalHistoryItem.count({
      where: { patientId, organizationId, status: 'ACTIVE' },
    }),
  ]);

  return {
    medications: { active: activeMedications },
    allergies: { active: activeAllergies },
    immunizations: { total: recentImmunizations },
    labResults: { total: recentLabResults },
    conditions: { active: activeConditions },
  };
}

export const healthRecordsService = {
  // Medications
  getMedications,
  createMedication,
  updateMedication,
  deleteMedication,

  // Allergies
  getAllergies,
  createAllergy,
  updateAllergy,
  deleteAllergy,

  // Immunizations
  getImmunizations,
  createImmunization,
  updateImmunization,
  deleteImmunization,

  // Lab Results
  getLabResults,
  createLabResult,
  updateLabResult,
  deleteLabResult,

  // Medical History
  getMedicalHistory,
  createMedicalHistoryItem,
  updateMedicalHistoryItem,
  deleteMedicalHistoryItem,

  // Aggregate
  getPatientHealthSummary,
};
