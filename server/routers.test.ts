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
    subscriptionPlan: "basic",
    subscriptionStatus: "active",
    subscriptionExpiresAt: null,
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
