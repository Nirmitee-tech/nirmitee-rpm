/**
 * Device Inventory Routes
 * Inventory management, shipments, troubleshooting, and resupply
 */

import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { deviceInventoryService } from '../../services/device-inventory-service';
import {
  DeviceType,
  InventoryStatus,
  ShipmentStatus,
  ShipmentType,
  TroubleshootingStatus,
  TroubleshootingIssue,
  ResupplyStatus,
  ResupplyType,
  IssueSeverity,
} from '@prisma/client';

const router = Router();

// ==========================================
// INVENTORY MANAGEMENT
// ==========================================

const addInventorySchema = z.object({
  serialNumber: z.string().min(1),
  deviceType: z.nativeEnum(DeviceType),
  manufacturer: z.string(),
  model: z.string(),
  lotNumber: z.string().optional(),
  purchaseDate: z.string().transform((s) => new Date(s)).optional(),
  warrantyExpiration: z.string().transform((s) => new Date(s)).optional(),
  purchasePrice: z.number().optional(),
});

router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = addInventorySchema.parse(req.body);
    const item = await deviceInventoryService.addToInventory(
      { ...data, organizationId: req.user!.organizationId! },
      req.user!.userId
    );
    res.status(201).json(item);
  } catch (error) {
    next(error);
  }
});

router.post('/bulk-import', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { items } = req.body;
    const result = await deviceInventoryService.bulkImport(
      items,
      req.user!.organizationId!,
      req.user!.userId
    );
    res.json(result);
  } catch (error) {
    next(error);
  }
});

router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { status, deviceType, search, limit, offset } = req.query;
    const result = await deviceInventoryService.getInventory(req.user!.organizationId!, {
      status: status as InventoryStatus | undefined,
      deviceType: deviceType as DeviceType | undefined,
      search: search as string | undefined,
      limit: limit ? parseInt(limit as string, 10) : undefined,
      offset: offset ? parseInt(offset as string, 10) : undefined,
    });
    res.json(result);
  } catch (error) {
    next(error);
  }
});

router.get('/:inventoryId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const item = await deviceInventoryService.getInventoryItem(
      req.params.inventoryId,
      req.user!.organizationId!
    );
    if (!item) {
      return res.status(404).json({ error: 'Item not found' });
    }
    res.json(item);
  } catch (error) {
    next(error);
  }
});

router.get('/qr/:qrCode', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const item = await deviceInventoryService.getByQRCode(
      req.params.qrCode,
      req.user!.organizationId!
    );
    if (!item) {
      return res.status(404).json({ error: 'Item not found' });
    }
    res.json(item);
  } catch (error) {
    next(error);
  }
});

router.patch('/:inventoryId/status', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { status, notes } = req.body;
    const item = await deviceInventoryService.updateStatus(
      req.params.inventoryId,
      req.user!.organizationId!,
      status,
      req.user!.userId,
      notes
    );
    res.json(item);
  } catch (error) {
    next(error);
  }
});

// ==========================================
// QR PAIRING
// ==========================================

router.post('/pair-by-qr', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { qrCode, patientId } = req.body;
    const result = await deviceInventoryService.pairByQRCode(
      qrCode,
      patientId,
      req.user!.organizationId!,
      req.user!.userId
    );
    res.json(result);
  } catch (error) {
    next(error);
  }
});

// ==========================================
// SHIPMENTS
// ==========================================

const createShipmentSchema = z.object({
  shipmentType: z.nativeEnum(ShipmentType),
  recipientType: z.string(),
  recipientId: z.string().optional(),
  recipientName: z.string(),
  shippingAddress: z.object({
    street: z.string(),
    city: z.string(),
    state: z.string(),
    zip: z.string(),
    country: z.string().optional(),
  }),
  items: z.array(z.object({
    inventoryId: z.string(),
    notes: z.string().optional(),
  })),
  carrier: z.string().optional(),
  shippingMethod: z.string().optional(),
});

router.post('/shipments', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = createShipmentSchema.parse(req.body);
    const shipment = await deviceInventoryService.createShipment(
      { ...data, organizationId: req.user!.organizationId! },
      req.user!.userId
    );
    res.status(201).json(shipment);
  } catch (error) {
    next(error);
  }
});

