import { prisma } from '../utils/prisma';
import { VitalType, Prisma } from '@prisma/client';
import { log } from '../utils/logger';

// System default thresholds (fallback when no org/patient thresholds exist)
const SYSTEM_DEFAULTS: Record<VitalType, ThresholdConfig> = {
  BLOOD_PRESSURE: {
    warningMin: 90,
    warningMax: 140,
    criticalMin: 80,
    criticalMax: 180,
    warningMinSecondary: 60,
    warningMaxSecondary: 90,
    criticalMinSecondary: 50,
    criticalMaxSecondary: 120,
    unit: 'mmHg',
  },
  BLOOD_GLUCOSE: {
    warningMin: 70,
    warningMax: 140,
    criticalMin: 54,
    criticalMax: 250,
    unit: 'mg/dL',
  },
  PULSE_OXIMETRY: {
    warningMin: 92,
    warningMax: null,
    criticalMin: 88,
    criticalMax: null,
    unit: '%',
  },
  HEART_RATE: {
    warningMin: 60,
    warningMax: 100,
    criticalMin: 40,
    criticalMax: 150,
    unit: 'bpm',
  },
  WEIGHT: {
    warningMin: null,
    warningMax: null,
    criticalMin: null,
    criticalMax: null,
    unit: 'kg',
  },
  TEMPERATURE: {
    warningMin: 97,
    warningMax: 100.4,
    criticalMin: 95,
    criticalMax: 103,
    unit: '°F',
  },
  RESPIRATORY_RATE: {
    warningMin: 12,
    warningMax: 20,
    criticalMin: 8,
    criticalMax: 30,
    unit: 'breaths/min',
  },
  BMI: {
    warningMin: 18.5,
    warningMax: 25,
    criticalMin: 16,
    criticalMax: 35,
    unit: 'kg/m²',
  },
};

export interface ThresholdConfig {
  warningMin: number | null;
  warningMax: number | null;
  criticalMin: number | null;
  criticalMax: number | null;
  warningMinSecondary?: number | null;
  warningMaxSecondary?: number | null;
  criticalMinSecondary?: number | null;
  criticalMaxSecondary?: number | null;
  unit: string;
}

export type VitalStatus = 'normal' | 'warning' | 'critical';

interface SetThresholdData {
  warningMin?: number | null;
  warningMax?: number | null;
  criticalMin?: number | null;
  criticalMax?: number | null;
  warningMinSecondary?: number | null;
  warningMaxSecondary?: number | null;
  criticalMinSecondary?: number | null;
  criticalMaxSecondary?: number | null;
  unit?: string;
}

interface SetPatientThresholdData extends SetThresholdData {
  notes?: string;
  useCustomThresholds?: boolean;
}

class ThresholdService {
  /**
   * Get system default thresholds for a vital type
   */
  getSystemDefaults(vitalType: VitalType): ThresholdConfig {
    return SYSTEM_DEFAULTS[vitalType] || {
      warningMin: null,
      warningMax: null,
      criticalMin: null,
      criticalMax: null,
      unit: '',
    };
  }

  /**
   * Get effective thresholds for a patient (patient > org > system defaults)
   */
  async getEffectiveThresholds(
    patientId: string,
    organizationId: string,
    vitalType: VitalType
  ): Promise<ThresholdConfig> {
    // First, check for patient-specific thresholds
    const patientThreshold = await prisma.patientVitalThreshold.findUnique({
      where: {
        patientId_vitalType: {
          patientId,
          vitalType,
        },
      },
    });

    if (patientThreshold && patientThreshold.useCustomThresholds) {
      return {
        warningMin: patientThreshold.warningMin,
        warningMax: patientThreshold.warningMax,
        criticalMin: patientThreshold.criticalMin,
        criticalMax: patientThreshold.criticalMax,
        warningMinSecondary: patientThreshold.warningMinSecondary,
        warningMaxSecondary: patientThreshold.warningMaxSecondary,
        criticalMinSecondary: patientThreshold.criticalMinSecondary,
        criticalMaxSecondary: patientThreshold.criticalMaxSecondary,
        unit: this.getSystemDefaults(vitalType).unit,
      };
    }

    // Check for organization-level thresholds
    const orgThreshold = await prisma.vitalThreshold.findUnique({
      where: {
        organizationId_vitalType: {
          organizationId,
          vitalType,
        },
      },
    });

    if (orgThreshold && orgThreshold.isActive) {
      return {
        warningMin: orgThreshold.warningMin,
        warningMax: orgThreshold.warningMax,
        criticalMin: orgThreshold.criticalMin,
        criticalMax: orgThreshold.criticalMax,
        warningMinSecondary: orgThreshold.warningMinSecondary,
        warningMaxSecondary: orgThreshold.warningMaxSecondary,
        criticalMinSecondary: orgThreshold.criticalMinSecondary,
        criticalMaxSecondary: orgThreshold.criticalMaxSecondary,
        unit: orgThreshold.unit,
      };
    }

    // Fall back to system defaults
    return this.getSystemDefaults(vitalType);
  }

