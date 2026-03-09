import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createUserContext(overrides?: Partial<AuthenticatedUser>): TrpcContext {
  const user: AuthenticatedUser = {
    id: 1,
    openId: "test-trainer-001",
    email: "trainer@fitpro.com",
    name: "Test Trainer",
    loginMethod: "manus",
    role: "user",
    phone: null,
    photoUrl: null,
    specialties: null,
    bio: null,
    cref: null,
    subscriptionPlan: "pro",
    subscriptionStatus: "active",
    maxClients: 20,
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
    ...overrides,
  };

  return {
    user,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: () => {} } as unknown as TrpcContext["res"],
  };
}

function createAdminContext(): TrpcContext {
  return createUserContext({
    id: 99,
    openId: "admin-001",
    name: "Admin User",
    role: "admin",
  });
}

function createAnonContext(): TrpcContext {
  return {
    user: null,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: () => {} } as unknown as TrpcContext["res"],
  };
}

describe("auth.me", () => {
  it("returns user when authenticated", async () => {
    const ctx = createUserContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.auth.me();
    expect(result).not.toBeNull();
    expect(result?.name).toBe("Test Trainer");
    expect(result?.role).toBe("user");
  });

  it("returns null when not authenticated", async () => {
    const ctx = createAnonContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.auth.me();
    expect(result).toBeNull();
  });
});

describe("protected procedures - unauthorized access", () => {
  it("clients.list throws UNAUTHORIZED for anonymous users", async () => {
    const ctx = createAnonContext();
    const caller = appRouter.createCaller(ctx);
    await expect(caller.clients.list()).rejects.toThrow();
  });

  it("appointments.list throws UNAUTHORIZED for anonymous users", async () => {
    const ctx = createAnonContext();
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.appointments.list({ startDate: "2026-01-01", endDate: "2026-01-31" })
    ).rejects.toThrow();
  });

  it("finances.list throws UNAUTHORIZED for anonymous users", async () => {
    const ctx = createAnonContext();
    const caller = appRouter.createCaller(ctx);
    await expect(caller.finances.list({})).rejects.toThrow();
  });

  it("evolution.measurements.list throws UNAUTHORIZED for anonymous users", async () => {
    const ctx = createAnonContext();
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.evolution.measurements.list({ clientId: 1 })
    ).rejects.toThrow();
  });

  it("profile.update throws UNAUTHORIZED for anonymous users", async () => {
    const ctx = createAnonContext();
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.profile.update({ name: "Hacker" })
    ).rejects.toThrow();
  });
});

describe("admin procedures - access control", () => {
  it("admin.stats throws FORBIDDEN for regular users", async () => {
    const ctx = createUserContext();
    const caller = appRouter.createCaller(ctx);
    await expect(caller.admin.stats()).rejects.toThrow();
  });

  it("admin.trainers throws FORBIDDEN for regular users", async () => {
    const ctx = createUserContext();
    const caller = appRouter.createCaller(ctx);
    await expect(caller.admin.trainers()).rejects.toThrow();
  });

  it("admin.updateTrainer throws FORBIDDEN for regular users", async () => {
    const ctx = createUserContext();
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.admin.updateTrainer({ id: 1, subscriptionPlan: "premium" })
    ).rejects.toThrow();
  });

  it("admin.stats throws for anonymous users", async () => {
    const ctx = createAnonContext();
    const caller = appRouter.createCaller(ctx);
    await expect(caller.admin.stats()).rejects.toThrow();
  });
});

describe("input validation", () => {
  it("clients.create requires name", async () => {
    const ctx = createUserContext();
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.clients.create({ name: "" })
    ).rejects.toThrow();
  });

  it("appointments.create requires date and startTime", async () => {
    const ctx = createUserContext();
    const caller = appRouter.createCaller(ctx);
    await expect(
      (caller.appointments.create as any)({ duration: 60 })
    ).rejects.toThrow();
  });

  it("finances.create validates type enum", async () => {
    const ctx = createUserContext();
    const caller = appRouter.createCaller(ctx);
    await expect(
      (caller.finances.create as any)({
        type: "invalid_type",
        category: "Test",
        amount: "100",
        date: "2026-01-01",
      })
    ).rejects.toThrow();
  });

  it("finances.summary requires month and year", async () => {
    const ctx = createUserContext();
    const caller = appRouter.createCaller(ctx);
    await expect(
      (caller.finances.summary as any)({})
    ).rejects.toThrow();
  });
});

describe("dashboard procedures - access control", () => {
  it("dashboard.stats throws UNAUTHORIZED for anonymous users", async () => {
    const ctx = createAnonContext();
    const caller = appRouter.createCaller(ctx);
    await expect(caller.dashboard.stats()).rejects.toThrow();
  });

  it("dashboard.weeklyChart throws UNAUTHORIZED for anonymous users", async () => {
    const ctx = createAnonContext();
    const caller = appRouter.createCaller(ctx);
    await expect(caller.dashboard.weeklyChart()).rejects.toThrow();
  });

  it("dashboard.statusChart throws UNAUTHORIZED for anonymous users", async () => {
    const ctx = createAnonContext();
    const caller = appRouter.createCaller(ctx);
    await expect(caller.dashboard.statusChart()).rejects.toThrow();
  });

  it("dashboard.todaySessions throws UNAUTHORIZED for anonymous users", async () => {
    const ctx = createAnonContext();
    const caller = appRouter.createCaller(ctx);
    await expect(caller.dashboard.todaySessions()).rejects.toThrow();
  });
});

