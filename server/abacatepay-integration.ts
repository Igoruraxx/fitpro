/**
 * AbacatePay Integration Helper
 * Handles checkout creation, webhook verification, and subscription status
 */

import crypto from 'crypto';
import { ENV } from './_core/env';
const env = ENV;

const ABACATEPAY_API_URL = 'https://api.abacatepay.com.br';

export interface SubscriptionPlan {
  id: string;
  name: string;
  priceCents: number;
  cycle: 'monthly' | 'quarterly' | 'semiannual' | 'annual';
}

export const SUBSCRIPTION_PLANS: Record<string, SubscriptionPlan> = {
  monthly: {
    id: 'plan_monthly',
    name: 'Plano Mensal',
    priceCents: 2490, // R$ 24,90
    cycle: 'monthly',
  },
  quarterly: {
    id: 'plan_quarterly',
    name: 'Plano Trimestral',
    priceCents: 7097, // R$ 70,97 (5% desconto)
    cycle: 'quarterly',
  },
  semiannual: {
    id: 'plan_semiannual',
    name: 'Plano Semestral',
    priceCents: 13446, // R$ 134,46 (10% desconto)
    cycle: 'semiannual',
  },
  annual: {
    id: 'plan_annual',
    name: 'Plano Anual',
    priceCents: 23904, // R$ 239,04 (20% desconto)
    cycle: 'annual',
  },
};

export interface AbacatepaySubscriptionPayload {
  customerId: string;
  planId: string;
  planName: string;
  amount: number;
  billingCycle: string;
  returnUrl: string;
  notificationUrl: string;
}

/**
 * Create a subscription checkout link
 */
export async function createAbacatepaySubscription(
  payload: AbacatepaySubscriptionPayload
): Promise<{ checkoutUrl: string; subscriptionId: string }> {
  try {
    // Mock mode for development
    if (process.env.NODE_ENV === 'development' || !env.abacatepaySkLive) {
      console.log('[AbacatePay] Mock mode - returning test checkout URL');
      const mockSubscriptionId = `sub_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const mockCheckoutUrl = `https://checkout.abacatepay.test/pay/${mockSubscriptionId}`;
      return {
        checkoutUrl: mockCheckoutUrl,
        subscriptionId: mockSubscriptionId,
      };
    }

    // Production mode - requires API key
    if (!env.abacatepaySkLive) {
      throw new Error('ABACATEPAY_SK_LIVE not configured for production');
    }

    const response = await fetch(`${ABACATEPAY_API_URL}/subscriptions/create`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${env.abacatepaySkLive}`,
      },
      body: JSON.stringify({
        customerId: payload.customerId,
        planId: payload.planId,
        planName: payload.planName,
        amount: payload.amount,
        billingCycle: payload.billingCycle,
        returnUrl: payload.returnUrl,
        notificationUrl: payload.notificationUrl,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`AbacatePay API error: ${error.message || response.statusText}`);
    }

    const data = await response.json();
    return {
      checkoutUrl: data.checkoutUrl,
      subscriptionId: data.subscriptionId,
    };
  } catch (error) {
    console.error('[AbacatePay] Error creating subscription:', error);
    throw error;
  }
}

/**
 * Verify webhook signature
 */
export function verifyAbacatepayWebhookSignature(
  payload: string,
  signature: string
): boolean {
  if (!env.abacatepaySkLive) {
    return false;
  }

  const hash = crypto
    .createHmac('sha256', env.abacatepaySkLive)
    .update(payload)
    .digest('hex');

  return hash === signature;
}

/**
 * Get subscription status from AbacatePay
 */
export async function getSubscriptionStatus(subscriptionId: string) {
  if (!env.abacatepaySkLive) {
    throw new Error('ABACATEPAY_SK_LIVE not configured');
  }

  const response = await fetch(`${ABACATEPAY_API_URL}/subscriptions/${subscriptionId}`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${env.abacatepaySkLive}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch subscription status: ${response.statusText}`);
  }

  return await response.json();
}
