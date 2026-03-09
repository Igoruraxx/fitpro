import { describe, it, expect, vi, beforeEach } from "vitest";
import { appRouter } from "./routers";
import { COOKIE_NAME } from "../shared/const";
import type { TrpcContext } from "./_core/context";

// Provide a non-empty JWT secret so token signing succeeds in tests
vi.mock("./_core/env", () => ({
  ENV: {
    cookieSecret: "test-jwt-secret-key-at-least-32-chars-ok",
    appUrl: "http://localhost:3000",
    isProduction: false,
    databaseUrl: "",
    appId: "",
    oAuthServerUrl: "",
    ownerOpenId: "",
    forgeApiUrl: "",
    forgeApiKey: "",
    supabaseUrl: "",
    supabaseServiceKey: "",
    supabaseAnonKey: "",
    supabaseDbUrl: "",
    abacashSkLive: "",
    abacatepaySkLive: "",
    s3AccessKeyId: "",
    s3SecretAccessKey: "",
    s3Region: "us-east-1",
    s3Bucket: "",
    s3Endpoint: "",
  },
  validateEnv: vi.fn(),
}));

// Mock database functions to avoid requiring a real DB connection
vi.mock("./db", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./db")>();
  return {
    ...actual,
    getUserByEmail: vi.fn(),
    getUserById: vi.fn(),
  };
});

// Mock password verification to control test outcomes
vi.mock("./auth", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./auth")>();
  return {
    ...actual,
    verifyPassword: vi.fn(),
  };
});

import { getUserByEmail, getUserById } from "./db";
import { verifyPassword } from "./auth";

type CookieCall = { name: string; value: string; options: Record<string, unknown> };

function createAnonContext(): { ctx: TrpcContext; cookies: CookieCall[] } {
  const cookies: CookieCall[] = [];

  const ctx = {
    user: null,
    adminUser: null,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: {
      cookie: (name: string, value: string, options: Record<string, unknown>) => {
        cookies.push({ name, value, options });
      },
      clearCookie: vi.fn(),
    } as unknown as TrpcContext["res"],
  } as TrpcContext;

  return { ctx, cookies };
}

const mockUser = {
  id: 1,
  openId: "trainer-001",
  email: "trainer@fitpro.com",
  name: "Test Trainer",
  passwordHash: "$2b$10$hashedpassword",
  emailVerified: true,
  loginMethod: "email",
  role: "user",
  phone: null,
  photoUrl: null,
  specialties: null,
  bio: null,
  cref: null,
  subscriptionPlan: "free",
  subscriptionStatus: "trial",
  subscriptionExpiresAt: null,
  maxClients: 5,
  createdAt: new Date(),
  updatedAt: new Date(),
  lastSignedIn: new Date(),
};

describe("auth.login", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should login successfully with valid credentials and verified email", async () => {
    (getUserByEmail as ReturnType<typeof vi.fn>).mockResolvedValue(mockUser);
    (verifyPassword as ReturnType<typeof vi.fn>).mockResolvedValue(true);
    (getUserById as ReturnType<typeof vi.fn>).mockResolvedValue(mockUser);

    const { ctx, cookies } = createAnonContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.auth.login({
      email: "trainer@fitpro.com",
      password: "ValidPassword1",
    });

    expect(result.success).toBe(true);
    expect(result.user.email).toBe("trainer@fitpro.com");
    expect(result.user.name).toBe("Test Trainer");
    expect(result.user.role).toBe("user");
    expect(cookies).toHaveLength(1);
    expect(cookies[0]?.name).toBe(COOKIE_NAME);
    expect(typeof cookies[0]?.value).toBe("string");
    expect(cookies[0]?.value.length).toBeGreaterThan(0);
  });

  it("should set session cookie with httpOnly and path options", async () => {
    (getUserByEmail as ReturnType<typeof vi.fn>).mockResolvedValue(mockUser);
    (verifyPassword as ReturnType<typeof vi.fn>).mockResolvedValue(true);
    (getUserById as ReturnType<typeof vi.fn>).mockResolvedValue(mockUser);

    const { ctx, cookies } = createAnonContext();
    const caller = appRouter.createCaller(ctx);

    await caller.auth.login({
      email: "trainer@fitpro.com",
      password: "ValidPassword1",
    });

    expect(cookies[0]?.options).toMatchObject({
      httpOnly: true,
      path: "/",
    });
  });

  it("should reject login with non-existent email", async () => {
    (getUserByEmail as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    const { ctx } = createAnonContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.auth.login({ email: "nonexistent@example.com", password: "ValidPassword1" })
    ).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });

  it("should reject login when user has no passwordHash (passwordless account)", async () => {
    const passwordlessUser = { ...mockUser, passwordHash: null };
    (getUserByEmail as ReturnType<typeof vi.fn>).mockResolvedValue(passwordlessUser);

    const { ctx } = createAnonContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.auth.login({ email: "trainer@fitpro.com", password: "ValidPassword1" })
    ).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });

  it("should reject login with wrong password", async () => {
    (getUserByEmail as ReturnType<typeof vi.fn>).mockResolvedValue(mockUser);
    (verifyPassword as ReturnType<typeof vi.fn>).mockResolvedValue(false);

    const { ctx } = createAnonContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.auth.login({ email: "trainer@fitpro.com", password: "WrongPassword1" })
    ).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });

  it("should reject login if email is not verified", async () => {
    const unverifiedUser = { ...mockUser, emailVerified: false };
    (getUserByEmail as ReturnType<typeof vi.fn>).mockResolvedValue(unverifiedUser);
    (verifyPassword as ReturnType<typeof vi.fn>).mockResolvedValue(true);

    const { ctx } = createAnonContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.auth.login({ email: "trainer@fitpro.com", password: "ValidPassword1" })
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("should reject login with invalid email format", async () => {
    const { ctx } = createAnonContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.auth.login({ email: "not-a-valid-email", password: "ValidPassword1" })
    ).rejects.toThrow();
  });

  it("should not set a session cookie when login fails", async () => {
    (getUserByEmail as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    const { ctx, cookies } = createAnonContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.auth.login({ email: "nobody@example.com", password: "ValidPassword1" })
    ).rejects.toThrow();

    expect(cookies).toHaveLength(0);
  });

  it("should return user id, email, name and role on success", async () => {
    const adminUser = { ...mockUser, role: "admin" };
    (getUserByEmail as ReturnType<typeof vi.fn>).mockResolvedValue(adminUser);
    (verifyPassword as ReturnType<typeof vi.fn>).mockResolvedValue(true);
    (getUserById as ReturnType<typeof vi.fn>).mockResolvedValue(adminUser);

    const { ctx } = createAnonContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.auth.login({
      email: "trainer@fitpro.com",
      password: "ValidPassword1",
    });

    expect(result.user).toMatchObject({
      id: 1,
      email: "trainer@fitpro.com",
      name: "Test Trainer",
      role: "admin",
    });
  });
});
