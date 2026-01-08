import { PrismaClient, Prisma } from '@prisma/client';

const prisma = new PrismaClient();

// ============================================
// Medical Conditions
// ============================================

export interface CreateConditionInput {
  code: string;
  name: string;
  description?: string;
  category?: string;
  icdCode?: string;
  sortOrder?: number;
}

export interface UpdateConditionInput {
  name?: string;
  description?: string;
  category?: string;
  icdCode?: string;
  isActive?: boolean;
  sortOrder?: number;
}

export const medicalConditionsService = {
  async list(organizationId: string, includeInactive = false) {
    return prisma.medicalCondition.findMany({
      where: {
        organizationId,
        ...(includeInactive ? {} : { isActive: true }),
      },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    });
  },

  async get(organizationId: string, id: string) {
    return prisma.medicalCondition.findFirst({
      where: { id, organizationId },
    });
  },

  async create(organizationId: string, data: CreateConditionInput) {
    return prisma.medicalCondition.create({
      data: {
        organizationId,
        code: data.code.toUpperCase(),
        name: data.name,
        description: data.description,
        category: data.category,
        icdCode: data.icdCode,
        sortOrder: data.sortOrder ?? 0,
      },
    });
  },

  async update(organizationId: string, id: string, data: UpdateConditionInput) {
    return prisma.medicalCondition.updateMany({
      where: { id, organizationId },
      data,
    });
  },

  async delete(organizationId: string, id: string) {
    // Soft delete by deactivating
    return prisma.medicalCondition.updateMany({
      where: { id, organizationId },
      data: { isActive: false },
    });
  },

  async seedDefaults(organizationId: string) {
    const defaults = [
      { code: 'HTN', name: 'Hypertension', category: 'Cardiovascular', icdCode: 'I10', sortOrder: 1 },
      { code: 'CHF', name: 'Heart Failure', category: 'Cardiovascular', icdCode: 'I50.9', sortOrder: 2 },
      { code: 'DM1', name: 'Diabetes Type 1', category: 'Endocrine', icdCode: 'E10', sortOrder: 3 },
      { code: 'DM2', name: 'Diabetes Type 2', category: 'Endocrine', icdCode: 'E11', sortOrder: 4 },
      { code: 'COPD', name: 'COPD', category: 'Respiratory', icdCode: 'J44.9', sortOrder: 5 },
      { code: 'CKD', name: 'Chronic Kidney Disease', category: 'Renal', icdCode: 'N18.9', sortOrder: 6 },
      { code: 'ASTHMA', name: 'Asthma', category: 'Respiratory', icdCode: 'J45.909', sortOrder: 7 },
      { code: 'AFIB', name: 'Atrial Fibrillation', category: 'Cardiovascular', icdCode: 'I48.91', sortOrder: 8 },
      { code: 'OBESITY', name: 'Obesity', category: 'Metabolic', icdCode: 'E66.9', sortOrder: 9 },
    ];

    for (const condition of defaults) {
      await prisma.medicalCondition.upsert({
        where: { organizationId_code: { organizationId, code: condition.code } },
        update: {},
        create: { organizationId, ...condition },
      });
    }
  },
};

// ============================================
// Insurance Providers
// ============================================

export interface CreateInsuranceInput {
  code: string;
  name: string;
  payerId?: string;
  phone?: string;
  website?: string;
  sortOrder?: number;
}

export interface UpdateInsuranceInput {
  name?: string;
  payerId?: string;
  phone?: string;
  website?: string;
  isActive?: boolean;
  sortOrder?: number;
}

