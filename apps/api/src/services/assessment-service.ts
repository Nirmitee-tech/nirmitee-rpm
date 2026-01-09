import { prisma } from '../utils/prisma';
import { AssessmentType, AssessmentStatus, Prisma } from '@prisma/client';
import { auditService } from './audit-service';

// Types
export interface CreateAssessmentInput {
  patientId: string;
  type: AssessmentType;
  dueDate?: Date;
  notes?: string;
}

export interface UpdateAssessmentInput {
  score?: number;
  maxScore?: number;
  responses?: Prisma.InputJsonValue;
  notes?: string;
  status?: AssessmentStatus;
}

export interface CompleteAssessmentInput {
  score: number;
  maxScore: number;
  responses?: Prisma.InputJsonValue;
  notes?: string;
}

export interface ListAssessmentsParams {
  patientId?: string;
  type?: AssessmentType;
  status?: AssessmentStatus;
  page?: number;
  limit?: number;
}

// Standard include for patient with user info
const patientInclude = {
  include: {
    user: {
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
      },
    },
  },
};

// Standard include for completedBy user
const completedByInclude = {
  select: {
    id: true,
    firstName: true,
    lastName: true,
  },
};

class AssessmentService {
  /**
   * Get assessments for organization with optional filters
   */
  async getAssessments(
    organizationId: string,
    params: ListAssessmentsParams = {}
  ) {
    const { patientId, type, status, page = 1, limit = 20 } = params;
    const skip = (page - 1) * limit;

    const where: Prisma.AssessmentWhereInput = {
      organizationId,
      ...(patientId && { patientId }),
      ...(type && { type }),
      ...(status && { status }),
    };

    const [assessments, total] = await Promise.all([
      prisma.assessment.findMany({
        where,
        include: {
          patient: patientInclude,
          completedBy: completedByInclude,
        },
        orderBy: [
          { status: 'asc' }, // Show pending/in-progress first
          { dueDate: 'asc' },
          { createdAt: 'desc' },
        ],
        skip,
        take: limit,
      }),
      prisma.assessment.count({ where }),
    ]);

    return {
      assessments: assessments.map(this.mapAssessment),
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get assessments for a specific patient
   */
  async getPatientAssessments(
    patientId: string,
    organizationId: string,
    params: { type?: AssessmentType; status?: AssessmentStatus } = {}
  ) {
    const { type, status } = params;

    const assessments = await prisma.assessment.findMany({
      where: {
        patientId,
        organizationId,
        ...(type && { type }),
        ...(status && { status }),
      },
      include: {
        completedBy: completedByInclude,
      },
      orderBy: [
        { status: 'asc' },
        { dueDate: 'asc' },
        { createdAt: 'desc' },
      ],
    });

    return assessments.map((a) => ({
      id: a.id,
      patientId: a.patientId,
      organizationId: a.organizationId,
      type: a.type,
      status: a.status,
      score: a.score,
      maxScore: a.maxScore,
      responses: a.responses,
      notes: a.notes,
      dueDate: a.dueDate?.toISOString() || null,
      completedAt: a.completedAt?.toISOString() || null,
      createdAt: a.createdAt.toISOString(),
      updatedAt: a.updatedAt.toISOString(),
      completedBy: a.completedBy
        ? {
            id: a.completedBy.id,
            firstName: a.completedBy.firstName,
            lastName: a.completedBy.lastName,
          }
        : null,
    }));
  }

  /**
   * Get a single assessment by ID
   */
  async getAssessment(id: string, organizationId: string) {
    const assessment = await prisma.assessment.findFirst({
      where: { id, organizationId },
      include: {
        patient: patientInclude,
        completedBy: completedByInclude,
      },
    });

    if (!assessment) {
      return null;
    }

    return this.mapAssessment(assessment);
  }

  /**
   * Create a new assessment (schedule)
   */
  async createAssessment(
    organizationId: string,
    userId: string,
    data: CreateAssessmentInput
  ) {
    // Get max score based on assessment type
    const maxScore = this.getMaxScoreForType(data.type);

    const assessment = await prisma.assessment.create({
      data: {
        organizationId,
        patientId: data.patientId,
        type: data.type,
        status: data.dueDate ? AssessmentStatus.SCHEDULED : AssessmentStatus.IN_PROGRESS,
        dueDate: data.dueDate,
        notes: data.notes,
        maxScore,
      },
      include: {
        patient: patientInclude,
      },
    });

    // Audit log
    await auditService.log({
      userId,
      organizationId,
      action: 'assessment.created',
      entity: 'assessment',
      entityId: assessment.id,
      metadata: {
        patientId: data.patientId,
        type: data.type,
      },
    });

    return {
      id: assessment.id,
      patientId: assessment.patientId,
      organizationId: assessment.organizationId,
      type: assessment.type,
      status: assessment.status,
      maxScore: assessment.maxScore,
      dueDate: assessment.dueDate?.toISOString() || null,
      createdAt: assessment.createdAt.toISOString(),
      patient: {
        id: assessment.patient.id,
        firstName: assessment.patient.user.firstName,
        lastName: assessment.patient.user.lastName,
      },
    };
  }

  /**
   * Update an assessment (partial update)
   */
  async updateAssessment(
    id: string,
    organizationId: string,
    userId: string,
    data: UpdateAssessmentInput
  ) {
    const assessment = await prisma.assessment.update({
      where: { id },
      data: {
        ...(data.score !== undefined && { score: data.score }),
        ...(data.maxScore !== undefined && { maxScore: data.maxScore }),
        ...(data.responses !== undefined && { responses: data.responses }),
        ...(data.notes !== undefined && { notes: data.notes }),
        ...(data.status && { status: data.status }),
      },
      include: {
        completedBy: completedByInclude,
      },
    });

    // Audit log
    await auditService.log({
      userId,
      organizationId,
      action: 'assessment.updated',
      entity: 'assessment',
      entityId: id,
      metadata: { changes: Object.keys(data) },
    });

    return {
      id: assessment.id,
      patientId: assessment.patientId,
      type: assessment.type,
      status: assessment.status,
      score: assessment.score,
      maxScore: assessment.maxScore,
      notes: assessment.notes,
      completedAt: assessment.completedAt?.toISOString() || null,
      completedBy: assessment.completedBy
        ? {
            id: assessment.completedBy.id,
            firstName: assessment.completedBy.firstName,
            lastName: assessment.completedBy.lastName,
          }
        : null,
    };
  }

  /**
   * Complete an assessment with score
   */
  async completeAssessment(
    id: string,
    organizationId: string,
    userId: string,
    data: CompleteAssessmentInput
  ) {
    const assessment = await prisma.assessment.update({
      where: { id },
      data: {
        score: data.score,
        maxScore: data.maxScore,
        responses: data.responses,
        notes: data.notes,
        status: AssessmentStatus.COMPLETED,
        completedById: userId,
        completedAt: new Date(),
      },
      include: {
        patient: patientInclude,
        completedBy: completedByInclude,
      },
    });

    // Audit log
    await auditService.log({
      userId,
      organizationId,
      action: 'assessment.completed',
      entity: 'assessment',
      entityId: id,
      metadata: {
        type: assessment.type,
        score: data.score,
        maxScore: data.maxScore,
        patientId: assessment.patientId,
      },
    });

    return this.mapAssessment(assessment);
  }

  /**
   * Cancel an assessment
   */
  async cancelAssessment(
    id: string,
    organizationId: string,
    userId: string,
    reason?: string
  ) {
    const assessment = await prisma.assessment.update({
      where: { id },
      data: {
        status: AssessmentStatus.CANCELLED,
        notes: reason ? `Cancelled: ${reason}` : undefined,
      },
    });

    // Audit log
    await auditService.log({
      userId,
      organizationId,
      action: 'assessment.cancelled',
      entity: 'assessment',
      entityId: id,
      metadata: { reason },
    });

    return {
      id: assessment.id,
      status: assessment.status,
    };
  }

  /**
   * Delete an assessment
   */
  async deleteAssessment(
    id: string,
    organizationId: string,
    userId: string
  ) {
    const assessment = await prisma.assessment.findFirst({
      where: { id, organizationId },
    });

    if (!assessment) {
      throw new Error('Assessment not found');
    }

    await prisma.assessment.delete({ where: { id } });

    // Audit log
    await auditService.log({
      userId,
      organizationId,
      action: 'assessment.deleted',
      entity: 'assessment',
      entityId: id,
      metadata: {
        type: assessment.type,
        patientId: assessment.patientId,
      },
    });
  }

  /**
   * Get max score for assessment type
   */
  private getMaxScoreForType(type: AssessmentType): number {
    const maxScores: Record<AssessmentType, number> = {
      PHQ9: 27,
      GAD7: 21,
      FALLS_RISK: 28, // Morse Fall Scale
      NUTRITION: 14,  // MNA-SF
      PAIN_SCALE: 10, // 0-10 scale
      ADL: 100,       // Barthel Index
    };
    return maxScores[type] || 100;
  }

  /**
   * Get pending assessments count for dashboard
   */
  async getPendingCount(organizationId: string) {
    return prisma.assessment.count({
      where: {
        organizationId,
        status: {
          in: [AssessmentStatus.SCHEDULED, AssessmentStatus.IN_PROGRESS],
        },
      },
    });
  }

  /**
   * Get overdue assessments
   */
  async getOverdueAssessments(organizationId: string) {
    const assessments = await prisma.assessment.findMany({
      where: {
        organizationId,
        status: {
          in: [AssessmentStatus.SCHEDULED, AssessmentStatus.IN_PROGRESS],
        },
        dueDate: {
          lt: new Date(),
        },
      },
      include: {
        patient: patientInclude,
      },
      orderBy: { dueDate: 'asc' },
    });

    return assessments.map((a) => ({
      id: a.id,
      patientId: a.patientId,
      type: a.type,
      status: a.status,
      dueDate: a.dueDate?.toISOString() || null,
      patient: {
        id: a.patient.id,
        firstName: a.patient.user.firstName,
        lastName: a.patient.user.lastName,
      },
    }));
  }

  /**
   * Map assessment with includes to API response format
   */
  private mapAssessment(assessment: {
    id: string;
    patientId: string;
    organizationId: string;
    type: AssessmentType;
    status: AssessmentStatus;
    score: number | null;
    maxScore: number | null;
    responses: Prisma.JsonValue;
    notes: string | null;
    dueDate: Date | null;
    completedAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
    patient?: {
      id: string;
      user: {
        id: string;
        firstName: string;
        lastName: string;
        email: string;
      };
    };
    completedBy?: {
      id: string;
      firstName: string;
      lastName: string;
    } | null;
  }) {
    return {
      id: assessment.id,
      patientId: assessment.patientId,
      organizationId: assessment.organizationId,
      type: assessment.type,
      status: assessment.status,
      score: assessment.score,
      maxScore: assessment.maxScore,
      responses: assessment.responses,
      notes: assessment.notes,
      dueDate: assessment.dueDate?.toISOString() || null,
      completedAt: assessment.completedAt?.toISOString() || null,
      createdAt: assessment.createdAt.toISOString(),
      updatedAt: assessment.updatedAt.toISOString(),
      patient: assessment.patient
        ? {
            id: assessment.patient.id,
            firstName: assessment.patient.user.firstName,
            lastName: assessment.patient.user.lastName,
          }
        : undefined,
      completedBy: assessment.completedBy
        ? {
            id: assessment.completedBy.id,
            firstName: assessment.completedBy.firstName,
            lastName: assessment.completedBy.lastName,
          }
        : null,
    };
  }
}

export const assessmentService = new AssessmentService();