router.get('/shipments', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { status, shipmentType, recipientId, limit } = req.query;
    const shipments = await deviceInventoryService.getShipments(req.user!.organizationId!, {
      status: status as ShipmentStatus | undefined,
      shipmentType: shipmentType as ShipmentType | undefined,
      recipientId: recipientId as string | undefined,
      limit: limit ? parseInt(limit as string, 10) : undefined,
    });
    res.json(shipments);
  } catch (error) {
    next(error);
  }
});

router.post('/shipments/:shipmentId/ship', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { trackingNumber, carrier } = req.body;
    const shipment = await deviceInventoryService.shipShipment(
      req.params.shipmentId,
      req.user!.organizationId!,
      trackingNumber,
      carrier,
      req.user!.userId
    );
    res.json(shipment);
  } catch (error) {
    next(error);
  }
});

router.post('/shipments/:shipmentId/delivered', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const shipment = await deviceInventoryService.markDelivered(
      req.params.shipmentId,
      req.user!.organizationId!,
      req.user!.userId
    );
    res.json(shipment);
  } catch (error) {
    next(error);
  }
});

// ==========================================
// TROUBLESHOOTING
// ==========================================

const logTroubleshootingSchema = z.object({
  patientId: z.string().optional(),
  deviceId: z.string().optional(),
  inventoryId: z.string().optional(),
  issueType: z.nativeEnum(TroubleshootingIssue),
  issueDescription: z.string(),
  severity: z.nativeEnum(IssueSeverity).optional(),
  reportedBy: z.string().optional(),
});

router.post('/troubleshooting', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = logTroubleshootingSchema.parse(req.body);
    const log = await deviceInventoryService.logTroubleshooting(
      { ...data, organizationId: req.user!.organizationId! },
      req.user!.userId
    );
    res.status(201).json(log);
  } catch (error) {
    next(error);
  }
});

router.get('/troubleshooting', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { status, patientId, deviceId, limit } = req.query;
    const logs = await deviceInventoryService.getTroubleshootingLogs(req.user!.organizationId!, {
      status: status as TroubleshootingStatus | undefined,
      patientId: patientId as string | undefined,
      deviceId: deviceId as string | undefined,
      limit: limit ? parseInt(limit as string, 10) : undefined,
    });
    res.json(logs);
  } catch (error) {
    next(error);
  }
});

router.post('/troubleshooting/:logId/step', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { step, outcome } = req.body;
    const log = await deviceInventoryService.addTroubleshootingStep(
      req.params.logId,
      req.user!.organizationId!,
      step,
      outcome,
      req.user!.userId
    );
    res.json(log);
  } catch (error) {
    next(error);
  }
});

router.post('/troubleshooting/:logId/resolve', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { resolution } = req.body;
    const log = await deviceInventoryService.resolveTroubleshooting(
      req.params.logId,
      req.user!.organizationId!,
      resolution,
      req.user!.userId
    );
    res.json(log);
  } catch (error) {
    next(error);
  }
});

// ==========================================
// RESUPPLY
// ==========================================

const createResupplySchema = z.object({
  patientId: z.string(),
  ticketType: z.nativeEnum(ResupplyType),
  items: z.array(z.object({
    deviceType: z.nativeEnum(DeviceType),
    quantity: z.number().min(1),
    reason: z.string().optional(),
  })),
  notes: z.string().optional(),
  priority: z.enum(['LOW', 'NORMAL', 'HIGH', 'URGENT']).optional(),
});

router.post('/resupply', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = createResupplySchema.parse(req.body);
    const ticket = await deviceInventoryService.createResupplyTicket(
      { ...data, organizationId: req.user!.organizationId! },
      req.user!.userId
    );
    res.status(201).json(ticket);
  } catch (error) {
    next(error);
  }
});

router.get('/resupply', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { status, patientId, limit } = req.query;
    const tickets = await deviceInventoryService.getResupplyTickets(req.user!.organizationId!, {
      status: status as ResupplyStatus | undefined,
      patientId: patientId as string | undefined,
      limit: limit ? parseInt(limit as string, 10) : undefined,
    });
    res.json(tickets);
  } catch (error) {
    next(error);
  }
});

router.post('/resupply/:ticketId/approve', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const ticket = await deviceInventoryService.approveResupply(
      req.params.ticketId,
      req.user!.organizationId!,
      req.user!.userId
    );
    res.json(ticket);
  } catch (error) {
    next(error);
  }
});

export default router;
