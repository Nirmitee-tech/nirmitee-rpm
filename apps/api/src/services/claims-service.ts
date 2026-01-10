/**
 * Claims/RCM Service
 * Manages claim generation, submission, and denial tracking
 */

import { prisma } from '../utils/prisma';
import {
  Claim,
  ClaimLine,
  ClaimStatus,
  ClaimType,
  ClaimDenial,
  DenialCategory,
  AppealStatus,
  PayerRule,
  PayerRuleType,
  ClaimSubmission,
  SubmissionStatus,
  ClaimAuditAction,
  ClaimLineStatus,
  Prisma,
} from '@prisma/client';
import { auditService } from './audit-service';

interface CreateClaimInput {
  patientId: string;
  organizationId: string;
  claimType?: ClaimType;
  serviceStartDate: Date;
  serviceEndDate: Date;
  billingProviderId?: string;
  renderingProviderId?: string;
  placeOfService?: string;
  payerId?: string;
  memberId?: string;
}

interface ClaimLineInput {
  cptCode: string;
  modifier1?: string;
  modifier2?: string;
  modifier3?: string;
  modifier4?: string;
  units: number;
  chargeAmount: number;
  diagnosisCodes?: string[];
  serviceDate: Date;
}

interface RecordDenialInput {
  claimId: string;
  denialCode: string;
  denialReason: string;
  denialCategory: DenialCategory;
  deniedAmount: number;
  appealDeadline?: Date;
}

// RPM CPT Codes (commonly used)
const RPM_CPT_CODES = {
  DEVICE_SETUP: '99453', // Remote monitoring device setup
  MONTHLY_MONITORING: '99454', // Monthly device transmission
  TREATMENT_MANAGEMENT_FIRST: '99457', // First 20 min treatment management
  TREATMENT_MANAGEMENT_ADDITIONAL: '99458', // Additional 20 min
  DATA_INTERPRETATION: '99091', // Collection/interpretation
  PRINCIPAL_CARE_MGMT: '99424', // Principal care management
};

class ClaimsService {
  /**
   * Create a new claim
   */
  async createClaim(
    input: CreateClaimInput,
    userId: string
  ): Promise<Claim> {
    // Generate claim number
    const claimNumber = await this.generateClaimNumber(input.organizationId);

    const claim = await prisma.claim.create({
      data: {
        organizationId: input.organizationId,
        patientId: input.patientId,
        claimNumber,
        claimType: input.claimType || ClaimType.PROFESSIONAL,
        status: ClaimStatus.DRAFT,
        serviceStartDate: input.serviceStartDate,
        serviceEndDate: input.serviceEndDate,
        billingProviderId: input.billingProviderId,
        renderingProviderId: input.renderingProviderId,
        placeOfService: input.placeOfService || '11', // Office
        payerId: input.payerId || '',
        memberId: input.memberId,
        totalCharges: 0,
      },
    });

    await this.logClaimAudit(
      claim.id,
      input.organizationId,
      ClaimAuditAction.CREATED,
      userId,
      null,
      JSON.stringify({ claimNumber, patientId: input.patientId })
    );

    await auditService.log({
      action: 'claim.created',
      entity: 'claim',
      entityId: claim.id,
      organizationId: input.organizationId,
      userId,
      newValues: { claimNumber, status: ClaimStatus.DRAFT },
    });

    return claim;
  }

