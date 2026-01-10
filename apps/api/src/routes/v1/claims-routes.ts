/**
 * Claims/RCM Routes
 * Claim management, submission, and denial tracking
 */

import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { claimsService } from '../../services/claims-service';
import { ClaimType, ClaimStatus, DenialCategory } from '@prisma/client';

const router = Router();

// ==========================================
// CLAIMS
// ==========================================

const createClaimSchema = z.object({
  patientId: z.string(),
  claimType: z.nativeEnum(ClaimType).optional(),
  serviceStartDate: z.string().transform((s) => new Date(s)),
  serviceEndDate: z.string().transform((s) => new Date(s)),
  billingProviderId: z.string().optional(),
  renderingProviderId: z.string().optional(),
  placeOfService: z.string().optional(),
  diagnosisCodes: z.array(z.string()),
  payerId: z.string().optional(),
  subscriberId: z.string().optional(),
});

router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = createClaimSchema.parse(req.body);
    const claim = await claimsService.createClaim(
      { ...data, organizationId: req.user!.organizationId! },
      req.user!.userId
    );
    res.status(201).json(claim);
  } catch (error) {
    next(error);
  }
});

router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { status, patientId, startDate, endDate, limit, offset } = req.query;
    const result = await claimsService.getClaims(req.user!.organizationId!, {
      status: status as ClaimStatus | undefined,
      patientId: patientId as string | undefined,
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

router.get('/:claimId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const claim = await claimsService.getClaim(
      req.params.claimId,
      req.user!.organizationId!
    );
    if (!claim) {
      return res.status(404).json({ error: 'Claim not found' });
    }
    res.json(claim);
  } catch (error) {
    next(error);
  }
});

// ==========================================
// CLAIM LINES
// ==========================================

const addClaimLinesSchema = z.object({
  lines: z.array(z.object({
    cptCode: z.string(),
    modifier1: z.string().optional(),
    modifier2: z.string().optional(),
    modifier3: z.string().optional(),
    modifier4: z.string().optional(),
    units: z.number().min(1),
    chargeAmount: z.number().min(0),
    diagnosisCodes: z.array(z.string()).optional(),
    serviceDate: z.string().transform((s) => new Date(s)),
  })),
});

router.post('/:claimId/lines', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = addClaimLinesSchema.parse(req.body);
    const lines = await claimsService.addClaimLines(
      req.params.claimId,
      data.lines,
      req.user!.organizationId!,
      req.user!.userId
    );
    res.status(201).json(lines);
  } catch (error) {
    next(error);
  }
});

// ==========================================
// RPM CLAIM GENERATION
// ==========================================

router.post('/generate-rpm', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { patientId, serviceMonth } = req.body;
    if (!patientId || !serviceMonth) {
      return res.status(400).json({ error: 'patientId and serviceMonth are required' });
    }
    const claim = await claimsService.generateRpmClaim(
      patientId,
      req.user!.organizationId!,
      new Date(serviceMonth),
      req.user!.userId
    );
    res.status(201).json(claim);
  } catch (error) {
    next(error);
  }
});

// ==========================================
// CLAIM OPERATIONS
// ==========================================

router.post('/:claimId/validate', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await claimsService.validateClaim(
      req.params.claimId,
      req.user!.organizationId!
    );
    res.json(result);
  } catch (error) {
    next(error);
  }
});

router.post('/:claimId/submit', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const submission = await claimsService.submitClaim(
      req.params.claimId,
      req.user!.organizationId!,
      req.user!.userId
    );
    res.json(submission);
  } catch (error) {
    next(error);
  }
});

router.post('/:claimId/payment', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { paymentAmount, paymentDate, notes } = req.body;
    const claim = await claimsService.recordPayment(
      req.params.claimId,
      req.user!.organizationId!,
      paymentAmount,
      new Date(paymentDate),
      req.user!.userId,
      notes
    );
    res.json(claim);
  } catch (error) {
    next(error);
  }
});

// ==========================================
// DENIALS
// ==========================================

const recordDenialSchema = z.object({
  denialCode: z.string(),
  denialReason: z.string(),
  denialCategory: z.nativeEnum(DenialCategory),
  deniedAmount: z.number(),
  appealDeadline: z.string().transform((s) => new Date(s)).optional(),
});

router.post('/:claimId/denials', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = recordDenialSchema.parse(req.body);
    const denial = await claimsService.recordDenial(
      { ...data, claimId: req.params.claimId },
      req.user!.organizationId!,
      req.user!.userId
    );
    res.status(201).json(denial);
  } catch (error) {
    next(error);
  }
});

router.post('/denials/:denialId/appeal', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { appealNotes } = req.body;
    const denial = await claimsService.createAppeal(
      req.params.denialId,
      req.user!.organizationId!,
      appealNotes,
      req.user!.userId
    );
    res.json(denial);
  } catch (error) {
    next(error);
  }
});

router.get('/denials/stats', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { startDate, endDate } = req.query;
    const stats = await claimsService.getDenialStats(
      req.user!.organizationId!,
      startDate ? new Date(startDate as string) : undefined,
      endDate ? new Date(endDate as string) : undefined
    );
    res.json(stats);
  } catch (error) {
    next(error);
  }
});

// ==========================================
// PAYER RULES
// ==========================================

router.post('/payer-rules', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { payerId, ruleName, ruleType, conditions, actions } = req.body;
    const rule = await claimsService.createPayerRule(
      req.user!.organizationId!,
      payerId,
      ruleName,
      ruleType,
      conditions,
      actions,
      req.user!.userId
    );
    res.status(201).json(rule);
  } catch (error) {
    next(error);
  }
});

router.get('/payer-rules', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { payerId } = req.query;
    const rules = await claimsService.getPayerRules(
      req.user!.organizationId!,
      payerId as string | undefined
    );
    res.json(rules);
  } catch (error) {
    next(error);
  }
});

export default router;
