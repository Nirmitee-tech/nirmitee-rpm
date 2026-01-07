import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { billingService } from '../services/billing-service';
import { authenticate } from '../middleware/auth-middleware';
import { ApiError } from '../utils/api-error';

const router = Router();

// All billing routes require authentication
router.use(authenticate);

// Validation schemas
const createCheckoutSchema = z.object({
  priceId: z.string().min(1, 'Price ID is required'),
  successUrl: z.string().url('Invalid success URL'),
  cancelUrl: z.string().url('Invalid cancel URL'),
});

const updateSubscriptionSchema = z.object({
  priceId: z.string().min(1, 'Price ID is required'),
});

const createPortalSchema = z.object({
  returnUrl: z.string().url('Invalid return URL'),
});

/**
 * GET /api/billing/plans
 * Get all active pricing plans
 */
router.get('/plans', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const plans = await billingService.getPricingPlans();
    res.json({ plans });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/billing/subscription
 * Get current subscription for the organization
 */
router.get('/subscription', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const organizationId = req.organizationId!;
    const subscription = await billingService.getSubscription(organizationId);

    if (!subscription) {
      return res.json({
        subscription: null,
        status: 'no_subscription',
      });
    }

    res.json({ subscription });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/billing/checkout
 * Create Stripe Checkout session for new subscription
 */
router.post('/checkout', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = createCheckoutSchema.parse(req.body);
    const organizationId = req.organizationId!;

    const checkoutUrl = await billingService.createCheckoutSession({
      organizationId,
      priceId: data.priceId,
      successUrl: data.successUrl,
      cancelUrl: data.cancelUrl,
    });

    res.json({ url: checkoutUrl });
  } catch (error) {
    if (error instanceof z.ZodError) {
      next(ApiError.badRequest(error.errors[0].message));
    } else {
      next(error);
    }
  }
});

/**
 * POST /api/billing/portal
 * Create Stripe Customer Portal session for managing subscription
 */
router.post('/portal', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = createPortalSchema.parse(req.body);
    const organizationId = req.organizationId!;

    const portalUrl = await billingService.createPortalSession({
      organizationId,
      returnUrl: data.returnUrl,
    });

    res.json({ url: portalUrl });
  } catch (error) {
    if (error instanceof z.ZodError) {
      next(ApiError.badRequest(error.errors[0].message));
    } else {
      next(error);
    }
  }
});

/**
 * POST /api/billing/cancel
 * Cancel subscription at period end
 */
router.post('/cancel', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const organizationId = req.organizationId!;
    await billingService.cancelSubscription(organizationId);

    res.json({
      message: 'Subscription will be canceled at the end of the billing period',
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/billing/resume
 * Resume canceled subscription (remove cancel at period end)
 */
router.post('/resume', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const organizationId = req.organizationId!;
    await billingService.resumeSubscription(organizationId);

    res.json({
      message: 'Subscription cancellation has been removed',
    });
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /api/billing/subscription
 * Update subscription to a different plan
 */
router.put('/subscription', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = updateSubscriptionSchema.parse(req.body);
    const organizationId = req.organizationId!;

    await billingService.updateSubscription({
      organizationId,
      priceId: data.priceId,
    });

    res.json({
      message: 'Subscription updated successfully',
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      next(ApiError.badRequest(error.errors[0].message));
    } else {
      next(error);
    }
  }
});

/**
 * GET /api/billing/invoices
 * Get all invoices for the organization
 */
router.get('/invoices', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const organizationId = req.organizationId!;
    const invoices = await billingService.getInvoices(organizationId);

    res.json({ invoices });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/billing/limits/:resource
 * Check if organization is within limits for a resource
 */
router.get('/limits/:resource', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const organizationId = req.organizationId!;
    const { resource } = req.params;

    const withinLimits = await billingService.checkLimits(organizationId, resource);

    res.json({
      resource,
      withinLimits,
    });
  } catch (error) {
    next(error);
  }
});

export { router as billingRouter };