  /**
   * Add line items to claim
   */
  async addClaimLines(
    claimId: string,
    lines: ClaimLineInput[],
    organizationId: string,
    userId: string
  ): Promise<ClaimLine[]> {
    const claim = await this.getClaim(claimId, organizationId);
    if (!claim) {
      throw new Error('Claim not found');
    }

    if (claim.status !== ClaimStatus.DRAFT) {
      throw new Error('Can only add lines to draft claims');
    }

    // Get next line number
    const existingLines = await prisma.claimLine.count({
      where: { claimId },
    });

    const createdLines: ClaimLine[] = [];
    let totalCharges = claim.totalCharges.toNumber();

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      const claimLine = await prisma.claimLine.create({
        data: {
          claimId,
          organizationId,
          lineNumber: existingLines + i + 1,
          cptCode: line.cptCode,
          modifier1: line.modifier1,
          modifier2: line.modifier2,
          modifier3: line.modifier3,
          modifier4: line.modifier4,
          units: line.units,
          chargeAmount: line.chargeAmount,
          diagnosisCodes: line.diagnosisCodes || [],
          serviceDate: line.serviceDate,
          status: ClaimLineStatus.PENDING,
        },
      });

      createdLines.push(claimLine);
      totalCharges += line.chargeAmount * line.units;
    }

    // Update claim total
    await prisma.claim.update({
      where: { id: claimId },
      data: { totalCharges },
    });

    await this.logClaimAudit(
      claimId,
      organizationId,
      ClaimAuditAction.UPDATED,
      userId,
      null,
      JSON.stringify({ linesAdded: createdLines.length, newTotal: totalCharges })
    );

