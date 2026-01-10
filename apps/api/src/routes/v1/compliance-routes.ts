/**
 * Compliance Routes
 * BAA management, security headers, MFA enforcement, and feature gates
 */

import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { complianceService } from '../../services/compliance-service';
import { BaaPartyType, BaaStatus, MfaEnforcementLevel, RolloutStage, SecurityEventType, SecuritySeverity } from '@prisma/client';

const router = Router();

// ==========================================
// BAA MANAGEMENT
// ==========================================

const createBaaSchema = z.object({
  partyName: z.string().min(1),
  partyType: z.nativeEnum(BaaPartyType),
  contactName: z.string().optional(),
  contactEmail: z.string().email().optional(),
  effectiveDate: z.string().transform((s) => new Date(s)),
  expirationDate: z.string().transform((s) => new Date(s)).optional(),
  documentUrl: z.string().url().optional(),
});

router.post('/baa', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = createBaaSchema.parse(req.body);
    const baa = await complianceService.createBaa(
      { ...data, organizationId: req.user!.organizationId! },
      req.user!.userId
    );
    res.status(201).json(baa);
  } catch (error) {
    next(error);
  }
});

router.get('/baa', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { status } = req.query;
    const agreements = await complianceService.getBaaAgreements(
      req.user!.organizationId!,
      status as BaaStatus | undefined
    );
    res.json(agreements);
  } catch (error) {
    next(error);
  }
});

router.get('/baa/expiring', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { days } = req.query;
    const agreements = await complianceService.getExpiringBaas(
      req.user!.organizationId!,
      days ? parseInt(days as string, 10) : undefined
    );
    res.json(agreements);
  } catch (error) {
    next(error);
  }
});

router.post('/baa/:baaId/execute', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { signedBy } = req.body;
    const baa = await complianceService.executeBaa(
      req.params.baaId,
      req.user!.organizationId!,
      signedBy,
      req.user!.userId
    );
    res.json(baa);
  } catch (error) {
    next(error);
  }
});

router.post('/baa/:baaId/terminate', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { reason } = req.body;
    const baa = await complianceService.terminateBaa(
      req.params.baaId,
      req.user!.organizationId!,
      reason,
      req.user!.userId
    );
    res.json(baa);
  } catch (error) {
    next(error);
  }
});

// ==========================================
// SECURITY AUDIT LOGS
// ==========================================

router.get('/security-logs', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { eventType, userId, severity, startDate, endDate, limit, offset } = req.query;
    const result = await complianceService.getSecurityLogs(req.user!.organizationId!, {
      eventType: eventType as SecurityEventType | undefined,
      userId: userId as string | undefined,
      severity: severity as SecuritySeverity | undefined,
      startDate: startDate ? new Date(startDate as string) : undefined,
      endDate: endDate ? new Date(endDate as string) : undefined,
      limit: limit ? parseInt(limit as string, 10) : undefined,
      offset: offset ? parseInt(offset as string, 10) : undefined,
    });
    res.json(result);
  } catch (error) {
    next(error);
  }
});

router.get('/security-logs/high-risk', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { hours } = req.query;
    const events = await complianceService.getHighRiskEvents(
      req.user!.organizationId!,
      hours ? parseInt(hours as string, 10) : undefined
    );
    res.json(events);
  } catch (error) {
    next(error);
  }
});

// ==========================================
// MFA ENFORCEMENT
// ==========================================

const setMfaEnforcementSchema = z.object({
  enforcementLevel: z.nativeEnum(MfaEnforcementLevel),
  requiredForRoles: z.array(z.string()),
  gracePeriodDays: z.number().min(0).max(90),
});

router.get('/mfa', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const enforcement = await complianceService.getMfaEnforcement(req.user!.organizationId!);
    res.json(enforcement || { enforcementLevel: 'DISABLED' });
  } catch (error) {
    next(error);
  }
});

