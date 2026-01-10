/**
 * Device Telemetry Service
 * Manages device health metrics (battery, signal, firmware)
 */

import { prisma } from '../utils/prisma';
import {
  DeviceTelemetry,
  TelemetryType,
  DeviceFirmware,
  Device,
  DeviceStatus,
  Prisma,
} from '@prisma/client';
import { auditService } from './audit-service';

interface TelemetryInput {
  deviceId: string;
  hubId?: string;
  telemetryType: TelemetryType;
  batteryLevel?: number;
  signalStrength?: number;
  firmwareVersion?: string;
  isOnline?: boolean;
  errorCode?: string;
  errorMessage?: string;
}

interface FirmwareInput {
  organizationId: string;
  deviceType: string;
  version: string;
  releaseNotes?: string;
  downloadUrl?: string;
  checksum?: string;
  lotNumber?: string;
  isRequired?: boolean;
}

interface TelemetryStats {
  totalDevices: number;
  onlineDevices: number;
  lowBatteryDevices: number;
  weakSignalDevices: number;
  avgBatteryLevel: number;
  avgSignalStrength: number;
}

class DeviceTelemetryService {
  private readonly LOW_BATTERY_THRESHOLD = 20;
  private readonly WEAK_SIGNAL_THRESHOLD = -80;
  private readonly CRITICAL_BATTERY_THRESHOLD = 10;

  /**
   * Record device telemetry
   */
  async recordTelemetry(
    input: TelemetryInput,
    organizationId: string
  ): Promise<DeviceTelemetry> {
    const device = await prisma.device.findFirst({
      where: { id: input.deviceId, organizationId },
    });

    if (!device) {
      throw new Error('Device not found');
    }

    const telemetry = await prisma.deviceTelemetry.create({
      data: {
        organizationId,
        deviceId: input.deviceId,
        hubId: input.hubId,
        telemetryType: input.telemetryType,
        batteryLevel: input.batteryLevel,
        signalStrength: input.signalStrength,
        firmwareVersion: input.firmwareVersion,
        isOnline: input.isOnline ?? true,
        errorCode: input.errorCode,
        errorMessage: input.errorMessage,
        recordedAt: new Date(),
      },
    });

    // Check for critical conditions
    await this.checkCriticalConditions(device, input, organizationId);

    return telemetry;
  }

  /**
   * Check for critical telemetry conditions
   */
  private async checkCriticalConditions(
    device: Device,
    telemetry: TelemetryInput,
    organizationId: string
  ): Promise<void> {
    // Critical battery check
    if (
      telemetry.batteryLevel !== undefined &&
      telemetry.batteryLevel <= this.CRITICAL_BATTERY_THRESHOLD
    ) {
      await prisma.alert.create({
        data: {
          patientId: device.patientId,
          organizationId,
          type: 'DEVICE_MALFUNCTION',
          severity: 'CRITICAL',
          status: 'NEW',
          message: `${device.serialNumber}: Critical battery level: ${telemetry.batteryLevel}%`,
          metadata: {
            deviceId: device.id,
            batteryLevel: telemetry.batteryLevel,
          } as Prisma.InputJsonValue,
        },
      });
    }

    // Device offline check
    if (telemetry.isOnline === false) {
      await prisma.device.update({
        where: { id: device.id },
        data: { status: DeviceStatus.INACTIVE },
      });
    }

    // Error condition check
    if (telemetry.errorCode) {
      const criticalErrors = ['SENSOR_FAILURE', 'CALIBRATION_ERROR', 'HARDWARE_ERROR'];
      if (criticalErrors.includes(telemetry.errorCode)) {
        await prisma.device.update({
          where: { id: device.id },
          data: { status: DeviceStatus.MALFUNCTIONING },
        });
      }
    }
  }

  /**
   * Get latest telemetry for a device
   */
  async getLatestTelemetry(
    deviceId: string,
    organizationId: string
  ): Promise<DeviceTelemetry | null> {
    return prisma.deviceTelemetry.findFirst({
      where: { deviceId, organizationId },
      orderBy: { recordedAt: 'desc' },
    });
  }