  /**
   * Evaluate a vital reading against thresholds
   * Returns the status (normal, warning, critical)
   */
  async evaluateReading(
    patientId: string,
    organizationId: string,
    vitalType: VitalType,
    values: Record<string, number>
  ): Promise<VitalStatus> {
    const thresholds = await this.getEffectiveThresholds(patientId, organizationId, vitalType);
    return this.evaluateWithThresholds(vitalType, values, thresholds);
  }

  /**
   * Evaluate values against provided thresholds
   */
  evaluateWithThresholds(
    vitalType: VitalType,
    values: Record<string, number>,
    thresholds: ThresholdConfig
  ): VitalStatus {
    // Blood Pressure requires both systolic and diastolic evaluation
    if (vitalType === 'BLOOD_PRESSURE') {
      const systolic = values.systolic || 0;
      const diastolic = values.diastolic || 0;

      // Check critical (primary = systolic, secondary = diastolic)
      if (
        (thresholds.criticalMax != null && systolic >= thresholds.criticalMax) ||
        (thresholds.criticalMin != null && systolic < thresholds.criticalMin) ||
        (thresholds.criticalMaxSecondary != null && diastolic >= thresholds.criticalMaxSecondary) ||
        (thresholds.criticalMinSecondary != null && diastolic < thresholds.criticalMinSecondary)
      ) {
        return 'critical';
      }

      // Check warning
      if (
        (thresholds.warningMax != null && systolic >= thresholds.warningMax) ||
        (thresholds.warningMin != null && systolic < thresholds.warningMin) ||
        (thresholds.warningMaxSecondary != null && diastolic >= thresholds.warningMaxSecondary) ||
        (thresholds.warningMinSecondary != null && diastolic < thresholds.warningMinSecondary)
      ) {
        return 'warning';
      }

      return 'normal';
    }

    // Single-value vitals
    const value = this.extractPrimaryValue(vitalType, values);
    if (value === null) return 'normal';

    // Check critical first (more severe)
    if (
      (thresholds.criticalMax !== null && value >= thresholds.criticalMax) ||
      (thresholds.criticalMin !== null && value < thresholds.criticalMin)
    ) {
      return 'critical';
    }

    // Check warning
    if (
      (thresholds.warningMax !== null && value >= thresholds.warningMax) ||
      (thresholds.warningMin !== null && value < thresholds.warningMin)
    ) {
      return 'warning';
    }

    return 'normal';
  }

  /**
   * Extract the primary value from a vital reading based on type
   */
  private extractPrimaryValue(vitalType: VitalType, values: Record<string, number>): number | null {
    switch (vitalType) {
      case 'BLOOD_GLUCOSE':
        return values.glucose ?? null;
      case 'PULSE_OXIMETRY':
        return values.oxygen ?? values.spo2 ?? null;
      case 'HEART_RATE':
        return values.heartRate ?? values.pulse ?? null;
      case 'WEIGHT':
        return values.weight ?? null;
      case 'TEMPERATURE':
        return values.temperature ?? null;
      case 'RESPIRATORY_RATE':
        return values.respiratoryRate ?? null;
      case 'BMI':
        return values.bmi ?? null;
      default:
        return null;
    }
  }