export const insuranceProvidersService = {
  async list(organizationId: string, includeInactive = false) {
    return prisma.insuranceProvider.findMany({
      where: {
        organizationId,
        ...(includeInactive ? {} : { isActive: true }),
      },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    });
  },

  async get(organizationId: string, id: string) {
    return prisma.insuranceProvider.findFirst({
      where: { id, organizationId },
    });
  },

  async create(organizationId: string, data: CreateInsuranceInput) {
    return prisma.insuranceProvider.create({
      data: {
        organizationId,
        code: data.code.toUpperCase(),
        name: data.name,
        payerId: data.payerId,
        phone: data.phone,
        website: data.website,
        sortOrder: data.sortOrder ?? 0,
      },
    });
  },

  async update(organizationId: string, id: string, data: UpdateInsuranceInput) {
    return prisma.insuranceProvider.updateMany({
      where: { id, organizationId },
      data,
    });
  },

  async delete(organizationId: string, id: string) {
    return prisma.insuranceProvider.updateMany({
      where: { id, organizationId },
      data: { isActive: false },
    });
  },

  async seedDefaults(organizationId: string) {
    const defaults = [
      { code: 'MEDICARE', name: 'Medicare', payerId: 'CMS', sortOrder: 1 },
      { code: 'MEDICAID', name: 'Medicaid', sortOrder: 2 },
      { code: 'BCBS', name: 'Blue Cross Blue Shield', sortOrder: 3 },
      { code: 'AETNA', name: 'Aetna', sortOrder: 4 },
      { code: 'CIGNA', name: 'Cigna', sortOrder: 5 },
      { code: 'UHC', name: 'UnitedHealthcare', sortOrder: 6 },
      { code: 'HUMANA', name: 'Humana', sortOrder: 7 },
      { code: 'KAISER', name: 'Kaiser Permanente', sortOrder: 8 },
    ];

    for (const provider of defaults) {
      await prisma.insuranceProvider.upsert({
        where: { organizationId_code: { organizationId, code: provider.code } },
        update: {},
        create: { organizationId, ...provider },
      });
    }
  },
};

// ============================================
// Providers (from User table)
// ============================================

export const providersService = {
  async listByRole(organizationId: string, roleNames: string[]) {
    return prisma.user.findMany({
      where: {
        organizations: {
          some: {
            organizationId,
            status: 'ACTIVE',
            role: {
              name: { in: roleNames },
            },
          },
        },
        isActive: true,
        deletedAt: null,
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        organizations: {
          where: { organizationId },
          select: {
            role: { select: { name: true } },
          },
        },
      },
      orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
    });
  },

  async getPhysicians(organizationId: string) {
    return this.listByRole(organizationId, ['Physician', 'Doctor', 'Provider', 'Admin']);
  },

  async getCareCoordinators(organizationId: string) {
    return this.listByRole(organizationId, ['Care Coordinator', 'Nurse', 'Clinical Staff', 'Admin']);
  },
};

// ============================================
// External Providers (Referring physicians, etc.)
// ============================================

export interface CreateExternalProviderInput {
  npiNumber: string;
  name: string;
  firstName?: string;
  lastName?: string;
  credentials?: string;
  specialty?: string;
  taxonomyCode?: string;
  practiceName?: string;
  licenseNumber?: string;
  licenseState?: string;
  deaNumber?: string;
  phone?: string;
  fax?: string;
  email?: string;
  address?: Record<string, unknown>;
  sortOrder?: number;
}

export const externalProvidersService = {
  async list(organizationId: string, includeInactive = false) {
    return prisma.externalProvider.findMany({
      where: {
        organizationId,
        ...(includeInactive ? {} : { isActive: true }),
      },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    });
  },

  async get(organizationId: string, id: string) {
    return prisma.externalProvider.findFirst({
      where: { id, organizationId },
    });
  },

  async create(organizationId: string, data: CreateExternalProviderInput) {
    return prisma.externalProvider.create({
      data: {
        organizationId,
        npiNumber: data.npiNumber,
        name: data.name,
        firstName: data.firstName,
        lastName: data.lastName,
        credentials: data.credentials,
        specialty: data.specialty,
        taxonomyCode: data.taxonomyCode,
        practiceName: data.practiceName,
        licenseNumber: data.licenseNumber,
        licenseState: data.licenseState,
        deaNumber: data.deaNumber,
        phone: data.phone,
        fax: data.fax,
        email: data.email,
        address: data.address as Prisma.InputJsonValue,
        sortOrder: data.sortOrder ?? 0,
      },
    });
  },

  async update(organizationId: string, id: string, data: Partial<CreateExternalProviderInput> & { isActive?: boolean }) {
    const { address, ...rest } = data;
    return prisma.externalProvider.updateMany({
      where: { id, organizationId },
      data: {
        ...rest,
        ...(address !== undefined && { address: address as Prisma.InputJsonValue }),
      },
    });
  },

  async delete(organizationId: string, id: string) {
    return prisma.externalProvider.updateMany({
      where: { id, organizationId },
      data: { isActive: false },
    });
  },
};

