import { router, adminProcedure } from "../_core/trpc";
import { z } from "zod";
import { getDb } from "../db";
import { users, clients } from "../../drizzle/schema";
import { eq, count } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { SignJWT } from "jose";
import { getSessionCookieOptions } from "../_core/cookies";
import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import { ENV } from "../_core/env";

function getSessionSecret() {
  return new TextEncoder().encode(ENV.cookieSecret);
}

async function createImpersonationToken(adminUserId: number, personalId: number): Promise<string> {
  const issuedAt = Date.now();
  const expiresInMs = ONE_YEAR_MS;
  const expirationSeconds = Math.floor((issuedAt + expiresInMs) / 1000);
  const secretKey = getSessionSecret();

  return new SignJWT({ userId: adminUserId, impersonatingUserId: personalId })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setExpirationTime(expirationSeconds)
    .sign(secretKey);
}

export const adminRouter = router({
  /**
   * List all personals with their subscription info and client count
   */
  listPersonals: adminProcedure
    .input(
      z.object({
        search: z.string().optional(),
        planFilter: z.enum(["all", "free", "pro"]).optional(),
        originFilter: z.enum(["all", "courtesy", "trial"]).optional(),
      })
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];

      let personals = await db
        .select()
        .from(users)
        .where(eq(users.role, "user"));

      if (input.search) {
        const searchLower = input.search.toLowerCase();
        personals = personals.filter(
          (p) =>
            p.name?.toLowerCase().includes(searchLower) ||
            p.email?.toLowerCase().includes(searchLower)
        );
      }

      if (input.planFilter && input.planFilter !== "all") {
        personals = personals.filter(
          (p) => p.subscriptionPlan === input.planFilter
        );
      }

      if (input.originFilter && input.originFilter !== "all") {
        personals = personals.filter((p) => {
          if (p.subscriptionPlan !== "pro") return false;
          return p.proSource === input.originFilter;
        });
      }

      const personalsWithClients = await Promise.all(
        personals.map(async (personal) => {
          const clientCount = await db
            .select({ count: count() })
            .from(clients)
            .where(eq(clients.trainerId, personal.id));

          const daysRemaining = personal.proExpiresAt
            ? Math.ceil(
                (new Date(personal.proExpiresAt).getTime() - Date.now()) /
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
            expiresAt: personal.proExpiresAt
              ? new Date(personal.proExpiresAt).toISOString()
              : null,
            daysRemaining,
            status: personal.subscriptionStatus,
            trialRequestedAt: personal.trialRequestedAt
              ? new Date(personal.trialRequestedAt).toISOString()
              : null,
            lastSignedIn: personal.lastSignedIn
              ? new Date(personal.lastSignedIn).toISOString()
              : null,
            createdAt: personal.createdAt
              ? new Date(personal.createdAt).toISOString()
              : null,
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
        daysValid: z.number().default(365),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db)
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });

      const [personal] = await db
        .select()
        .from(users)
        .where(eq(users.id, input.personalId))
        .limit(1);

      if (!personal)
        throw new TRPCError({ code: "NOT_FOUND", message: "Personal não encontrado" });

      if (personal.subscriptionPlan === "pro")
        throw new TRPCError({ code: "BAD_REQUEST", message: "Este personal já é Pro" });

      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + input.daysValid);

      await db
        .update(users)
        .set({
          subscriptionPlan: "pro",
          subscriptionStatus: "active",
          proSource: "courtesy",
          proExpiresAt: expiresAt,
          planStartAt: new Date(),
          maxClients: 999,
          updatedAt: new Date(),
        })
        .where(eq(users.id, input.personalId));

      return {
        success: true,
        message: `${personal.name} convertido para Pro (cortesia) até ${expiresAt.toLocaleDateString("pt-BR")}`,
      };
    }),

  /**
   * Cancel pro subscription
   */
  cancelProSubscription: adminProcedure
    .input(z.object({ personalId: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db)
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });

      const [personal] = await db
        .select()
        .from(users)
        .where(eq(users.id, input.personalId))
        .limit(1);

      if (!personal)
        throw new TRPCError({ code: "NOT_FOUND", message: "Personal não encontrado" });

      if (personal.subscriptionPlan !== "pro")
        throw new TRPCError({ code: "BAD_REQUEST", message: "Este personal não é Pro" });

      await db
        .update(users)
        .set({
          subscriptionPlan: "free",
          subscriptionStatus: "inactive",
          proSource: null,
          proExpiresAt: null,
          planStartAt: null,
          maxClients: 5,
          updatedAt: new Date(),
        })
        .where(eq(users.id, input.personalId));

      return {
        success: true,
        message: `Assinatura Pro de ${personal.name} cancelada`,
      };
    }),

  /**
   * Impersonate a personal - creates a new JWT with impersonatingUserId
   */
  impersonatePersonal: adminProcedure
    .input(z.object({ personalId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db)
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });

      const [personal] = await db
        .select()
        .from(users)
        .where(eq(users.id, input.personalId))
        .limit(1);

      if (!personal)
        throw new TRPCError({ code: "NOT_FOUND", message: "Personal não encontrado" });

      // Get the real admin user ID (could be ctx.adminUser if already impersonating, or ctx.user)
      const adminId = ctx.adminUser?.id || ctx.user!.id;

      // Create JWT with impersonatingUserId
      const token = await createImpersonationToken(adminId, input.personalId);
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.cookie(COOKIE_NAME, token, cookieOptions);

      return {
        success: true,
        personalId: input.personalId,
        personalName: personal.name,
        message: `Impersonando ${personal.name}. Você verá os dados deste personal.`,
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

      const [personal] = await db
        .select()
        .from(users)
        .where(eq(users.id, input.personalId))
        .limit(1);

      if (!personal) return null;

      const clientCount = await db
        .select({ count: count() })
        .from(clients)
        .where(eq(clients.trainerId, input.personalId));

      return {
        id: personal.id,
        name: personal.name,
        email: personal.email,
        phone: personal.phone,
        plan: personal.subscriptionPlan,
        proSource: personal.proSource,
        status: personal.subscriptionStatus,
        expiresAt: personal.proExpiresAt
          ? new Date(personal.proExpiresAt).toISOString()
          : null,
        clientCount: clientCount[0]?.count || 0,
        createdAt: personal.createdAt
          ? new Date(personal.createdAt).toISOString()
          : null,
        lastSignedIn: personal.lastSignedIn
          ? new Date(personal.lastSignedIn).toISOString()
          : null,
      };
    }),
});