  /**
   * Get all organization thresholds
   */
  async getOrganizationThresholds(organizationId: string): Promise<{
    vitalType: VitalType;
    config: ThresholdConfig;
    isCustom: boolean;
  }[]> {
    const orgThresholds = await prisma.vitalThreshold.findMany({
      where: { organizationId, isActive: true },
    });

    const thresholdMap = new Map(orgThresholds.map(t => [t.vitalType, t]));
    const allTypes = Object.keys(SYSTEM_DEFAULTS) as VitalType[];

    return allTypes.map(vitalType => {
      const orgThreshold = thresholdMap.get(vitalType);
      if (orgThreshold) {
        return {
          vitalType,
          config: {
            warningMin: orgThreshold.warningMin,
            warningMax: orgThreshold.warningMax,
            criticalMin: orgThreshold.criticalMin,
            criticalMax: orgThreshold.criticalMax,
            warningMinSecondary: orgThreshold.warningMinSecondary,
            warningMaxSecondary: orgThreshold.warningMaxSecondary,
            criticalMinSecondary: orgThreshold.criticalMinSecondary,
            criticalMaxSecondary: orgThreshold.criticalMaxSecondary,
            unit: orgThreshold.unit,
          },
          isCustom: true,
        };
      }
      return {
        vitalType,
        config: this.getSystemDefaults(vitalType),
        isCustom: false,
      };
    });
  }

  /**
   * Set organization-level thresholds
   */
  async setOrganizationThresholds(
    organizationId: string,
    vitalType: VitalType,
    data: SetThresholdData
  ): Promise<ThresholdConfig> {
    const systemDefaults = this.getSystemDefaults(vitalType);

    const threshold = await prisma.vitalThreshold.upsert({
      where: {
        organizationId_vitalType: {
          organizationId,
          vitalType,
        },
      },
      update: {
        warningMin: data.warningMin ?? null,
        warningMax: data.warningMax ?? null,
        criticalMin: data.criticalMin ?? null,
        criticalMax: data.criticalMax ?? null,
        warningMinSecondary: data.warningMinSecondary ?? null,
        warningMaxSecondary: data.warningMaxSecondary ?? null,
        criticalMinSecondary: data.criticalMinSecondary ?? null,
        criticalMaxSecondary: data.criticalMaxSecondary ?? null,
        unit: data.unit || systemDefaults.unit,
        isActive: true,
      },
      create: {
        organizationId,
        vitalType,
        warningMin: data.warningMin ?? null,
        warningMax: data.warningMax ?? null,
        criticalMin: data.criticalMin ?? null,
        criticalMax: data.criticalMax ?? null,
        warningMinSecondary: data.warningMinSecondary ?? null,
        warningMaxSecondary: data.warningMaxSecondary ?? null,
        criticalMinSecondary: data.criticalMinSecondary ?? null,
        criticalMaxSecondary: data.criticalMaxSecondary ?? null,
        unit: data.unit || systemDefaults.unit,
        isActive: true,
      },
    });

    log.info('[THRESHOLD] Organization threshold updated', {
      organizationId,
      vitalType,
    });

    return {
      warningMin: threshold.warningMin,
      warningMax: threshold.warningMax,
      criticalMin: threshold.criticalMin,
      criticalMax: threshold.criticalMax,
      warningMinSecondary: threshold.warningMinSecondary,
      warningMaxSecondary: threshold.warningMaxSecondary,
      criticalMinSecondary: threshold.criticalMinSecondary,
      criticalMaxSecondary: threshold.criticalMaxSecondary,
      unit: threshold.unit,
    };
  }