    return createdLines;
  }

  /**
   * Generate RPM claim for a patient
   */
  async generateRpmClaim(
    patientId: string,
    organizationId: string,
    serviceMonth: Date,
    userId: string
  ): Promise<Claim> {
    // Get patient with care plan and readings
    const patient = await prisma.patient.findFirst({
      where: { id: patientId, organizationId },
      include: {
        carePlans: { where: { status: 'ACTIVE' } },
        devices: { where: { status: 'ACTIVE' } },
      },
    });

    if (!patient) {
      throw new Error('Patient not found');
    }

    // Calculate service period
    const startDate = new Date(serviceMonth.getFullYear(), serviceMonth.getMonth(), 1);
    const endDate = new Date(serviceMonth.getFullYear(), serviceMonth.getMonth() + 1, 0);

    // Get readings for the month
    await prisma.vitalReading.count({
      where: {
        patientId,
        recordedAt: { gte: startDate, lte: endDate },
        source: 'DEVICE',
      },
    });

    // Calculate transmission days (for 99454)
    const transmissionDays = await prisma.vitalReading.groupBy({
      by: ['recordedAt'],
      where: {
        patientId,
        recordedAt: { gte: startDate, lte: endDate },
        source: 'DEVICE',
      },
    });

    // Get diagnosis codes from patient conditions
    const diagnosisCodes = this.mapConditionsToDiagnosis(patient.conditions || []);

    // Create claim
    const claim = await this.createClaim(
      {
        patientId,
        organizationId,
        serviceStartDate: startDate,
        serviceEndDate: endDate,
      },
      userId
    );

    // Note: diagnosisCodes are added to claim lines, not the claim itself

    // Add appropriate CPT codes based on services rendered
    const claimLines: ClaimLineInput[] = [];

    // Check if device was setup this month (99453)
    const deviceSetupThisMonth = patient.devices?.some(
      (d) => d.assignedAt && d.assignedAt >= startDate && d.assignedAt <= endDate
    );

    if (deviceSetupThisMonth) {
      claimLines.push({
        cptCode: RPM_CPT_CODES.DEVICE_SETUP,
        units: 1,
        chargeAmount: 19.32, // Example Medicare rate
        serviceDate: startDate,
      });
    }

    // 99454 requires 16+ days of transmission
    if (transmissionDays.length >= 16) {
      claimLines.push({
        cptCode: RPM_CPT_CODES.MONTHLY_MONITORING,
        units: 1,
        chargeAmount: 63.16,
        serviceDate: endDate,
      });
    }

    // 99457 - First 20 minutes of treatment management
    claimLines.push({
      cptCode: RPM_CPT_CODES.TREATMENT_MANAGEMENT_FIRST,
      units: 1,
      chargeAmount: 50.94,
      serviceDate: endDate,
    });

    await this.addClaimLines(claim.id, claimLines, organizationId, userId);

    return this.getClaim(claim.id, organizationId) as Promise<Claim>;
  }

  /**
   * Validate claim before submission
   */
  async validateClaim(
    claimId: string,
    organizationId: string
  ): Promise<{ valid: boolean; errors: string[] }> {
    const claim = await prisma.claim.findFirst({
      where: { id: claimId, organizationId },
      include: { lines: true },
    });

    if (!claim) {
      return { valid: false, errors: ['Claim not found'] };
    }

    const errors: string[] = [];

    // Required fields
    if (!claim.patientId) errors.push('Patient is required');
    if (!claim.lines.length) errors.push('At least one service line is required');
    if (!claim.payerId) errors.push('Payer is required');

    // Validate lines and check for at least one diagnosis code
    let hasDiagnosis = false;
    for (const line of claim.lines) {
      if (!line.cptCode) {
        errors.push(`Line ${line.lineNumber}: CPT code is required`);
      }
      if (line.chargeAmount.toNumber() <= 0) {
        errors.push(`Line ${line.lineNumber}: Charge amount must be positive`);
      }
      if (line.diagnosisCodes.length > 0) {
        hasDiagnosis = true;
      }
    }

    if (!hasDiagnosis) {
      errors.push('At least one diagnosis code is required');
    }

    // Apply payer-specific rules
    if (claim.payerId) {
      const payerRules = await prisma.payerRule.findMany({
        where: {
          organizationId,
          payerId: claim.payerId,
          isActive: true,
        },
      });

      for (const rule of payerRules) {
        const ruleErrors = this.applyPayerRule(claim, rule);
        errors.push(...ruleErrors);
      }
    }

    return { valid: errors.length === 0, errors };
  }

  /**
   * Submit claim to clearinghouse
   */
  async submitClaim(
    claimId: string,
    organizationId: string,
    userId: string
  ): Promise<ClaimSubmission> {
    const claim = await this.getClaim(claimId, organizationId);
    if (!claim) {
      throw new Error('Claim not found');
    }

    // Validate first
    const validation = await this.validateClaim(claimId, organizationId);
    if (!validation.valid) {
      throw new Error(`Claim validation failed: ${validation.errors.join(', ')}`);
    }

    // Generate EDI 837P file
    const ediContent = await this.generate837P(claim);

    // Create submission record
    const submission = await prisma.claimSubmission.create({
      data: {
        claimId,
        organizationId,
        submissionType: 'ORIGINAL',
        ediFileContent: ediContent,
        clearinghouse: process.env.CLEARINGHOUSE_NAME || 'TEST_CLEARINGHOUSE',
        status: SubmissionStatus.PENDING,
        submittedAt: new Date(),
      },
    });

    // Update claim status
    await prisma.claim.update({
      where: { id: claimId },
      data: {
        status: ClaimStatus.SUBMITTED,
        submittedAt: new Date(),
      },
    });

    await this.logClaimAudit(
      claimId,
      organizationId,
      ClaimAuditAction.SUBMITTED,
      userId,
      null,
      JSON.stringify({ submissionId: submission.id })
    );

    // In production, this would send to actual clearinghouse
    // For now, simulate acknowledgment
    setTimeout(async () => {
      await prisma.claimSubmission.update({
        where: { id: submission.id },
        data: {
          status: SubmissionStatus.ACCEPTED,
          acceptedAt: new Date(),
          trackingNumber: `TRK${Date.now()}`,
        },
      });
    }, 5000);

    return submission;
  }

  /**
   * Record a denial
   */
  async recordDenial(
    input: RecordDenialInput,
    organizationId: string,
    userId: string
  ): Promise<ClaimDenial> {
    const claim = await this.getClaim(input.claimId, organizationId);
    if (!claim) {
      throw new Error('Claim not found');
    }

    const denial = await prisma.claimDenial.create({
      data: {
        claimId: input.claimId,
        organizationId,
        denialCode: input.denialCode,
        denialReason: input.denialReason,
        denialCategory: input.denialCategory,
        deniedAmount: input.deniedAmount,
        appealDeadline: input.appealDeadline,
        appealable: true,
        receivedAt: new Date(),
      },
    });

    // Update claim status
    await prisma.claim.update({
      where: { id: input.claimId },
      data: { status: ClaimStatus.DENIED },
    });

    await this.logClaimAudit(
      input.claimId,
      organizationId,
      ClaimAuditAction.DENIED,
      userId,
      null,
      JSON.stringify({ denialId: denial.id, denialCode: input.denialCode, deniedAmount: input.deniedAmount })
    );

    await auditService.log({
      action: 'claim.denied',
      entity: 'claim_denial',
      entityId: denial.id,
      organizationId,
      userId,
      newValues: {
        claimId: input.claimId,
        denialCode: input.denialCode,
        deniedAmount: input.deniedAmount,
      },
    });

    return denial;
  }

  /**
   * Create appeal for denial
   */
  async createAppeal(
    denialId: string,
    organizationId: string,
    appealNotes: string,
    userId: string
  ): Promise<ClaimDenial> {
    const denial = await prisma.claimDenial.findFirst({
      where: { id: denialId, organizationId },
    });

    if (!denial) {
      throw new Error('Denial not found');
    }

    if (!denial.appealable) {
      throw new Error('This denial is not appealable');
    }

    if (denial.appealStatus) {
      throw new Error('Appeal already initiated');
    }

    const updated = await prisma.claimDenial.update({
      where: { id: denialId },
      data: {
        appealStatus: AppealStatus.PENDING,
        appealedAt: new Date(),
        appealNotes,
      },
    });

    await this.logClaimAudit(
      denial.claimId,
      organizationId,
      ClaimAuditAction.APPEALED,
      userId,
      null,
      JSON.stringify({ denialId, appealNotes })
    );

    return updated;
  }

  /**
   * Mark payment received
   */
  async recordPayment(
    claimId: string,
    organizationId: string,
    paymentAmount: number,
    paymentDate: Date,
    userId: string,
    notes?: string
  ): Promise<Claim> {
    const claim = await this.getClaim(claimId, organizationId);
    if (!claim) {
      throw new Error('Claim not found');
    }

    const updated = await prisma.claim.update({
      where: { id: claimId },
      data: {
        status: ClaimStatus.PAID,
        allowedAmount: paymentAmount,
        paidAmount: paymentAmount,
        paidAt: paymentDate,
        notes: notes || claim.notes,
      },
    });

    await this.logClaimAudit(
      claimId,
      organizationId,
      ClaimAuditAction.PAID,
      userId,
      null,
      JSON.stringify({ paymentAmount, paymentDate: paymentDate.toISOString() })
    );

    return updated;
  }

  /**
   * Get claim by ID
   */
  async getClaim(claimId: string, organizationId: string): Promise<Claim | null> {
    return prisma.claim.findFirst({
      where: { id: claimId, organizationId },
      include: {
        lines: true,
        denials: true,
        submissions: { orderBy: { submittedAt: 'desc' } },
      },
    });
  }

  /**
   * Get claims list
   */
  async getClaims(
    organizationId: string,
    options?: {
      status?: ClaimStatus;
      patientId?: string;
      startDate?: Date;
      endDate?: Date;
      limit?: number;
      offset?: number;
    }
  ): Promise<{ claims: Claim[]; total: number }> {
    const where: Prisma.ClaimWhereInput = {
      organizationId,
      ...(options?.status && { status: options.status }),
      ...(options?.patientId && { patientId: options.patientId }),
      ...(options?.startDate && { serviceStartDate: { gte: options.startDate } }),
      ...(options?.endDate && { serviceEndDate: { lte: options.endDate } }),
    };

    const [claims, total] = await Promise.all([
      prisma.claim.findMany({
        where,
        include: { lines: true },
        orderBy: { createdAt: 'desc' },
        take: options?.limit || 50,
        skip: options?.offset || 0,
      }),
      prisma.claim.count({ where }),
    ]);

    return { claims, total };
  }

  /**
   * Get denial statistics
   */
  async getDenialStats(
    organizationId: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<{
    totalDenials: number;
    totalDeniedAmount: number;
    topDenialCodes: Array<{ code: string; count: number; amount: number }>;
    appealRate: number;
    overturnRate: number;
  }> {
    const where: Prisma.ClaimDenialWhereInput = {
      organizationId,
      ...(startDate && { receivedAt: { gte: startDate } }),
      ...(endDate && { receivedAt: { lte: endDate } }),
    };

    const denials = await prisma.claimDenial.findMany({
      where,
    });

    const totalDenials = denials.length;
    const totalDeniedAmount = denials.reduce(
      (sum, d) => sum + d.deniedAmount.toNumber(),
      0
    );

    // Group by denial code
    const codeGroups = denials.reduce(
      (acc, d) => {
        if (!acc[d.denialCode]) {
          acc[d.denialCode] = { count: 0, amount: 0 };
        }
        acc[d.denialCode].count++;
        acc[d.denialCode].amount += d.deniedAmount.toNumber();
        return acc;
      },
      {} as Record<string, { count: number; amount: number }>
    );

    const topDenialCodes = Object.entries(codeGroups)
      .map(([code, stats]) => ({ code, ...stats }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    const appealedCount = denials.filter(
      (d) => d.appealStatus !== null
    ).length;
    const overturnedCount = denials.filter(
      (d) => d.appealStatus === AppealStatus.APPROVED
    ).length;

    return {
      totalDenials,
      totalDeniedAmount,
      topDenialCodes,
      appealRate: totalDenials > 0 ? (appealedCount / totalDenials) * 100 : 0,
      overturnRate: appealedCount > 0 ? (overturnedCount / appealedCount) * 100 : 0,
    };
  }

  // ==========================================
  // PAYER RULES
  // ==========================================

  /**
   * Create payer rule
   */
  async createPayerRule(
    organizationId: string,
    payerId: string,
    payerName: string,
    ruleType: PayerRuleType,
    description: string,
    requirement: Record<string, unknown>,
    userId: string,
    cptCode?: string
  ): Promise<PayerRule> {
    const rule = await prisma.payerRule.create({
      data: {
        organizationId,
        payerId,
        payerName,
        ruleType,
        description,
        requirement: requirement as Prisma.InputJsonValue,
        cptCode,
        isActive: true,
      },
    });

    await auditService.log({
      action: 'payer_rule.created',
      entity: 'payer_rule',
      entityId: rule.id,
      organizationId,
      userId,
      newValues: { ruleType, payerId, description },
    });

    return rule;
  }

  /**
   * Get payer rules
   */
  async getPayerRules(
    organizationId: string,
    payerId?: string
  ): Promise<PayerRule[]> {
    return prisma.payerRule.findMany({
      where: {
        organizationId,
        ...(payerId && { payerId }),
        isActive: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  // ==========================================
  // HELPER METHODS
  // ==========================================

  /**
   * Generate claim number
   */
  private async generateClaimNumber(organizationId: string): Promise<string> {
    const date = new Date();
    const prefix = `CLM${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}`;

    const count = await prisma.claim.count({
      where: {
        organizationId,
        claimNumber: { startsWith: prefix },
      },
    });

    return `${prefix}${String(count + 1).padStart(5, '0')}`;
  }

  /**
   * Map conditions to ICD-10 codes
   */
  private mapConditionsToDiagnosis(conditions: string[]): string[] {
    const diagnosisMap: Record<string, string> = {
      HYPERTENSION: 'I10',
      DIABETES_TYPE_2: 'E11.9',
      DIABETES_TYPE_1: 'E10.9',
      COPD: 'J44.9',
      CONGESTIVE_HEART_FAILURE: 'I50.9',
      CHRONIC_KIDNEY_DISEASE: 'N18.9',
      OBESITY: 'E66.9',
      ARRHYTHMIA: 'I49.9',
    };

    return conditions
      .map((c) => diagnosisMap[c])
      .filter((code) => code !== undefined);
  }

  /**
   * Apply payer-specific rule
   */
  private applyPayerRule(claim: Claim & { lines: ClaimLine[] }, rule: PayerRule): string[] {
    const errors: string[] = [];
    const requirement = rule.requirement as Record<string, unknown>;

    // Example rules based on rule type
    switch (rule.ruleType) {
      case PayerRuleType.FREQUENCY_LIMIT:
        if (requirement.maxUnits) {
          for (const line of claim.lines) {
            if (rule.cptCode && line.cptCode !== rule.cptCode) continue;
            if (line.units > (requirement.maxUnits as number)) {
              errors.push(`Line ${line.lineNumber}: Exceeds maximum units (${requirement.maxUnits})`);
            }
          }
        }
        break;
      case PayerRuleType.MODIFIER_REQUIRED:
        if (requirement.requiredModifier) {
          for (const line of claim.lines) {
            if (rule.cptCode && line.cptCode !== rule.cptCode) continue;
            const hasModifier = [line.modifier1, line.modifier2, line.modifier3, line.modifier4]
              .includes(requirement.requiredModifier as string);
            if (!hasModifier) {
              errors.push(`Line ${line.lineNumber}: Missing required modifier ${requirement.requiredModifier}`);
            }
          }
        }
        break;
      case PayerRuleType.DIAGNOSIS_REQUIRED:
        if (requirement.requiredDiagnosis) {
          const requiredCodes = requirement.requiredDiagnosis as string[];
          for (const line of claim.lines) {
            if (rule.cptCode && line.cptCode !== rule.cptCode) continue;
            const hasRequired = requiredCodes.some(code => line.diagnosisCodes.includes(code));
            if (!hasRequired) {
              errors.push(`Line ${line.lineNumber}: Missing required diagnosis code`);
            }
          }
        }
        break;
    }

    return errors;
  }

  /**
   * Generate EDI 837P content
   */
  private async generate837P(claim: Claim): Promise<string> {
    // Simplified 837P generation
    // In production, would use proper EDI library
    const segments: string[] = [];

    // ISA - Interchange Control Header
    segments.push(`ISA*00*          *00*          *ZZ*SENDER         *ZZ*RECEIVER       *${this.formatDate(new Date(), 'YYMMDD')}*${this.formatTime(new Date())}*^*00501*000000001*0*P*:~`);

    // GS - Functional Group Header
    segments.push(`GS*HC*SENDER*RECEIVER*${this.formatDate(new Date(), 'YYYYMMDD')}*${this.formatTime(new Date())}*1*X*005010X222A1~`);

    // ST - Transaction Set Header
    segments.push(`ST*837*0001*005010X222A1~`);

    // BHT - Beginning of Hierarchical Transaction
    segments.push(`BHT*0019*00*${claim.claimNumber}*${this.formatDate(new Date(), 'YYYYMMDD')}*${this.formatTime(new Date())}*CH~`);

    // SE - Transaction Set Trailer
    segments.push(`SE*${segments.length}*0001~`);

    // GE - Functional Group Trailer
    segments.push(`GE*1*1~`);

    // IEA - Interchange Control Trailer
    segments.push(`IEA*1*000000001~`);

    return segments.join('\n');
  }

  private formatDate(date: Date, format: string): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');

    if (format === 'YYMMDD') {
      return `${String(year).slice(-2)}${month}${day}`;
    }
    return `${year}${month}${day}`;
  }

  private formatTime(date: Date): string {
    return `${String(date.getHours()).padStart(2, '0')}${String(date.getMinutes()).padStart(2, '0')}`;
  }

  /**
   * Log claim audit entry
   */
  private async logClaimAudit(
    claimId: string,
    organizationId: string,
    action: ClaimAuditAction,
    performedById: string | null,
    oldValue: string | null,
    newValue: string | null
  ): Promise<void> {
    await prisma.claimAudit.create({
      data: {
        claimId,
        organizationId,
        action,
        performedById,
        oldValue,
        newValue,
      },
    });
  }
}

export const claimsService = new ClaimsService();
