import Stripe from 'stripe';
import { prisma } from '../utils/prisma';
import { ApiError } from '../utils/api-error';
import type { Organization, Subscription, Invoice, PricingPlan } from '@prisma/client';
import { log } from '../utils/logger';

// Initialize Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2025-12-15.clover',
  typescript: true,
});

export interface CreateCheckoutSessionParams {
  organizationId: string;
  priceId: string;
  successUrl: string;
  cancelUrl: string;
}

export interface CreatePortalSessionParams {
  organizationId: string;
  returnUrl: string;
}

export interface UpdateSubscriptionParams {
  organizationId: string;
  priceId: string;
}

export class BillingService {
  /**
   * Create Stripe customer for organization
   */
  async createCustomer(organization: Organization): Promise<string> {
    try {
      const customer = await stripe.customers.create({
        name: organization.name,
        metadata: {
          organizationId: organization.id,
        },
      });

      return customer.id;
    } catch (error) {
      log.error('Error creating Stripe customer:', error);
      throw ApiError.internal('Failed to create customer');
    }
  }

  /**
   * Create Stripe Checkout Session
   */
  async createCheckoutSession(params: CreateCheckoutSessionParams): Promise<string> {
    const { organizationId, priceId, successUrl, cancelUrl } = params;

    // Get or create subscription record
    let subscription = await prisma.subscription.findUnique({
      where: { organizationId },
      include: { organization: true },
    });

    let customerId: string;

    if (!subscription) {
      // Create new customer and subscription record
      const organization = await prisma.organization.findUnique({
        where: { id: organizationId },
      });

      if (!organization) {
        throw ApiError.notFound('Organization not found');
      }

      customerId = await this.createCustomer(organization);

      subscription = await prisma.subscription.create({
        data: {
          organizationId,
          stripeCustomerId: customerId,
          status: 'INCOMPLETE',
        },
        include: { organization: true },
      });
    } else {
      customerId = subscription.stripeCustomerId;
    }

    try {
      const session = await stripe.checkout.sessions.create({
        customer: customerId,
        mode: 'subscription',
        payment_method_types: ['card'],
        line_items: [
          {
            price: priceId,
            quantity: 1,
          },
        ],
        success_url: successUrl,
        cancel_url: cancelUrl,
        metadata: {
          organizationId,
        },
        subscription_data: {
          metadata: {
            organizationId,
          },
          trial_period_days: 14, // 14-day trial
        },
      });

      return session.url || '';
    } catch (error) {
      log.error('Error creating checkout session:', error);
      throw ApiError.internal('Failed to create checkout session');
    }
  }

  /**
   * Create Stripe Customer Portal Session
   */
  async createPortalSession(params: CreatePortalSessionParams): Promise<string> {
    const { organizationId, returnUrl } = params;

    const subscription = await prisma.subscription.findUnique({
      where: { organizationId },
    });

    if (!subscription) {
      throw ApiError.notFound('No subscription found');
    }

    try {
      const session = await stripe.billingPortal.sessions.create({
        customer: subscription.stripeCustomerId,
        return_url: returnUrl,
      });

      return session.url;
    } catch (error) {
      log.error('Error creating portal session:', error);
      throw ApiError.internal('Failed to create portal session');
    }
  }

