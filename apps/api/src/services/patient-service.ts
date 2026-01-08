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
  AssignDeviceRequest,
  DeviceResponse,
  DeviceType,
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

  /**
   * Log time for patient interaction
   */
  async logTime(
    patientId: string,
    organizationId: string,
    userId: string,
    durationSeconds: number,
    type: string = 'INTERACTION',
    notes?: string
  ): Promise<any> {
    // Verify patient exists and belongs to organization
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

    // Create time log
    const now = new Date();
    const startTime = new Date(now.getTime() - durationSeconds * 1000);

    const timeLog = await prisma.timeLog.create({
      data: {
        patientId,
        organizationId,
        userId,
        startTime,
        endTime: now,
        durationSeconds,
        type: type as any,
        notes,
      },
      include: {
        user: {
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
      userId,
      organizationId,
      action: 'timelog.created',
      entity: 'timelog',
      entityId: timeLog.id,
      metadata: {
        patientId,
        durationSeconds,
        type,
      },
    });

    return {
      id: timeLog.id,
      patientId: timeLog.patientId,
      userId: timeLog.userId,
      userName: `${timeLog.user.firstName} ${timeLog.user.lastName}`,
      startTime: timeLog.startTime.toISOString(),
      endTime: timeLog.endTime?.toISOString(),
      durationSeconds: timeLog.durationSeconds,
      type: timeLog.type,
      notes: timeLog.notes,
      createdAt: timeLog.createdAt.toISOString(),
    };
  }

  /**
   * Get monthly billing metrics for a patient
   * Returns readings count, logged minutes, and last interaction info
   */
  async getMonthlyMetrics(
    patientId: string,
    organizationId: string
  ): Promise<{
    totalReadings: { current: number; required: number };
    totalMinutes: { current: number; required: number };
    lastCall: string | null;
    callStatus: 'successful' | 'missed' | 'no_answer' | null;
    billingPeriod: { start: string; end: string };
  }> {
    // Get current billing month (first day to last day)
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

    // Verify patient exists
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

    // Count vitals readings for this month
    const readingsCount = await prisma.vitalReading.count({
      where: {
        patientId,
        organizationId,
        recordedAt: {
          gte: startOfMonth,
          lte: endOfMonth,
        },
      },
    });

    // Sum logged minutes for this month
    const timeLogs = await prisma.timeLog.aggregate({
      where: {
        patientId,
        organizationId,
        createdAt: {
          gte: startOfMonth,
          lte: endOfMonth,
        },
      },
      _sum: {
        durationSeconds: true,
      },
    });

    const totalSeconds = timeLogs._sum.durationSeconds || 0;
    const totalMinutes = Math.floor(totalSeconds / 60);

    // Get last time log (as proxy for last interaction/call)
    const lastTimeLog = await prisma.timeLog.findFirst({
      where: {
        patientId,
        organizationId,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return {
      totalReadings: {
        current: readingsCount,
        required: 16, // CMS requires 16 readings per month for RPM billing
      },
      totalMinutes: {
        current: totalMinutes,
        required: 20, // CMS requires 20 minutes per month for RPM billing
      },
      lastCall: lastTimeLog?.createdAt.toISOString() || null,
      callStatus: lastTimeLog ? 'successful' : null,
      billingPeriod: {
        start: startOfMonth.toISOString(),
        end: endOfMonth.toISOString(),
      },
    };
  }

  /**
   * Add condition to patient
   * Prevents duplicates
   */
  async addCondition(
    patientId: string,
    organizationId: string,
    condition: string,
    actorId: string
  ): Promise<PatientResponse> {
    // Verify patient exists and belongs to organization
    const patient = await prisma.patient.findFirst({
      where: {
        id: patientId,
        organizationId,
        deletedAt: null,
      },
      include: {
        user: true,
      },
    });

    if (!patient) {
      throw ApiError.notFound('Patient not found');
    }

    // Check if condition already exists
    if (patient.conditions.includes(condition)) {
      throw ApiError.conflict('Condition already exists for this patient');
    }

    // Add condition to array
    const updatedConditions = [...patient.conditions, condition];

    // Update patient
    const updatedPatient = await prisma.patient.update({
      where: { id: patientId },
      data: {
        conditions: updatedConditions,
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
      action: 'patient.condition_added',
      entity: 'patient',
      entityId: patientId,
      oldValues: { conditions: patient.conditions } as Record<string, unknown>,
      newValues: { conditions: updatedConditions, addedCondition: condition } as Record<string, unknown>,
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
        change: `Added condition: ${condition}`,
      } as Record<string, unknown>,
    });

    return this.mapPatientToResponse(updatedPatient);
  }

  /**
   * Remove condition from patient
   */
  async removeCondition(
    patientId: string,
    organizationId: string,
    condition: string,
    actorId: string
  ): Promise<PatientResponse> {
    // Verify patient exists and belongs to organization
    const patient = await prisma.patient.findFirst({
      where: {
        id: patientId,
        organizationId,
        deletedAt: null,
      },
      include: {
        user: true,
      },
    });

    if (!patient) {
      throw ApiError.notFound('Patient not found');
    }

    // Check if condition exists
    if (!patient.conditions.includes(condition)) {
      throw ApiError.notFound('Condition not found for this patient');
    }

    // Remove condition from array
    const updatedConditions = patient.conditions.filter((c) => c !== condition);

    // Update patient
    const updatedPatient = await prisma.patient.update({
      where: { id: patientId },
      data: {
        conditions: updatedConditions,
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
      action: 'patient.condition_removed',
      entity: 'patient',
      entityId: patientId,
      oldValues: { conditions: patient.conditions } as Record<string, unknown>,
      newValues: { conditions: updatedConditions, removedCondition: condition } as Record<string, unknown>,
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
        change: `Removed condition: ${condition}`,
      } as Record<string, unknown>,
    });

    return this.mapPatientToResponse(updatedPatient);
  }

  /**
   * Get patient's devices
   */
  async getPatientDevices(
    patientId: string,
    organizationId: string
  ): Promise<DeviceResponse[]> {
    // Verify patient exists and belongs to organization
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

    const devices = await prisma.device.findMany({
      where: {
        patientId,
        organizationId,
      },
      orderBy: {
        assignedAt: 'desc',
      },
    });

    return devices.map((device): DeviceResponse => ({
      id: device.id,
      patientId: device.patientId,
      type: device.type as DeviceType,
      serialNumber: device.serialNumber,
      manufacturer: device.manufacturer,
      model: device.model,
      status: device.status,
      lastSyncAt: device.lastSyncAt?.toISOString() || null,
      assignedAt: device.assignedAt.toISOString(),
      createdAt: device.createdAt.toISOString(),
      updatedAt: device.updatedAt.toISOString(),
    }));
  }

  /**
   * Assign device to patient
   */
  async assignDevice(
    patientId: string,
    organizationId: string,
    deviceData: AssignDeviceRequest,
    actorId: string
  ): Promise<DeviceResponse> {
    // Verify patient exists and belongs to organization
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

    // Check if device with serial number already exists
    const existingDevice = await prisma.device.findUnique({
      where: {
        serialNumber: deviceData.serialNumber,
      },
    });

    if (existingDevice) {
      throw ApiError.conflict('Device with this serial number already exists');
    }

    // Create device
    const device = await prisma.device.create({
      data: {
        patientId,
        organizationId,
        type: deviceData.type,
        serialNumber: deviceData.serialNumber,
        manufacturer: deviceData.manufacturer,
        model: deviceData.model,
        status: 'ACTIVE',
      },
    });

    // Audit log
    await auditService.log({
      userId: actorId,
      organizationId,
      action: 'device.assigned',
      entity: 'device',
      entityId: device.id,
      newValues: {
        patientId,
        type: deviceData.type,
        serialNumber: deviceData.serialNumber,
      } as Record<string, unknown>,
    });

    // Activity feed
    await activityService.log({
      organizationId,
      actorId,
      action: 'assigned',
      entityType: 'device',
      entityId: device.id,
      entityName: `${deviceData.type} (${deviceData.serialNumber})`,
      metadata: {
        patientId,
      } as Record<string, unknown>,
    });

    return {
      id: device.id,
      patientId: device.patientId,
      type: device.type as DeviceType,
      serialNumber: device.serialNumber,
      manufacturer: device.manufacturer,
      model: device.model,
      status: device.status,
      lastSyncAt: device.lastSyncAt?.toISOString() || null,
      assignedAt: device.assignedAt.toISOString(),
      createdAt: device.createdAt.toISOString(),
      updatedAt: device.updatedAt.toISOString(),
    };
  }

  /**
   * Remove device from patient
   */
  async removeDevice(
    patientId: string,
    deviceId: string,
    organizationId: string,
    actorId: string
  ): Promise<void> {
    // Verify patient exists and belongs to organization
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

    // Find device
    const device = await prisma.device.findFirst({
      where: {
        id: deviceId,
        patientId,
        organizationId,
      },
    });

    if (!device) {
      throw ApiError.notFound('Device not found for this patient');
    }

    // Delete device
    await prisma.device.delete({
      where: {
        id: deviceId,
      },
    });

    // Audit log
    await auditService.log({
      userId: actorId,
      organizationId,
      action: 'device.removed',
      entity: 'device',
      entityId: deviceId,
      oldValues: {
        patientId,
        type: device.type,
        serialNumber: device.serialNumber,
      } as Record<string, unknown>,
    });

    // Activity feed
    await activityService.log({
      organizationId,
      actorId,
      action: 'removed',
      entityType: 'device',
      entityId: deviceId,
      entityName: `${device.type} (${device.serialNumber})`,
      metadata: {
        patientId,
      } as Record<string, unknown>,
    });
  }

  /**
   * Get patient's care plans with versions
   */
  async getPatientCarePlans(
    patientId: string,
    organizationId: string
  ): Promise<any[]> {
    // Verify patient exists and belongs to organization
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

    const carePlans = await prisma.carePlan.findMany({
      where: {
        patientId,
        organizationId,
      },
      include: {
        versions: {
          orderBy: { version: 'desc' },
          take: 1,
        },
        createdBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
        approvedBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return carePlans.map((plan) => ({
      id: plan.id,
      patientId: plan.patientId,
      status: plan.status,
      currentVersion: plan.currentVersion,
      activatedAt: plan.activatedAt?.toISOString() || null,
      deactivatedAt: plan.deactivatedAt?.toISOString() || null,
      createdBy: {
        id: plan.createdBy.id,
        name: `${plan.createdBy.firstName} ${plan.createdBy.lastName}`,
      },
      approvedBy: plan.approvedBy
        ? {
            id: plan.approvedBy.id,
            name: `${plan.approvedBy.firstName} ${plan.approvedBy.lastName}`,
          }
        : null,
      latestVersion: plan.versions[0]
        ? {
            version: plan.versions[0].version,
            goals: plan.versions[0].goals,
            vitalThresholds: plan.versions[0].vitalThresholds,
            medications: plan.versions[0].medications,
            instructions: plan.versions[0].instructions,
            effectiveDate: plan.versions[0].effectiveDate.toISOString(),
            expiryDate: plan.versions[0].expiryDate?.toISOString() || null,
          }
        : null,
      createdAt: plan.createdAt.toISOString(),
      updatedAt: plan.updatedAt.toISOString(),
    }));
  }

  /**
   * Create a new care plan for a patient
   */
  async createCarePlan(
    patientId: string,
    organizationId: string,
    actorId: string,
    data: {
      goals?: { description: string; targetDate?: string; status?: string }[];
      vitalThresholds?: Record<string, { min?: number; max?: number; critical?: number }>;
      medications?: { name: string; dosage: string; frequency: string }[];
      instructions?: string;
      activateImmediately?: boolean;
    }
  ): Promise<any> {
    // Verify patient exists and belongs to organization
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

    // Check if there's already an active care plan
    const existingActive = await prisma.carePlan.findFirst({
      where: {
        patientId,
        organizationId,
        status: 'ACTIVE',
      },
    });

    if (existingActive && data.activateImmediately) {
      // Deactivate existing active plan
      await prisma.carePlan.update({
        where: { id: existingActive.id },
        data: {
          status: 'INACTIVE',
          deactivatedAt: new Date(),
        },
      });
    }

    // Create care plan with initial version
    const carePlan = await prisma.carePlan.create({
      data: {
        patientId,
        organizationId,
        createdById: actorId,
        status: data.activateImmediately ? 'ACTIVE' : 'DRAFT',
        activatedAt: data.activateImmediately ? new Date() : null,
        currentVersion: 1,
        versions: {
          create: {
            organizationId,
            version: 1,
            goals: (data.goals || []).map((g, idx) => ({
              id: `goal-${idx + 1}`,
              description: g.description,
              targetDate: g.targetDate || null,
              status: g.status || 'pending',
            })) as Prisma.InputJsonValue,
            vitalThresholds: (data.vitalThresholds || {}) as Prisma.InputJsonValue,
            medications: (data.medications || []) as Prisma.InputJsonValue,
            instructions: data.instructions || null,
            effectiveDate: new Date(),
          },
        },
      },
      include: {
        versions: true,
        createdBy: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
    });

    // Log activity
    await activityService.log({
      organizationId,
      type: 'CARE_PLAN_CREATED',
      title: 'Care plan created',
      description: `New care plan created for patient`,
      userId: actorId,
      patientId,
      metadata: { carePlanId: carePlan.id },
    });

    // Audit log
    await auditService.log({
      userId: actorId,
      organizationId,
      action: 'careplan.created',
      entity: 'careplan',
      entityId: carePlan.id,
      metadata: { patientId, status: carePlan.status },
    });

    return {
      id: carePlan.id,
      status: carePlan.status,
      currentVersion: carePlan.currentVersion,
      createdAt: carePlan.createdAt.toISOString(),
      createdBy: {
        id: carePlan.createdBy.id,
        firstName: carePlan.createdBy.firstName,
        lastName: carePlan.createdBy.lastName,
      },
      versions: carePlan.versions.map((v) => ({
        version: v.version,
        goals: v.goals,
        vitalThresholds: v.vitalThresholds,
        medications: v.medications,
        instructions: v.instructions,
        effectiveDate: v.effectiveDate.toISOString(),
      })),
    };
  }

  /**
   * Get patient's alerts with optional status filtering
   */
  async getPatientAlerts(
    patientId: string,
    organizationId: string,
    status?: string
  ): Promise<any[]> {
    // Verify patient exists and belongs to organization
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

    const alerts = await prisma.alert.findMany({
      where: {
        patientId,
        organizationId,
        ...(status ? { status: status as any } : {}),
      },
      include: {
        vitalReading: {
          select: {
            type: true,
            values: true,
            unit: true,
            recordedAt: true,
          },
        },
        assignedTo: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
        escalatedTo: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
        acknowledgedBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    return alerts.map((alert) => ({
      id: alert.id,
      patientId: alert.patientId,
      type: alert.type,
      severity: alert.severity,
      status: alert.status,
      message: alert.message,
      metadata: alert.metadata,
      vitalReading: alert.vitalReading
        ? {
            type: alert.vitalReading.type,
            values: alert.vitalReading.values,
            unit: alert.vitalReading.unit,
            recordedAt: alert.vitalReading.recordedAt.toISOString(),
          }
        : null,
      assignedTo: alert.assignedTo
        ? {
            id: alert.assignedTo.id,
            name: `${alert.assignedTo.firstName} ${alert.assignedTo.lastName}`,
          }
        : null,
      escalatedTo: alert.escalatedTo
        ? {
            id: alert.escalatedTo.id,
            name: `${alert.escalatedTo.firstName} ${alert.escalatedTo.lastName}`,
          }
        : null,
      acknowledgedBy: alert.acknowledgedBy
        ? {
            id: alert.acknowledgedBy.id,
            name: `${alert.acknowledgedBy.firstName} ${alert.acknowledgedBy.lastName}`,
          }
        : null,
      acknowledgedAt: alert.acknowledgedAt?.toISOString() || null,
      escalatedAt: alert.escalatedAt?.toISOString() || null,
      resolvedAt: alert.resolvedAt?.toISOString() || null,
      resolution: alert.resolution,
      createdAt: alert.createdAt.toISOString(),
      updatedAt: alert.updatedAt.toISOString(),
    }));
  }

  /**
   * Acknowledge an alert
   */
  async acknowledgeAlert(
    alertId: string,
    organizationId: string,
    userId: string
  ): Promise<any> {
    // Verify alert exists and belongs to organization
    const alert = await prisma.alert.findFirst({
      where: {
        id: alertId,
        organizationId,
      },
      include: {
        patient: {
          include: {
            user: {
              select: {
                firstName: true,
                lastName: true,
              },
            },
          },
        },
      },
    });

    if (!alert) {
      throw ApiError.notFound('Alert not found');
    }

    // Check if alert can be acknowledged
    if (alert.status !== 'NEW' && alert.status !== 'ESCALATED') {
      throw ApiError.badRequest('Alert cannot be acknowledged in current status');
    }

    // Update alert
    const updatedAlert = await prisma.alert.update({
      where: { id: alertId },
      data: {
        status: 'ACKNOWLEDGED',
        acknowledgedAt: new Date(),
        acknowledgedById: userId,
      },
      include: {
        acknowledgedBy: {
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
      userId,
      organizationId,
      action: 'alert.acknowledged',
      entity: 'alert',
      entityId: alertId,
      oldValues: { status: alert.status } as Record<string, unknown>,
      newValues: { status: 'ACKNOWLEDGED', acknowledgedById: userId } as Record<string, unknown>,
    });

    // Activity feed
    await activityService.log({
      organizationId,
      actorId: userId,
      action: 'acknowledged',
      entityType: 'alert',
      entityId: alertId,
      entityName: `Alert for ${alert.patient.user.firstName} ${alert.patient.user.lastName}`,
    });

    return {
      id: updatedAlert.id,
      status: updatedAlert.status,
      acknowledgedAt: updatedAlert.acknowledgedAt?.toISOString() || null,
      acknowledgedBy: updatedAlert.acknowledgedBy
        ? {
            id: updatedAlert.acknowledgedBy.id,
            name: `${updatedAlert.acknowledgedBy.firstName} ${updatedAlert.acknowledgedBy.lastName}`,
          }
        : null,
    };
  }

  /**
   * Resolve an alert
   */
  async resolveAlert(
    alertId: string,
    organizationId: string,
    userId: string,
    resolution: string
  ): Promise<any> {
    // Verify alert exists and belongs to organization
    const alert = await prisma.alert.findFirst({
      where: {
        id: alertId,
        organizationId,
      },
      include: {
        patient: {
          include: {
            user: {
              select: {
                firstName: true,
                lastName: true,
              },
            },
          },
        },
      },
    });

    if (!alert) {
      throw ApiError.notFound('Alert not found');
    }

    // Check if alert can be resolved
    if (alert.status === 'RESOLVED' || alert.status === 'DISMISSED') {
      throw ApiError.badRequest('Alert is already resolved or dismissed');
    }

    // Validate resolution text
    if (!resolution || resolution.trim().length < 5) {
      throw ApiError.badRequest('Resolution must be at least 5 characters');
    }

    // Update alert
    const updatedAlert = await prisma.alert.update({
      where: { id: alertId },
      data: {
        status: 'RESOLVED',
        resolvedAt: new Date(),
        resolution: resolution.trim(),
      },
    });

    // Audit log
    await auditService.log({
      userId,
      organizationId,
      action: 'alert.resolved',
      entity: 'alert',
      entityId: alertId,
      oldValues: { status: alert.status } as Record<string, unknown>,
      newValues: {
        status: 'RESOLVED',
        resolution: resolution.trim(),
      } as Record<string, unknown>,
    });

    // Activity feed
    await activityService.log({
      organizationId,
      actorId: userId,
      action: 'resolved',
      entityType: 'alert',
      entityId: alertId,
      entityName: `Alert for ${alert.patient.user.firstName} ${alert.patient.user.lastName}`,
    });

    return {
      id: updatedAlert.id,
      status: updatedAlert.status,
      resolvedAt: updatedAlert.resolvedAt?.toISOString() || null,
      resolution: updatedAlert.resolution,
    };
  }

  /**
   * Get patient's vital readings with summary statistics
   */
  async getPatientVitals(
    patientId: string,
    organizationId: string,
    options: {
      type?: string;
      page?: number;
      limit?: number;
      startDate?: string;
      endDate?: string;
    }
  ): Promise<{
    readings: any[];
    summary: Record<string, any>;
    pagination: { page: number; limit: number; total: number; totalPages: number };
  }> {
    // Verify patient exists
    const patient = await prisma.patient.findFirst({
      where: { id: patientId, organizationId, deletedAt: null },
    });

    if (!patient) {
      throw ApiError.notFound('Patient not found');
    }

    const page = options.page || 1;
    const limit = options.limit || 100;
    const skip = (page - 1) * limit;

    // Build where clause
    const whereClause: Prisma.VitalReadingWhereInput = {
      patientId,
      organizationId,
    };

    if (options.type) {
      whereClause.type = options.type as any;
    }

    if (options.startDate || options.endDate) {
      whereClause.recordedAt = {};
      if (options.startDate) {
        whereClause.recordedAt.gte = new Date(options.startDate);
      }
      if (options.endDate) {
        whereClause.recordedAt.lte = new Date(options.endDate);
      }
    }

    // Get readings and count
    const [readings, total] = await Promise.all([
      prisma.vitalReading.findMany({
        where: whereClause,
        orderBy: { recordedAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.vitalReading.count({ where: whereClause }),
    ]);

    // Calculate summary by type
    const summaryByType: Record<string, any> = {};
    const allReadings = await prisma.vitalReading.findMany({
      where: { patientId, organizationId },
      orderBy: { recordedAt: 'desc' },
    });

    // Group by type
    const groupedByType: Record<string, any[]> = {};
    allReadings.forEach((r: any) => {
      if (!groupedByType[r.type]) groupedByType[r.type] = [];
      groupedByType[r.type].push(r);
    });

    // Calculate summaries for each type
    for (const [vitalType, typeReadings] of Object.entries(groupedByType)) {
      const count = typeReadings.length;
      const latest = typeReadings[0];

      // Calculate status counts
      const statusCounts = { normal: 0, warning: 0, critical: 0 };
      typeReadings.forEach((r: any) => {
        const status = r.status?.toLowerCase() || 'normal';
        if (status in statusCounts) {
          statusCounts[status as keyof typeof statusCounts]++;
        }
      });

      summaryByType[vitalType] = {
        totalReadings: count,
        latestReading: latest ? {
          values: latest.values,
          recordedAt: latest.recordedAt.toISOString(),
          status: latest.status,
        } : null,
        statusCounts,
      };

      // Calculate averages for numeric values
      if (typeReadings.length > 0 && latest?.values) {
        const avgValues: Record<string, number> = {};
        const valueKeys = Object.keys(latest.values as object);

        valueKeys.forEach((key) => {
          const sum = typeReadings.reduce((acc: number, r: any) => {
            const val = (r.values as any)?.[key];
            return acc + (typeof val === 'number' ? val : 0);
          }, 0);
          avgValues[key] = Math.round((sum / count) * 10) / 10;
        });

        summaryByType[vitalType].averageValues = avgValues;
      }
    }

    return {
      readings: readings.map((r) => ({
        id: r.id,
        type: r.type,
        values: r.values,
        unit: r.unit,
        status: r.status,
        recordedAt: r.recordedAt.toISOString(),
        symptoms: r.symptoms,
        mealContext: r.mealContext,
        notes: r.notes,
        createdAt: r.createdAt.toISOString(),
      })),
      summary: summaryByType,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get patient's assessments
   */
  async getPatientAssessments(
    patientId: string,
    organizationId: string,
    status?: string
  ): Promise<any[]> {
    // Verify patient exists and belongs to organization
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

    const assessments = await prisma.assessment.findMany({
      where: {
        patientId,
        organizationId,
        ...(status ? { status: status as any } : {}),
      },
      include: {
        completedBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return assessments.map((assessment) => ({
      id: assessment.id,
      type: assessment.type,
      status: assessment.status,
      score: assessment.score,
      maxScore: assessment.maxScore,
      responses: assessment.responses,
      notes: assessment.notes,
      dueDate: assessment.dueDate?.toISOString() || null,
      completedAt: assessment.completedAt?.toISOString() || null,
      completedBy: assessment.completedBy
        ? `${assessment.completedBy.firstName} ${assessment.completedBy.lastName}`
        : null,
      createdAt: assessment.createdAt.toISOString(),
      updatedAt: assessment.updatedAt.toISOString(),
    }));
  }

  /**
   * Create a new assessment for a patient
   */
  async createAssessment(
    patientId: string,
    organizationId: string,
    actorId: string,
    data: {
      type: string;
      responses?: Record<string, any>;
      notes?: string;
      dueDate?: string;
    }
  ): Promise<any> {
    // Verify patient exists and belongs to organization
    const patient = await prisma.patient.findFirst({
      where: {
        id: patientId,
        organizationId,
        deletedAt: null,
      },
      include: {
        user: {
          select: { firstName: true, lastName: true },
        },
      },
    });

    if (!patient) {
      throw ApiError.notFound('Patient not found');
    }

    // Get max score based on assessment type
    const maxScores: Record<string, number> = {
      PHQ9: 27,
      GAD7: 21,
      FALLS_RISK: 10,
      NUTRITION: 100,
      PAIN_SCALE: 10,
      ADL: 100,
    };

    // Create assessment
    const assessment = await prisma.assessment.create({
      data: {
        patientId,
        organizationId,
        type: data.type as any,
        status: 'IN_PROGRESS',
        maxScore: maxScores[data.type] || null,
        responses: (data.responses || {}) as Prisma.InputJsonValue,
        notes: data.notes,
        dueDate: data.dueDate ? new Date(data.dueDate) : null,
      },
      include: {
        completedBy: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
    });

    // Activity feed
    await activityService.log({
      organizationId,
      actorId,
      action: 'created',
      entityType: 'assessment',
      entityId: assessment.id,
      entityName: `${data.type} Assessment for ${patient.user.firstName} ${patient.user.lastName}`,
    });

    // Audit log
    await auditService.log({
      userId: actorId,
      organizationId,
      action: 'assessment.created',
      entity: 'assessment',
      entityId: assessment.id,
      metadata: { patientId, type: data.type },
    });

    return {
      id: assessment.id,
      type: assessment.type,
      status: assessment.status,
      score: assessment.score,
      maxScore: assessment.maxScore,
      responses: assessment.responses,
      notes: assessment.notes,
      dueDate: assessment.dueDate?.toISOString() || null,
      completedAt: assessment.completedAt?.toISOString() || null,
      completedBy: null,
      createdAt: assessment.createdAt.toISOString(),
      updatedAt: assessment.updatedAt.toISOString(),
    };
  }

  /**
   * Complete an assessment with responses and score
   */
  async completeAssessment(
    assessmentId: string,
    organizationId: string,
    actorId: string,
    data: {
      responses: Record<string, any>;
      score: number;
      notes?: string;
    }
  ): Promise<any> {
    // Verify assessment exists and belongs to organization
    const assessment = await prisma.assessment.findFirst({
      where: {
        id: assessmentId,
        organizationId,
      },
      include: {
        patient: {
          include: {
            user: {
              select: { firstName: true, lastName: true },
            },
          },
        },
      },
    });

    if (!assessment) {
      throw ApiError.notFound('Assessment not found');
    }

    if (assessment.status === 'COMPLETED') {
      throw ApiError.badRequest('Assessment is already completed');
    }

    if (assessment.status === 'CANCELLED') {
      throw ApiError.badRequest('Assessment has been cancelled');
    }

    // Update assessment
    const updatedAssessment = await prisma.assessment.update({
      where: { id: assessmentId },
      data: {
        status: 'COMPLETED',
        score: data.score,
        responses: data.responses as Prisma.InputJsonValue,
        notes: data.notes || assessment.notes,
        completedById: actorId,
        completedAt: new Date(),
      },
      include: {
        completedBy: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
    });

    // Activity feed
    await activityService.log({
      organizationId,
      actorId,
      action: 'completed',
      entityType: 'assessment',
      entityId: assessment.id,
      entityName: `${assessment.type} Assessment for ${assessment.patient.user.firstName} ${assessment.patient.user.lastName}`,
      metadata: { score: data.score, maxScore: assessment.maxScore } as Record<string, unknown>,
    });

    // Audit log
    await auditService.log({
      userId: actorId,
      organizationId,
      action: 'assessment.completed',
      entity: 'assessment',
      entityId: assessmentId,
      oldValues: { status: assessment.status } as Record<string, unknown>,
      newValues: { status: 'COMPLETED', score: data.score } as Record<string, unknown>,
    });

    return {
      id: updatedAssessment.id,
      type: updatedAssessment.type,
      status: updatedAssessment.status,
      score: updatedAssessment.score,
      maxScore: updatedAssessment.maxScore,
      responses: updatedAssessment.responses,
      notes: updatedAssessment.notes,
      dueDate: updatedAssessment.dueDate?.toISOString() || null,
      completedAt: updatedAssessment.completedAt?.toISOString() || null,
      completedBy: updatedAssessment.completedBy
        ? `${updatedAssessment.completedBy.firstName} ${updatedAssessment.completedBy.lastName}`
        : null,
      createdAt: updatedAssessment.createdAt.toISOString(),
      updatedAt: updatedAssessment.updatedAt.toISOString(),
    };
  }
}

export const patientService = new PatientService();
