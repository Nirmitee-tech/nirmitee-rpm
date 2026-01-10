/**
 * Device Inventory Service
 * Manages device logistics, QR pairing, troubleshooting, and resupply
 */

import { prisma } from '../utils/prisma';
import {
  DeviceInventory,
  InventoryStatus,
  DeviceShipment,
  ShipmentStatus,
  ShipmentType,
  TroubleshootingLog,
  TroubleshootingStatus,
  TroubleshootingIssue,
  IssueSeverity,
  ResupplyTicket,
  ResupplyStatus,
  ResupplyType,
  DeviceType,
  Prisma,
} from '@prisma/client';
import { auditService } from './audit-service';
import crypto from 'crypto';

interface AddInventoryInput {
  organizationId: string;
  serialNumber: string;
  deviceType: DeviceType;
  manufacturer: string;
  model: string;
  lotNumber?: string;
  purchaseDate?: Date;
  warrantyExpiration?: Date;
  purchasePrice?: number;
}

interface CreateShipmentInput {
  organizationId: string;
  shipmentType: ShipmentType;
  recipientId?: string;
  recipientType: string;
  recipientName: string;
  shippingAddress: {
    street: string;
    city: string;
    state: string;
    zip: string;
    country?: string;
  };
  items: Array<{ inventoryId: string; notes?: string }>;
  carrier?: string;
  shippingMethod?: string;
}

interface LogTroubleshootingInput {
  organizationId: string;
  patientId?: string;
  deviceId?: string;
  inventoryId?: string;
  issueType: TroubleshootingIssue;
  issueDescription: string;
  severity?: IssueSeverity;
  reportedBy?: string;
}

interface CreateResupplyInput {
  organizationId: string;
  patientId: string;
  ticketType: ResupplyType;
  items: Array<{ deviceType: DeviceType; quantity: number; reason?: string }>;
  notes?: string;
  priority?: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
}

class DeviceInventoryService {
  /**
   * Add device to inventory
   */
  async addToInventory(
    input: AddInventoryInput,
    userId: string
  ): Promise<DeviceInventory> {
    const qrCode = this.generateQRCode(input.serialNumber);

    const inventory = await prisma.deviceInventory.create({
      data: {
        organizationId: input.organizationId,
        serialNumber: input.serialNumber,
        deviceType: input.deviceType,
        manufacturer: input.manufacturer,
        model: input.model,
        lotNumber: input.lotNumber,
        status: InventoryStatus.IN_STOCK,
        qrCode,
        purchaseDate: input.purchaseDate,
        warrantyExpiry: input.warrantyExpiration,
        unitCost: input.purchasePrice,
      },
    });

    await auditService.log({
      action: 'inventory.created',
      entity: 'inventory_item',
      entityId: inventory.id,
      organizationId: input.organizationId,
      userId,
      newValues: {
        serialNumber: input.serialNumber,
        deviceType: input.deviceType,
      },
    });

    return inventory;
  }

  /**
   * Bulk import inventory
   */
  async bulkImport(
    items: AddInventoryInput[],
    organizationId: string,
    userId: string
  ): Promise<{ imported: number; errors: string[] }> {
    const errors: string[] = [];
    let imported = 0;

    for (const item of items) {
      try {
        await this.addToInventory({ ...item, organizationId }, userId);
        imported++;
      } catch (error) {
        errors.push(`Failed to import ${item.serialNumber}: ${error}`);
      }
    }

    return { imported, errors };
  }

