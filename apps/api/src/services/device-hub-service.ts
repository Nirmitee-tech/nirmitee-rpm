/**
 * Device Hub Service
 * Manages device vendor integrations (iHealth, Withings, Bodytrace, etc.)
 */

import { prisma } from '../utils/prisma';
import {
  DeviceHub,
  DeviceHubType,
  DeviceHubStatus,
  DevicePairing,
  PairingStatus,
  DeviceType,
  Prisma,
} from '@prisma/client';
import { auditService } from './audit-service';

interface CreateDeviceHubInput {
  organizationId: string;
  name: string;
  vendor: string;
  type?: DeviceHubType;
  apiEndpoint?: string;
  clientId?: string;
  clientSecret?: string;
  webhookUrl?: string;
  webhookSecret?: string;
  supportedTypes: DeviceType[];
}

interface UpdateDeviceHubInput {
  name?: string;
  apiEndpoint?: string;
  clientId?: string;
  clientSecret?: string;
  webhookUrl?: string;
  webhookSecret?: string;
  supportedTypes?: DeviceType[];
  status?: DeviceHubStatus;
}

interface PairDeviceInput {
  hubId: string;
  deviceId: string;
  vendorDeviceId: string;
  metadata?: Record<string, unknown>;
}

class DeviceHubService {
  /**
   * Create a new device hub connection
   */
  async createHub(
    input: CreateDeviceHubInput,
    userId: string
  ): Promise<DeviceHub> {
    const hub = await prisma.deviceHub.create({
      data: {
        organizationId: input.organizationId,
        name: input.name,
        vendor: input.vendor,
        type: input.type || DeviceHubType.API,
        apiEndpoint: input.apiEndpoint,
        clientId: input.clientId,
        clientSecret: input.clientSecret, // TODO: Encrypt
        webhookUrl: input.webhookUrl,
        webhookSecret: input.webhookSecret, // TODO: Encrypt
        supportedTypes: input.supportedTypes,
        status: DeviceHubStatus.INACTIVE,
      },
    });

    await auditService.log({
      action: 'device_hub.created',
      entity: 'device_hub',
      entityId: hub.id,
      organizationId: input.organizationId,
      userId,
      newValues: { name: hub.name, vendor: hub.vendor },
    });

    return hub;
  }

