import { z } from "zod";
import { publicProcedure, protectedProcedure, router } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import { SignJWT } from "jose";
import {
  hashPassword,
  verifyPassword,
  isValidEmail,
  getPasswordErrorMessage,
  getTokenExpiration,
} from "../auth";
import {
  createUser,
  getUserByEmail,
  createAuthToken,
  getAuthToken,
  deleteAuthToken,
  updateUserEmailVerified,
  updateUserPassword,
  getUserById,
} from "../db";
import { getSessionCookieOptions } from "../_core/cookies";
import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import { ENV } from "../_core/env";
import { sendWelcomeEmail, sendPasswordResetEmail } from "../email";
import { sendOtpEmail } from "../email-otp";

function getSessionSecret() {
  return new TextEncoder().encode(ENV.cookieSecret);
}

async function createSessionToken(userId: number): Promise<string> {
  const issuedAt = Date.now();
  const expiresInMs = ONE_YEAR_MS;
  const expirationSeconds = Math.floor((issuedAt + expiresInMs) / 1000);
  const secretKey = getSessionSecret();

  return new SignJWT({ userId })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setExpirationTime(expirationSeconds)
    .sign(secretKey);
}

const registerSchema = z.object({
  email: z.string().email("E-mail inválido"),
  password: z.string().min(8, "Senha deve ter no mínimo 8 caracteres"),
  name: z.string().min(2, "Nome deve ter no mínimo 2 caracteres"),
});

const loginSchema = z.object({
  email: z.string().email("E-mail inválido"),
  password: z.string(),
});

const confirmEmailSchema = z.object({
  token: z.string(),
});

const forgotPasswordSchema = z.object({
  email: z.string().email("E-mail inválido"),
});

const resetPasswordSchema = z.object({
  token: z.string(),
  password: z.string().min(8, "Senha deve ter no mínimo 8 caracteres"),
});

