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

      // For now, auto-confirm email (remove this when email sending is configured)
      await updateUserEmailVerified(user.id);

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

      // Create JWT session token
      const sessionToken = await createSessionToken(user.id);

      // Set session cookie
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.cookie(COOKIE_NAME, sessionToken, {
        ...cookieOptions,
        maxAge: ONE_YEAR_MS,
      });

      return {
        success: true,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
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
      await createAuthToken(
        user.id,
        "password_reset",
        getTokenExpiration("password_reset")
      );

      // TODO: Send password reset email with token

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

  me: publicProcedure.query(opts => opts.ctx.user),

  logout: publicProcedure.mutation(({ ctx }) => {
    const cookieOptions = getSessionCookieOptions(ctx.req);
    ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
    return { success: true } as const;
  }),
});