  /**
   * Get subscription for organization
   */
  async getSubscription(organizationId: string): Promise<Subscription | null> {
    const subscription = await prisma.subscription.findUnique({
      where: { organizationId },
      include: {
        invoices: {
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
      },
    });

    return subscription;
  }

  /**
   * Cancel subscription at period end
   */
  async cancelSubscription(organizationId: string): Promise<void> {
    const subscription = await prisma.subscription.findUnique({
      where: { organizationId },
    });

    if (!subscription || !subscription.stripeSubscriptionId) {
      throw ApiError.notFound('No active subscription found');
    }

    try {
      await stripe.subscriptions.update(subscription.stripeSubscriptionId, {
        cancel_at_period_end: true,
      });

      await prisma.subscription.update({
        where: { id: subscription.id },
        data: { cancelAtPeriodEnd: true },
      });
    } catch (error) {
      log.error('Error canceling subscription:', error);
      throw ApiError.internal('Failed to cancel subscription');
    }
  }

  /**
   * Resume subscription (remove cancel at period end)
   */
  async resumeSubscription(organizationId: string): Promise<void> {
    const subscription = await prisma.subscription.findUnique({
      where: { organizationId },
    });

    if (!subscription || !subscription.stripeSubscriptionId) {
      throw ApiError.notFound('No subscription found');
    }

    try {
      await stripe.subscriptions.update(subscription.stripeSubscriptionId, {
        cancel_at_period_end: false,
      });

      await prisma.subscription.update({
        where: { id: subscription.id },
        data: { cancelAtPeriodEnd: false },
      });
    } catch (error) {
      log.error('Error resuming subscription:', error);
      throw ApiError.internal('Failed to resume subscription');
    }
  }

  /**
   * Update subscription to new price
   */
  async updateSubscription(params: UpdateSubscriptionParams): Promise<void> {
    const { organizationId, priceId } = params;

    const subscription = await prisma.subscription.findUnique({
      where: { organizationId },
    });

    if (!subscription || !subscription.stripeSubscriptionId) {
      throw ApiError.notFound('No active subscription found');
    }

    try {
      // Get current subscription from Stripe
      const stripeSubscription = await stripe.subscriptions.retrieve(
        subscription.stripeSubscriptionId
      );

      // Update subscription item
      await stripe.subscriptions.update(subscription.stripeSubscriptionId, {
        items: [
          {
            id: stripeSubscription.items.data[0].id,
            price: priceId,
          },
        ],
        proration_behavior: 'create_prorations',
      });

      await prisma.subscription.update({
        where: { id: subscription.id },
        data: { stripePriceId: priceId },
      });
    } catch (error) {
      log.error('Error updating subscription:', error);
      throw ApiError.internal('Failed to update subscription');
    }
  }

  /**
   * Get invoices for organization
   */
  async getInvoices(organizationId: string): Promise<Invoice[]> {
    const subscription = await prisma.subscription.findUnique({
      where: { organizationId },
    });

    if (!subscription) {
      return [];
    }

    const invoices = await prisma.invoice.findMany({
      where: { subscriptionId: subscription.id },
      orderBy: { createdAt: 'desc' },
    });

    return invoices;
  }

  /**
   * Check if organization is within limits for a resource
   */
  async checkLimits(organizationId: string, resource: string): Promise<boolean> {
    const subscription = await prisma.subscription.findUnique({
      where: { organizationId },
    });

    // If no subscription or not active, apply free tier limits
    if (!subscription || !['ACTIVE', 'TRIALING'].includes(subscription.status)) {
      return this.checkFreeTierLimits(organizationId, resource);
    }

    // Get pricing plan limits
    if (!subscription.stripePriceId) {
      return this.checkFreeTierLimits(organizationId, resource);
    }

    const plan = await prisma.pricingPlan.findUnique({
      where: { stripePriceId: subscription.stripePriceId },
    });

    if (!plan) {
      return this.checkFreeTierLimits(organizationId, resource);
    }

    const limits = plan.limits as Record<string, any>;

    switch (resource) {
      case 'users':
        const userCount = await prisma.organizationMember.count({
          where: { organizationId, status: 'ACTIVE' },
        });
        return userCount < (limits.users || 999999);

      case 'patients':
        const patientCount = await prisma.patient.count({
          where: { organizationId },
        });
        return patientCount < (limits.patients || 999999);

      default:
        return true;
    }
  }

  /**
   * Check free tier limits
   */
  private async checkFreeTierLimits(organizationId: string, resource: string): Promise<boolean> {
    const FREE_TIER_LIMITS = {
      users: 3,
      patients: 10,
      storage: 1024 * 1024 * 100, // 100MB
    };

    switch (resource) {
      case 'users':
        const userCount = await prisma.organizationMember.count({
          where: { organizationId, status: 'ACTIVE' },
        });
        return userCount < FREE_TIER_LIMITS.users;

      case 'patients':
        const patientCount = await prisma.patient.count({
          where: { organizationId },
        });
        return patientCount < FREE_TIER_LIMITS.patients;

      default:
        return true;
    }
  }

  /**
   * Get usage limits for organization
   */
  async getUsageLimits(organizationId: string): Promise<{
    users: { used: number; limit: number };
    patients: { used: number; limit: number };
    teams: { used: number; limit: number };
  }> {
    // Get current subscription and plan limits
    const subscription = await prisma.subscription.findUnique({
      where: { organizationId },
    });

    // Default free tier limits
    let limits = {
      users: 3,
      patients: 10,
      teams: 1,
    };

    // If active subscription, get plan limits
    if (subscription && ['ACTIVE', 'TRIALING'].includes(subscription.status) && subscription.stripePriceId) {
      const plan = await prisma.pricingPlan.findUnique({
        where: { stripePriceId: subscription.stripePriceId },
      });

      if (plan && plan.limits) {
        const planLimits = plan.limits as Record<string, number>;
        limits = {
          users: planLimits.users || 999999,
          patients: planLimits.patients || 999999,
          teams: planLimits.teams || 999999,
        };
      }
    }

    // Get current usage
    const [userCount, patientCount, teamCount] = await Promise.all([
      prisma.organizationMember.count({
        where: { organizationId, status: 'ACTIVE' },
      }),
      prisma.patient.count({
        where: { organizationId },
      }),
      prisma.team.count({
        where: { organizationId },
      }),
    ]);

    return {
      users: { used: userCount, limit: limits.users },
      patients: { used: patientCount, limit: limits.patients },
      teams: { used: teamCount, limit: limits.teams },
    };
  }

  /**
   * Get all active pricing plans
   */
  async getPricingPlans(): Promise<PricingPlan[]> {
    const plans = await prisma.pricingPlan.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
    });