  /**
   * Get patient-specific thresholds
   */
  async getPatientThresholds(
    patientId: string,
    organizationId: string
  ): Promise<{
    vitalType: VitalType;
    config: ThresholdConfig;
    isCustom: boolean;
    notes?: string;
  }[]> {
    const patientThresholds = await prisma.patientVitalThreshold.findMany({
      where: { patientId, organizationId },
    });

    const thresholdMap = new Map(patientThresholds.map(t => [t.vitalType, t]));
    const allTypes = Object.keys(SYSTEM_DEFAULTS) as VitalType[];

    const results = await Promise.all(
      allTypes.map(async vitalType => {
        const patientThreshold = thresholdMap.get(vitalType);
        if (patientThreshold && patientThreshold.useCustomThresholds) {
          return {
            vitalType,
            config: {
              warningMin: patientThreshold.warningMin,
              warningMax: patientThreshold.warningMax,
              criticalMin: patientThreshold.criticalMin,
              criticalMax: patientThreshold.criticalMax,
              warningMinSecondary: patientThreshold.warningMinSecondary,
              warningMaxSecondary: patientThreshold.warningMaxSecondary,
              criticalMinSecondary: patientThreshold.criticalMinSecondary,
              criticalMaxSecondary: patientThreshold.criticalMaxSecondary,
              unit: this.getSystemDefaults(vitalType).unit,
            },
            isCustom: true,
            notes: patientThreshold.notes || undefined,
          };
        }
        // Use effective thresholds (org or system defaults)
        const effectiveConfig = await this.getEffectiveThresholds(patientId, organizationId, vitalType);
        return {
          vitalType,
          config: effectiveConfig,
          isCustom: false,
        };
      })
    );

    return results;
  }

  /**
   * Set patient-specific thresholds
   */
  async setPatientThresholds(
    patientId: string,
    organizationId: string,
    vitalType: VitalType,
    data: SetPatientThresholdData,
    createdById?: string
  ): Promise<ThresholdConfig & { notes?: string }> {
    const threshold = await prisma.patientVitalThreshold.upsert({
      where: {
        patientId_vitalType: {
          patientId,
          vitalType,
        },
      },
      update: {
        warningMin: data.warningMin ?? null,
        warningMax: data.warningMax ?? null,
        criticalMin: data.criticalMin ?? null,
        criticalMax: data.criticalMax ?? null,
        warningMinSecondary: data.warningMinSecondary ?? null,
        warningMaxSecondary: data.warningMaxSecondary ?? null,
        criticalMinSecondary: data.criticalMinSecondary ?? null,
        criticalMaxSecondary: data.criticalMaxSecondary ?? null,
        notes: data.notes,
        useCustomThresholds: data.useCustomThresholds ?? true,
      },
      create: {
        patientId,
        organizationId,
        vitalType,
        warningMin: data.warningMin ?? null,
        warningMax: data.warningMax ?? null,
        criticalMin: data.criticalMin ?? null,
        criticalMax: data.criticalMax ?? null,
        warningMinSecondary: data.warningMinSecondary ?? null,
        warningMaxSecondary: data.warningMaxSecondary ?? null,
        criticalMinSecondary: data.criticalMinSecondary ?? null,
        criticalMaxSecondary: data.criticalMaxSecondary ?? null,
        notes: data.notes,
        useCustomThresholds: data.useCustomThresholds ?? true,
        createdById,
      },
    });

    log.info('[THRESHOLD] Patient threshold updated', {
      patientId,
      vitalType,
      createdById,
    });

    return {
      warningMin: threshold.warningMin,
      warningMax: threshold.warningMax,
      criticalMin: threshold.criticalMin,
      criticalMax: threshold.criticalMax,
      warningMinSecondary: threshold.warningMinSecondary,
      warningMaxSecondary: threshold.warningMaxSecondary,
      criticalMinSecondary: threshold.criticalMinSecondary,
      criticalMaxSecondary: threshold.criticalMaxSecondary,
      unit: this.getSystemDefaults(vitalType).unit,
      notes: threshold.notes || undefined,
    };
  }

  /**
   * Reset patient threshold to use organization defaults
   */
  async resetPatientThreshold(
    patientId: string,
    vitalType: VitalType
  ): Promise<void> {
    await prisma.patientVitalThreshold.deleteMany({
      where: {
        patientId,
        vitalType,
      },
    });

    log.info('[THRESHOLD] Patient threshold reset to default', {
      patientId,
      vitalType,
    });
  }

  /**
   * Reset organization threshold to system defaults
   */
  async resetOrganizationThreshold(
    organizationId: string,
    vitalType: VitalType
  ): Promise<void> {
    await prisma.vitalThreshold.deleteMany({
      where: {
        organizationId,
        vitalType,
      },
    });

    log.info('[THRESHOLD] Organization threshold reset to system defaults', {
      organizationId,
      vitalType,
    });
  }
}

export const thresholdService = new ThresholdService();