  /**
   * Get telemetry history for a device
   */
  async getTelemetryHistory(
    deviceId: string,
    organizationId: string,
    options?: {
      telemetryType?: TelemetryType;
      startDate?: Date;
      endDate?: Date;
      limit?: number;
    }
  ): Promise<DeviceTelemetry[]> {
    const where: Prisma.DeviceTelemetryWhereInput = {
      deviceId,
      organizationId,
    };

    if (options?.telemetryType) {
      where.telemetryType = options.telemetryType;
    }

    if (options?.startDate || options?.endDate) {
      where.recordedAt = {};
      if (options.startDate) {
        where.recordedAt.gte = options.startDate;
      }
      if (options.endDate) {
        where.recordedAt.lte = options.endDate;
      }
    }

    return prisma.deviceTelemetry.findMany({
      where,
      orderBy: { recordedAt: 'desc' },
      take: options?.limit || 100,
    });
  }

  /**
   * Get telemetry stats for organization
   */
  async getTelemetryStats(organizationId: string): Promise<TelemetryStats> {
    const devices = await prisma.device.findMany({
      where: { organizationId, status: { not: DeviceStatus.DECOMMISSIONED } },
      select: { id: true },
    });

    const deviceIds = devices.map((d) => d.id);

    const latestTelemetry = await Promise.all(
      deviceIds.map(async (deviceId) => {
        return prisma.deviceTelemetry.findFirst({
          where: { deviceId },
          orderBy: { recordedAt: 'desc' },
        });
      })
    );

    const validTelemetry = latestTelemetry.filter((t): t is DeviceTelemetry => t !== null);

    const onlineDevices = validTelemetry.filter((t) => t.isOnline).length;
    const lowBatteryDevices = validTelemetry.filter(
      (t) => t.batteryLevel !== null && t.batteryLevel <= this.LOW_BATTERY_THRESHOLD
    ).length;
    const weakSignalDevices = validTelemetry.filter(
      (t) => t.signalStrength !== null && t.signalStrength <= this.WEAK_SIGNAL_THRESHOLD
    ).length;

    const batteryLevels = validTelemetry
      .filter((t) => t.batteryLevel !== null)
      .map((t) => t.batteryLevel as number);
    const signalStrengths = validTelemetry
      .filter((t) => t.signalStrength !== null)
      .map((t) => t.signalStrength as number);

    return {
      totalDevices: deviceIds.length,
      onlineDevices,
      lowBatteryDevices,
      weakSignalDevices,
      avgBatteryLevel:
        batteryLevels.length > 0
          ? Math.round(batteryLevels.reduce((a, b) => a + b, 0) / batteryLevels.length)
          : 0,
      avgSignalStrength:
        signalStrengths.length > 0
          ? Math.round(signalStrengths.reduce((a, b) => a + b, 0) / signalStrengths.length)
          : 0,
    };
  }

  /**
   * Get devices with low battery
   */
  async getLowBatteryDevices(organizationId: string): Promise<Device[]> {
    const lowBatteryTelemetry = await prisma.deviceTelemetry.findMany({
      where: {
        organizationId,
        batteryLevel: { lte: this.LOW_BATTERY_THRESHOLD },
        recordedAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
      },
      select: { deviceId: true },
      distinct: ['deviceId'],
    });

    const deviceIds = lowBatteryTelemetry.map((t) => t.deviceId);

    return prisma.device.findMany({
      where: {
        id: { in: deviceIds },
        status: { not: DeviceStatus.DECOMMISSIONED },
      },
      include: { patient: true },
    });
  }

  /**
   * Get offline devices
   */
  async getOfflineDevices(
    organizationId: string,
    hoursThreshold: number = 24
  ): Promise<Device[]> {
    const cutoffTime = new Date(Date.now() - hoursThreshold * 60 * 60 * 1000);

    return prisma.device.findMany({
      where: {
        organizationId,
        status: { in: [DeviceStatus.ACTIVE, DeviceStatus.INACTIVE] },
        OR: [
          { lastSyncAt: null },
          { lastSyncAt: { lt: cutoffTime } },
        ],
      },
      include: { patient: true },
    });
  }

  // ==========================================
  // FIRMWARE MANAGEMENT
  // ==========================================

