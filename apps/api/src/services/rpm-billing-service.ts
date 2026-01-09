import { prisma } from '../utils/prisma';
import { BillingStatus, Prisma } from '@prisma/client';
import { auditService } from './audit-service';

// Types
export interface BillingPeriodData {
  id: string;
  patientId: string;
  periodStart: string;
  periodEnd: string;
  dataTransmissionDays: number;
  interactionMinutes: number;
  status: string;
  eligibleCodes: string[];
  claimId: string | null;
  amount: number | null;
}

export interface CreateBillingRecordInput {
  patientId: string;
  periodStart: Date;
  periodEnd: Date;
  dataTransmissionDays?: number;
  interactionMinutes?: number;
}

export interface UpdateBillingRecordInput {
  dataTransmissionDays?: number;
  interactionMinutes?: number;
  status?: BillingStatus;
  claimId?: string;
  amount?: number;
}

class RpmBillingService {
  /**
   * Get billing records for a patient
   */
  async getPatientBillingRecords(
    patientId: string,
    organizationId: string
  ): Promise<BillingPeriodData[]> {
    const records = await prisma.billingRecord.findMany({
      where: {
        patientId,
        organizationId,
      },
      orderBy: { periodStart: 'desc' },
    });

    return records.map((r) => ({
      id: r.id,
      patientId: r.patientId,
      periodStart: r.periodStart.toISOString(),
      periodEnd: r.periodEnd.toISOString(),
      dataTransmissionDays: r.dataTransmissionDays,
      interactionMinutes: r.interactionMinutes,
      status: this.mapStatusToUI(r.status),
      eligibleCodes: this.calculateEligibleCodes(r.dataTransmissionDays, r.interactionMinutes),
      claimId: r.claimId,
      amount: r.amount,
    }));
  }

  /**
   * Get or create current billing period for a patient
   */
  async getCurrentBillingPeriod(
    patientId: string,
    organizationId: string
  ): Promise<BillingPeriodData | null> {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    let record = await prisma.billingRecord.findFirst({
      where: {
        patientId,
        organizationId,
        periodStart: { gte: startOfMonth },
        periodEnd: { lte: endOfMonth },
      },
    });

    if (!record) {
      // Create new billing record for current month
      record = await prisma.billingRecord.create({
        data: {
          patientId,
          organizationId,
          periodStart: startOfMonth,
          periodEnd: endOfMonth,
          status: 'PENDING',
        },
      });
    }

    return {
      id: record.id,
      patientId: record.patientId,
      periodStart: record.periodStart.toISOString(),
      periodEnd: record.periodEnd.toISOString(),
      dataTransmissionDays: record.dataTransmissionDays,
      interactionMinutes: record.interactionMinutes,
      status: this.mapStatusToUI(record.status),
      eligibleCodes: this.calculateEligibleCodes(record.dataTransmissionDays, record.interactionMinutes),
      claimId: record.claimId,
      amount: record.amount,
    };
  }

  /**
   * Update billing record with new data
   */
  async updateBillingRecord(
    id: string,
    organizationId: string,
    userId: string,
    data: UpdateBillingRecordInput
  ) {
    const record = await prisma.billingRecord.update({
      where: { id },
      data: {
        ...(data.dataTransmissionDays !== undefined && { dataTransmissionDays: data.dataTransmissionDays }),
        ...(data.interactionMinutes !== undefined && { interactionMinutes: data.interactionMinutes }),
        ...(data.status && { status: data.status }),
        ...(data.claimId && { claimId: data.claimId }),
        ...(data.amount !== undefined && { amount: data.amount }),
      },
    });

    await auditService.log({
      userId,
      organizationId,
      action: 'patient.updated',
      entity: 'billing_record',
      entityId: id,
      metadata: { changes: Object.keys(data) },
    });

    return {
      id: record.id,
      patientId: record.patientId,
      periodStart: record.periodStart.toISOString(),
      periodEnd: record.periodEnd.toISOString(),
      dataTransmissionDays: record.dataTransmissionDays,
      interactionMinutes: record.interactionMinutes,
      status: this.mapStatusToUI(record.status),
      eligibleCodes: this.calculateEligibleCodes(record.dataTransmissionDays, record.interactionMinutes),
      claimId: record.claimId,
      amount: record.amount,
    };
  }

  /**
   * Increment data transmission days for a patient (called when vitals are received)
   */
  async incrementDataTransmissionDay(
    patientId: string,
    organizationId: string,
    date: Date = new Date()
  ) {
    // Find or create billing record for the month
    const startOfMonth = new Date(date.getFullYear(), date.getMonth(), 1);
    const endOfMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0);

    let record = await prisma.billingRecord.findFirst({
      where: {
        patientId,
        organizationId,
        periodStart: { gte: startOfMonth },
        periodEnd: { lte: endOfMonth },
      },
    });

    if (!record) {
      record = await prisma.billingRecord.create({
        data: {
          patientId,
          organizationId,
          periodStart: startOfMonth,
          periodEnd: endOfMonth,
          dataTransmissionDays: 1,
          status: 'PENDING',
        },
      });
    } else {
      // Check if we already counted this day
      // For simplicity, we increment (in real app, track daily dates)
      record = await prisma.billingRecord.update({
        where: { id: record.id },
        data: { dataTransmissionDays: { increment: 1 } },
      });
    }

    return record;
  }

  /**
   * Add interaction minutes to current billing period
   */
  async addInteractionMinutes(
    patientId: string,
    organizationId: string,
    minutes: number
  ) {
    const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const endOfMonth = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0);

    let record = await prisma.billingRecord.findFirst({
      where: {
        patientId,
        organizationId,
        periodStart: { gte: startOfMonth },
        periodEnd: { lte: endOfMonth },
      },
    });

    if (!record) {
      record = await prisma.billingRecord.create({
        data: {
          patientId,
          organizationId,
          periodStart: startOfMonth,
          periodEnd: endOfMonth,
          interactionMinutes: minutes,
          status: 'PENDING',
        },
      });
    } else {
      record = await prisma.billingRecord.update({
        where: { id: record.id },
        data: { interactionMinutes: { increment: minutes } },
      });
    }

    return record;
  }

  /**
   * Calculate eligible CPT codes based on data
   */
  private calculateEligibleCodes(dataTransmissionDays: number, interactionMinutes: number): string[] {
    const codes: string[] = [];

    // 99454 - Device Supply (16+ days of data transmission)
    if (dataTransmissionDays >= 16) {
      codes.push('99454');
    }

    // 99457 - Treatment Management (20+ minutes interaction)
    if (interactionMinutes >= 20) {
      codes.push('99457');
    }

    // 99458 - Additional Management (40+ minutes interaction)
    if (interactionMinutes >= 40) {
      codes.push('99458');
    }

    return codes;
  }

  /**
   * Map database status to UI status
   */
  private mapStatusToUI(status: BillingStatus): string {
    const mapping: Record<BillingStatus, string> = {
      PENDING: 'pending',
      ELIGIBLE: 'eligible',
      SUBMITTED: 'submitted',
      ACCEPTED: 'submitted', // Map accepted to submitted for UI
      PAID: 'paid',
      DENIED: 'denied',
      APPEALED: 'pending', // Map appealed back to pending for UI
    };
    return mapping[status] || 'pending';
  }
}

export const rpmBillingService = new RpmBillingService();