router.put('/mfa', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = setMfaEnforcementSchema.parse(req.body);
    const enforcement = await complianceService.setMfaEnforcement(
      req.user!.organizationId!,
      data.enforcementLevel,
      data.requiredForRoles,
      data.gracePeriodDays,
      req.user!.userId
    );
    res.json(enforcement);
  } catch (error) {
    next(error);
  }
});

router.get('/mfa/check', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { userId, roles } = req.query;
    const rolesArray = roles ? (roles as string).split(',') : [];
    const result = await complianceService.requiresMfa(
      (userId as string) || req.user!.userId,
      req.user!.organizationId!,
      rolesArray
    );
    res.json(result);
  } catch (error) {
    next(error);
  }
});

router.get('/mfa/users-without', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const users = await complianceService.getUsersWithoutMfa(req.user!.organizationId!);
    res.json(users);
  } catch (error) {
    next(error);
  }
});

// ==========================================
// SECURITY HEADERS
// ==========================================

router.get('/security-headers', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const headers = await complianceService.getSecurityHeaders(req.user!.organizationId!);
    res.json(headers);
  } catch (error) {
    next(error);
  }
});

router.put('/security-headers', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { headers } = req.body;
    const config = await complianceService.setSecurityHeaders(
      req.user!.organizationId!,
      headers,
      req.user!.userId
    );
    res.json(config);
  } catch (error) {
    next(error);
  }
});

router.post('/security-headers/reset', async (req: Request, res: Response, next: NextFunction) => {
  try {
    await complianceService.resetSecurityHeaders(req.user!.organizationId!, req.user!.userId);
    const headers = await complianceService.getSecurityHeaders(req.user!.organizationId!);
    res.json(headers);
  } catch (error) {
    next(error);
  }
});

// ==========================================
// FEATURE GATES
// ==========================================

const setFeatureGateSchema = z.object({
  featureKey: z.string().min(1),
  featureName: z.string().min(1),
  description: z.string().optional(),
  rolloutStage: z.nativeEnum(RolloutStage).optional(),
  rolloutPercentage: z.number().min(0).max(100).optional(),
  allowedRoles: z.array(z.string()).optional(),
  allowedUserIds: z.array(z.string()).optional(),
});

router.get('/feature-gates', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const gates = await complianceService.getFeatureGates(req.user!.organizationId!);
    res.json(gates);
  } catch (error) {
    next(error);
  }
});

router.post('/feature-gates', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = setFeatureGateSchema.parse(req.body);
    const gate = await complianceService.setFeatureGate(
      { ...data, organizationId: req.user!.organizationId! },
      req.user!.userId
    );
    res.json(gate);
  } catch (error) {
    next(error);
  }
});

router.get('/feature-gates/check/:featureKey', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { roles } = req.query;
    const rolesArray = roles ? (roles as string).split(',') : [];
    const enabled = await complianceService.isFeatureEnabled(
      req.user!.organizationId!,
      req.params.featureKey,
      req.user!.userId,
      rolesArray
    );
    res.json({ enabled });
  } catch (error) {
    next(error);
  }
});

router.get('/feature-gates/enabled', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { roles } = req.query;
    const rolesArray = roles ? (roles as string).split(',') : [];
    const features = await complianceService.getEnabledFeatures(
      req.user!.organizationId!,
      req.user!.userId,
      rolesArray
    );
    res.json(features);
  } catch (error) {
    next(error);
  }
});

router.delete('/feature-gates/:featureKey', async (req: Request, res: Response, next: NextFunction) => {
  try {
    await complianceService.disableFeatureGate(
      req.user!.organizationId!,
      req.params.featureKey,
      req.user!.userId
    );
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

// ==========================================
// COMPLIANCE DASHBOARD
// ==========================================

router.get('/overview', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const overview = await complianceService.getComplianceOverview(req.user!.organizationId!);
    res.json(overview);
  } catch (error) {
    next(error);
  }
});

export default router;