// ============================================
// Medications
// ============================================

export interface CreateMedicationInput {
  code: string;
  name: string;
  genericName?: string;
  brandNames?: string[];
  dosageForm?: string;
  strength?: string;
  ndc?: string;
  rxcui?: string;
  category?: string;
  sortOrder?: number;
}

export const medicationsService = {
  async list(organizationId: string, includeInactive = false) {
    return prisma.medication.findMany({
      where: {
        organizationId,
        ...(includeInactive ? {} : { isActive: true }),
      },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    });
  },

  async get(organizationId: string, id: string) {
    return prisma.medication.findFirst({
      where: { id, organizationId },
    });
  },

  async create(organizationId: string, data: CreateMedicationInput) {
    return prisma.medication.create({
      data: {
        organizationId,
        code: data.code.toUpperCase(),
        name: data.name,
        genericName: data.genericName,
        brandNames: data.brandNames || [],
        dosageForm: data.dosageForm,
        strength: data.strength,
        ndc: data.ndc,
        rxcui: data.rxcui,
        category: data.category,
        sortOrder: data.sortOrder ?? 0,
      },
    });
  },

  async update(organizationId: string, id: string, data: Partial<CreateMedicationInput> & { isActive?: boolean }) {
    return prisma.medication.updateMany({
      where: { id, organizationId },
      data,
    });
  },

  async delete(organizationId: string, id: string) {
    return prisma.medication.updateMany({
      where: { id, organizationId },
      data: { isActive: false },
    });
  },
};

// ============================================
// Procedures
// ============================================

export interface CreateProcedureInput {
  code: string;
  name: string;
  cptCode?: string;
  hcpcsCode?: string;
  description?: string;
  category?: string;
  sortOrder?: number;
}

export const proceduresService = {
  async list(organizationId: string, includeInactive = false) {
    return prisma.procedure.findMany({
      where: {
        organizationId,
        ...(includeInactive ? {} : { isActive: true }),
      },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    });
  },

  async get(organizationId: string, id: string) {
    return prisma.procedure.findFirst({
      where: { id, organizationId },
    });
  },

  async create(organizationId: string, data: CreateProcedureInput) {
    return prisma.procedure.create({
      data: {
        organizationId,
        code: data.code.toUpperCase(),
        name: data.name,
        cptCode: data.cptCode,
        hcpcsCode: data.hcpcsCode,
        description: data.description,
        category: data.category,
        sortOrder: data.sortOrder ?? 0,
      },
    });
  },

  async update(organizationId: string, id: string, data: Partial<CreateProcedureInput> & { isActive?: boolean }) {
    return prisma.procedure.updateMany({
      where: { id, organizationId },
      data,
    });
  },

  async delete(organizationId: string, id: string) {
    return prisma.procedure.updateMany({
      where: { id, organizationId },
      data: { isActive: false },
    });
  },

  async seedDefaults(organizationId: string) {
    const defaults = [
      { code: 'RPM_SETUP', name: 'RPM Device Setup', cptCode: '99453', category: 'RPM Setup', sortOrder: 1 },
      { code: 'RPM_EDU', name: 'RPM Education & Training', cptCode: '99454', category: 'RPM Setup', sortOrder: 2 },
      { code: 'RPM_MGMT_20', name: 'RPM Management (20 min)', cptCode: '99457', category: 'RPM Management', sortOrder: 3 },
      { code: 'RPM_MGMT_ADD', name: 'RPM Management (addl 20 min)', cptCode: '99458', category: 'RPM Management', sortOrder: 4 },
    ];

    for (const procedure of defaults) {
      await prisma.procedure.upsert({
        where: { organizationId_code: { organizationId, code: procedure.code } },
        update: {},
        create: { organizationId, ...procedure },
      });
    }
  },
};

