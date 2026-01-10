/**
 * FHIR Integration Routes
 * SMART on FHIR connections and resource mapping
 */

import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { fhirService } from '../../services/fhir-service';
import { FhirAuthType, FhirSyncDirection } from '@prisma/client';

const router = Router();

// ==========================================
// FHIR CONNECTIONS
// ==========================================

const createConnectionSchema = z.object({
  name: z.string().min(1),
  ehrVendor: z.string().min(1),
  fhirVersion: z.string().optional(),
  baseUrl: z.string().url(),
  authType: z.nativeEnum(FhirAuthType).optional(),
  clientId: z.string().optional(),
  clientSecret: z.string().optional(),
  scopes: z.array(z.string()).optional(),
  syncDirection: z.nativeEnum(FhirSyncDirection).optional(),
});

router.post('/connections', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = createConnectionSchema.parse(req.body);
    const connection = await fhirService.createConnection(
      { ...data, organizationId: req.user!.organizationId! },
      req.user!.userId
    );
    res.status(201).json(connection);
  } catch (error) {
    next(error);
  }
});

router.get('/connections', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const connections = await fhirService.getConnections(req.user!.organizationId!);
    res.json(connections);
  } catch (error) {
    next(error);
  }
});

router.get('/connections/:connectionId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const connection = await fhirService.getConnection(
      req.params.connectionId,
      req.user!.organizationId!
    );
    if (!connection) {
      return res.status(404).json({ error: 'Connection not found' });
    }
    res.json(connection);
  } catch (error) {
    next(error);
  }
});

router.delete('/connections/:connectionId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    await fhirService.deleteConnection(
      req.params.connectionId,
      req.user!.organizationId!,
      req.user!.userId
    );
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

// ==========================================
// SMART ON FHIR AUTHORIZATION
// ==========================================

router.post('/connections/:connectionId/auth/initiate', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { redirectUri } = req.body;
    if (!redirectUri) {
      return res.status(400).json({ error: 'redirectUri is required' });
    }

    const result = await fhirService.initiateAuth(
      req.params.connectionId,
      req.user!.organizationId!,
      redirectUri
    );
    res.json(result);
  } catch (error) {
    next(error);
  }
});

router.post('/connections/:connectionId/auth/complete', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { code, state } = req.body;
    if (!code || !state) {
      return res.status(400).json({ error: 'code and state are required' });
    }

    const connection = await fhirService.completeAuth(
      req.params.connectionId,
      req.user!.organizationId!,
      code,
      state
    );
    res.json(connection);
  } catch (error) {
    next(error);
  }
});

// ==========================================
// CONNECTION HEALTH
// ==========================================

router.post('/connections/:connectionId/test', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await fhirService.testConnection(
      req.params.connectionId,
      req.user!.organizationId!
    );
    res.json(result);
  } catch (error) {
    next(error);
  }
});

// ==========================================
// SYNC OPERATIONS
// ==========================================

router.post('/connections/:connectionId/sync', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { resourceTypes, sinceDatetime } = req.body;
    const result = await fhirService.syncFromEhr(
      req.params.connectionId,
      req.user!.organizationId!,
      {
        resourceTypes,
        sinceDatetime: sinceDatetime ? new Date(sinceDatetime) : undefined,
      }
    );
    res.json(result);
  } catch (error) {
    next(error);
  }
});

router.get('/connections/:connectionId/sync-logs', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { limit } = req.query;
    const logs = await fhirService.getSyncLogs(
      req.params.connectionId,
      req.user!.organizationId!,
      limit ? parseInt(limit as string, 10) : undefined
    );
    res.json(logs);
  } catch (error) {
    next(error);
  }
});

// ==========================================
// RESOURCE MAPPINGS
// ==========================================

const createMappingSchema = z.object({
  connectionId: z.string(),
  fhirResourceType: z.enum(['Patient', 'Observation', 'Condition', 'CarePlan', 'Device', 'Practitioner', 'Organization']),
  localEntityType: z.string(),
  direction: z.nativeEnum(FhirSyncDirection).optional(),
  mappingRules: z.record(z.unknown()).optional(),
});

router.post('/mappings', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = createMappingSchema.parse(req.body);
    const mapping = await fhirService.createMapping(
      data,
      req.user!.organizationId!,
      req.user!.userId
    );
    res.status(201).json(mapping);
  } catch (error) {
    next(error);
  }
});

// ==========================================
// DIRECT FHIR API PROXY
// ==========================================

router.get('/connections/:connectionId/fhir/*', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const path = req.params[0]; // Everything after /fhir/
    const resource = await fhirService.fhirRequest(
      req.params.connectionId,
      req.user!.organizationId!,
      path,
      'GET'
    );
    res.json(resource);
  } catch (error) {
    next(error);
  }
});

export default router;