    return plans;
  }

  /**
   * Sync subscription from Stripe webhook
   */
  async syncSubscriptionFromStripe(stripeSubscription: Stripe.Subscription): Promise<void> {
    const organizationId = stripeSubscription.metadata.organizationId;

    if (!organizationId) {
      log.error('No organizationId in subscription metadata');
      return;
    }

    const data = {
      stripeSubscriptionId: stripeSubscription.id,
      stripePriceId: stripeSubscription.items.data[0]?.price.id || null,
      status: this.mapStripeStatus(stripeSubscription.status),
      currentPeriodStart: new Date((stripeSubscription as any).current_period_start * 1000),
      currentPeriodEnd: new Date((stripeSubscription as any).current_period_end * 1000),
      cancelAtPeriodEnd: (stripeSubscription as any).cancel_at_period_end,
      trialEndsAt: (stripeSubscription as any).trial_end
        ? new Date((stripeSubscription as any).trial_end * 1000)
        : null,
    };

    await prisma.subscription.upsert({
      where: { organizationId },
      create: {
        organizationId,
        stripeCustomerId: stripeSubscription.customer as string,
        ...data,
      },
      update: data,
    });
  }

  /**
   * Sync invoice from Stripe webhook
   */
  async syncInvoiceFromStripe(stripeInvoice: Stripe.Invoice): Promise<void> {
    const subscriptionId = (stripeInvoice as any).subscription as string;

    if (!subscriptionId) {
      return;
    }

    const subscription = await prisma.subscription.findUnique({
      where: { stripeSubscriptionId: subscriptionId },
    });

    if (!subscription) {
      log.error('Subscription not found for invoice');
      return;
    }

    await prisma.invoice.upsert({
      where: { stripeInvoiceId: stripeInvoice.id },
      create: {
        subscriptionId: subscription.id,
        organizationId: subscription.organizationId,
        stripeInvoiceId: stripeInvoice.id,
        amount: (stripeInvoice as any).amount_paid || 0,
        currency: stripeInvoice.currency || 'usd',
        status: this.mapInvoiceStatus(stripeInvoice.status),
        paidAt: (stripeInvoice as any).status_transitions?.paid_at
          ? new Date((stripeInvoice as any).status_transitions.paid_at * 1000)
          : null,
        invoiceUrl: (stripeInvoice as any).hosted_invoice_url || null,
        invoicePdf: (stripeInvoice as any).invoice_pdf || null,
      },
      update: {
        amount: (stripeInvoice as any).amount_paid || 0,
        status: this.mapInvoiceStatus(stripeInvoice.status),
        paidAt: (stripeInvoice as any).status_transitions?.paid_at
          ? new Date((stripeInvoice as any).status_transitions.paid_at * 1000)
          : null,
        invoiceUrl: (stripeInvoice as any).hosted_invoice_url || null,
        invoicePdf: (stripeInvoice as any).invoice_pdf || null,
      },
    });
  }

  /**
   * Map Stripe subscription status to our enum
   */
  private mapStripeStatus(status: Stripe.Subscription.Status): any {
    const statusMap: Record<string, string> = {
      incomplete: 'INCOMPLETE',
      incomplete_expired: 'INCOMPLETE_EXPIRED',
      trialing: 'TRIALING',
      active: 'ACTIVE',
      past_due: 'PAST_DUE',
      canceled: 'CANCELED',
      unpaid: 'UNPAID',
    };

    return statusMap[status] || 'INCOMPLETE';
  }

  /**
   * Map Stripe invoice status to our enum
   */
  private mapInvoiceStatus(status: Stripe.Invoice.Status | null): any {
    const statusMap: Record<string, string> = {
      draft: 'DRAFT',
      open: 'OPEN',
      paid: 'PAID',
      void: 'VOID',
      uncollectible: 'UNCOLLECTIBLE',
    };

    return statusMap[status || 'draft'] || 'DRAFT';
  }
}

export const billingService = new BillingService();