  /**
   * Get inventory by organization
   */
  async getInventory(
    organizationId: string,
    options?: {
      status?: InventoryStatus;
      deviceType?: DeviceType;
      search?: string;
      limit?: number;
      offset?: number;
    }
  ): Promise<{ items: DeviceInventory[]; total: number }> {
    const where: Prisma.DeviceInventoryWhereInput = {
      organizationId,
      ...(options?.status && { status: options.status }),
      ...(options?.deviceType && { deviceType: options.deviceType }),
      ...(options?.search && {
        OR: [
          { serialNumber: { contains: options.search, mode: 'insensitive' as const } },
          { model: { contains: options.search, mode: 'insensitive' as const } },
        ],
      }),
    };

    const [items, total] = await Promise.all([
      prisma.deviceInventory.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: options?.limit || 50,
        skip: options?.offset || 0,
      }),
      prisma.deviceInventory.count({ where }),
    ]);

    return { items, total };
  }

  /**
   * Get inventory item by ID
   */
  async getInventoryItem(
    inventoryId: string,
    organizationId: string
  ): Promise<DeviceInventory | null> {
    return prisma.deviceInventory.findFirst({
      where: { id: inventoryId, organizationId },
    });
  }

  /**
   * Get inventory by QR code
   */
  async getByQRCode(
    qrCode: string,
    organizationId: string
  ): Promise<DeviceInventory | null> {
    return prisma.deviceInventory.findFirst({
      where: { qrCode, organizationId },
    });
  }

  /**
   * Update inventory status
   */
  async updateStatus(
    inventoryId: string,
    organizationId: string,
    status: InventoryStatus,
    userId: string,
    notes?: string
  ): Promise<DeviceInventory> {
    const inventory = await this.getInventoryItem(inventoryId, organizationId);
    if (!inventory) {
      throw new Error('Inventory item not found');
    }

    const updated = await prisma.deviceInventory.update({
      where: { id: inventoryId },
      data: {
        status,
        notes: notes || inventory.notes,
        ...(status === InventoryStatus.ASSIGNED && { assignedAt: new Date() }),
      },
    });

    await auditService.log({
      action: 'inventory.status_changed',
      entity: 'inventory_item',
      entityId: inventoryId,
      organizationId,
      userId,
      oldValues: { status: inventory.status },
      newValues: { status },
    });

    return updated;
  }

  /**
   * Pair device with patient via QR code
   */
  async pairByQRCode(
    qrCode: string,
    patientId: string,
    organizationId: string,
    userId: string
  ): Promise<{ inventory: DeviceInventory; device: unknown }> {
    const inventory = await this.getByQRCode(qrCode, organizationId);
    if (!inventory) {
      throw new Error('Device not found');
    }

    if (inventory.status !== InventoryStatus.IN_STOCK) {
      throw new Error('Device is not available for pairing');
    }

    // Create device record
    const device = await prisma.device.create({
      data: {
        patientId,
        organizationId,
        type: inventory.deviceType,
        serialNumber: inventory.serialNumber,
        manufacturer: inventory.manufacturer,
        model: inventory.model,
        status: 'ACTIVE',
        assignedAt: new Date(),
      },
    });

    // Update inventory status
    const updatedInventory = await prisma.deviceInventory.update({
      where: { id: inventory.id },
      data: {
        status: InventoryStatus.ASSIGNED,
        assignedPatientId: patientId,
        assignedDeviceId: device.id,
        assignedAt: new Date(),
      },
    });

    await auditService.log({
      action: 'inventory.assigned',
      entity: 'inventory_item',
      entityId: inventory.id,
      organizationId,
      userId,
      newValues: {
        qrCode,
        patientId,
        serialNumber: inventory.serialNumber,
      },
    });

    return { inventory: updatedInventory, device };
  }

  /**
   * Generate QR code for device
   */
  private generateQRCode(serialNumber: string): string {
    const timestamp = Date.now().toString(36);
    const random = crypto.randomBytes(4).toString('hex');
    return `RPM-${serialNumber.slice(-6)}-${timestamp}-${random}`.toUpperCase();
  }

  // ==========================================
  // SHIPMENT MANAGEMENT
  // ==========================================

  /**
   * Create shipment
   */
  async createShipment(
    input: CreateShipmentInput,
    userId: string
  ): Promise<DeviceShipment> {
    // Verify all items are available
    for (const item of input.items) {
      const inventory = await prisma.deviceInventory.findFirst({
        where: {
          id: item.inventoryId,
          organizationId: input.organizationId,
          status: InventoryStatus.IN_STOCK,
        },
      });

      if (!inventory) {
        throw new Error(`Device ${item.inventoryId} is not available for shipment`);
      }
    }

    // Generate shipment number
    const shipmentNumber = `SHP-${Date.now().toString(36).toUpperCase()}`;

    // Create shipment
    const shipment = await prisma.deviceShipment.create({
      data: {
        organizationId: input.organizationId,
        shipmentNumber,
        shipmentType: input.shipmentType,
        recipientType: input.recipientType,
        recipientId: input.recipientId,
        recipientName: input.recipientName,
        shippingAddress: input.shippingAddress as Prisma.InputJsonValue,
        carrier: input.carrier,
        shippingMethod: input.shippingMethod,
        status: ShipmentStatus.PENDING,
        createdById: userId,
      },
    });

    // Create shipment items and update inventory
    for (const item of input.items) {
      await prisma.deviceShipmentItem.create({
        data: {
          shipmentId: shipment.id,
          inventoryId: item.inventoryId,
          organizationId: input.organizationId,
          notes: item.notes,
        },
      });

      await prisma.deviceInventory.update({
        where: { id: item.inventoryId },
        data: { status: InventoryStatus.SHIPPED },
      });
    }

    await auditService.log({
      action: 'shipment.created',
      entity: 'shipment',
      entityId: shipment.id,
      organizationId: input.organizationId,
      userId,
      newValues: {
        shipmentType: input.shipmentType,
        itemCount: input.items.length,
      },
    });

    return shipment;
  }

  /**
   * Ship shipment (mark as shipped)
   */
  async shipShipment(
    shipmentId: string,
    organizationId: string,
    trackingNumber: string,
    carrier: string,
    userId: string
  ): Promise<DeviceShipment> {
    const shipment = await prisma.deviceShipment.findFirst({
      where: { id: shipmentId, organizationId },
      include: { items: true },
    });

    if (!shipment) {
      throw new Error('Shipment not found');
    }

    if (shipment.status !== ShipmentStatus.PENDING && shipment.status !== ShipmentStatus.PROCESSING) {
      throw new Error('Shipment cannot be shipped in current status');
    }

    // Update shipment
    const updated = await prisma.deviceShipment.update({
      where: { id: shipmentId },
      data: {
        status: ShipmentStatus.SHIPPED,
        trackingNumber,
        carrier,
        shippedDate: new Date(),
      },
    });

    // Update inventory items to in-transit
    for (const item of shipment.items) {
      await prisma.deviceInventory.update({
        where: { id: item.inventoryId },
        data: { status: InventoryStatus.IN_TRANSIT },
      });
    }

    await auditService.log({
      action: 'shipment.shipped',
      entity: 'shipment',
      entityId: shipmentId,
      organizationId,
      userId,
      newValues: { trackingNumber, carrier },
    });

    return updated;
  }

  /**
   * Mark shipment as delivered
   */
  async markDelivered(
    shipmentId: string,
    organizationId: string,
    userId: string
  ): Promise<DeviceShipment> {
    const shipment = await prisma.deviceShipment.findFirst({
      where: { id: shipmentId, organizationId },
      include: { items: true },
    });

    if (!shipment) {
      throw new Error('Shipment not found');
    }

    const updated = await prisma.deviceShipment.update({
      where: { id: shipmentId },
      data: {
        status: ShipmentStatus.DELIVERED,
        actualDelivery: new Date(),
      },
    });

    // Update inventory status based on shipment type
    const newStatus = shipment.shipmentType === ShipmentType.RETURN
      ? InventoryStatus.RETURNED
      : InventoryStatus.DELIVERED;

    for (const item of shipment.items) {
      await prisma.deviceInventory.update({
        where: { id: item.inventoryId },
        data: {
          status: newStatus,
          ...(shipment.recipientType === 'patient' && shipment.recipientId && {
            assignedPatientId: shipment.recipientId,
          }),
        },
      });
    }

    await auditService.log({
      action: 'shipment.delivered',
      entity: 'shipment',
      entityId: shipmentId,
      organizationId,
      userId,
      newValues: { status: ShipmentStatus.DELIVERED },
    });

    return updated;
  }

  /**
   * Get shipments
   */
  async getShipments(
    organizationId: string,
    options?: {
      status?: ShipmentStatus;
      shipmentType?: ShipmentType;
      recipientId?: string;
      limit?: number;
    }
  ): Promise<DeviceShipment[]> {
    return prisma.deviceShipment.findMany({
      where: {
        organizationId,
        ...(options?.status && { status: options.status }),
        ...(options?.shipmentType && { shipmentType: options.shipmentType }),
        ...(options?.recipientId && { recipientId: options.recipientId }),
      },
      include: {
        items: { include: { inventory: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: options?.limit || 50,
    });
  }

  // ==========================================
  // TROUBLESHOOTING
  // ==========================================

  /**
   * Log troubleshooting issue
   */
  async logTroubleshooting(
    input: LogTroubleshootingInput,
    userId: string
  ): Promise<TroubleshootingLog> {
    const log = await prisma.troubleshootingLog.create({
      data: {
        organizationId: input.organizationId,
        patientId: input.patientId,
        deviceId: input.deviceId,
        inventoryId: input.inventoryId,
        issueType: input.issueType,
        issueDescription: input.issueDescription,
        severity: input.severity || IssueSeverity.MEDIUM,
        reportedBy: input.reportedBy || 'staff',
        status: TroubleshootingStatus.OPEN,
      },
    });

    await auditService.log({
      action: 'troubleshooting.created',
      entity: 'troubleshooting_log',
      entityId: log.id,
      organizationId: input.organizationId,
      userId,
      newValues: {
        issueType: input.issueType,
        severity: input.severity || IssueSeverity.MEDIUM,
      },
    });

    return log;
  }

  /**
   * Add troubleshooting step
   */
  async addTroubleshootingStep(
    logId: string,
    organizationId: string,
    step: string,
    outcome: string,
    userId: string
  ): Promise<TroubleshootingLog> {
    const log = await prisma.troubleshootingLog.findFirst({
      where: { id: logId, organizationId },
    });

    if (!log) {
      throw new Error('Troubleshooting log not found');
    }

    const existingSteps = (log.steps || []) as Array<{
      step: string;
      outcome: string;
      timestamp: string;
      userId: string;
    }>;

    return prisma.troubleshootingLog.update({
      where: { id: logId },
      data: {
        steps: [
          ...existingSteps,
          { step, outcome, timestamp: new Date().toISOString(), userId },
        ] as unknown as Prisma.InputJsonValue,
        status: TroubleshootingStatus.IN_PROGRESS,
      },
    });
  }

  /**
   * Resolve troubleshooting
   */
  async resolveTroubleshooting(
    logId: string,
    organizationId: string,
    resolution: string,
    userId: string
  ): Promise<TroubleshootingLog> {
    const log = await prisma.troubleshootingLog.findFirst({
      where: { id: logId, organizationId },
    });

    if (!log) {
      throw new Error('Troubleshooting log not found');
    }

    const updated = await prisma.troubleshootingLog.update({
      where: { id: logId },
      data: {
        status: TroubleshootingStatus.RESOLVED,
        resolution,
        resolvedAt: new Date(),
        resolvedById: userId,
      },
    });

    await auditService.log({
      action: 'troubleshooting.resolved',
      entity: 'troubleshooting_log',
      entityId: logId,
      organizationId,
      userId,
      newValues: { resolution },
    });

    return updated;
  }

  /**
   * Get troubleshooting logs
   */
  async getTroubleshootingLogs(
    organizationId: string,
    options?: {
      status?: TroubleshootingStatus;
      patientId?: string;
      deviceId?: string;
      limit?: number;
    }
  ): Promise<TroubleshootingLog[]> {
    return prisma.troubleshootingLog.findMany({
      where: {
        organizationId,
        ...(options?.status && { status: options.status }),
        ...(options?.patientId && { patientId: options.patientId }),
        ...(options?.deviceId && { deviceId: options.deviceId }),
      },
      include: {
        inventory: true,
      },
      orderBy: { createdAt: 'desc' },
      take: options?.limit || 50,
    });
  }

  // ==========================================
  // RESUPPLY TICKETS
  // ==========================================

  /**
   * Create resupply ticket
   */
  async createResupplyTicket(
    input: CreateResupplyInput,
    userId: string
  ): Promise<ResupplyTicket> {
    const ticketNumber = `RSP-${Date.now().toString(36).toUpperCase()}`;

    const ticket = await prisma.resupplyTicket.create({
      data: {
        organizationId: input.organizationId,
        patientId: input.patientId,
        ticketNumber,
        ticketType: input.ticketType,
        items: input.items as unknown as Prisma.InputJsonValue,
        priority: input.priority || 'NORMAL',
        status: ResupplyStatus.PENDING,
        requestReason: input.notes,
        requestedById: userId,
      },
    });

    await auditService.log({
      action: 'resupply.created',
      entity: 'resupply_ticket',
      entityId: ticket.id,
      organizationId: input.organizationId,
      userId,
      newValues: {
        ticketType: input.ticketType,
        itemCount: input.items.length,
      },
    });

    return ticket;
  }

  /**
   * Approve resupply ticket
   */
  async approveResupply(
    ticketId: string,
    organizationId: string,
    userId: string
  ): Promise<ResupplyTicket> {
    const ticket = await prisma.resupplyTicket.findFirst({
      where: { id: ticketId, organizationId },
    });

    if (!ticket) {
      throw new Error('Resupply ticket not found');
    }

    const updated = await prisma.resupplyTicket.update({
      where: { id: ticketId },
      data: {
        status: ResupplyStatus.APPROVED,
        approvedById: userId,
        approvedAt: new Date(),
      },
    });

    await auditService.log({
      action: 'resupply.approved',
      entity: 'resupply_ticket',
      entityId: ticketId,
      organizationId,
      userId,
      newValues: { status: ResupplyStatus.APPROVED },
    });

    return updated;
  }

  /**
   * Get resupply tickets
   */
  async getResupplyTickets(
    organizationId: string,
    options?: {
      status?: ResupplyStatus;
      patientId?: string;
      limit?: number;
    }
  ): Promise<ResupplyTicket[]> {
    return prisma.resupplyTicket.findMany({
      where: {
        organizationId,
        ...(options?.status && { status: options.status }),
        ...(options?.patientId && { patientId: options.patientId }),
      },
      orderBy: { createdAt: 'desc' },
      take: options?.limit || 50,
    });
  }
}

export const deviceInventoryService = new DeviceInventoryService();