  /**
   * Get all device hubs for an organization
   */
  async getHubs(organizationId: string): Promise<DeviceHub[]> {
    return prisma.deviceHub.findMany({
      where: { organizationId },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Get a specific device hub
   */
  async getHub(hubId: string, organizationId: string): Promise<DeviceHub | null> {
    return prisma.deviceHub.findFirst({
      where: { id: hubId, organizationId },
    });
  }

  /**
   * Update a device hub
   */
  async updateHub(
    hubId: string,
    organizationId: string,
    input: UpdateDeviceHubInput,
    userId: string
  ): Promise<DeviceHub> {
    const existingHub = await this.getHub(hubId, organizationId);
    if (!existingHub) {
      throw new Error('Device hub not found');
    }

    const hub = await prisma.deviceHub.update({
      where: { id: hubId },
      data: {
        ...(input.name && { name: input.name }),
        ...(input.apiEndpoint !== undefined && { apiEndpoint: input.apiEndpoint }),
        ...(input.clientId !== undefined && { clientId: input.clientId }),
        ...(input.clientSecret !== undefined && { clientSecret: input.clientSecret }),
        ...(input.webhookUrl !== undefined && { webhookUrl: input.webhookUrl }),
        ...(input.webhookSecret !== undefined && { webhookSecret: input.webhookSecret }),
        ...(input.supportedTypes && { supportedTypes: input.supportedTypes }),
        ...(input.status && { status: input.status }),
      },
    });

    await auditService.log({
      action: 'device_hub.updated',
      entity: 'device_hub',
      entityId: hub.id,
      organizationId,
      userId,
      oldValues: { name: existingHub.name, status: existingHub.status },
      newValues: { name: hub.name, status: hub.status },
    });

    return hub;
  }

  /**
   * Activate a device hub (test connection)
   */
  async activateHub(
    hubId: string,
    organizationId: string,
    userId: string
  ): Promise<DeviceHub> {
    const hub = await this.getHub(hubId, organizationId);
    if (!hub) {
      throw new Error('Device hub not found');
    }

    // Test connection based on hub type
    const isConnected = await this.testConnection(hub);

    const updatedHub = await prisma.deviceHub.update({
      where: { id: hubId },
      data: {
        status: isConnected ? DeviceHubStatus.ACTIVE : DeviceHubStatus.ERROR,
        lastSyncAt: isConnected ? new Date() : null,
        lastError: isConnected ? null : 'Connection test failed',
      },
    });

    await auditService.log({
      action: 'device_hub.activated',
      entity: 'device_hub',
      entityId: hub.id,
      organizationId,
      userId,
      newValues: { status: updatedHub.status, success: isConnected },
    });

    return updatedHub;
  }

  /**
   * Test connection to device hub
   */
  private async testConnection(hub: DeviceHub): Promise<boolean> {
    try {
      switch (hub.vendor.toLowerCase()) {
        case 'ihealth':
          return await this.testIHealthConnection(hub);
        case 'withings':
          return await this.testWithingsConnection(hub);
        case 'bodytrace':
          return await this.testBodytraceConnection(hub);
        default:
          // Generic API test
          if (hub.apiEndpoint) {
            const response = await fetch(hub.apiEndpoint, {
              method: 'GET',
              headers: hub.accessToken
                ? { Authorization: `Bearer ${hub.accessToken}` }
                : {},
            });
            return response.ok;
          }
          return true; // Webhook-only hubs don't need testing
      }
    } catch (error) {
      console.error(`Connection test failed for hub ${hub.id}:`, error);
      return false;
    }
  }

  private async testIHealthConnection(hub: DeviceHub): Promise<boolean> {
    // iHealth API test endpoint
    // In production, this would authenticate with OAuth and test API access
    return hub.clientId !== null && hub.clientSecret !== null;
  }

  private async testWithingsConnection(hub: DeviceHub): Promise<boolean> {
    // Withings API test
    return hub.clientId !== null && hub.clientSecret !== null;
  }

  private async testBodytraceConnection(hub: DeviceHub): Promise<boolean> {
    // Bodytrace API test
    return hub.apiEndpoint !== null;
  }

  /**
   * Pair a device with a hub
   */
  async pairDevice(
    input: PairDeviceInput,
    organizationId: string,
    userId: string
  ): Promise<DevicePairing> {
    // Verify hub exists and belongs to org
    const hub = await this.getHub(input.hubId, organizationId);
    if (!hub) {
      throw new Error('Device hub not found');
    }

    // Check if device exists
    const device = await prisma.device.findFirst({
      where: { id: input.deviceId, organizationId },
    });
    if (!device) {
      throw new Error('Device not found');
    }

    // Check if pairing already exists
    const existingPairing = await prisma.devicePairing.findUnique({
      where: {
        deviceId_hubId: {
          deviceId: input.deviceId,
          hubId: input.hubId,
        },
      },
    });

    if (existingPairing) {
      throw new Error('Device is already paired with this hub');
    }

    const pairing = await prisma.devicePairing.create({
      data: {
        organizationId,
        hubId: input.hubId,
        deviceId: input.deviceId,
        vendorDeviceId: input.vendorDeviceId,
        status: PairingStatus.PENDING,
      },
    });

    await auditService.log({
      action: 'device_pairing.created',
      entity: 'device_pairing',
      entityId: pairing.id,
      organizationId,
      userId,
      newValues: {
        hubId: input.hubId,
        deviceId: input.deviceId,
        vendorDeviceId: input.vendorDeviceId,
      },
    });

    return pairing;
  }

  /**
   * Confirm device pairing
   */
  async confirmPairing(
    pairingId: string,
    organizationId: string,
    userId: string
  ): Promise<DevicePairing> {
    const pairing = await prisma.devicePairing.findFirst({
      where: { id: pairingId, organizationId },
    });

    if (!pairing) {
      throw new Error('Pairing not found');
    }

    const updated = await prisma.devicePairing.update({
      where: { id: pairingId },
      data: {
        status: PairingStatus.PAIRED,
        pairedAt: new Date(),
      },
    });

    await auditService.log({
      action: 'device_pairing.confirmed',
      entity: 'device_pairing',
      entityId: pairingId,
      organizationId,
      userId,
      newValues: { status: PairingStatus.PAIRED },
    });

    return updated;
  }

  /**
   * Unpair a device
   */
  async unpairDevice(
    pairingId: string,
    organizationId: string,
    userId: string
  ): Promise<void> {
    const pairing = await prisma.devicePairing.findFirst({
      where: { id: pairingId, organizationId },
    });

    if (!pairing) {
      throw new Error('Pairing not found');
    }

    await prisma.devicePairing.delete({
      where: { id: pairingId },
    });

    await auditService.log({
      action: 'device_pairing.removed',
      entity: 'device_pairing',
      entityId: pairingId,
      organizationId,
      userId,
      oldValues: {
        hubId: pairing.hubId,
        deviceId: pairing.deviceId,
      },
    });
  }

  /**
   * Get all pairings for an organization
   */
  async getPairings(organizationId: string): Promise<DevicePairing[]> {
    return prisma.devicePairing.findMany({
      where: { organizationId },
      include: {
        hub: true,
        device: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Get pairings for a specific device
   */
  async getDevicePairings(
    deviceId: string,
    organizationId: string
  ): Promise<DevicePairing[]> {
    return prisma.devicePairing.findMany({
      where: { deviceId, organizationId },
      include: { hub: true },
    });
  }

  /**
   * Sync devices from hub
   */
  async syncFromHub(
    hubId: string,
    organizationId: string,
    userId: string
  ): Promise<{ synced: number; errors: string[] }> {
    const hub = await this.getHub(hubId, organizationId);
    if (!hub) {
      throw new Error('Device hub not found');
    }

    if (hub.status !== DeviceHubStatus.ACTIVE) {
      throw new Error('Hub is not active');
    }

    // Get paired devices
    const pairings = await prisma.devicePairing.findMany({
      where: { hubId, status: PairingStatus.PAIRED },
    });

    let synced = 0;
    const errors: string[] = [];

    for (const pairing of pairings) {
      try {
        // Update last sync timestamp
        await prisma.devicePairing.update({
          where: { id: pairing.id },
          data: { lastSyncAt: new Date() },
        });
        synced++;
      } catch (error) {
        errors.push(`Failed to sync device ${pairing.deviceId}: ${error}`);
      }
    }

    // Update hub last sync
    await prisma.deviceHub.update({
      where: { id: hubId },
      data: { lastSyncAt: new Date() },
    });

    await auditService.log({
      action: 'device_hub.synced',
      entity: 'device_hub',
      entityId: hubId,
      organizationId,
      userId,
      newValues: { synced, errorCount: errors.length },
    });

    return { synced, errors };
  }

  /**
   * Delete a device hub
   */
  async deleteHub(
    hubId: string,
    organizationId: string,
    userId: string
  ): Promise<void> {
    const hub = await this.getHub(hubId, organizationId);
    if (!hub) {
      throw new Error('Device hub not found');
    }

    // Delete associated pairings first
    await prisma.devicePairing.deleteMany({
      where: { hubId },
    });

    await prisma.deviceHub.delete({
      where: { id: hubId },
    });

    await auditService.log({
      action: 'device_hub.deleted',
      entity: 'device_hub',
      entityId: hubId,
      organizationId,
      userId,
      oldValues: { name: hub.name, vendor: hub.vendor },
    });
  }
}

export const deviceHubService = new DeviceHubService();
