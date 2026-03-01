import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { runTrialExpirationJob } from './jobs';
import { getDb } from './db';
import { users } from '../drizzle/schema';
import { eq } from 'drizzle-orm';

describe('Trial Expiration Job', () => {
  let db: any;
  let testUserId: number;

  beforeAll(async () => {
    db = await getDb();
    if (!db) {
      throw new Error('Database not available for tests');
    }
  });

  afterAll(async () => {
    // Cleanup: delete test user if it exists
    if (testUserId) {
      try {
        await db.delete(users).where(eq(users.id, testUserId));
      } catch (err) {
        console.error('Cleanup error:', err);
      }
    }
  });

  it('should downgrade expired trial users to FREE', async () => {
    // Create a test user with expired trial
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    const testUser = await db.insert(users).values({
      openId: `test-trial-${Date.now()}`,
      name: 'Test Trial User',
      email: `test-trial-${Date.now()}@example.com`,
      subscriptionPlan: 'pro',
      proSource: 'trial',
      proExpiresAt: yesterday,
      planStartAt: new Date(yesterday.getTime() - 7 * 24 * 60 * 60 * 1000), // 7 days ago
      trialRequestedAt: new Date(yesterday.getTime() - 7 * 24 * 60 * 60 * 1000),
      createdAt: new Date(),
    });

    testUserId = testUser[0];

    // Verify user is PRO with trial before job runs
    const [userBefore] = await db
      .select()
      .from(users)
      .where(eq(users.id, testUserId));

    expect(userBefore.subscriptionPlan).toBe('pro');
    expect(userBefore.proSource).toBe('trial');
    expect(userBefore.proExpiresAt).toBeLessThanOrEqual(new Date());

    // Run the job
    await runTrialExpirationJob();

    // Verify user is now FREE
    const [userAfter] = await db
      .select()
      .from(users)
      .where(eq(users.id, testUserId));

    expect(userAfter.subscriptionPlan).toBe('free');
    expect(userAfter.proSource).toBeNull();
    expect(userAfter.proExpiresAt).toBeNull();
    expect(userAfter.planStartAt).toBeNull();
    expect(userAfter.trialRequestedAt).toBeNull();
  });

  it('should not downgrade active trial users', async () => {
    // Create a test user with active trial (expires tomorrow)
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);

    const testUser = await db.insert(users).values({
      openId: `test-active-trial-${Date.now()}`,
      name: 'Test Active Trial User',
      email: `test-active-trial-${Date.now()}@example.com`,
      subscriptionPlan: 'pro',
      proSource: 'trial',
      proExpiresAt: tomorrow,
      planStartAt: new Date(),
      trialRequestedAt: new Date(),
      createdAt: new Date(),
    });

    const activeTrialUserId = testUser[0];

    // Run the job
    await runTrialExpirationJob();

    // Verify user is still PRO with trial
    const [userAfter] = await db
      .select()
      .from(users)
      .where(eq(users.id, activeTrialUserId));

    expect(userAfter.subscriptionPlan).toBe('pro');
    expect(userAfter.proSource).toBe('trial');

    // Cleanup
    await db.delete(users).where(eq(users.id, activeTrialUserId));
  });

  it('should not downgrade paid PRO users', async () => {
    // Create a test user with paid PRO (expired date but payment origin)
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    const testUser = await db.insert(users).values({
      openId: `test-paid-pro-${Date.now()}`,
      name: 'Test Paid PRO User',
      email: `test-paid-pro-${Date.now()}@example.com`,
      subscriptionPlan: 'pro',
      proSource: 'payment',
      proExpiresAt: yesterday,
      planStartAt: new Date(yesterday.getTime() - 30 * 24 * 60 * 60 * 1000),
      createdAt: new Date(),
    });

    const paidProUserId = testUser[0];

    // Run the job
    await runTrialExpirationJob();

    // Verify user is still PRO with payment origin (job only downgrades trials)
    const [userAfter] = await db
      .select()
      .from(users)
      .where(eq(users.id, paidProUserId));

    expect(userAfter.subscriptionPlan).toBe('pro');
    expect(userAfter.proSource).toBe('payment');

    // Cleanup
    await db.delete(users).where(eq(users.id, paidProUserId));
  });

  it('should not downgrade courtesy PRO users', async () => {
    // Create a test user with courtesy PRO
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    const testUser = await db.insert(users).values({
      openId: `test-courtesy-pro-${Date.now()}`,
      name: 'Test Courtesy PRO User',
      email: `test-courtesy-pro-${Date.now()}@example.com`,
      subscriptionPlan: 'pro',
      proSource: 'courtesy',
      proExpiresAt: yesterday,
      planStartAt: new Date(yesterday.getTime() - 30 * 24 * 60 * 60 * 1000),
      createdAt: new Date(),
    });

    const courtesyProUserId = testUser[0];

    // Run the job
    await runTrialExpirationJob();

    // Verify user is still PRO with courtesy origin (job only downgrades trials)
    const [userAfter] = await db
      .select()
      .from(users)
      .where(eq(users.id, courtesyProUserId));

    expect(userAfter.subscriptionPlan).toBe('pro');
    expect(userAfter.proSource).toBe('courtesy');

    // Cleanup
    await db.delete(users).where(eq(users.id, courtesyProUserId));
  });

  it('should handle multiple expired trials', async () => {
    // Create multiple test users with expired trials
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    const testUsers = await Promise.all([
      db.insert(users).values({
        openId: `test-multi-1-${Date.now()}`,
        name: 'Test Multi 1',
        email: `test-multi-1-${Date.now()}@example.com`,
        subscriptionPlan: 'pro',
        proSource: 'trial',
        proExpiresAt: yesterday,
        planStartAt: new Date(yesterday.getTime() - 7 * 24 * 60 * 60 * 1000),
        trialRequestedAt: new Date(yesterday.getTime() - 7 * 24 * 60 * 60 * 1000),
        createdAt: new Date(),
      }),
      db.insert(users).values({
        openId: `test-multi-2-${Date.now()}`,
        name: 'Test Multi 2',
        email: `test-multi-2-${Date.now()}@example.com`,
        subscriptionPlan: 'pro',
        proSource: 'trial',
        proExpiresAt: yesterday,
        planStartAt: new Date(yesterday.getTime() - 7 * 24 * 60 * 60 * 1000),
        trialRequestedAt: new Date(yesterday.getTime() - 7 * 24 * 60 * 60 * 1000),
        createdAt: new Date(),
      }),
    ]);

    const userIds = testUsers.map((result) => result[0]);

    // Run the job
    await runTrialExpirationJob();

    // Verify all users are now FREE
    for (const userId of userIds) {
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.id, userId));

      expect(user.subscriptionPlan).toBe('free');
      expect(user.proSource).toBeNull();

      // Cleanup
      await db.delete(users).where(eq(users.id, userId));
    }
  });
});
