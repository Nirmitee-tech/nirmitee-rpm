/**
 * Device Webhook Service
 * Handles incoming webhooks from device vendors (iHealth, Withings, Bodytrace, etc.)
 */

import { prisma } from '../utils/prisma';
import {
  DeviceHub,
  DeviceWebhookLog,
  WebhookProcessStatus,
  PairingStatus,
  DeviceType,
  VitalType,
  DataSource,
  Prisma,
} from '@prisma/client';
import crypto from 'crypto';
import { vitalsService } from './vitals-service';

interface WebhookPayload {
  vendor: string;
  eventType: string;
  timestamp?: string;
  deviceId?: string;
  externalDeviceId?: string;
  data: Record<string, unknown>;
  signature?: string;
}

interface ProcessedReading {
  deviceId: string;
  patientId: string;
  type: VitalType;
  values: Record<string, unknown>;
  unit: string;
  recordedAt: Date;
}

class DeviceWebhookService {
  /**
   * Process incoming webhook from device vendor
   */
  async processWebhook(
    hubId: string,
    payload: WebhookPayload,
    signature?: string
  ): Promise<DeviceWebhookLog> {
    // Get the hub
    const hub = await prisma.deviceHub.findUnique({
      where: { id: hubId },
    });

    if (!hub) {
      throw new Error('Device hub not found');
    }

    // Create webhook log entry
    const webhookLog = await prisma.deviceWebhookLog.create({
      data: {
        organizationId: hub.organizationId,
        hubId: hub.id,
        eventType: payload.eventType,
        payload: payload as unknown as Prisma.InputJsonValue,
        receivedAt: new Date(),
        status: WebhookProcessStatus.PROCESSING,
      },
    });

    try {
      // Validate signature if webhook secret is configured
      if (hub.webhookSecret && signature) {
        const isValid = this.validateSignature(
          hub.webhookSecret,
          JSON.stringify(payload),
          signature,
          hub.vendor
        );
        if (!isValid) {
          await this.updateWebhookStatus(webhookLog.id, WebhookProcessStatus.FAILED, 'Invalid signature');
          throw new Error('Invalid webhook signature');
        }
      }

      // Process based on vendor
      let result: ProcessedReading | null = null;

      switch (hub.vendor.toLowerCase()) {
        case 'ihealth':
          result = await this.processIHealthWebhook(hub, payload);
          break;
        case 'withings':
          result = await this.processWithingsWebhook(hub, payload);
          break;
        case 'bodytrace':
          result = await this.processBodytraceWebhook(hub, payload);
          break;
        default:
          result = await this.processGenericWebhook(hub, payload);
      }

      if (result) {
        // Create vital reading (system action, no user ID)
        // Convert values to Record<string, number> for the API
        const numericValues: Record<string, number> = {};
        for (const [key, val] of Object.entries(result.values)) {
          if (typeof val === 'number') {
            numericValues[key] = val;
          }
        }

        await vitalsService.createReading(
          'system', // System user for device webhooks
          hub.organizationId,
          {
            patientId: result.patientId,
            type: result.type,
            values: numericValues,
            unit: result.unit,
            recordedAt: result.recordedAt.toISOString(),
          }
        );
      }

      await this.updateWebhookStatus(webhookLog.id, WebhookProcessStatus.PROCESSED);
      return webhookLog;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      await this.updateWebhookStatus(webhookLog.id, WebhookProcessStatus.FAILED, errorMessage);
      throw error;
    }
  }

