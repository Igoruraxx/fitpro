import { router, protectedProcedure } from "../_core/trpc";
import { z } from "zod";
import { getDb } from "../db";
import { users } from "../../drizzle/schema";
import { eq } from "drizzle-orm";
import { createAbacashSubscription, SUBSCRIPTION_PLANS } from "../abacash";
import { TRPCError } from "@trpc/server";

export const paymentsRouter = router({
  /**
   * Get available subscription plans with pricing
   */
  getPlans: protectedProcedure.query(async () => {
    return Object.entries(SUBSCRIPTION_PLANS).map(([key, plan]) => ({
      id: plan.id,
      key: key as keyof typeof SUBSCRIPTION_PLANS,
      name: plan.name,
      cycle: plan.cycle,
      price: plan.price,
      priceCents: plan.priceCents,
      discount: plan.discount,
      billingPeriod: {
        monthly: "Mensal",
        quarterly: "Trimestral (3 meses)",
        semiannual: "Semestral (6 meses)",
        annual: "Anual (12 meses)",
      }[plan.cycle],
    }));
  }),

  /**
   * Create a subscription checkout link
   */
  createCheckout: protectedProcedure
    .input(
      z.object({
        planKey: z.enum(["monthly", "quarterly", "semiannual", "annual"]),
        returnUrl: z.string().url(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (!ctx.user) {
        throw new TRPCError({ code: "UNAUTHORIZED" });
      }

      const plan = SUBSCRIPTION_PLANS[input.planKey];
      if (!plan) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Invalid plan" });
      }

      try {
        const result = await createAbacashSubscription({
          customerId: `user_${ctx.user.id}`,
          planId: plan.id,
          planName: plan.name,
          amount: plan.priceCents,
          billingCycle: plan.cycle,
          returnUrl: input.returnUrl,
          notificationUrl: `${process.env.VITE_FRONTEND_FORGE_API_URL || "http://localhost:3000"}/api/webhooks/abacash`,
        });

        return {
          checkoutUrl: result.checkoutUrl,
          subscriptionId: result.subscriptionId,
        };
      } catch (error) {
        console.error("[Payments] Error creating checkout:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Erro ao criar checkout",
        });
      }
    }),

  /**
   * Confirm payment and activate Pro subscription
   */
  confirmPayment: protectedProcedure
    .input(
      z.object({
        subscriptionId: z.string(),
        planKey: z.enum(["monthly", "quarterly", "semiannual", "annual"]),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (!ctx.user) {
        throw new TRPCError({ code: "UNAUTHORIZED" });
      }

      const plan = SUBSCRIPTION_PLANS[input.planKey];
      if (!plan) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Invalid plan" });
      }

      try {
        // Calculate expiration date based on billing cycle
        const now = new Date();
        let expiresAt = new Date(now);

        switch (plan.cycle) {
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
        const database = await getDb();
      if (!database) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database connection failed",
        });
      }
      await database
          .update(users)
          .set({
            subscriptionPlan: "pro",
            subscriptionStatus: "active",
            proSource: "paid",
            proExpiresAt: expiresAt,
            maxClients: 999, // Unlimited for Pro
            updatedAt: new Date(),
          })
          .where(eq(users.id, ctx.user.id));

        return {
          success: true,
          expiresAt: expiresAt.toISOString(),
          message: "Assinatura ativada com sucesso!",
        };
      } catch (error) {
        console.error("[Payments] Error confirming payment:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Erro ao confirmar pagamento",
        });
      }
    }),

  /**
   * Get current subscription status
   */
  getSubscriptionStatus: protectedProcedure.query(async ({ ctx }) => {
    if (!ctx.user) {
      throw new TRPCError({ code: "UNAUTHORIZED" });
    }

    const database = await getDb();
    if (!database) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Database connection failed",
      });
    }
    const user = await database
      .select()
      .from(users)
      .where(eq(users.id, ctx.user.id))
      .limit(1);

    if (!user.length) {
      throw new TRPCError({ code: "NOT_FOUND" });
    }

    const userData = user[0];

    return {
      plan: userData.subscriptionPlan,
      status: userData.subscriptionStatus,
      source: userData.proSource, // 'trial' | 'paid' | 'courtesy'
      expiresAt: userData.proExpiresAt?.toISOString() || null,
      isActive: userData.subscriptionStatus === "active",
      daysRemaining: userData.proExpiresAt
        ? Math.ceil(
            (userData.proExpiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
          )
        : null,
    };
  }),

  /**
   * Cancel subscription
   */
  cancelSubscription: protectedProcedure.mutation(async ({ ctx }) => {
    if (!ctx.user) {
      throw new TRPCError({ code: "UNAUTHORIZED" });
    }

    try {
      const database = await getDb();
      if (!database) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database connection failed",
        });
      }
      // Update user subscription to free
      await database
        .update(users)
        .set({
          subscriptionPlan: "free",
          subscriptionStatus: "inactive",
          proSource: null,
          proExpiresAt: null,
          maxClients: 5, // Back to free tier limit
          updatedAt: new Date(),
        })
        .where(eq(users.id, ctx.user.id));

      return {
        success: true,
        message: "Assinatura cancelada",
      };
    } catch (error) {
      console.error("[Payments] Error canceling subscription:", error);
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Erro ao cancelar assinatura",
      });
    }
  }),
});
