import { Request, Response } from "express";
import { getDb } from "../db";
import { users } from "../../drizzle/schema";
import { eq } from "drizzle-orm";
import { verifyAbacashWebhookSignature } from "../abacash";

/**
 * Handle Abacash webhook for subscription events
 * Events: subscription.created, subscription.activated, subscription.cancelled, subscription.expired
 */
export async function handleAbacashWebhook(req: Request, res: Response) {
  try {
    const signature = req.headers["x-abacash-signature"] as string;
    const body = (req as any).rawBody?.toString("utf-8") || JSON.stringify(req.body);

    // Verify webhook signature
    if (!verifyAbacashWebhookSignature(body, signature)) {
      console.warn("[Abacash Webhook] Invalid signature");
      return res.status(401).json({ error: "Invalid signature" });
    }

    const event = req.body;
    const db = await getDb();
    if (!db) {
      return res.status(500).json({ error: "Database connection failed" });
    }

    console.log(`[Abacash Webhook] Event: ${event.type}`, event);

    switch (event.type) {
      case "subscription.activated":
      case "subscription.created": {
        // Extract user ID from customerId (format: user_123)
        const customerId = event.data?.customerId || event.customerId;
        const userId = parseInt(customerId?.replace("user_", "") || "0");

        if (!userId) {
          console.warn("[Abacash Webhook] Invalid customerId:", customerId);
          return res.status(400).json({ error: "Invalid customerId" });
        }

        // Calculate expiration date based on billing cycle
        const now = new Date();
        let expiresAt = new Date(now);

        const billingCycle = event.data?.billingCycle || event.billingCycle;
        switch (billingCycle) {
          case "monthly":
            expiresAt.setMonth(expiresAt.getMonth() + 1);
            break;
          case "quarterly":
            expiresAt.setMonth(expiresAt.getMonth() + 3);
            break;
          case "semiannual":
            expiresAt.setMonth(expiresAt.getMonth() + 6);
            break;
          case "annual":
            expiresAt.setFullYear(expiresAt.getFullYear() + 1);
            break;
        }

        // Update user subscription
        await db
          .update(users)
          .set({
            subscriptionPlan: "pro",
            subscriptionStatus: "active",
            proSource: "paid",
            proExpiresAt: expiresAt,
            maxClients: 999, // Unlimited for Pro
            updatedAt: new Date(),
          })
          .where(eq(users.id, userId));

        console.log(`[Abacash Webhook] Subscription activated for user ${userId}`);
        return res.json({ success: true });
      }

      case "subscription.cancelled": {
        const customerId = event.data?.customerId || event.customerId;
        const userId = parseInt(customerId?.replace("user_", "") || "0");

        if (!userId) {
          console.warn("[Abacash Webhook] Invalid customerId:", customerId);
          return res.status(400).json({ error: "Invalid customerId" });
        }

        // Update user subscription to free
        await db
          .update(users)
          .set({
            subscriptionPlan: "free",
            subscriptionStatus: "inactive",
            proSource: null,
            proExpiresAt: null,
            maxClients: 5, // Back to free tier limit
            updatedAt: new Date(),
          })
          .where(eq(users.id, userId));

        console.log(`[Abacash Webhook] Subscription cancelled for user ${userId}`);
        return res.json({ success: true });
      }

      case "subscription.expired": {
        const customerId = event.data?.customerId || event.customerId;
        const userId = parseInt(customerId?.replace("user_", "") || "0");

        if (!userId) {
          console.warn("[Abacash Webhook] Invalid customerId:", customerId);
          return res.status(400).json({ error: "Invalid customerId" });
        }

        // Update user subscription to free
        await db
          .update(users)
          .set({
            subscriptionPlan: "free",
            subscriptionStatus: "inactive",
            proSource: null,
            proExpiresAt: null,
            maxClients: 5, // Back to free tier limit
            updatedAt: new Date(),
          })
          .where(eq(users.id, userId));

        console.log(`[Abacash Webhook] Subscription expired for user ${userId}`);
        return res.json({ success: true });
      }

      default:
        console.log(`[Abacash Webhook] Unknown event type: ${event.type}`);
        return res.json({ success: true }); // Always return 200 for unknown events
    }
  } catch (error) {
    console.error("[Abacash Webhook] Error processing webhook:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}
