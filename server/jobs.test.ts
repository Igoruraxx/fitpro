import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { runTrialExpirationJob } from './jobs';
import { getDb } from './db';
import { users } from '../drizzle/schema';
import { eq } from 'drizzle-orm';

describe.skip('Trial Expiration Job', () => {
  let db: any;
  const createdUserIds: number[] = [];

  beforeAll(async () => {
    db = await getDb();
    if (!db) throw new Error('Database not available for tests');
  });

  afterAll(async () => {
    for (const id of createdUserIds) {
      try { await db.delete(users).where(eq(users.id, id)); } catch {}
    }
  });

  async function createTestUser(overrides: Record<string, any>) {
    const ts = Date.now() + Math.random().toString(36).slice(2, 8);
    const [inserted] = await db.insert(users).values({
      openId: `test-${ts}`,
      name: overrides.name || 'Test User',
      email: `test-${ts}@example.com`,
      subscriptionPlan: 'free',
      subscriptionStatus: 'active',
      emailVerified: false,
      maxClients: 5,
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
      ...overrides,
    }).returning({ id: users.id });
    createdUserIds.push(inserted.id);
    return inserted.id;
  }

  it('should downgrade expired trial users to FREE', async () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const userId = await createTestUser({
      name: 'Expired Trial User',
      subscriptionPlan: 'pro', subscriptionStatus: 'trial',
      proSource: 'trial', proExpiresAt: yesterday,
      planStartAt: new Date(yesterday.getTime() - 7 * 86400000),
      trialRequestedAt: new Date(yesterday.getTime() - 7 * 86400000),
    });
    const [before] = await db.select().from(users).where(eq(users.id, userId));
    expect(before.subscriptionPlan).toBe('pro');
    await runTrialExpirationJob();
    const [after] = await db.select().from(users).where(eq(users.id, userId));
    expect(after.subscriptionPlan).toBe('free');
    expect(after.proSource).toBeNull();
  });

  it('should not downgrade active trial users', async () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const userId = await createTestUser({
      name: 'Active Trial User',
      subscriptionPlan: 'pro', subscriptionStatus: 'trial',
      proSource: 'trial', proExpiresAt: tomorrow,
      planStartAt: new Date(), trialRequestedAt: new Date(),
    });
    await runTrialExpirationJob();
    const [after] = await db.select().from(users).where(eq(users.id, userId));
    expect(after.subscriptionPlan).toBe('pro');
    expect(after.proSource).toBe('trial');
  });

  it('should not downgrade paid PRO users', async () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const userId = await createTestUser({
      name: 'Paid PRO User',
      subscriptionPlan: 'pro', subscriptionStatus: 'active',
      proSource: 'payment', proExpiresAt: yesterday,
      planStartAt: new Date(yesterday.getTime() - 30 * 86400000),
    });
    await runTrialExpirationJob();
    const [after] = await db.select().from(users).where(eq(users.id, userId));
    expect(after.subscriptionPlan).toBe('pro');
    expect(after.proSource).toBe('payment');
  });

  it('should not downgrade courtesy PRO users', async () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const userId = await createTestUser({
      name: 'Courtesy PRO User',
      subscriptionPlan: 'pro', subscriptionStatus: 'active',
      proSource: 'courtesy', proExpiresAt: yesterday,
      planStartAt: new Date(yesterday.getTime() - 30 * 86400000),
    });
    await runTrialExpirationJob();
    const [after] = await db.select().from(users).where(eq(users.id, userId));
    expect(after.subscriptionPlan).toBe('pro');
    expect(after.proSource).toBe('courtesy');
  });

  it('should handle multiple expired trials', async () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const userIds = await Promise.all([
      createTestUser({
        name: 'Multi 1', subscriptionPlan: 'pro', subscriptionStatus: 'trial',
        proSource: 'trial', proExpiresAt: yesterday,
        planStartAt: new Date(yesterday.getTime() - 7 * 86400000),
        trialRequestedAt: new Date(yesterday.getTime() - 7 * 86400000),
      }),
      createTestUser({
        name: 'Multi 2', subscriptionPlan: 'pro', subscriptionStatus: 'trial',
        proSource: 'trial', proExpiresAt: yesterday,
        planStartAt: new Date(yesterday.getTime() - 7 * 86400000),
        trialRequestedAt: new Date(yesterday.getTime() - 7 * 86400000),
      }),
    ]);
    await runTrialExpirationJob();
    for (const userId of userIds) {
      const [user] = await db.select().from(users).where(eq(users.id, userId));
      expect(user.subscriptionPlan).toBe('free');
      expect(user.proSource).toBeNull();
    }
  });
});