  /**
   * Create firmware version
   */
  async createFirmware(
    input: FirmwareInput,
    userId: string
  ): Promise<DeviceFirmware> {
    // Parse deviceType into manufacturer and modelNumber
    const [manufacturer, modelNumber] = input.deviceType.split(':');

    const firmware = await prisma.deviceFirmware.create({
      data: {
        organizationId: input.organizationId,
        manufacturer: manufacturer || input.deviceType,
        modelNumber: modelNumber || 'default',
        version: input.version,
        releaseNotes: input.releaseNotes,
        downloadUrl: input.downloadUrl,
        checksum: input.checksum,
        lotNumber: input.lotNumber,
        isRequired: input.isRequired ?? false,
        isLatest: false,
      },
    });

    await auditService.log({
      action: 'device_firmware.created',
      entity: 'device_firmware',
      entityId: firmware.id,
      organizationId: input.organizationId,
      userId,
      newValues: { version: firmware.version },
    });

    return firmware;
  }

  /**
   * Release firmware version
   */
  async releaseFirmware(
    firmwareId: string,
    organizationId: string,
    userId: string
  ): Promise<DeviceFirmware> {
    const firmware = await prisma.deviceFirmware.findFirst({
      where: { id: firmwareId, organizationId },
    });

    if (!firmware) {
      throw new Error('Firmware not found');
    }

    // Set all other firmware for this model to not latest
    await prisma.deviceFirmware.updateMany({
      where: {
        organizationId,
        manufacturer: firmware.manufacturer,
        modelNumber: firmware.modelNumber,
        isLatest: true,
      },
      data: { isLatest: false },
    });

    const updated = await prisma.deviceFirmware.update({
      where: { id: firmwareId },
      data: {
        isLatest: true,
        releaseDate: new Date(),
      },
    });

    await auditService.log({
      action: 'device_firmware.released',
      entity: 'device_firmware',
      entityId: firmwareId,
      organizationId,
      userId,
      newValues: { isLatest: true },
    });

    return updated;
  }

  /**
   * Deprecate firmware version
   */
  async deprecateFirmware(
    firmwareId: string,
    organizationId: string,
    userId: string
  ): Promise<DeviceFirmware> {
    const firmware = await prisma.deviceFirmware.findFirst({
      where: { id: firmwareId, organizationId },
    });

    if (!firmware) {
      throw new Error('Firmware not found');
    }

    const updated = await prisma.deviceFirmware.update({
      where: { id: firmwareId },
      data: { isLatest: false },
    });

    await auditService.log({
      action: 'device_firmware.deprecated',
      entity: 'device_firmware',
      entityId: firmwareId,
      organizationId,
      userId,
      newValues: { deprecated: true },
    });

    return updated;
  }

  /**
   * Get firmware versions
   */
  async getFirmwareVersions(
    organizationId: string,
    deviceType?: string
  ): Promise<DeviceFirmware[]> {
    const where: Prisma.DeviceFirmwareWhereInput = { organizationId };

    if (deviceType) {
      const [manufacturer, modelNumber] = deviceType.split(':');
      where.manufacturer = manufacturer;
      if (modelNumber) {
        where.modelNumber = modelNumber;
      }
    }

    return prisma.deviceFirmware.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Check if device firmware is up to date
   */
  async checkFirmwareStatus(
    deviceId: string,
    organizationId: string
  ): Promise<{
    isUpToDate: boolean;
    currentVersion: string | null;
    latestVersion: string | null;
    updateRequired: boolean;
  }> {
    const device = await prisma.device.findFirst({
      where: { id: deviceId, organizationId },
    });

    if (!device) {
      throw new Error('Device not found');
    }

    const latestTelemetry = await this.getLatestTelemetry(deviceId, organizationId);
    const currentVersion = latestTelemetry?.firmwareVersion || null;

    const latestFirmware = await prisma.deviceFirmware.findFirst({
      where: {
        organizationId,
        manufacturer: device.manufacturer || 'default',
        isLatest: true,
      },
      orderBy: { releaseDate: 'desc' },
    });

    const isUpToDate = currentVersion === latestFirmware?.version;
    const updateRequired = (latestFirmware?.isRequired && !isUpToDate) || false;

    return {
      isUpToDate,
      currentVersion,
      latestVersion: latestFirmware?.version || null,
      updateRequired,
    };
  }
}

export const deviceTelemetryService = new DeviceTelemetryService();
