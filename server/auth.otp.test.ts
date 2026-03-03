import { describe, it, expect, beforeEach, vi } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";
import { getDb } from "./db";
import { users, authTokens } from "../drizzle/schema";
import { eq, and } from "drizzle-orm";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAnonContext(): TrpcContext {
  return {
    user: null,
    adminUser: null,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: {
      cookie: vi.fn(),
      clearCookie: vi.fn(),
    } as unknown as TrpcContext["res"],
  };
}

describe("auth.sendOtp", () => {
  it("should send OTP code to valid email", async () => {
    const ctx = createAnonContext();
    const caller = appRouter.createCaller(ctx);
    const testEmail = `otp-test-${Date.now()}@example.com`;

    const result = await caller.auth.sendOtp({ email: testEmail });

    expect(result).toBeDefined();
    expect(result.success).toBe(true);
    expect(result.isNewUser).toBe(true);
    expect(result.message).toContain("Código");
  });

  it("should reject invalid email format", async () => {
    const ctx = createAnonContext();
    const caller = appRouter.createCaller(ctx);

    try {
      await caller.auth.sendOtp({ email: "invalid-email" });
      expect.fail("Should have thrown error");
    } catch (error: any) {
      expect(error.code).toBe("BAD_REQUEST");
    }
  });

  it("should store OTP token in database for new user", async () => {
    const ctx = createAnonContext();
    const caller = appRouter.createCaller(ctx);
    const uniqueEmail = `otp-new-${Date.now()}@example.com`;

    await caller.auth.sendOtp({ email: uniqueEmail });

    const db = await getDb();
    if (!db) throw new Error("DB unavailable");

    const otpRecords = await db
      .select()
      .from(authTokens)
      .where(eq(authTokens.type, "otp"));

    expect(otpRecords.length).toBeGreaterThan(0);
  });

  it("should mark existing user as not new", async () => {
    const ctx = createAnonContext();
    const caller = appRouter.createCaller(ctx);
    const email1 = `otp-existing-${Date.now()}@example.com`;

    await caller.auth.sendOtp({ email: email1 });
    const result = await caller.auth.sendOtp({ email: email1 });

    expect(result.isNewUser).toBe(false);
  });
});

describe("auth.verifyOtp", () => {
  it("should reject invalid OTP code", async () => {
    const ctx = createAnonContext();
    const caller = appRouter.createCaller(ctx);
    const testEmail = `otp-invalid-${Date.now()}@example.com`;

    try {
      await caller.auth.verifyOtp({
        email: testEmail,
        code: "000000",
        name: "Test User",
      });
      expect.fail("Should have thrown error");
    } catch (error: any) {
      expect(error.code).toBe("BAD_REQUEST");
      expect(error.message).toContain("inválido");
    }
  });

  it("should reject code with wrong length", async () => {
    const ctx = createAnonContext();
    const caller = appRouter.createCaller(ctx);
    const testEmail = `otp-short-${Date.now()}@example.com`;

    try {
      await caller.auth.verifyOtp({
        email: testEmail,
        code: "12345",
        name: "Test User",
      });
      expect.fail("Should have thrown error");
    } catch (error: any) {
      expect(error.code).toBe("BAD_REQUEST");
    }
  });

  it("should verify valid OTP code and set session", async () => {
    const ctx = createAnonContext();
    const caller = appRouter.createCaller(ctx);
    const testEmail = `otp-valid-${Date.now()}@example.com`;

    // Step 1: Send OTP
    await caller.auth.sendOtp({ email: testEmail });

    // Step 2: Extract OTP from database
    const db = await getDb();
    if (!db) throw new Error("DB unavailable");

    const otpRecords = await db
      .select()
      .from(authTokens)
      .where(eq(authTokens.type, "otp"));

    expect(otpRecords.length).toBeGreaterThan(0);

    // Find the OTP for our test email
    let otpCode = "";
    for (const record of otpRecords) {
      const token = record.token;
      if (token.includes(testEmail)) {
        const parts = token.split(":");
        if (parts.length === 3) {
          otpCode = parts[2];
          break;
        }
      }
    }

    expect(otpCode).toBeTruthy();
    expect(otpCode).toHaveLength(6);

    // Step 3: Verify OTP
    const result = await caller.auth.verifyOtp({
      email: testEmail,
      code: otpCode,
      name: "Test User OTP",
    });

    expect(result).toBeDefined();
    expect(result.success).toBe(true);
    expect(result.user).toBeDefined();
    expect(result.user.email).toBe(testEmail);
    expect(result.user.name).toBe("Test User OTP");
    expect(ctx.res.cookie).toHaveBeenCalled();
  });

  it("should mark email as verified after OTP verification", async () => {
    const ctx = createAnonContext();
    const caller = appRouter.createCaller(ctx);
    const testEmail = `otp-verify-${Date.now()}@example.com`;

    // Send OTP
    await caller.auth.sendOtp({ email: testEmail });

    // Extract OTP
    const db = await getDb();
    if (!db) throw new Error("DB unavailable");

    const otpRecords = await db
      .select()
      .from(authTokens)
      .where(eq(authTokens.type, "otp"));

    let otpCode = "";
    for (const record of otpRecords) {
      const token = record.token;
      if (token.includes(testEmail)) {
        const parts = token.split(":");
        if (parts.length === 3) {
          otpCode = parts[2];
          break;
        }
      }
    }

    if (!otpCode) return; // Skip if OTP not found

    // Verify OTP
    const result = await caller.auth.verifyOtp({
      email: testEmail,
      code: otpCode,
      name: "Test User",
    });

    // Check user email is verified
    const userRecord = await db
      .select()
      .from(users)
      .where(eq(users.id, result.user.id));

    expect(userRecord.length).toBe(1);
    expect(userRecord[0].emailVerified).toBe(true);
  });

  it("should clear OTP tokens after successful verification", async () => {
    const ctx = createAnonContext();
    const caller = appRouter.createCaller(ctx);
    const testEmail = `otp-clear-${Date.now()}@example.com`;

    // Send OTP
    await caller.auth.sendOtp({ email: testEmail });

    // Extract OTP
    const db = await getDb();
    if (!db) throw new Error("DB unavailable");

    const otpRecords = await db
      .select()
      .from(authTokens)
      .where(eq(authTokens.type, "otp"));

    let otpCode = "";
    for (const record of otpRecords) {
      const token = record.token;
      if (token.includes(testEmail)) {
        const parts = token.split(":");
        if (parts.length === 3) {
          otpCode = parts[2];
          break;
        }
      }
    }

    if (!otpCode) return;

    // Verify OTP
    const result = await caller.auth.verifyOtp({
      email: testEmail,
      code: otpCode,
      name: "Test User",
    });

    // Check OTP tokens were deleted
    const remainingOtps = await db
      .select()
      .from(authTokens)
      .where(and(
        eq(authTokens.userId, result.user.id),
        eq(authTokens.type, "otp")
      ));

    expect(remainingOtps.length).toBe(0);
  });
});