export const authRouter = router({
  register: publicProcedure
    .input(registerSchema)
    .mutation(async ({ input }) => {
      // Validate email format
      if (!isValidEmail(input.email)) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "E-mail inválido",
        });
      }

      // Validate password strength
      const passwordError = getPasswordErrorMessage(input.password);
      if (passwordError) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: passwordError,
        });
      }

      // Check if user already exists
      const existingUser = await getUserByEmail(input.email);
      if (existingUser) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "Este e-mail já está registrado",
        });
      }

      // Hash password and create user
      const passwordHash = await hashPassword(input.password);
      const user = await createUser(input.email, passwordHash, input.name);

      // Create email confirmation token (stored for future email sending)
      await createAuthToken(
        user.id,
        "email_confirmation",
        getTokenExpiration("email_confirmation")
      );

      // Auto-confirm email (no email verification flow)
      await updateUserEmailVerified(user.id);
      
      // Verify that email was marked as verified
      const verifiedUser = await getUserById(user.id);
      if (!verifiedUser?.emailVerified) {
        console.warn(`[Auth] Email verification failed for user ${user.id}`);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Erro ao confirmar e-mail. Tente novamente.",
        });
      }

      // Send welcome email (fire-and-forget, don't block registration)
      sendWelcomeEmail(input.email, input.name).catch(() => {});

      return {
        success: true,
        message: "Cadastro realizado com sucesso! Você já pode fazer login.",
        userId: user.id,
      };
    }),

  login: publicProcedure
    .input(loginSchema)
    .mutation(async ({ input, ctx }) => {
      // Find user by email
      const user = await getUserByEmail(input.email);
      if (!user || !user.passwordHash) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "E-mail ou senha inválidos",
        });
      }

      // Verify password
      const isValid = await verifyPassword(input.password, user.passwordHash);
      if (!isValid) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "E-mail ou senha inválidos",
        });
      }

      // Check if email is verified
      if (!user.emailVerified) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Por favor, confirme seu e-mail antes de fazer login",
        });
      }

      // Reload user from database to get latest role and data
      const freshUser = await getUserById(user.id);
      if (!freshUser) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Erro ao carregar dados do usuário",
        });
      }

      // Create JWT session token
      const sessionToken = await createSessionToken(freshUser.id);

      // Set session cookie
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.cookie(COOKIE_NAME, sessionToken, {
        ...cookieOptions,
        maxAge: ONE_YEAR_MS,
      });

      return {
        success: true,
        user: {
          id: freshUser.id,
          email: freshUser.email,
          name: freshUser.name,
          role: freshUser.role,
        },
      };
    }),

  confirmEmail: publicProcedure
    .input(confirmEmailSchema)
    .mutation(async ({ input }) => {
      // Get auth token
      const authToken = await getAuthToken(input.token);
      if (!authToken) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Token inválido ou expirado",
        });
      }

      // Check if token is expired
      if (new Date() > authToken.expiresAt) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Token expirado",
        });
      }

      // Check if token is for email confirmation
      if (authToken.type !== "email_confirmation") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Token inválido",
        });
      }

      // Mark email as verified
      await updateUserEmailVerified(authToken.userId);

      // Delete token
      await deleteAuthToken(input.token);

      return {
        success: true,
        message: "E-mail confirmado com sucesso! Você já pode fazer login.",
      };
    }),

  forgotPassword: publicProcedure
    .input(forgotPasswordSchema)
    .mutation(async ({ input }) => {
      // Find user by email
      const user = await getUserByEmail(input.email);
      if (!user) {
        // Don't reveal if email exists or not (security)
        return {
          success: true,
          message: "Se o e-mail estiver registrado, você receberá um link para redefinir a senha.",
        };
      }

      // Create password reset token
      const resetToken = await createAuthToken(
        user.id,
        "password_reset",
        getTokenExpiration("password_reset")
      );

      // Send password reset email
      // The frontend origin is not available here, so we use a relative path
      // The client will pass origin if needed; for now use a known pattern
      const resetUrl = `${ENV.isProduction ? "https" : "http"}://fitpro.manus.space/reset-password?token=${resetToken}`;
      sendPasswordResetEmail(user.email!, user.name ?? "Personal Trainer", resetUrl).catch(() => {});

      return {
        success: true,
        message: "Se o e-mail estiver registrado, você receberá um link para redefinir a senha.",
      };
    }),

  resetPassword: publicProcedure
    .input(resetPasswordSchema)
    .mutation(async ({ input }) => {
      // Validate password strength
      const passwordError = getPasswordErrorMessage(input.password);
      if (passwordError) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: passwordError,
        });
      }

      // Get auth token
      const authToken = await getAuthToken(input.token);
      if (!authToken) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Token inválido ou expirado",
        });
      }

      // Check if token is expired
      if (new Date() > authToken.expiresAt) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Token expirado",
        });
      }

      // Check if token is for password reset
      if (authToken.type !== "password_reset") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Token inválido",
        });
      }

      // Hash new password and update user
      const passwordHash = await hashPassword(input.password);
      await updateUserPassword(authToken.userId, passwordHash);

      // Delete token
      await deleteAuthToken(input.token);

      return {
        success: true,
        message: "Senha redefinida com sucesso! Você já pode fazer login com a nova senha.",
      };
    }),

  // ==================== OTP AUTH ====================
  sendOtp: publicProcedure
    .input(z.object({ email: z.string().email("E-mail inválido") }))
    .mutation(async ({ input }) => {
      if (!isValidEmail(input.email)) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "E-mail inválido" });
      }

      // Generate 6-digit OTP code
      const code = String(Math.floor(100000 + Math.random() * 900000));

      // Store OTP as auth token (type = 'otp', expires in 10 minutes)
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 min

      // Check if user exists to personalize email
      const existingUser = await getUserByEmail(input.email);

      // Delete any existing OTP tokens for this email/user
      if (existingUser) {
        const { getDb } = await import("../db");
        const db = await getDb();
        if (db) {
          const { authTokens: authTokensTable } = await import("../../drizzle/schema");
          const { eq, and } = await import("drizzle-orm");
          await db.delete(authTokensTable).where(
            and(
              eq(authTokensTable.userId, existingUser.id),
              eq(authTokensTable.type, "otp")
            )
          );
        }
      }

      // For new users, create a temporary user record or store OTP differently
      // We'll use a special approach: store OTP with email as the token prefix
      if (existingUser) {
        // Store OTP for existing user
        const { getDb } = await import("../db");
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });

        const { authTokens: authTokensTable } = await import("../../drizzle/schema");
        await db.insert(authTokensTable).values({
          userId: existingUser.id,
          token: `otp:${input.email}:${code}`,
          type: "otp",
          expiresAt,
        });
      } else {
        // For new users, create a placeholder user (unverified) to store the OTP
        const { hashPassword: hp } = await import("../auth");
        const tempHash = await hp(code + Date.now()); // random hash, will be replaced
        const newUser = await createUser(input.email, tempHash, undefined);

        const { getDb } = await import("../db");
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });

        const { authTokens: authTokensTable } = await import("../../drizzle/schema");
        await db.insert(authTokensTable).values({
          userId: newUser.id,
          token: `otp:${input.email}:${code}`,
          type: "otp",
          expiresAt,
        });
      }

      // Send OTP email
      const sent = await sendOtpEmail(input.email, code, existingUser?.name ?? undefined);

      return {
        success: true,
        isNewUser: !existingUser,
        message: sent
          ? "Código enviado para seu e-mail"
          : "Código gerado (verifique o console do servidor)",
      };
    }),

  verifyOtp: publicProcedure
    .input(z.object({
      email: z.string().email("E-mail inválido"),
      code: z.string().length(6, "Código deve ter 6 dígitos"),
      name: z.string().optional(), // Required for new users
    }))
    .mutation(async ({ input, ctx }) => {
      const { getDb } = await import("../db");
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });

      const { authTokens: authTokensTable } = await import("../../drizzle/schema");
      const { eq } = await import("drizzle-orm");

      // Find the OTP token
      const tokenKey = `otp:${input.email}:${input.code}`;
      const [otpRecord] = await db.select().from(authTokensTable)
        .where(eq(authTokensTable.token, tokenKey))
        .limit(1);

      if (!otpRecord) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Código inválido" });
      }

      // Check expiration
      if (new Date() > otpRecord.expiresAt) {
        await db.delete(authTokensTable).where(eq(authTokensTable.token, tokenKey));
        throw new TRPCError({ code: "BAD_REQUEST", message: "Código expirado. Solicite um novo." });
      }

      // Get the user
      const user = await getUserById(otpRecord.userId);
      if (!user) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Usuário não encontrado" });
      }

      // Mark email as verified
      await updateUserEmailVerified(user.id);

      // If new user and name provided, update the name
      const isNewUser = !user.name;
      if (isNewUser && input.name) {
        const { users: usersTable } = await import("../../drizzle/schema");
        await db.update(usersTable).set({
          name: input.name,
          updatedAt: new Date(),
        }).where(eq(usersTable.id, user.id));

        // Send welcome email
        sendWelcomeEmail(input.email, input.name).catch(() => {});
      }

      // Delete all OTP tokens for this user
      const { and } = await import("drizzle-orm");
      await db.delete(authTokensTable).where(
        and(
          eq(authTokensTable.userId, user.id),
          eq(authTokensTable.type, "otp")
        )
      );

      // Create session JWT
      const sessionToken = await createSessionToken(user.id);
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.cookie(COOKIE_NAME, sessionToken, {
        ...cookieOptions,
        maxAge: ONE_YEAR_MS,
      });

      return {
        success: true,
        isNewUser,
        needsName: isNewUser && !input.name,
        user: {
          id: user.id,
          email: user.email,
          name: input.name || user.name,
          role: user.role,
        },
      };
    }),

  me: publicProcedure.query(opts => {
    const { user, adminUser } = opts.ctx;
    if (!user) return null;
    return {
      ...user,
      isImpersonating: !!adminUser,
      adminUser: adminUser ? { id: adminUser.id, name: adminUser.name, role: adminUser.role } : null,
    };
  }),

  stopImpersonating: protectedProcedure.mutation(async ({ ctx }) => {
    // Only works if currently impersonating
    if (!ctx.adminUser) {
      throw new TRPCError({ code: 'BAD_REQUEST', message: 'Não está impersonando ninguém' });
    }
    // Create a new JWT with just the admin's userId (no impersonatingUserId)
    const token = await createSessionToken(ctx.adminUser.id);
    const cookieOptions = getSessionCookieOptions(ctx.req);
    ctx.res.cookie(COOKIE_NAME, token, cookieOptions);
    return { success: true, message: `Voltou para ${ctx.adminUser.name}` };
  }),

  logout: publicProcedure.mutation(({ ctx }) => {
    const cookieOptions = getSessionCookieOptions(ctx.req);
    ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
    return { success: true } as const;
  }),
});
