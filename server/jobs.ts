/**
 * Background jobs for FITPRO
 *
 * - Daily due-date reminder: runs every day at 08:00 (server time)
 *   Notifies the owner about clients with charges due in the next 3 days.
 */

import { getDb } from "./db";
import { transactions, clients, users } from "../drizzle/schema";
import { eq, and, sql } from "drizzle-orm";
import { notifyOwner } from "./_core/notification";

// ==================== TRIAL EXPIRATION JOB ====================

async function runTrialExpirationJob() {
  console.log("[Jobs] Running trial expiration job...");

  try {
    const db = await getDb();
    if (!db) {
      console.warn("[Jobs] Database not available, skipping trial expiration job");
      return;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Find all users with PRO plan, TRIAL origin, and expiration date <= today
    const expiredTrials = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        proExpiresAt: users.proExpiresAt,
      })
      .from(users)
      .where(
        and(
          eq(users.subscriptionPlan, "pro"),
          eq(users.proSource, "trial"),
          sql`${users.proExpiresAt} <= NOW()`
        )
      );

    if (expiredTrials.length === 0) {
      console.log("[Jobs] No expired trials found.");
      return;
    }

    console.log(`[Jobs] Found ${expiredTrials.length} expired trials to downgrade`);

    // Downgrade each expired trial to FREE
    for (const trial of expiredTrials) {
      try {
        await db
          .update(users)
          .set({
            subscriptionPlan: "free",
            proSource: null,
            proExpiresAt: null,
            planStartAt: null,
            trialRequestedAt: null,
            planGrantedBy: null,
            updatedAt: new Date(),
          })
          .where(eq(users.id, trial.id));

        console.log(
          `[Jobs] Downgraded trial user ${trial.id} (${trial.name}) to FREE - expired on ${trial.proExpiresAt}`
        );
      } catch (err) {
        console.error(`[Jobs] Failed to downgrade user ${trial.id}:`, err);
      }
    }

    console.log(`[Jobs] Trial expiration job completed. Downgraded ${expiredTrials.length} users.`);
  } catch (err) {
    console.error("[Jobs] Trial expiration job failed:", err);
  }
}

// ==================== DUE DATE REMINDER JOB ====================

async function runDueDateReminderJob() {
  console.log("[Jobs] Running due-date reminder job...");

  try {
    const db = await getDb();
    if (!db) {
      console.warn("[Jobs] Database not available, skipping job");
      return;
    }

    const today = new Date();
    const in3Days = new Date(today);
    in3Days.setDate(today.getDate() + 3);

    const todayStr = today.toISOString().split("T")[0];
    const in3DaysStr = in3Days.toISOString().split("T")[0];

    // Find all pending income transactions with dueDate between today and today+3
    const upcomingTx = await db
      .select({
        txId: transactions.id,
        txAmount: transactions.amount,
        txDueDate: transactions.dueDate,
        txDescription: transactions.description,
        txCategory: transactions.category,
        clientId: transactions.clientId,
        trainerId: transactions.trainerId,
      })
      .from(transactions)
      .where(
        and(
          eq(transactions.type, "income"),
          sql`${transactions.status} IN ('pending', 'overdue')`,
          sql`${transactions.dueDate} >= ${todayStr}::date`,
          sql`${transactions.dueDate} <= ${in3DaysStr}::date`
        )
      );

    if (upcomingTx.length === 0) {
      console.log("[Jobs] No upcoming due dates found.");
      return;
    }

    // Group by trainer
    const byTrainer: Record<
      number,
      Array<{
        clientName: string;
        amount: number;
        dueDate: string;
        daysUntilDue: number;
        category: string;
      }>
    > = {};

    for (const tx of upcomingTx) {
      if (!tx.trainerId) continue;

      // Get client name
      let clientName = "Aluno";
      if (tx.clientId) {
        const [cl] = await db
          .select({ name: clients.name })
          .from(clients)
          .where(eq(clients.id, tx.clientId))
          .limit(1);
        if (cl) clientName = cl.name;
      }

      const dueDate = typeof tx.txDueDate === "string" ? tx.txDueDate : tx.txDueDate ? (tx.txDueDate as unknown as Date).toISOString().split("T")[0] : todayStr;
      const dueDateObj = new Date(dueDate + "T12:00:00");
      const diffMs = dueDateObj.getTime() - today.setHours(0, 0, 0, 0);
      const daysUntilDue = Math.round(diffMs / (1000 * 60 * 60 * 24));

      if (!byTrainer[tx.trainerId]) byTrainer[tx.trainerId] = [];
      byTrainer[tx.trainerId].push({
        clientName,
        amount: parseFloat(tx.txAmount),
        dueDate,
        daysUntilDue,
        category: tx.txCategory,
      });
    }

    // Send notification to each trainer
    for (const [trainerId, items] of Object.entries(byTrainer)) {
      // Get trainer info for notification
      const [trainer] = await db
        .select({ id: users.id, name: users.name, ownerOpenId: users.openId })
        .from(users)
        .where(eq(users.id, parseInt(trainerId)))
        .limit(1);

      if (!trainer) continue;

      const lines = items.map((item) => {
        const when =
          item.daysUntilDue === 0
            ? "hoje"
            : item.daysUntilDue === 1
            ? "amanhã"
            : `em ${item.daysUntilDue} dias`;
        return `• ${item.clientName} — R$ ${item.amount.toFixed(2)} (vence ${when})`;
      });

      const title = `📅 ${items.length} vencimento${items.length !== 1 ? "s" : ""} próximo${items.length !== 1 ? "s" : ""}`;
      const content = `Cobranças com vencimento nos próximos 3 dias:\n\n${lines.join("\n")}\n\nAcesse o FITPRO para dar baixa ou cobrar via WhatsApp.`;

      await notifyOwner({ title, content }).catch((err) => {
        console.warn(`[Jobs] Failed to notify trainer ${trainerId}:`, err);
      });

      console.log(`[Jobs] Notified trainer ${trainerId} about ${items.length} upcoming charges`);
    }
  } catch (err) {
    console.error("[Jobs] Due-date reminder job failed:", err);
  }
}

