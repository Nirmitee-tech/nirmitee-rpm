import { Router, Request, Response, NextFunction } from 'express';
import Stripe from 'stripe';
import { billingService } from '../../services/billing-service';
import { deviceWebhookService } from '../../services/device-webhook-service';
import { ApiError } from '../../utils/api-error';
import { log } from '../../utils/logger';

const router = Router();

// Initialize Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2025-12-15.clover',
  typescript: true,
});

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || '';

/**
 * POST /api/webhooks/stripe
 * Handle Stripe webhook events
 *
 * IMPORTANT: This endpoint must use raw body, not JSON parsed body
 * Configure this in index.ts before other body parsers
 */
router.post(
  '/stripe',
  async (req: Request, res: Response, next: NextFunction) => {
    const signature = req.headers['stripe-signature'];

    if (!signature) {
      return next(ApiError.badRequest('Missing stripe-signature header'));
    }

    let event: Stripe.Event;

    try {
      // Verify webhook signature
      event = stripe.webhooks.constructEvent(
        req.body,
        signature,
        webhookSecret
      );
    } catch (error) {
      log.error('Webhook signature verification failed:', error);
      return next(ApiError.unauthorized('Invalid webhook signature'));
    }

    log.info(`Received Stripe webhook: ${event.type}`);

    try {
      // Handle different event types
      switch (event.type) {
        case 'checkout.session.completed':
          await handleCheckoutSessionCompleted(event.data.object as Stripe.Checkout.Session);
          break;

        case 'customer.subscription.created':
          await handleSubscriptionCreated(event.data.object as Stripe.Subscription);
          break;

        case 'customer.subscription.updated':
          await handleSubscriptionUpdated(event.data.object as Stripe.Subscription);
          break;

        case 'customer.subscription.deleted':
          await handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
          break;

        case 'invoice.paid':
          await handleInvoicePaid(event.data.object as Stripe.Invoice);
          break;

        case 'invoice.payment_failed':
          await handleInvoicePaymentFailed(event.data.object as Stripe.Invoice);
          break;

        case 'customer.subscription.trial_will_end':
          await handleTrialWillEnd(event.data.object as Stripe.Subscription);
          break;

        default:
          log.info(`Unhandled event type: ${event.type}`);
      }

      // Return 200 to acknowledge receipt
      res.json({ received: true });
    } catch (error) {
      log.error(`Error processing webhook ${event.type}:`, error);
      // Return 200 even on error to prevent retries for processing errors
      res.json({ received: true, error: 'Processing error' });
    }
  }
);

/**
 * Handle checkout.session.completed
 * Triggered when a checkout session is completed
 */
async function handleCheckoutSessionCompleted(session: Stripe.Checkout.Session) {
  log.info('Checkout session completed', { sessionId: session.id });

  if (session.mode !== 'subscription') {
    return;
  }

  const subscriptionId = session.subscription as string;
  if (!subscriptionId) {
    return;
  }

  // Retrieve full subscription details
  const subscription = await stripe.subscriptions.retrieve(subscriptionId);
  await billingService.syncSubscriptionFromStripe(subscription);
}

/**
 * Handle customer.subscription.created
 * Triggered when a subscription is created
 */
async function handleSubscriptionCreated(subscription: Stripe.Subscription) {
  log.info('Subscription created', { subscriptionId: subscription.id });
  await billingService.syncSubscriptionFromStripe(subscription);
}

/**
 * Handle customer.subscription.updated
 * Triggered when a subscription is updated (status change, plan change, etc.)
 */
async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  log.info('Subscription updated', { subscriptionId: subscription.id });
  await billingService.syncSubscriptionFromStripe(subscription);
}

/**
 * Handle customer.subscription.deleted
 * Triggered when a subscription is canceled/deleted
 */
async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  log.info('Subscription deleted', { subscriptionId: subscription.id });
  await billingService.syncSubscriptionFromStripe(subscription);
}

/**
 * Handle invoice.paid
 * Triggered when an invoice payment succeeds
 */
async function handleInvoicePaid(invoice: Stripe.Invoice) {
  log.info('Invoice paid', { invoiceId: invoice.id });
  await billingService.syncInvoiceFromStripe(invoice);

  // TODO: Send payment confirmation email
  // const subscription = await prisma.subscription.findUnique({
  //   where: { stripeSubscriptionId: invoice.subscription as string },
  //   include: { organization: true }
  // });
  // await emailService.sendPaymentConfirmation(...)
}

/**
 * Handle invoice.payment_failed
 * Triggered when an invoice payment fails
 */
