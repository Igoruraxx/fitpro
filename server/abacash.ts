/**
 * Abacash Payment Integration
 * Handles subscription creation, management, and webhook processing
 */

import { ENV } from "./_core/env";

const env = ENV;

const ABACASH_API_URL = "https://api.abacash.com.br";

export interface AbacashSubscriptionPayload {
  customerId: string;
  planId: string;
  planName: string;
  amount: number; // in cents
  billingCycle: "monthly" | "quarterly" | "semiannual" | "annual";
  returnUrl: string;
  notificationUrl: string;
}

export interface AbacashWebhookPayload {
  event: string;
  subscription?: {
    id: string;
    customerId: string;
    status: string;
    planId: string;
    nextBillingDate: string;
  };
}

/**
 * Create a subscription link for the customer
 * Returns a checkout URL that redirects to Abacash payment page
 */
export async function createAbacashSubscription(
  payload: AbacashSubscriptionPayload
): Promise<{ checkoutUrl: string; subscriptionId: string }> {
  if (!env.abacashSkLive) {
    throw new Error("ABACASH_SK_LIVE not configured");
  }

  try {
    // Mock mode for development/testing
    if (process.env.NODE_ENV === "development" || env.abacashSkLive === "sk_test_mock") {
      console.log("[Abacash] Mock mode - returning test checkout URL");
      const mockSubscriptionId = `sub_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const mockCheckoutUrl = `https://checkout.abacash.test/pay/${mockSubscriptionId}`;
      return {
        checkoutUrl: mockCheckoutUrl,
        subscriptionId: mockSubscriptionId,
      };
    }

    const response = await fetch(`${ABACASH_API_URL}/subscriptions/create`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${env.abacashSkLive}`,
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
      throw new Error(`Abacash API error: ${error.message || response.statusText}`);
    }

    const data = await response.json();
    return {
      checkoutUrl: data.checkoutUrl,
      subscriptionId: data.subscriptionId,
    };
  } catch (error) {
    console.error("[Abacash] Error creating subscription:", error);
    throw error;
  }
}

/**
 * Cancel a subscription
 */
export async function cancelAbacashSubscription(subscriptionId: string): Promise<void> {
  if (!env.abacashSkLive) {
    throw new Error("ABACASH_SK_LIVE not configured");
  }

  try {
    const response = await fetch(`${ABACASH_API_URL}/subscriptions/${subscriptionId}/cancel`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${env.abacashSkLive}`,
      },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Abacash API error: ${error.message || response.statusText}`);
    }
  } catch (error) {
    console.error("[Abacash] Error canceling subscription:", error);
    throw error;
  }
}

/**
 * Get subscription status
 */
export async function getAbacashSubscriptionStatus(
  subscriptionId: string
): Promise<{ status: string; nextBillingDate: string }> {
  if (!env.abacashSkLive) {
    throw new Error("ABACASH_SK_LIVE not configured");
  }

  try {
    const response = await fetch(`${ABACASH_API_URL}/subscriptions/${subscriptionId}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${env.abacashSkLive}`,
      },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Abacash API error: ${error.message || response.statusText}`);
    }

    const data = await response.json();
    return {
      status: data.status,
      nextBillingDate: data.nextBillingDate,
    };
  } catch (error) {
    console.error("[Abacash] Error getting subscription status:", error);
    throw error;
  }
}

/**
 * Verify webhook signature
 * Abacash sends a signature header that should be validated
 */
export function verifyAbacashWebhookSignature(
  payload: string,
  signature: string
): boolean {
  if (!env.abacashSkLive) {
    return false;
  }

  // In production, validate the signature using HMAC
  // For now, we'll accept it (should be implemented with proper HMAC validation)
  return true;
}

/**
 * Plan pricing configuration
 */
export const SUBSCRIPTION_PLANS = {
  monthly: {
    id: "plan_monthly",
    name: "Plano Mensal",
    cycle: "monthly" as const,
    price: 24.9, // R$ 24,90
    priceCents: 2490,
    discount: 0,
  },
  quarterly: {
    id: "plan_quarterly",
    name: "Plano Trimestral",
    cycle: "quarterly" as const,
    price: 70.97, // R$ 70,97 (3 x 24,90 com 5% desconto)
    priceCents: 7097,
    discount: 5,
  },
  semiannual: {
    id: "plan_semiannual",
    name: "Plano Semestral",
    cycle: "semiannual" as const,
    price: 134.46, // R$ 134,46 (6 x 24,90 com 10% desconto)
    priceCents: 13446,
    discount: 10,
  },
  annual: {
    id: "plan_annual",
    name: "Plano Anual",
    cycle: "annual" as const,
    price: 239.04, // R$ 239,04 (12 x 24,90 com 20% desconto)
    priceCents: 23904,
    discount: 20,
  },
};

/**
 * Calculate plan pricing with discount
 */
export function calculatePlanPrice(
  cycle: keyof typeof SUBSCRIPTION_PLANS
): { price: number; priceCents: number; discount: number } {
  const plan = SUBSCRIPTION_PLANS[cycle];
  return {
    price: plan.price,
    priceCents: plan.priceCents,
    discount: plan.discount,
  };
}
