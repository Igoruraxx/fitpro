import { getDb } from "./server/db";
import { transactions, clients, users } from "./drizzle/schema";
import { eq, and, sql } from "drizzle-orm";
import { startJobs, runDueDateReminderJob } from "./server/jobs";

async function setupTestData() {
  const db = await getDb();
  if (!db) {
      console.warn("Database not available");
      return;
  }

  // create fake trainer
  const [trainer] = await db.insert(users).values({
    name: "Test Trainer",
    email: "test_trainer_" + Date.now() + "@example.com",
    role: "user",
  }).returning();

  // create 100 fake clients and transactions
  const today = new Date();
  const todayStr = today.toISOString().split("T")[0];

  const clientInserts = Array.from({ length: 100 }).map((_, i) => ({
    trainerId: trainer.id,
    name: "Test Client " + i,
    status: "active",
  }));

  const createdClients = await db.insert(clients).values(clientInserts).returning();

  const transactionInserts = createdClients.map((c, i) => ({
    trainerId: trainer.id,
    clientId: c.id,
    type: "income",
    category: "Test",
    description: "Test Transaction",
    amount: "100.00",
    date: todayStr,
    dueDate: todayStr,
    status: "pending",
  }));

  await db.insert(transactions).values(transactionInserts);

  return { trainerId: trainer.id };
}

async function cleanupTestData(trainerId: number) {
  const db = await getDb();
  await db.delete(transactions).where(eq(transactions.trainerId, trainerId));
  await db.delete(clients).where(eq(clients.trainerId, trainerId));
  await db.delete(users).where(eq(users.id, trainerId));
}

async function runBenchmark() {
  console.log("Setting up test data...");
  const data = await setupTestData();
  if (!data) return;

  console.log("Running baseline benchmark...");
  const start = Date.now();
  await runDueDateReminderJob();
  const end = Date.now();

  console.log(`Job took ${end - start}ms`);

  console.log("Cleaning up test data...");
  await cleanupTestData(data.trainerId);

  process.exit(0);
}

runBenchmark().catch(console.error);