async function handleInvoicePaymentFailed(invoice: Stripe.Invoice) {
  log.info('Invoice payment failed', { invoiceId: invoice.id });
  await billingService.syncInvoiceFromStripe(invoice);

  // TODO: Send payment failed notification
  // const subscription = await prisma.subscription.findUnique({
  //   where: { stripeSubscriptionId: invoice.subscription as string },
  //   include: { organization: { include: { members: true } } }
  // });
  // await notificationService.notifyPaymentFailed(...)
}

/**
 * Handle customer.subscription.trial_will_end
 * Triggered 3 days before trial ends
 */
async function handleTrialWillEnd(subscription: Stripe.Subscription) {
  log.info('Trial will end soon', { subscriptionId: subscription.id });

  // TODO: Send trial ending notification
  // const dbSubscription = await prisma.subscription.findUnique({
  //   where: { stripeSubscriptionId: subscription.id },
  //   include: { organization: { include: { members: true } } }
  // });
  // await notificationService.notifyTrialEnding(...)
}

// ==========================================
// DEVICE WEBHOOKS
// ==========================================

/**
 * Handle incoming device webhook
 * POST /api/webhooks/device/:hubId
 * This is a public endpoint - security is via webhook signature
 */
router.post('/device/:hubId', async (req: Request, res: Response) => {
  try {
    const { hubId } = req.params;
    const signature = req.headers['x-webhook-signature'] as string ||
                      req.headers['x-signature'] as string ||
                      req.headers['x-hub-signature-256'] as string;

    const vendor = req.body.vendor || req.headers['x-vendor'] || 'unknown';
    const eventType = req.body.event_type || req.body.eventType || req.body.type || 'unknown';

    const payload = {
      vendor,
      eventType,
      timestamp: req.body.timestamp,
      deviceId: req.body.device_id || req.body.deviceId,
      externalDeviceId: req.body.external_device_id || req.body.externalDeviceId || req.body.mac || req.body.serial,
      data: req.body.data || req.body,
      signature,
    };

    const result = await deviceWebhookService.processWebhook(hubId, payload, signature);
    res.status(200).json({ success: true, webhookId: result.id, status: result.status });
  } catch (error) {
    log.error('Device webhook error:', error);
    res.status(200).json({ success: false, error: error instanceof Error ? error.message : 'Unknown error' });
  }
});

/**
 * iHealth webhook endpoint
 */
router.post('/ihealth/:hubId', async (req: Request, res: Response) => {
  try {
    const { hubId } = req.params;
    const signature = req.headers['x-ihealth-signature'] as string;

    const payload = {
      vendor: 'ihealth',
      eventType: req.body.api_name || req.body.APIName,
      timestamp: req.body.measurement_time || req.body.MeasurementTime,
      externalDeviceId: req.body.mac || req.body.MAC,
      data: req.body,
    };

    await deviceWebhookService.processWebhook(hubId, payload, signature);
    res.status(200).json({ success: true });
  } catch (error) {
    log.error('iHealth webhook error:', error);
    res.status(200).json({ success: false });
  }
});

/**
 * Withings webhook endpoint
 */
router.post('/withings/:hubId', async (req: Request, res: Response) => {
  try {
    const { hubId } = req.params;
    const signature = req.headers['x-withings-signature'] as string;

    const payload = {
      vendor: 'withings',
      eventType: req.body.appli?.toString() || 'unknown',
      timestamp: req.body.date,
      externalDeviceId: req.body.deviceid,
      data: req.body,
    };

    await deviceWebhookService.processWebhook(hubId, payload, signature);
    res.status(200).json({ success: true });
  } catch (error) {
    log.error('Withings webhook error:', error);
    res.status(200).json({ success: false });
  }
});

/**
 * Bodytrace webhook endpoint
 */
router.post('/bodytrace/:hubId', async (req: Request, res: Response) => {
  try {
    const { hubId } = req.params;
    const signature = req.headers['x-bodytrace-signature'] as string;

    const payload = {
      vendor: 'bodytrace',
      eventType: req.body.event || 'reading',
      timestamp: req.body.timestamp,
      externalDeviceId: req.body.imei || req.body.serial,
      data: req.body,
    };

    await deviceWebhookService.processWebhook(hubId, payload, signature);
    res.status(200).json({ success: true });
  } catch (error) {
    log.error('Bodytrace webhook error:', error);
    res.status(200).json({ success: false });
  }
});

/**
 * Webhook verification endpoint (for vendor URL verification)
 */
router.get('/device/:hubId', async (req: Request, res: Response) => {
  const challenge = req.query.challenge || req.query['hub.challenge'];
  if (challenge) {
    res.send(challenge);
  } else {
    res.json({ status: 'ok', hubId: req.params.hubId });
  }
});

export { router as webhookRouter };
