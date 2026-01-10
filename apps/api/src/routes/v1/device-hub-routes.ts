/**
 * Device Hub Routes
 * Manages device vendor integrations and pairings
 */

import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { deviceHubService } from '../../services/device-hub-service';
import { deviceWebhookService } from '../../services/device-webhook-service';
import { deviceTelemetryService } from '../../services/device-telemetry-service';
import { DeviceHubType, DeviceType, TelemetryType, WebhookProcessStatus } from '@prisma/client';

const router = Router();

// ==========================================
// DEVICE HUBS
// ==========================================

// Create device hub
const createHubSchema = z.object({
  name: z.string().min(1),
  vendor: z.string().min(1),
  type: z.nativeEnum(DeviceHubType).optional(),
  apiEndpoint: z.string().url().optional(),
  clientId: z.string().optional(),
  clientSecret: z.string().optional(),
  webhookUrl: z.string().url().optional(),
  webhookSecret: z.string().optional(),
  supportedTypes: z.array(z.nativeEnum(DeviceType)),
});

router.post('/hubs', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = createHubSchema.parse(req.body);
    const hub = await deviceHubService.createHub(
      { ...data, organizationId: req.user!.organizationId! },
      req.user!.userId
    );
    res.status(201).json(hub);
  } catch (error) {
    next(error);
  }
});

// Get all hubs
router.get('/hubs', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const hubs = await deviceHubService.getHubs(req.user!.organizationId!);
    res.json(hubs);
  } catch (error) {
    next(error);
  }
});

// Get hub by ID
router.get('/hubs/:hubId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const hub = await deviceHubService.getHub(
      req.params.hubId,
      req.user!.organizationId!
    );
    if (!hub) {
      return res.status(404).json({ error: 'Hub not found' });
    }
    res.json(hub);
  } catch (error) {
    next(error);
  }
});

// Update hub
const updateHubSchema = z.object({
  name: z.string().optional(),
  apiEndpoint: z.string().url().optional(),
  clientId: z.string().optional(),
  clientSecret: z.string().optional(),
  webhookUrl: z.string().url().optional(),
  webhookSecret: z.string().optional(),
  supportedTypes: z.array(z.nativeEnum(DeviceType)).optional(),
  status: z.enum(['ACTIVE', 'INACTIVE', 'ERROR']).optional(),
});

router.patch('/hubs/:hubId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = updateHubSchema.parse(req.body);
    const hub = await deviceHubService.updateHub(
      req.params.hubId,
      req.user!.organizationId!,
      data,
      req.user!.userId
    );
    res.json(hub);
  } catch (error) {
    next(error);
  }
});

// Activate hub
router.post('/hubs/:hubId/activate', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const hub = await deviceHubService.activateHub(
      req.params.hubId,
      req.user!.organizationId!,
      req.user!.userId
    );
    res.json(hub);
  } catch (error) {
    next(error);
  }
});

// Sync from hub
router.post('/hubs/:hubId/sync', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await deviceHubService.syncFromHub(
      req.params.hubId,
      req.user!.organizationId!,
      req.user!.userId
    );
    res.json(result);
  } catch (error) {
    next(error);
  }
});

// Delete hub
router.delete('/hubs/:hubId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    await deviceHubService.deleteHub(
      req.params.hubId,
      req.user!.organizationId!,
      req.user!.userId
    );
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

// Get webhook URL for hub
router.get('/hubs/:hubId/webhook-url', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const hub = await deviceHubService.getHub(
      req.params.hubId,
      req.user!.organizationId!
    );
    if (!hub) {
      return res.status(404).json({ error: 'Hub not found' });
    }
    const webhookUrl = deviceWebhookService.generateWebhookUrl(hub.id);
    res.json({ webhookUrl });
  } catch (error) {
    next(error);
  }
});

// ==========================================
// DEVICE PAIRINGS
// ==========================================

// Pair device
const pairDeviceSchema = z.object({
  hubId: z.string(),
  deviceId: z.string(),
  vendorDeviceId: z.string(),
  metadata: z.record(z.unknown()).optional(),
});

router.post('/pairings', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = pairDeviceSchema.parse(req.body);
    const pairing = await deviceHubService.pairDevice(
      data,
      req.user!.organizationId!,
      req.user!.userId
    );
    res.status(201).json(pairing);
  } catch (error) {
    next(error);
  }
});

// Get all pairings
router.get('/pairings', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const pairings = await deviceHubService.getPairings(req.user!.organizationId!);
    res.json(pairings);
  } catch (error) {
    next(error);
  }
});

// Get pairings for device
router.get('/devices/:deviceId/pairings', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const pairings = await deviceHubService.getDevicePairings(
      req.params.deviceId,
      req.user!.organizationId!
    );
    res.json(pairings);
  } catch (error) {
    next(error);
  }
});

// Confirm pairing
router.post('/pairings/:pairingId/confirm', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const pairing = await deviceHubService.confirmPairing(
      req.params.pairingId,
      req.user!.organizationId!,
      req.user!.userId
    );
    res.json(pairing);
  } catch (error) {
    next(error);
  }
});

// Unpair device
router.delete('/pairings/:pairingId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    await deviceHubService.unpairDevice(
      req.params.pairingId,
      req.user!.organizationId!,
      req.user!.userId
    );
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

