import { router, adminProcedure } from "../_core/trpc";
import { z } from "zod";
import { getDb } from "../db";
import { users, clients } from "../../drizzle/schema";
import { eq, count } from "drizzle-orm";
import { TRPCError } from "@trpc/server";

export const adminRouter = router({
  /**
   * List all personals with their subscription info and client count
   */
  listPersonals: adminProcedure
    .input(
      z.object({
        search: z.string().optional(),
        planFilter: z.enum(["all", "free", "pro"]).optional(),
        originFilter: z.enum(["all", "payment", "courtesy", "trial"]).optional(),
      })
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];

      // Get all personals (role = 'user')
      let personals = await db
        .select()
        .from(users)
        .where(eq(users.role, "user"));

      // Filter by search term
      if (input.search) {
        const searchLower = input.search.toLowerCase();
        personals = personals.filter(
          (p) =>
            p.name?.toLowerCase().includes(searchLower) ||
            p.email?.toLowerCase().includes(searchLower)
        );
      }

      // Filter by plan
      if (input.planFilter && input.planFilter !== "all") {
        personals = personals.filter(
          (p) => p.subscriptionPlan === input.planFilter
        );
      }

      // Filter by origin (only for pro)
      if (input.originFilter && input.originFilter !== "all") {
        personals = personals.filter((p) => {
          if (p.subscriptionPlan !== "pro") return false;
          return p.proSource === input.originFilter;
        });
      }

      // Get client count for each personal
      const personalsWithClients = await Promise.all(
        personals.map(async (personal) => {
          const clientCount = await db
            .select({ count: count() })
            .from(clients)
            .where(eq(clients.trainerId, personal.id));

          const daysRemaining = personal.proExpiresAt
            ? Math.ceil(
                (personal.proExpiresAt.getTime() - Date.now()) /
                  (1000 * 60 * 60 * 24)
              )
            : null;

          return {
            id: personal.id,
            name: personal.name || "Sem nome",
            email: personal.email,
            plan: personal.subscriptionPlan,
            proSource: personal.proSource,
            clientCount: clientCount[0]?.count || 0,
            expiresAt: personal.proExpiresAt?.toISOString() || null,
            daysRemaining,
            status: personal.subscriptionStatus,
            trialRequestedAt: personal.trialRequestedAt?.toISOString() || null,
          };
        })
      );

      return personalsWithClients.sort((a, b) =>
        (a.name || "").localeCompare(b.name || "")
      );
    }),

  /**
   * Convert a free personal to pro (courtesy)
   */
  convertToProCourtesy: adminProcedure
    .input(
      z.object({
        personalId: z.number(),
        daysValid: z.number().default(365), // Default 1 year
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database connection failed",
        });
      }

      // Get personal
      const personal = await db
        .select()
        .from(users)
        .where(eq(users.id, input.personalId))
        .limit(1);

      if (!personal.length) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Personal não encontrado",
        });
      }

      if (personal[0].subscriptionPlan === "pro") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Este personal já é Pro",
        });
      }

      // Calculate expiration date
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + input.daysValid);

      // Update personal
      await db
        .update(users)
        .set({
          subscriptionPlan: "pro",
          subscriptionStatus: "active",
          proSource: "courtesy",
          proExpiresAt: expiresAt,
          maxClients: 999,
          updatedAt: new Date(),
        })
        .where(eq(users.id, input.personalId));

      return {
        success: true,
        message: `${personal[0].name} convertido para Pro (cortesia) até ${expiresAt.toLocaleDateString("pt-BR")}`,
      };
    }),

  /**
   * Cancel pro subscription
   */
  cancelProSubscription: adminProcedure
    .input(z.object({ personalId: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database connection failed",
        });
      }

      // Get personal
      const personal = await db
        .select()
        .from(users)
        .where(eq(users.id, input.personalId))
        .limit(1);

      if (!personal.length) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Personal não encontrado",
        });
      }

      if (personal[0].subscriptionPlan !== "pro") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Este personal não é Pro",
        });
      }

      // Update personal
      await db
        .update(users)
        .set({
          subscriptionPlan: "free",
          subscriptionStatus: "inactive",
          proSource: null,
          proExpiresAt: null,
          maxClients: 5,
          updatedAt: new Date(),
        })
        .where(eq(users.id, input.personalId));

      return {
        success: true,
        message: `Assinatura Pro de ${personal[0].name} cancelada`,
      };
    }),

  /**
   * Impersonate a personal (admin becomes the personal temporarily)
   */
  impersonatePersonal: adminProcedure
    .input(z.object({ personalId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database connection failed",
        });
      }

      // Get personal
      const personal = await db
        .select()
        .from(users)
        .where(eq(users.id, input.personalId))
        .limit(1);

      if (!personal.length) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Personal não encontrado",
        });
      }

      // Return info for frontend to handle impersonation
      return {
        success: true,
        personalId: input.personalId,
        personalName: personal[0].name,
        message: `Impersonando ${personal[0].name}. Você verá os dados deste personal.`,
      };
    }),

  /**
   * Get personal details with all info
   */
  getPersonalDetails: adminProcedure
    .input(z.object({ personalId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return null;

      const personal = await db
        .select()
        .from(users)
        .where(eq(users.id, input.personalId))
        .limit(1);

      if (!personal.length) return null;

      const clientCount = await db
        .select({ count: count() })
        .from(clients)
        .where(eq(clients.trainerId, input.personalId));

      return {
        id: personal[0].id,
        name: personal[0].name,
        email: personal[0].email,
        phone: personal[0].phone,
        plan: personal[0].subscriptionPlan,
        proSource: personal[0].proSource,
        status: personal[0].subscriptionStatus,
        expiresAt: personal[0].proExpiresAt?.toISOString(),
        clientCount: clientCount[0]?.count || 0,
        createdAt: personal[0].createdAt?.toISOString(),
        lastSignedIn: personal[0].lastSignedIn?.toISOString(),
      };
    }),
});
