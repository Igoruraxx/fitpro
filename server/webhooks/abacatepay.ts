/**
 * AbacatePay Webhook Handler
 * Processes payment events from AbacatePay and updates user subscription status
 */

import { Router } from 'express';
import { verifyAbacatepayWebhookSignature } from '../abacatepay-integration';
import { updateUserProfile, getUserById } from '../db';

export const abacatepayWebhookRouter = Router();

interface AbacatepayWebhookPayload {
  event: string;
  data: {
    charge?: {
      id: string;
      subscription_id: string;
      customer_id: string;
      amount: number;
      currency: string;
      status: 'paid' | 'failed' | 'cancelled';
      paid_at?: string;
      failed_at?: string;
    };
    subscription?: {
      id: string;
      customer_id: string;
      status: string;
      cancelled_at?: string;
    };
  };
}

abacatepayWebhookRouter.post('/abacatepay', async (req, res) => {
  try {
    // Verify webhook signature
    const signature = req.headers['x-abacatepay-signature'] as string;
    const payload = (req as any).rawBody?.toString('utf-8') || JSON.stringify(req.body);

    if (!verifyAbacatepayWebhookSignature(payload, signature)) {
      console.warn('[AbacatePay Webhook] Invalid signature');
      return res.status(401).json({ error: 'Invalid signature' });
    }

    const webhook: AbacatepayWebhookPayload = req.body;

    console.log(`[AbacatePay Webhook] Processing event: ${webhook.event}`);

    switch (webhook.event) {
      case 'payment.paid':
        await handlePaymentPaid(webhook);
        break;

      case 'payment.failed':
        await handlePaymentFailed(webhook);
        break;

      case 'subscription.cancelled':
        await handleSubscriptionCancelled(webhook);
        break;

      case 'subscription.overdue':
        await handleSubscriptionOverdue(webhook);
        break;

      default:
        console.log(`[AbacatePay Webhook] Unknown event type: ${webhook.event}`);
    }

    res.json({ success: true });
  } catch (error) {
    console.error('[AbacatePay Webhook] Error processing webhook:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Handle payment.paid event - Activate PRO subscription
 */
async function handlePaymentPaid(webhook: AbacatepayWebhookPayload) {
  const charge = webhook.data.charge;
  if (!charge) return;

  try {
    // Extract user ID from customer_id (format: user_123)
    const userId = parseInt(charge.customer_id.replace('user_', ''), 10);
    if (isNaN(userId)) {
      console.warn(`[AbacatePay] Invalid customer_id format: ${charge.customer_id}`);
      return;
    }

    const user = await getUserById(userId);
    if (!user) {
      console.warn(`[AbacatePay] User not found: ${userId}`);
      return;
    }

    // Check if payment already processed (idempotency)
    if (user.lastPaymentId === charge.id) {
      console.log(`[AbacatePay] Payment already processed: ${charge.id}`);
      return;
    }

    // Calculate expiration date based on billing cycle
    const now = new Date();
    let expiresAt = new Date(now);

    // Assuming the charge amount maps to a billing cycle
    // This is a simplified example - adjust based on your actual plan structure
    const amountInCents = charge.amount;
    if (amountInCents === 2490) {
      // Monthly
      expiresAt.setMonth(expiresAt.getMonth() + 1);
    } else if (amountInCents === 7097) {
      // Quarterly
      expiresAt.setMonth(expiresAt.getMonth() + 3);
    } else if (amountInCents === 13446) {
      // Semiannual
      expiresAt.setMonth(expiresAt.getMonth() + 6);
    } else if (amountInCents === 23904) {
      // Annual
      expiresAt.setFullYear(expiresAt.getFullYear() + 1);
    }

    // Update user subscription
    await updateUserProfile(userId, {
      subscriptionPlan: 'pro',
      proSource: 'payment',
      proExpiresAt: expiresAt,
      planStartAt: now,
      abacatepaySubscriptionId: charge.subscription_id,
      lastPaymentId: charge.id,
      lastPaymentDate: new Date(charge.paid_at || now),
      lastPaymentAmount: (charge.amount / 100).toString(), // Convert cents to decimal
      updatedAt: new Date(),
    });

    console.log(`[AbacatePay] Subscription activated for user ${userId}, expires at ${expiresAt.toISOString()}`);
  } catch (error) {
    console.error('[AbacatePay] Error handling payment.paid:', error);
    throw error;
  }
}

/**
 * Handle payment.failed event - Log failure
 */
async function handlePaymentFailed(webhook: AbacatepayWebhookPayload) {
  const charge = webhook.data.charge;
  if (!charge) return;

  try {
    const userId = parseInt(charge.customer_id.replace('user_', ''), 10);
    if (isNaN(userId)) return;

    console.warn(`[AbacatePay] Payment failed for user ${userId}: ${charge.id}`);

    // TODO: Send notification to user about failed payment
    // TODO: Implement retry logic or dunning management
  } catch (error) {
    console.error('[AbacatePay] Error handling payment.failed:', error);
  }
}

/**
 * Handle subscription.cancelled event - Downgrade to FREE
 */
async function handleSubscriptionCancelled(webhook: AbacatepayWebhookPayload) {
  const subscription = webhook.data.subscription;
  if (!subscription) return;

  try {
    const userId = parseInt(subscription.customer_id.replace('user_', ''), 10);
    if (isNaN(userId)) return;

    const user = await getUserById(userId);
    if (!user) return;

    // Downgrade to FREE
    await updateUserProfile(userId, {
      subscriptionPlan: 'free',
      proSource: null,
      proExpiresAt: null,
      abacatepaySubscriptionId: null,
      updatedAt: new Date(),
    });

    console.log(`[AbacatePay] Subscription cancelled for user ${userId}`);

    // TODO: Send notification to user about cancellation
  } catch (error) {
    console.error('[AbacatePay] Error handling subscription.cancelled:', error);
  }
}

/**
 * Handle subscription.overdue event - Mark as at-risk
 */
async function handleSubscriptionOverdue(webhook: AbacatepayWebhookPayload) {
  const subscription = webhook.data.subscription;
  if (!subscription) return;

  try {
    const userId = parseInt(subscription.customer_id.replace('user_', ''), 10);
    if (isNaN(userId)) return;

    console.warn(`[AbacatePay] Subscription overdue for user ${userId}`);

    // TODO: Send notification to user about overdue payment
    // TODO: Implement dunning management (retry, grace period, etc.)
  } catch (error) {
    console.error('[AbacatePay] Error handling subscription.overdue:', error);
  }
}