// ==========================================
// WEBHOOK LOGS
// ==========================================

// Get webhook logs for hub
router.get('/hubs/:hubId/webhook-logs', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { status, limit, offset } = req.query;
    const result = await deviceWebhookService.getWebhookLogs(
      req.params.hubId,
      req.user!.organizationId!,
      {
        status: status as WebhookProcessStatus | undefined,
        limit: limit ? parseInt(limit as string, 10) : undefined,
        offset: offset ? parseInt(offset as string, 10) : undefined,
      }
    );
    res.json(result);
  } catch (error) {
    next(error);
  }
});

// Retry failed webhook
router.post('/webhook-logs/:webhookId/retry', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await deviceWebhookService.retryWebhook(
      req.params.webhookId,
      req.user!.organizationId!
    );
    res.json(result);
  } catch (error) {
    next(error);
  }
});

// ==========================================
// DEVICE TELEMETRY
// ==========================================

// Record telemetry
const recordTelemetrySchema = z.object({
  deviceId: z.string(),
  hubId: z.string().optional(),
  telemetryType: z.nativeEnum(TelemetryType),
  batteryLevel: z.number().min(0).max(100).optional(),
  signalStrength: z.number().optional(),
  firmwareVersion: z.string().optional(),
  isOnline: z.boolean().optional(),
  errorCode: z.string().optional(),
  errorMessage: z.string().optional(),
  metadata: z.record(z.unknown()).optional(),
});

router.post('/telemetry', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = recordTelemetrySchema.parse(req.body);
    const telemetry = await deviceTelemetryService.recordTelemetry(
      data,
      req.user!.organizationId!
    );
    res.status(201).json(telemetry);
  } catch (error) {
    next(error);
  }
});

// Get latest telemetry for device
router.get('/devices/:deviceId/telemetry', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const telemetry = await deviceTelemetryService.getLatestTelemetry(
      req.params.deviceId,
      req.user!.organizationId!
    );
    res.json(telemetry);
  } catch (error) {
    next(error);
  }
});

// Get telemetry history
router.get('/devices/:deviceId/telemetry/history', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { type, startDate, endDate, limit } = req.query;
    const history = await deviceTelemetryService.getTelemetryHistory(
      req.params.deviceId,
      req.user!.organizationId!,
      {
        telemetryType: type as TelemetryType | undefined,
        startDate: startDate ? new Date(startDate as string) : undefined,
        endDate: endDate ? new Date(endDate as string) : undefined,
        limit: limit ? parseInt(limit as string, 10) : undefined,
      }
    );
    res.json(history);
  } catch (error) {
    next(error);
  }
});

// Get telemetry stats
router.get('/telemetry/stats', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const stats = await deviceTelemetryService.getTelemetryStats(
      req.user!.organizationId!
    );
    res.json(stats);
  } catch (error) {
    next(error);
  }
});

// Get low battery devices
router.get('/telemetry/low-battery', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const devices = await deviceTelemetryService.getLowBatteryDevices(
      req.user!.organizationId!
    );
    res.json(devices);
  } catch (error) {
    next(error);
  }
});

// Get offline devices
router.get('/telemetry/offline', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { hours } = req.query;
    const devices = await deviceTelemetryService.getOfflineDevices(
      req.user!.organizationId!,
      hours ? parseInt(hours as string, 10) : undefined
    );
    res.json(devices);
  } catch (error) {
    next(error);
  }
});

// ==========================================
// FIRMWARE
// ==========================================

// Create firmware
const createFirmwareSchema = z.object({
  deviceType: z.string(),
  version: z.string(),
  releaseNotes: z.string().optional(),
  downloadUrl: z.string().url().optional(),
  checksum: z.string().optional(),
  lotNumber: z.string().optional(),
  isRequired: z.boolean().optional(),
});

router.post('/firmware', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = createFirmwareSchema.parse(req.body);
    const firmware = await deviceTelemetryService.createFirmware(
      { ...data, organizationId: req.user!.organizationId! },
      req.user!.userId
    );
    res.status(201).json(firmware);
  } catch (error) {
    next(error);
  }
});

// Get firmware versions
router.get('/firmware', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { deviceType } = req.query;
    const firmware = await deviceTelemetryService.getFirmwareVersions(
      req.user!.organizationId!,
      deviceType as string | undefined
    );
    res.json(firmware);
  } catch (error) {
    next(error);
  }
});

// Release firmware
router.post('/firmware/:firmwareId/release', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const firmware = await deviceTelemetryService.releaseFirmware(
      req.params.firmwareId,
      req.user!.organizationId!,
      req.user!.userId
    );
    res.json(firmware);
  } catch (error) {
    next(error);
  }
});

// Deprecate firmware
router.post('/firmware/:firmwareId/deprecate', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const firmware = await deviceTelemetryService.deprecateFirmware(
      req.params.firmwareId,
      req.user!.organizationId!,
      req.user!.userId
    );
    res.json(firmware);
  } catch (error) {
    next(error);
  }
});

// Check firmware status for device
router.get('/devices/:deviceId/firmware-status', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const status = await deviceTelemetryService.checkFirmwareStatus(
      req.params.deviceId,
      req.user!.organizationId!
    );
    res.json(status);
  } catch (error) {
    next(error);
  }
});

export default router;
