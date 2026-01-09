import { api } from './client';

export interface Plan {
  id: string;
  name: string;
  description: string;
  price: number;
  interval: 'month' | 'year';
  features: string[];
  limits: Record<string, number>;
  stripePriceId: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Subscription {
  id: string;
  status: 'active' | 'canceled' | 'past_due' | 'trialing' | 'unpaid';
  planId: string;
  planName: string;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  cancelAtPeriodEnd: boolean;
  trialEnd?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Invoice {
  id: string;
  number: string;
  status: 'draft' | 'open' | 'paid' | 'void' | 'uncollectible';
  amount: number;
  currency: string;
  createdAt: string;
  paidAt?: string;
  invoicePdf?: string;
  hostedInvoiceUrl?: string;
}

export interface UsageLimits {
  users: { used: number; limit: number };
  patients: { used: number; limit: number };
  teams: { used: number; limit: number };
}

export interface CheckoutSession {
  url: string;
}

export interface PortalSession {
  url: string;
}

export interface PlansResponse {
  plans: Plan[];
}

export interface SubscriptionResponse {
  subscription: Subscription | null;
  status?: string;
}

export interface InvoicesResponse {
  invoices: Invoice[];
}

export const billingApi = {
  /**
   * Get all available pricing plans
   */
  getPlans: (): Promise<PlansResponse> => {
    return api.get<PlansResponse>('/api/billing/plans');
  },

  /**
   * Get current subscription for the organization
   */
  getSubscription: (): Promise<SubscriptionResponse> => {
    return api.get<SubscriptionResponse>('/api/billing/subscription');
  },

  /**
   * Create Stripe Checkout session
   */
  createCheckout: (priceId: string, successUrl: string, cancelUrl: string): Promise<CheckoutSession> => {
    return api.post<CheckoutSession>('/api/billing/checkout', {
      priceId,
      successUrl,
      cancelUrl,
    });
  },

  /**
   * Get Stripe Customer Portal URL
   */
  getPortalUrl: (returnUrl: string): Promise<PortalSession> => {
    return api.post<PortalSession>('/api/billing/portal', {
      returnUrl,
    });
  },

  /**
   * Cancel subscription at period end
   */
  cancelSubscription: (): Promise<{ message: string }> => {
    return api.post<{ message: string }>('/api/billing/cancel');
  },

  /**
   * Resume canceled subscription
   */
  resumeSubscription: (): Promise<{ message: string }> => {
    return api.post<{ message: string }>('/api/billing/resume');
  },

  /**
   * Update subscription to different plan
   */
  updateSubscription: (priceId: string): Promise<{ message: string }> => {
    return api.put<{ message: string }>('/api/billing/subscription', {
      priceId,
    });
  },

  /**
   * Get all invoices for the organization
   */
  getInvoices: (): Promise<InvoicesResponse> => {
    return api.get<InvoicesResponse>('/api/billing/invoices');
  },

  /**
   * Check if organization is within limits for a resource
   */
  checkLimits: (resource: string): Promise<{ resource: string; withinLimits: boolean }> => {
    return api.get<{ resource: string; withinLimits: boolean }>(`/api/billing/limits/${resource}`);
  },

  /**
   * Get usage limits for all resources
   */
  getUsageLimits: (): Promise<UsageLimits> => {
    return api.get<UsageLimits>('/api/billing/usage');
  },
};