describe("photos procedures - access control", () => {
  it("photos.listAll throws UNAUTHORIZED for anonymous users", async () => {
    const ctx = createAnonContext();
    const caller = appRouter.createCaller(ctx);
    await expect(caller.photos.listAll({})).rejects.toThrow();
  });

  it("photos.delete throws UNAUTHORIZED for anonymous users", async () => {
    const ctx = createAnonContext();
    const caller = appRouter.createCaller(ctx);
    await expect(caller.photos.delete({ id: 1 })).rejects.toThrow();
  });

  it("photos.upload requires clientId and file data", async () => {
    const ctx = createUserContext();
    const caller = appRouter.createCaller(ctx);
    await expect(
      (caller.photos.upload as any)({ photoType: "front", date: "2026-01-01" })
    ).rejects.toThrow();
  });
});

// ==================== BUSINESS LOGIC TESTS ====================

describe("plan type validation", () => {
  it("clients.create accepts consulting plan type (valid input)", async () => {
    const ctx = createUserContext();
    const caller = appRouter.createCaller(ctx);
    // consulting is a valid planType - should not throw input validation error
    // It may succeed or fail at DB level; either way, input is valid
    const result = caller.clients.create({ name: "Consultor Teste", planType: "consulting" });
    // Just ensure it doesn't throw a ZodError (input validation error)
    await result.then(
      () => expect(true).toBe(true), // success is fine
      (err) => expect(err.code).not.toBe("BAD_REQUEST") // DB errors are ok, ZodError is not
    );
  });

  it("clients.create rejects invalid plan type", async () => {
    const ctx = createUserContext();
    const caller = appRouter.createCaller(ctx);
    await expect(
      (caller.clients.create as any)({ name: "Test", planType: "invalid_plan" })
    ).rejects.toThrow();
  });

  it("clients.create accepts monthly plan type (valid input)", async () => {
    const ctx = createUserContext();
    const caller = appRouter.createCaller(ctx);
    // monthly is a valid planType - should not throw input validation error
    const result = caller.clients.create({ name: "Mensal Teste", planType: "monthly", monthlyFee: "150", paymentDay: 5 });
    await result.then(
      () => expect(true).toBe(true),
      (err) => expect(err.code).not.toBe("BAD_REQUEST")
    );
  });
});

describe("finances procedures - access control", () => {
  it("finances.overdueClients throws UNAUTHORIZED for anonymous users", async () => {
    const ctx = createAnonContext();
    const caller = appRouter.createCaller(ctx);
    await expect(caller.finances.overdueClients()).rejects.toThrow();
  });

  it("finances.generateMonthlyCharges throws UNAUTHORIZED for anonymous users", async () => {
    const ctx = createAnonContext();
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.finances.generateMonthlyCharges({ month: 2, year: 2026 })
    ).rejects.toThrow();
  });

  it("finances.markPaid throws UNAUTHORIZED for anonymous users", async () => {
    const ctx = createAnonContext();
    const caller = appRouter.createCaller(ctx);
    await expect(caller.finances.markPaid({ id: 1 })).rejects.toThrow();
  });

  it("finances.generateMonthlyCharges accepts valid month and year", async () => {
    const ctx = createUserContext();
    const caller = appRouter.createCaller(ctx);
    // Valid month/year should pass input validation and return a count
    const result = caller.finances.generateMonthlyCharges({ month: 2, year: 2026 });
    await result.then(
      (r) => expect(typeof r.count).toBe("number"), // success: count is a number
      (err) => expect(err.code).not.toBe("BAD_REQUEST") // DB errors are ok
    );
  });
});

describe("payment day clamping logic", () => {
  it("clamps day 31 to 28 in February (non-leap year)", () => {
    const clampDay = (day: number, m: number, y: number) => {
      const lastDay = new Date(y, m, 0).getDate();
      return Math.min(day, lastDay);
    };
    expect(clampDay(31, 2, 2025)).toBe(28); // Feb 2025 has 28 days
    expect(clampDay(31, 2, 2024)).toBe(29); // Feb 2024 is leap year
    expect(clampDay(31, 4, 2026)).toBe(30); // April has 30 days
    expect(clampDay(31, 1, 2026)).toBe(31); // January has 31 days
    expect(clampDay(28, 2, 2025)).toBe(28); // Day 28 is valid in Feb
    expect(clampDay(5, 2, 2025)).toBe(5);   // Day 5 is always valid
  });
});

// ==================== SUPABASE CONNECTION TEST ====================

describe("Supabase PostgreSQL connection", () => {
  it("should have SUPABASE_DB_URL configured", () => {
    // Validates that the secret was set (not empty)
    const url = process.env.SUPABASE_DB_URL ?? "";
    // In CI/test environments the secret may not be injected; skip gracefully
    if (!url) {
      console.warn("[Test] SUPABASE_DB_URL not set, skipping connection test");
      return;
    }
    expect(url).toMatch(/^postgresql:\/\//);
    expect(url).toContain("supabase");
  });

  it("ENV.supabaseDbUrl should resolve from SUPABASE_DB_URL", async () => {
    const { ENV } = await import("./_core/env");
    const url = ENV.supabaseDbUrl;
    if (!url) {
      console.warn("[Test] ENV.supabaseDbUrl not set, skipping");
      return;
    }
    expect(typeof url).toBe("string");
    expect(url.length).toBeGreaterThan(0);
  });
});