// ============================================
// Facilities
// ============================================

export interface CreateFacilityInput {
  code: string;
  name: string;
  type?: string;
  npi?: string;
  phone?: string;
  fax?: string;
  email?: string;
  address?: Record<string, unknown>;
  sortOrder?: number;
}

export const facilitiesService = {
  async list(organizationId: string, includeInactive = false) {
    return prisma.facility.findMany({
      where: {
        organizationId,
        ...(includeInactive ? {} : { isActive: true }),
      },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    });
  },

  async get(organizationId: string, id: string) {
    return prisma.facility.findFirst({
      where: { id, organizationId },
    });
  },

  async create(organizationId: string, data: CreateFacilityInput) {
    return prisma.facility.create({
      data: {
        organizationId,
        code: data.code.toUpperCase(),
        name: data.name,
        type: data.type,
        npi: data.npi,
        phone: data.phone,
        fax: data.fax,
        email: data.email,
        address: data.address as Prisma.InputJsonValue,
        sortOrder: data.sortOrder ?? 0,
      },
    });
  },

  async update(organizationId: string, id: string, data: Partial<CreateFacilityInput> & { isActive?: boolean }) {
    const { address, ...rest } = data;
    return prisma.facility.updateMany({
      where: { id, organizationId },
      data: {
        ...rest,
        ...(address !== undefined && { address: address as Prisma.InputJsonValue }),
      },
    });
  },

  async delete(organizationId: string, id: string) {
    return prisma.facility.updateMany({
      where: { id, organizationId },
      data: { isActive: false },
    });
  },
};

// ============================================
// Device Models
// ============================================

export interface CreateDeviceModelInput {
  code: string;
  name: string;
  manufacturer?: string;
  modelNumber?: string;
  category?: string;
  description?: string;
  sortOrder?: number;
}

export const deviceModelsService = {
  async list(organizationId: string, includeInactive = false) {
    return prisma.deviceModel.findMany({
      where: {
        organizationId,
        ...(includeInactive ? {} : { isActive: true }),
      },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    });
  },

  async get(organizationId: string, id: string) {
    return prisma.deviceModel.findFirst({
      where: { id, organizationId },
    });
  },

  async create(organizationId: string, data: CreateDeviceModelInput) {
    return prisma.deviceModel.create({
      data: {
        organizationId,
        code: data.code.toUpperCase(),
        name: data.name,
        manufacturer: data.manufacturer,
        modelNumber: data.modelNumber,
        category: data.category,
        description: data.description,
        sortOrder: data.sortOrder ?? 0,
      },
    });
  },

  async update(organizationId: string, id: string, data: Partial<CreateDeviceModelInput> & { isActive?: boolean }) {
    return prisma.deviceModel.updateMany({
      where: { id, organizationId },
      data,
    });
  },

  async delete(organizationId: string, id: string) {
    return prisma.deviceModel.updateMany({
      where: { id, organizationId },
      data: { isActive: false },
    });
  },

  async seedDefaults(organizationId: string) {
    const defaults = [
      { code: 'OMRON_BP786N', name: 'Omron Evolv BP Monitor', manufacturer: 'Omron', modelNumber: 'BP786N', category: 'Blood Pressure', sortOrder: 1 },
      { code: 'OMRON_HN290T', name: 'Omron Digital Scale', manufacturer: 'Omron', modelNumber: 'HN-290T', category: 'Weight', sortOrder: 2 },
      { code: 'CONTOUR_NEXT', name: 'Contour Next Glucose Meter', manufacturer: 'Ascensia', modelNumber: 'Contour Next', category: 'Glucose', sortOrder: 3 },
      { code: 'NONIN_3230', name: 'Nonin Pulse Oximeter', manufacturer: 'Nonin', modelNumber: '3230', category: 'Pulse Oximeter', sortOrder: 4 },
    ];

    for (const device of defaults) {
      await prisma.deviceModel.upsert({
        where: { organizationId_code: { organizationId, code: device.code } },
        update: {},
        create: { organizationId, ...device },
      });
    }
  },
};