  /**
   * Validate webhook signature
   */
  private validateSignature(
    secret: string,
    payload: string,
    signature: string,
    vendor: string
  ): boolean {
    let expectedSignature: string;

    switch (vendor.toLowerCase()) {
      case 'ihealth':
        // iHealth uses HMAC-SHA256
        expectedSignature = crypto
          .createHmac('sha256', secret)
          .update(payload)
          .digest('hex');
        break;
      case 'withings':
        // Withings uses SHA1
        expectedSignature = crypto
          .createHmac('sha1', secret)
          .update(payload)
          .digest('hex');
        break;
      default:
        // Default to HMAC-SHA256
        expectedSignature = crypto
          .createHmac('sha256', secret)
          .update(payload)
          .digest('hex');
    }

    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    );
  }

  /**
   * Process iHealth webhook
   */
  private async processIHealthWebhook(
    hub: DeviceHub,
    payload: WebhookPayload
  ): Promise<ProcessedReading | null> {
    const { eventType, data, externalDeviceId } = payload;

    // Find paired device
    const pairing = await this.findPairing(hub.id, externalDeviceId);
    if (!pairing) {
      console.warn(`No pairing found for iHealth device: ${externalDeviceId}`);
      return null;
    }

    const device = await prisma.device.findUnique({
      where: { id: pairing.deviceId },
      include: { patient: true },
    });

    if (!device) return null;

    // Parse iHealth data based on event type
    switch (eventType) {
      case 'bp_measurement':
        return {
          deviceId: device.id,
          patientId: device.patientId,
          type: VitalType.BLOOD_PRESSURE,
          values: {
            systolic: data.systolic as number,
            diastolic: data.diastolic as number,
            pulse: data.pulse as number,
          },
          unit: 'mmHg',
          recordedAt: new Date(data.measurementTime as string || Date.now()),
        };
      case 'weight_measurement':
        return {
          deviceId: device.id,
          patientId: device.patientId,
          type: VitalType.WEIGHT,
          values: {
            weight: data.weight as number,
          },
          unit: data.unit as string || 'kg',
          recordedAt: new Date(data.measurementTime as string || Date.now()),
        };
      case 'glucose_measurement':
        return {
          deviceId: device.id,
          patientId: device.patientId,
          type: VitalType.BLOOD_GLUCOSE,
          values: {
            glucose: data.glucose as number,
            mealContext: data.mealContext as string || 'unknown',
          },
          unit: 'mg/dL',
          recordedAt: new Date(data.measurementTime as string || Date.now()),
        };
      case 'spo2_measurement':
        return {
          deviceId: device.id,
          patientId: device.patientId,
          type: VitalType.PULSE_OXIMETRY,
          values: {
            spo2: data.spo2 as number,
            pulse: data.pulse as number,
          },
          unit: '%',
          recordedAt: new Date(data.measurementTime as string || Date.now()),
        };
      default:
        console.warn(`Unknown iHealth event type: ${eventType}`);
        return null;
    }
  }

  /**
   * Process Withings webhook
   */
  private async processWithingsWebhook(
    hub: DeviceHub,
    payload: WebhookPayload
  ): Promise<ProcessedReading | null> {
    const { eventType, data, externalDeviceId } = payload;

    const pairing = await this.findPairing(hub.id, externalDeviceId);
    if (!pairing) return null;

    const device = await prisma.device.findUnique({
      where: { id: pairing.deviceId },
      include: { patient: true },
    });

    if (!device) return null;

    // Withings appli values
    switch (eventType) {
      case '1': // Weight
        return {
          deviceId: device.id,
          patientId: device.patientId,
          type: VitalType.WEIGHT,
          values: {
            weight: (data.weight as number) / 1000, // Withings sends in grams
            fatMass: data.fat_mass_weight ? (data.fat_mass_weight as number) / 1000 : undefined,
            muscleMass: data.muscle_mass_weight ? (data.muscle_mass_weight as number) / 1000 : undefined,
          },
          unit: 'kg',
          recordedAt: new Date((data.date as number) * 1000),
        };
      case '4': // Blood Pressure
        return {
          deviceId: device.id,
          patientId: device.patientId,
          type: VitalType.BLOOD_PRESSURE,
          values: {
            systolic: data.systolic as number,
            diastolic: data.diastolic as number,
            pulse: data.heart_pulse as number,
          },
          unit: 'mmHg',
          recordedAt: new Date((data.date as number) * 1000),
        };
      default:
        return null;
    }
  }

  /**
   * Process Bodytrace webhook
   */
  private async processBodytraceWebhook(
    hub: DeviceHub,
    payload: WebhookPayload
  ): Promise<ProcessedReading | null> {
    const { eventType, data, externalDeviceId } = payload;

    const pairing = await this.findPairing(hub.id, externalDeviceId);
    if (!pairing) return null;

    const device = await prisma.device.findUnique({
      where: { id: pairing.deviceId },
    });

    if (!device) return null;

    // Bodytrace event types
    switch (eventType) {
      case 'reading':
        // Parse based on device type
        switch (data.deviceType) {
          case 'bp':
            return {
              deviceId: device.id,
              patientId: device.patientId,
              type: VitalType.BLOOD_PRESSURE,
              values: {
                systolic: data.systolic as number,
                diastolic: data.diastolic as number,
                pulse: data.pulse as number,
              },
              unit: 'mmHg',
              recordedAt: new Date(data.timestamp as string),
            };
          case 'scale':
            return {
              deviceId: device.id,
              patientId: device.patientId,
              type: VitalType.WEIGHT,
              values: { weight: data.weight as number },
              unit: 'lbs',
              recordedAt: new Date(data.timestamp as string),
            };
          case 'glucometer':
            return {
              deviceId: device.id,
              patientId: device.patientId,
              type: VitalType.BLOOD_GLUCOSE,
              values: { glucose: data.glucose as number },
              unit: 'mg/dL',
              recordedAt: new Date(data.timestamp as string),
            };
          default:
            return null;
        }
      default:
        return null;
    }
  }

  /**
   * Process generic webhook (custom integration)
   */
  private async processGenericWebhook(
    hub: DeviceHub,
    payload: WebhookPayload
  ): Promise<ProcessedReading | null> {
    const { data, externalDeviceId } = payload;

    const pairing = await this.findPairing(hub.id, externalDeviceId);
    if (!pairing) return null;

    const device = await prisma.device.findUnique({
      where: { id: pairing.deviceId },
    });

    if (!device) return null;

    // Attempt to parse standard fields
    const vitalType = this.mapDeviceTypeToVitalType(device.type);
    if (!vitalType) return null;

    return {
      deviceId: device.id,
      patientId: device.patientId,
      type: vitalType,
      values: data.values as Record<string, unknown> || data,
      unit: data.unit as string || 'unknown',
      recordedAt: new Date(data.timestamp as string || Date.now()),
    };
  }

  /**
   * Find device pairing by vendor device ID
   */
  private async findPairing(hubId: string, vendorDeviceId?: string) {
    if (!vendorDeviceId) return null;

    return prisma.devicePairing.findFirst({
      where: {
        hubId,
        vendorDeviceId,
        status: PairingStatus.PAIRED,
      },
    });
  }

  /**
   * Map device type to vital type
   */
  private mapDeviceTypeToVitalType(deviceType: DeviceType): VitalType | null {
    const mapping: Record<DeviceType, VitalType> = {
      BLOOD_PRESSURE_MONITOR: VitalType.BLOOD_PRESSURE,
      WEIGHT_SCALE: VitalType.WEIGHT,
      PULSE_OXIMETER: VitalType.PULSE_OXIMETRY,
      GLUCOSE_MONITOR: VitalType.BLOOD_GLUCOSE,
      CONTINUOUS_GLUCOSE_MONITOR: VitalType.BLOOD_GLUCOSE,
      THERMOMETER: VitalType.TEMPERATURE,
      ACTIVITY_TRACKER: VitalType.HEART_RATE,
      ECG_MONITOR: VitalType.HEART_RATE,
      OTHER: VitalType.HEART_RATE,
    };
    return mapping[deviceType] || null;
  }

  /**
   * Update webhook log status
   */
  private async updateWebhookStatus(
    webhookId: string,
    status: WebhookProcessStatus,
    errorMessage?: string
  ): Promise<void> {
    await prisma.deviceWebhookLog.update({
      where: { id: webhookId },
      data: {
        status,
        errorMessage,
        processedAt: new Date(),
      },
    });
  }

  /**
   * Get webhook logs for a hub
   */
  async getWebhookLogs(
    hubId: string,
    organizationId: string,
    options?: {
      status?: WebhookProcessStatus;
      limit?: number;
      offset?: number;
    }
  ): Promise<{ logs: DeviceWebhookLog[]; total: number }> {
    const where: Prisma.DeviceWebhookLogWhereInput = {
      hubId,
      organizationId,
      ...(options?.status && { status: options.status }),
    };

    const [logs, total] = await Promise.all([
      prisma.deviceWebhookLog.findMany({
        where,
        take: options?.limit || 50,
        skip: options?.offset || 0,
        orderBy: { receivedAt: 'desc' },
      }),
      prisma.deviceWebhookLog.count({ where }),
    ]);

    return { logs, total };
  }

  /**
   * Retry failed webhook
   */
  async retryWebhook(
    webhookId: string,
    organizationId: string
  ): Promise<DeviceWebhookLog> {
    const webhook = await prisma.deviceWebhookLog.findFirst({
      where: { id: webhookId, organizationId, status: WebhookProcessStatus.FAILED },
    });

    if (!webhook) {
      throw new Error('Webhook not found or not in failed state');
    }

    // Re-process the webhook
    return this.processWebhook(
      webhook.hubId,
      webhook.payload as unknown as WebhookPayload
    );
  }

  /**
   * Generate webhook URL for a hub
   */
  generateWebhookUrl(hubId: string): string {
    const baseUrl = process.env.API_BASE_URL || 'http://localhost:4000';
    return `${baseUrl}/api/webhooks/device/${hubId}`;
  }
}

export const deviceWebhookService = new DeviceWebhookService();
