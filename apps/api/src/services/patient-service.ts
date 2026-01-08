/**
 * Patient Service
 * Business logic for patient registration & enrollment (RPM-004)
 */

import { prisma } from '../utils/prisma';
import { ApiError } from '../utils/api-error';
import { hashPassword } from '../utils/password';
import { auditService } from './audit-service';
import { activityService } from './activity-service';
import { Prisma, EnrollmentStatus } from '@prisma/client';
import type {
  CreatePatientRequest,
  UpdatePatientRequest,
  UpdateEnrollmentStatusRequest,
  PatientFilterOptions,
  PatientResponse,
  EligibilityValidationResult,
  SearchPatientResult,
  EnrollmentDraftData,
  EnrollmentDraftResponse,
} from '../types/patient-types';

export class PatientService {
  /**
   * Create and register a new patient
   */
  async createPatient(
    organizationId: string,
    data: CreatePatientRequest,
    actorId: string
  ): Promise<PatientResponse> {
    // Validate primary physician if provided
    if (data.primaryPhysicianId) {
      await this.validatePhysician(organizationId, data.primaryPhysicianId);
    }

    // Validate assigned clinical staff if provided
    if (data.assignedClinicalStaffId) {
      await this.validateClinicalStaff(organizationId, data.assignedClinicalStaffId);
    }

    // Check if user already exists
    let user = await prisma.user.findUnique({
      where: { email: data.email },
    });

    // Check if patient already exists in organization
    if (user) {
      const existingPatient = await prisma.patient.findFirst({
        where: {
          userId: user.id,
          organizationId,
          deletedAt: null,
        },
      });

      if (existingPatient) {
        throw ApiError.conflict('Patient already registered in this organization');
      }
    }

    // Validate eligibility if conditions provided
    const conditions = data.conditions || [];
    if (conditions.length > 0) {
      const eligibility = await this.validateEligibility(conditions);
      if (!eligibility.eligible) {
        throw ApiError.badRequest(`Patient not eligible for RPM: ${eligibility.reasons.join(', ')}`);
      }
    }

    // Create user if doesn't exist
    if (!user) {
      const tempPassword = this.generateTemporaryPassword();
      const passwordHash = await hashPassword(tempPassword);

      user = await prisma.user.create({
        data: {
          email: data.email,
          firstName: data.firstName,
          lastName: data.lastName,
          passwordHash,
          emailVerified: false,
        },
      });

      // TODO: Send welcome email with temporary password
    }

    // Build address object from flat fields
    const addressData = {
      street: data.address || '',
      city: data.city || '',
      state: data.state || '',
      zipCode: data.zipCode || '',
      country: 'US',
    };

    // Create patient record
    const patient = await prisma.patient.create({
      data: {
        userId: user.id,
        organizationId,
        dateOfBirth: new Date(data.dateOfBirth),
        phone: data.phone,
        address: addressData as Prisma.InputJsonValue,
        conditions: conditions,
        insuranceProviderId: data.insuranceProvider || undefined,
        insurancePlanName: data.isSelfPay ? 'Self-Pay' : undefined,
        insuranceMemberId: data.policyNumber || undefined,
        insuranceGroupNumber: data.groupNumber || undefined,
        primaryPhysicianId: data.primaryPhysicianId || undefined,
        assignedClinicalStaffId: data.assignedClinicalStaffId || undefined,
        enrollmentStatus: EnrollmentStatus.PENDING,
      },
      include: {
        user: true,
        primaryPhysician: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
        clinicalStaff: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    // Audit log
    await auditService.log({
      userId: actorId,
      organizationId,
      action: 'patient.created',
      entity: 'patient',
      entityId: patient.id,
      newValues: {
        patientId: patient.id,
        email: data.email,
        conditions: conditions,
      } as Record<string, unknown>,
    });

    // Activity feed
    await activityService.log({
      organizationId,
      actorId,
      action: 'created',
      entityType: 'patient',
      entityId: patient.id,
      entityName: `${patient.user.firstName} ${patient.user.lastName}`,
    });

    return this.mapPatientToResponse(patient);
  }

  /**
   * Get patient by ID
   */
  async getPatientById(
    patientId: string,
    organizationId: string
  ): Promise<PatientResponse> {
    const patient = await prisma.patient.findFirst({
      where: {
        id: patientId,
        organizationId,
        deletedAt: null,
      },
      include: {
        user: true,
        primaryPhysician: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
        clinicalStaff: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    if (!patient) {
      throw ApiError.notFound('Patient not found');
    }

    return this.mapPatientToResponse(patient);
  }

  /**
   * Update patient information
   */
  async updatePatient(
    patientId: string,
    organizationId: string,
    data: UpdatePatientRequest,
    actorId: string
  ): Promise<PatientResponse> {
    // Get existing patient
    const existingPatient = await prisma.patient.findFirst({
      where: {
        id: patientId,
        organizationId,
        deletedAt: null,
      },
      include: { user: true },
    });

    if (!existingPatient) {
      throw ApiError.notFound('Patient not found');
    }

    // Validate physician if being updated
    if (data.primaryPhysicianId) {
      await this.validatePhysician(organizationId, data.primaryPhysicianId);
    }

    // Validate clinical staff if being updated
    if (data.assignedClinicalStaffId) {
      await this.validateClinicalStaff(organizationId, data.assignedClinicalStaffId);
    }

    // Validate conditions if being updated
    if (data.conditions) {
      const eligibility = await this.validateEligibility(data.conditions);
      if (!eligibility.eligible) {
        throw ApiError.badRequest(`Invalid conditions: ${eligibility.reasons.join(', ')}`);
      }
    }

    // Update user information
    if (data.firstName || data.lastName) {
      await prisma.user.update({
        where: { id: existingPatient.userId },
        data: {
          firstName: data.firstName,
          lastName: data.lastName,
        },
      });
    }

    // Update patient information
    const updatedPatient = await prisma.patient.update({
      where: { id: patientId },
      data: {
        phone: data.phone,
        address: data.address ? (JSON.parse(JSON.stringify(data.address)) as Prisma.InputJsonValue) : undefined,
        conditions: data.conditions,
        insuranceProviderId: data.insurance?.providerId,
        insurancePlanName: data.insurance?.planName,
        insuranceMemberId: data.insurance?.memberId,
        insuranceGroupNumber: data.insurance?.groupNumber,
        primaryPhysicianId: data.primaryPhysicianId,
        assignedClinicalStaffId: data.assignedClinicalStaffId,
      },
      include: {
        user: true,
        primaryPhysician: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
        clinicalStaff: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    // Audit log
    await auditService.log({
      userId: actorId,
      organizationId,
      action: 'patient.updated',
      entity: 'patient',
      entityId: patientId,
      oldValues: JSON.parse(JSON.stringify(existingPatient)) as Record<string, unknown>,
      newValues: JSON.parse(JSON.stringify(data)) as Record<string, unknown>,
    });

    // Activity feed
    await activityService.log({
      organizationId,
      actorId,
      action: 'updated',
      entityType: 'patient',
      entityId: patientId,
      entityName: `${updatedPatient.user.firstName} ${updatedPatient.user.lastName}`,
    });

    return this.mapPatientToResponse(updatedPatient);
  }

  /**
   * Search and filter patients
   */
  async searchPatients(
    organizationId: string,
    options: PatientFilterOptions
  ): Promise<{
    patients: PatientResponse[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  }> {
    const page = options.page || 1;
    const limit = options.limit || 20;
    const skip = (page - 1) * limit;

    const where: Prisma.PatientWhereInput = {
      organizationId,
      deletedAt: null,
      ...(options.enrollmentStatus && { enrollmentStatus: options.enrollmentStatus }),
      ...(options.primaryPhysicianId && { primaryPhysicianId: options.primaryPhysicianId }),
      ...(options.assignedClinicalStaffId && { assignedClinicalStaffId: options.assignedClinicalStaffId }),
      ...(options.conditions && options.conditions.length > 0 && {
        conditions: {
          hasSome: options.conditions,
        },
      }),
    };

    if (options.search) {
      where.user = {
        OR: [
          { firstName: { contains: options.search, mode: 'insensitive' } },
          { lastName: { contains: options.search, mode: 'insensitive' } },
          { email: { contains: options.search, mode: 'insensitive' } },
        ],
      };
    }

    const [patients, total] = await Promise.all([
      prisma.patient.findMany({
        where,
        skip,
        take: limit,
        include: {
          user: true,
          primaryPhysician: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
            },
          },
          clinicalStaff: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.patient.count({ where }),
    ]);

    return {
      patients: patients.map(this.mapPatientToResponse),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Update enrollment status with workflow validation
   */
  async updateEnrollmentStatus(
    patientId: string,
    organizationId: string,
    data: UpdateEnrollmentStatusRequest,
    actorId: string
  ): Promise<PatientResponse> {
    const patient = await prisma.patient.findFirst({
      where: {
        id: patientId,
        organizationId,
        deletedAt: null,
      },
      include: { user: true },
    });

    if (!patient) {
      throw ApiError.notFound('Patient not found');
    }

    // Validate status transition
    this.validateStatusTransition(patient.enrollmentStatus, data.status);

    // Update status with appropriate dates
    const updateData: Prisma.PatientUpdateInput = {
      enrollmentStatus: data.status,
    };

    // Set consent date when moving to CONSENTED
    if (data.status === EnrollmentStatus.CONSENTED && !patient.consentDate) {
      updateData.consentDate = new Date();
    }

    // Set enrollment date when moving to ACTIVE
    if (data.status === EnrollmentStatus.ACTIVE && !patient.enrollmentDate) {
      updateData.enrollmentDate = new Date();
    }

    const updatedPatient = await prisma.patient.update({
      where: { id: patientId },
      data: updateData,
      include: {
        user: true,
        primaryPhysician: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
        clinicalStaff: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    // Audit log
    await auditService.log({
      userId: actorId,
      organizationId,
      action: 'patient.enrollment_status_updated',
      entity: 'patient',
      entityId: patientId,
      oldValues: { enrollmentStatus: patient.enrollmentStatus } as Record<string, unknown>,
      newValues: { enrollmentStatus: data.status, notes: data.notes } as Record<string, unknown>,
    });

    // Activity feed
    await activityService.log({
      organizationId,
      actorId,
      action: 'updated',
      entityType: 'patient',
      entityId: patientId,
      entityName: `${updatedPatient.user.firstName} ${updatedPatient.user.lastName}`,
      metadata: {
        statusChange: `${patient.enrollmentStatus} → ${data.status}`,
      } as Record<string, unknown>,
    });

    return this.mapPatientToResponse(updatedPatient);
  }

  /**
   * Assign care team (physician and/or clinical staff)
   */
  async assignCareTeam(
    patientId: string,
    organizationId: string,
    primaryPhysicianId?: string,
    assignedClinicalStaffId?: string,
    actorId?: string
  ): Promise<PatientResponse> {
    const patient = await prisma.patient.findFirst({
      where: {
        id: patientId,
        organizationId,
        deletedAt: null,
      },
    });

    if (!patient) {
      throw ApiError.notFound('Patient not found');
    }

    if (primaryPhysicianId) {
      await this.validatePhysician(organizationId, primaryPhysicianId);
    }

    if (assignedClinicalStaffId) {
      await this.validateClinicalStaff(organizationId, assignedClinicalStaffId);
    }

    const updatedPatient = await prisma.patient.update({
      where: { id: patientId },
      data: {
        primaryPhysicianId,
        assignedClinicalStaffId,
      },
      include: {
        user: true,
        primaryPhysician: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
        clinicalStaff: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    if (actorId) {
      await auditService.log({
        userId: actorId,
        organizationId,
        action: 'patient.care_team_assigned',
        entity: 'patient',
        entityId: patientId,
        newValues: { primaryPhysicianId, assignedClinicalStaffId } as Record<string, unknown>,
      });
    }

    return this.mapPatientToResponse(updatedPatient);
  }

  /**
   * Quick patient search by name, email, or phone
   * Returns minimal patient info for autocomplete/search
   */
  async quickSearch(
    organizationId: string,
    query: string
  ): Promise<SearchPatientResult[]> {
    const searchTerm = query.trim();

    if (!searchTerm) {
      return [];
    }

    // Search patients by name, email, or phone
    const patients = await prisma.patient.findMany({
      where: {
        organizationId,
        deletedAt: null,
        OR: [
          {
            user: {
              firstName: { contains: searchTerm, mode: 'insensitive' },
            },
          },
          {
            user: {
              lastName: { contains: searchTerm, mode: 'insensitive' },
            },
          },
          {
            user: {
              email: { contains: searchTerm, mode: 'insensitive' },
            },
          },
          {
            phone: { contains: searchTerm, mode: 'insensitive' },
          },
        ],
      },
      select: {
        id: true,
        dateOfBirth: true,
        phone: true,
        user: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
      take: 10, // Limit to 10 results for performance
      orderBy: [
        { user: { firstName: 'asc' } },
        { user: { lastName: 'asc' } },
      ],
    });

    return patients.map((patient): SearchPatientResult => ({
      id: patient.id,
      firstName: patient.user.firstName,
      lastName: patient.user.lastName,
      email: patient.user.email,
      phone: patient.phone || '',
      dateOfBirth: patient.dateOfBirth.toISOString(),
    }));
  }

  /**
   * Check patient eligibility for RPM by patient ID
   */
  async checkEligibility(
    patientId: string,
    organizationId: string
  ): Promise<EligibilityValidationResult> {
    const patient = await prisma.patient.findFirst({
      where: {
        id: patientId,
        organizationId,
        deletedAt: null,
      },
    });

    if (!patient) {
      throw ApiError.notFound('Patient not found');
    }

    return this.validateEligibility(patient.conditions);
  }

  /**
   * Validate patient eligibility for RPM
   * Now accepts string condition codes from master data
   */
  async validateEligibility(
    conditions: string[]
  ): Promise<EligibilityValidationResult> {
    const result: EligibilityValidationResult = {
      eligible: true,
      reasons: [],
      warnings: [],
    };

    // For initial enrollment, conditions are optional
    // They can be added later as part of the care plan
    if (!conditions || conditions.length === 0) {
      result.warnings.push('No conditions specified. Consider adding conditions for better care management.');
    }

    return result;
  }

  // Private helper methods

  private async validatePhysician(organizationId: string, physicianId: string): Promise<void> {
    const member = await prisma.organizationMember.findFirst({
      where: {
        userId: physicianId,
        organizationId,
        status: 'ACTIVE',
      },
      include: {
        role: {
          include: {
            permissions: {
              include: {
                permission: true,
              },
            },
          },
        },
      },
    });

    if (!member) {
      throw ApiError.badRequest('Primary physician not found in organization');
    }

    // Verify physician has appropriate permissions
    const hasPhysicianPermission = member.role.permissions.some(
      rp => rp.permission.code.startsWith('patients:') || rp.permission.code.startsWith('rpm:')
    );

    if (!hasPhysicianPermission) {
      throw ApiError.badRequest('User does not have physician permissions');
    }
  }

  private async validateClinicalStaff(organizationId: string, staffId: string): Promise<void> {
    const member = await prisma.organizationMember.findFirst({
      where: {
        userId: staffId,
        organizationId,
        status: 'ACTIVE',
      },
    });

    if (!member) {
      throw ApiError.badRequest('Clinical staff member not found in organization');
    }
  }

  private validateStatusTransition(current: EnrollmentStatus, next: EnrollmentStatus): void {
    const validTransitions: Record<EnrollmentStatus, EnrollmentStatus[]> = {
      [EnrollmentStatus.PENDING]: [EnrollmentStatus.CONSENTED, EnrollmentStatus.DISCHARGED],
      [EnrollmentStatus.CONSENTED]: [EnrollmentStatus.DEVICE_PENDING, EnrollmentStatus.DISCHARGED],
      [EnrollmentStatus.DEVICE_PENDING]: [EnrollmentStatus.ACTIVE, EnrollmentStatus.DISCHARGED],
      [EnrollmentStatus.ACTIVE]: [EnrollmentStatus.PAUSED, EnrollmentStatus.DISCHARGED],
      [EnrollmentStatus.PAUSED]: [EnrollmentStatus.ACTIVE, EnrollmentStatus.DISCHARGED],
      [EnrollmentStatus.DISCHARGED]: [], // Cannot transition from discharged
    };

    if (!validTransitions[current].includes(next)) {
      throw ApiError.badRequest(
        `Invalid status transition from ${current} to ${next}`
      );
    }
  }

  private generateTemporaryPassword(): string {
    // Generate a random 12-character password
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$%';
    let password = '';
    for (let i = 0; i < 12; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
  }

  private mapPatientToResponse(patient: any): PatientResponse {
    return {
      id: patient.id,
      userId: patient.userId,
      email: patient.user.email,
      firstName: patient.user.firstName,
      lastName: patient.user.lastName,
      dateOfBirth: patient.dateOfBirth.toISOString(),
      phone: patient.phone,
      address: patient.address,
      conditions: patient.conditions,
      insurance: {
        providerId: patient.insuranceProviderId,
        planName: patient.insurancePlanName,
        memberId: patient.insuranceMemberId,
        groupNumber: patient.insuranceGroupNumber,
      },
      enrollmentStatus: patient.enrollmentStatus,
      enrollmentDate: patient.enrollmentDate?.toISOString() || null,
      consentDate: patient.consentDate?.toISOString() || null,
      primaryPhysician: patient.primaryPhysician
        ? {
            id: patient.primaryPhysician.id,
            name: `${patient.primaryPhysician.firstName} ${patient.primaryPhysician.lastName}`,
          }
        : null,
      assignedClinicalStaff: patient.clinicalStaff
        ? {
            id: patient.clinicalStaff.id,
            name: `${patient.clinicalStaff.firstName} ${patient.clinicalStaff.lastName}`,
          }
        : null,
      createdAt: patient.createdAt.toISOString(),
      updatedAt: patient.updatedAt.toISOString(),
    };
  }

  /**
   * Save enrollment draft
   */
  async saveDraft(
    userId: string,
    organizationId: string,
    data: EnrollmentDraftData
  ): Promise<EnrollmentDraftResponse> {
    // Check for existing draft for this user
    const existingDraft = await prisma.enrollmentDraft.findFirst({
      where: {
        userId,
        organizationId,
      },
    });

    let draft;
    if (existingDraft) {
      // Update existing draft
      draft = await prisma.enrollmentDraft.update({
        where: { id: existingDraft.id },
        data: {
          step: data.step,
          data: data.data as Prisma.InputJsonValue,
          updatedAt: new Date(),
        },
      });
    } else {
      // Create new draft
      draft = await prisma.enrollmentDraft.create({
        data: {
          userId,
          organizationId,
          step: data.step,
          data: data.data as Prisma.InputJsonValue,
        },
      });
    }

    return this.mapDraftToResponse(draft);
  }

  /**
   * Get enrollment draft by ID
   */
  async getDraftById(
    draftId: string,
    userId: string,
    organizationId: string
  ): Promise<EnrollmentDraftResponse> {
    const draft = await prisma.enrollmentDraft.findFirst({
      where: {
        id: draftId,
        userId,
        organizationId,
      },
    });

    if (!draft) {
      throw ApiError.notFound('Draft not found');
    }

    return this.mapDraftToResponse(draft);
  }

  /**
   * Delete enrollment draft
   */
  async deleteDraft(
    draftId: string,
    userId: string,
    organizationId: string
  ): Promise<void> {
    const draft = await prisma.enrollmentDraft.findFirst({
      where: {
        id: draftId,
        userId,
        organizationId,
      },
    });

    if (!draft) {
      throw ApiError.notFound('Draft not found');
    }

    await prisma.enrollmentDraft.delete({
      where: { id: draftId },
    });
  }

  /**
   * Get user's latest enrollment draft
   */
  async getLatestDraft(
    userId: string,
    organizationId: string
  ): Promise<EnrollmentDraftResponse | null> {
    const draft = await prisma.enrollmentDraft.findFirst({
      where: {
        userId,
        organizationId,
      },
      orderBy: {
        updatedAt: 'desc',
      },
    });

    if (!draft) {
      return null;
    }

    return this.mapDraftToResponse(draft);
  }

  private mapDraftToResponse(draft: any): EnrollmentDraftResponse {
    return {
      id: draft.id,
      step: draft.step,
      data: draft.data as Partial<CreatePatientRequest>,
      createdAt: draft.createdAt.toISOString(),
      updatedAt: draft.updatedAt.toISOString(),
    };
  }
}

export const patientService = new PatientService();
