/**
 * Caregiver Consent & Delegation Routes
 * Manages consent workflows and delegated actions
 */

import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { caregiverConsentService } from '../../services/caregiver-consent-service';
import { CaregiverConsentType, DelegatedActionType, DelegationStatus } from '@prisma/client';

const router = Router();

// ==========================================
// CONSENT MANAGEMENT
// ==========================================

const grantConsentSchema = z.object({
  caregiverLinkId: z.string(),
  consentType: z.nativeEnum(CaregiverConsentType),
  accessScope: z.array(z.string()),
  canDelegate: z.boolean().optional(),
  validFrom: z.string().transform((s) => new Date(s)).optional(),
  validUntil: z.string().transform((s) => new Date(s)).optional(),
  notes: z.string().optional(),
});

router.post('/consents', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = grantConsentSchema.parse(req.body);
    const consent = await caregiverConsentService.grantConsent(
      data,
      req.user!.organizationId!,
      req.user!.userId
    );
    res.status(201).json(consent);
  } catch (error) {
    next(error);
  }
});

router.get('/consents', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { caregiverLinkId } = req.query;
    if (!caregiverLinkId) {
      return res.status(400).json({ error: 'caregiverLinkId is required' });
    }
    const consents = await caregiverConsentService.getConsents(
      caregiverLinkId as string,
      req.user!.organizationId!
    );
    res.json(consents);
  } catch (error) {
    next(error);
  }
});

router.get('/consents/patient/:patientId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const consents = await caregiverConsentService.getPatientConsents(
      req.params.patientId,
      req.user!.organizationId!
    );
    res.json(consents);
  } catch (error) {
    next(error);
  }
});

router.post('/consents/:consentId/revoke', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { reason } = req.body;
    const consent = await caregiverConsentService.revokeConsent(
      req.params.consentId,
      req.user!.organizationId!,
      req.user!.userId,
      reason
    );
    res.json(consent);
  } catch (error) {
    next(error);
  }
});

router.get('/access-check', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { caregiverLinkId, accessType } = req.query;
    if (!caregiverLinkId || !accessType) {
      return res.status(400).json({ error: 'caregiverLinkId and accessType are required' });
    }
    const hasAccess = await caregiverConsentService.hasAccess(
      caregiverLinkId as string,
      accessType as string
    );
    res.json({ hasAccess });
  } catch (error) {
    next(error);
  }
});

// ==========================================
// DELEGATED ACTIONS
// ==========================================

const createDelegationSchema = z.object({
  caregiverLinkId: z.string(),
  actionType: z.nativeEnum(DelegatedActionType),
  delegatedByUserId: z.string().optional(),
  targetEntityType: z.string().optional(),
  targetEntityId: z.string().optional(),
  parameters: z.record(z.unknown()).optional(),
  validUntil: z.string().transform((s) => new Date(s)).optional(),
  notes: z.string().optional(),
});

router.post('/delegations', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = createDelegationSchema.parse(req.body);
    const delegation = await caregiverConsentService.createDelegation(
      data,
      req.user!.organizationId!,
      req.user!.userId
    );
    res.status(201).json(delegation);
  } catch (error) {
    next(error);
  }
});

router.get('/delegations', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { caregiverLinkId, status } = req.query;
    if (!caregiverLinkId) {
      return res.status(400).json({ error: 'caregiverLinkId is required' });
    }
    const delegations = await caregiverConsentService.getDelegations(
      caregiverLinkId as string,
      req.user!.organizationId!,
      status as DelegationStatus | undefined
    );
    res.json(delegations);
  } catch (error) {
    next(error);
  }
});

router.get('/delegations/pending', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const delegations = await caregiverConsentService.getPendingDelegations(
      req.user!.organizationId!
    );
    res.json(delegations);
  } catch (error) {
    next(error);
  }
});

router.post('/delegations/:delegationId/execute', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { result } = req.body;
    const delegation = await caregiverConsentService.executeDelegation(
      {
        delegationId: req.params.delegationId,
        executedByUserId: req.user!.userId,
        result,
      },
      req.user!.organizationId!
    );
    res.json(delegation);
  } catch (error) {
    next(error);
  }
});

router.post('/delegations/:delegationId/approve', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const delegation = await caregiverConsentService.approveDelegation(
      req.params.delegationId,
      req.user!.organizationId!,
      req.user!.userId
    );
    res.json(delegation);
  } catch (error) {
    next(error);
  }
});

router.post('/delegations/:delegationId/reject', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { reason } = req.body;
    const delegation = await caregiverConsentService.rejectDelegation(
      req.params.delegationId,
      req.user!.organizationId!,
      req.user!.userId,
      reason
    );
    res.json(delegation);
  } catch (error) {
    next(error);
  }
});

export default router;