// ==================== JOB SCHEDULER ====================

/**
 * Schedules the daily due-date reminder at 08:00 server time.
 * Uses a simple setInterval-based scheduler (no external dependency needed).
 */
export function startJobs() {
  console.log("[Jobs] Initializing background jobs...");

  // Run once on startup (after a short delay to let DB connect)
  setTimeout(() => {
    runDueDateReminderJob().catch(console.error);
    runTrialExpirationJob().catch(console.error);
  }, 15_000);

  // Schedule to run every 24 hours
  // For production, this fires daily; for a more precise "08:00" trigger,
  // we calculate the ms until next 08:00 and then repeat every 24h.
  const scheduleDaily = () => {
    const now = new Date();
    const next8am = new Date(now);
    next8am.setHours(8, 0, 0, 0);
    if (next8am <= now) {
      next8am.setDate(next8am.getDate() + 1);
    }
    const msUntil8am = next8am.getTime() - now.getTime();

    console.log(
      `[Jobs] Due-date reminder scheduled for ${next8am.toLocaleString("pt-BR")} (in ${Math.round(msUntil8am / 60000)} min)`
    );

    setTimeout(() => {
      runDueDateReminderJob().catch(console.error);
      // After first run at 08:00, repeat every 24h
      setInterval(() => {
        runDueDateReminderJob().catch(console.error);
      }, 24 * 60 * 60 * 1000);
    }, msUntil8am);
  };

  scheduleDaily();
  scheduleTrialExpirationJob();
}

// ==================== JOB SCHEDULER INTEGRATION ====================

/**
 * Schedules the trial expiration job to run daily at 00:00 (midnight UTC)
 */
const scheduleTrialExpirationJob = () => {
  const now = new Date();
  const nextMidnight = new Date(now);
  nextMidnight.setUTCHours(0, 0, 0, 0);
  if (nextMidnight <= now) {
    nextMidnight.setUTCDate(nextMidnight.getUTCDate() + 1);
  }
  const msUntilMidnight = nextMidnight.getTime() - now.getTime();

  console.log(
    `[Jobs] Trial expiration job scheduled for ${nextMidnight.toISOString()} (in ${Math.round(msUntilMidnight / 60000)} min)`
  );

  setTimeout(() => {
    runTrialExpirationJob().catch(console.error);
    // After first run at midnight, repeat every 24h
    setInterval(() => {
      runTrialExpirationJob().catch(console.error);
    }, 24 * 60 * 60 * 1000);
  }, msUntilMidnight);
};

// Export for testing
export { runDueDateReminderJob, runTrialExpirationJob };
