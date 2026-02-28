import { eq, and, desc, asc, sql, count } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import {
  InsertUser, users,
  clients, InsertClient,
  appointments, InsertAppointment,
  bodyMeasurements, InsertBodyMeasurement,
  progressPhotos, InsertProgressPhoto,
  transactions, InsertTransaction,
  authTokens, InsertAuthToken,
  bioimpedanceExams, InsertBioimpedanceExam,
} from "../drizzle/schema";
import { ENV } from './_core/env';
import { nanoid } from "nanoid";

let _db: ReturnType<typeof drizzle> | null = null;

async function runMigrations(db: ReturnType<typeof drizzle>) {
  try {
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS "bioimpedanceExams" (
        "id" SERIAL PRIMARY KEY,
        "trainerId" INTEGER NOT NULL,
        "clientId" INTEGER NOT NULL REFERENCES "clients"("id") ON DELETE CASCADE,
        "date" DATE NOT NULL,
        "weight" DECIMAL(6,2),
        "muscleMass" DECIMAL(6,2),
        "musclePct" DECIMAL(5,2),
        "bodyFatPct" DECIMAL(5,2),
        "visceralFat" DECIMAL(5,1),
        "perimetria" TEXT,
        "dobras" TEXT,
        "imageUrl" TEXT,
        "notes" TEXT,
        "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    // Ensure new columns exist (idempotent ALTER TABLE)
    await db.execute(sql`
      ALTER TABLE "bioimpedanceExams"
        ADD COLUMN IF NOT EXISTS "musclePct" DECIMAL(5,2),
        ADD COLUMN IF NOT EXISTS "perimetria" TEXT,
        ADD COLUMN IF NOT EXISTS "dobras" TEXT
    `);
    console.log("[Database] Migrations applied");
  } catch (err) {
    console.warn("[Database] Migration warning:", err);
  }
}

export async function getDb() {
  if (!_db) {
    // Prefer SUPABASE_DB_URL (PostgreSQL), fall back to DATABASE_URL (MySQL)
    const connStr = ENV.supabaseDbUrl || process.env.DATABASE_URL;

    if (!connStr) {
      console.warn("[Database] No connection string available");
      return null;
    }
    try {
      const client = postgres(connStr, { max: 5, ssl: 'require' });
      _db = drizzle(client);
      console.log("[Database] Connected to", ENV.supabaseDbUrl ? "Supabase PostgreSQL" : "MySQL");
      await runMigrations(_db);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

// ==================== USERS ====================

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) return;

  try {
    const values: InsertUser = { openId: user.openId };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];
    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };
    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }
    if (!values.lastSignedIn) values.lastSignedIn = new Date();
    if (Object.keys(updateSet).length === 0) updateSet.lastSignedIn = new Date();

    await db.insert(users).values(values).onConflictDoUpdate({
      target: users.openId,
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getUserById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function updateUserProfile(userId: number, data: Partial<InsertUser>) {
  const db = await getDb();
  if (!db) return;
  await db.update(users).set({ ...data, updatedAt: new Date() }).where(eq(users.id, userId));
}

export async function getAllTrainers() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(users).where(eq(users.role, "user")).orderBy(desc(users.createdAt));
}

export async function getTrainerStats() {
  const db = await getDb();
  if (!db) return { total: 0, active: 0, trial: 0, revenue: 0 };
  const all = await db.select().from(users).where(eq(users.role, "user"));
  const active = all.filter(u => u.subscriptionStatus === "active").length;
  const trial = all.filter(u => u.subscriptionStatus === "trial").length;
  return { total: all.length, active, trial, revenue: 0 };
}

// ==================== CLIENTS ====================

export async function getClientsByTrainer(trainerId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(clients).where(eq(clients.trainerId, trainerId)).orderBy(asc(clients.name));
}

export async function getClientById(id: number, trainerId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(clients)
    .where(and(eq(clients.id, id), eq(clients.trainerId, trainerId))).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

/**
 * Creates or refreshes the current-month pending charge for a client.
 * Called automatically on create and update.
 * - monthly plan: uses monthlyFee + paymentDay
 * - package plan: uses packageValue as a one-time charge
 * - consulting / inactive: no charge
 */
export async function upsertCurrentMonthCharge(trainerId: number, clientId: number, clientData: Partial<InsertClient>) {
  const db = await getDb();
  if (!db) return;

  const planType = clientData.planType;
  const status = clientData.status;

  // Only active monthly/package clients get charges
  if (status === 'inactive' || planType === 'consulting') return;

  const now = new Date();
  const month = now.getMonth() + 1;
  const year = now.getFullYear();

  let amount: string | null = null;
  let dueDate: string | null = null;
  let category = 'Mensalidade';

  if (planType === 'monthly' && clientData.monthlyFee && clientData.paymentDay) {
    amount = String(clientData.monthlyFee);
    const lastDay = new Date(year, month, 0).getDate();
    const validDay = Math.min(Number(clientData.paymentDay), lastDay);
    dueDate = `${year}-${String(month).padStart(2, '0')}-${String(validDay).padStart(2, '0')}`;
    category = 'Mensalidade';
  } else if (planType === 'package' && clientData.packageValue) {
    amount = String(clientData.packageValue);
    // Due date = today for package (one-time)
    dueDate = now.toISOString().split('T')[0];
    category = 'Pacote de Sessões';
  }

  if (!amount || !dueDate) return;

  // Check if a pending charge already exists for this client in this month
  const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
  const lastDay = new Date(year, month, 0).getDate();
  const endDate = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

  const existing = await db.select({ id: transactions.id, status: transactions.status })
    .from(transactions)
    .where(and(
      eq(transactions.trainerId, trainerId),
      eq(transactions.clientId, clientId),
      eq(transactions.type, 'income'),
      sql`${transactions.dueDate} >= ${startDate}::date`,
      sql`${transactions.dueDate} <= ${endDate}::date`,
      sql`${transactions.status} IN ('pending', 'overdue')`
    ));

  if (existing.length > 0) {
    // Update existing pending charge with new amount/dueDate
    await db.update(transactions)
      .set({ amount, dueDate, updatedAt: new Date() })
      .where(eq(transactions.id, existing[0].id));
  } else {
    // Create new charge
    const clientRow = await getClientById(clientId, trainerId);
    const clientName = clientRow?.name ?? 'Aluno';
    await db.insert(transactions).values({
      trainerId,
      clientId,
      type: 'income',
      category,
      description: `${category} - ${clientName}`,
      amount,
      date: dueDate,
      dueDate,
      status: 'pending',
    });
  }
}

export async function createClient(data: InsertClient) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.insert(clients).values(data).returning({ id: clients.id });
  const clientId = result[0]?.id;
  if (clientId) {
    await upsertCurrentMonthCharge(data.trainerId, clientId, data);
  }
  return clientId;
}

export async function updateClient(id: number, trainerId: number, data: Partial<InsertClient>) {
  const db = await getDb();
  if (!db) return;
  await db.update(clients).set({ ...data, updatedAt: new Date() })
    .where(and(eq(clients.id, id), eq(clients.trainerId, trainerId)));
  // Refresh charge if financial-relevant fields changed
  const financialFields = ['planType', 'monthlyFee', 'paymentDay', 'packageValue', 'status'] as const;
  const hasFinancialChange = financialFields.some(f => f in data);
  if (hasFinancialChange) {
    // Merge with existing client data to have full picture
    const existing = await getClientById(id, trainerId);
    if (existing) {
      const merged = { ...existing, ...data };
      await upsertCurrentMonthCharge(trainerId, id, merged);
    }
  }
}

export async function deleteClient(id: number, trainerId: number) {
  const db = await getDb();
  if (!db) return;
  await db.delete(clients).where(and(eq(clients.id, id), eq(clients.trainerId, trainerId)));
}

export async function countClientsByTrainer(trainerId: number) {
  const db = await getDb();
  if (!db) return 0;
  const result = await db.select({ count: count() }).from(clients)
    .where(eq(clients.trainerId, trainerId));
  return result[0]?.count ?? 0;
}

// ==================== APPOINTMENTS ====================

export async function getAppointmentsByTrainer(trainerId: number, startDate: string, endDate: string) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(appointments)
    .where(and(
      eq(appointments.trainerId, trainerId),
      sql`${appointments.date} >= ${startDate}::date`,
      sql`${appointments.date} <= ${endDate}::date`
    ))
    .orderBy(asc(appointments.date), asc(appointments.startTime));
}

export async function getAppointmentById(id: number, trainerId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(appointments)
    .where(and(eq(appointments.id, id), eq(appointments.trainerId, trainerId))).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function createAppointment(data: InsertAppointment) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.insert(appointments).values(data).returning({ id: appointments.id });
  return result[0]?.id;
}

export async function updateAppointment(id: number, trainerId: number, data: Partial<InsertAppointment>) {
  const db = await getDb();
  if (!db) return;
  await db.update(appointments).set({ ...data, updatedAt: new Date() })
    .where(and(eq(appointments.id, id), eq(appointments.trainerId, trainerId)));
}

export async function deleteAppointment(id: number, trainerId: number) {
  const db = await getDb();
  if (!db) return;
  await db.delete(appointments).where(and(eq(appointments.id, id), eq(appointments.trainerId, trainerId)));
}

export async function deleteAppointmentsByGroup(groupId: string, trainerId: number) {
  const db = await getDb();
  if (!db) return;
  await db.delete(appointments).where(
    and(eq(appointments.recurrenceGroupId, groupId), eq(appointments.trainerId, trainerId))
  );
}

// ==================== BODY MEASUREMENTS ====================

export async function getMeasurementsByClient(trainerId: number, clientId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(bodyMeasurements)
    .where(and(eq(bodyMeasurements.trainerId, trainerId), eq(bodyMeasurements.clientId, clientId)))
    .orderBy(desc(bodyMeasurements.date));
}

export async function createMeasurement(data: InsertBodyMeasurement) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.insert(bodyMeasurements).values(data).returning({ id: bodyMeasurements.id });
  return result[0]?.id;
}

export async function deleteMeasurement(id: number, trainerId: number) {
  const db = await getDb();
  if (!db) return;
  await db.delete(bodyMeasurements).where(and(eq(bodyMeasurements.id, id), eq(bodyMeasurements.trainerId, trainerId)));
}

// ==================== PROGRESS PHOTOS ====================

export async function getPhotosByClient(trainerId: number, clientId: number) {
  const db = await getDb();
  if (!db) return [];
  if (clientId === 0) {
    return db.select().from(progressPhotos)
      .where(eq(progressPhotos.trainerId, trainerId))
      .orderBy(desc(progressPhotos.date));
  }
  return db.select().from(progressPhotos)
    .where(and(eq(progressPhotos.trainerId, trainerId), eq(progressPhotos.clientId, clientId)))
    .orderBy(desc(progressPhotos.date));
}

export async function createProgressPhoto(data: InsertProgressPhoto) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.insert(progressPhotos).values(data).returning({ id: progressPhotos.id });
  return result[0]?.id;
}

export async function deleteProgressPhoto(id: number, trainerId: number) {
  const db = await getDb();
  if (!db) return;
  await db.delete(progressPhotos).where(and(eq(progressPhotos.id, id), eq(progressPhotos.trainerId, trainerId)));
}

// ==================== TRANSACTIONS ====================

export async function getTransactionsByClient(trainerId: number, clientId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(transactions)
    .where(and(eq(transactions.trainerId, trainerId), eq(transactions.clientId, clientId)))
    .orderBy(desc(transactions.dueDate));
}

export async function getTransactionsByTrainer(trainerId: number, startDate?: string, endDate?: string) {
  const db = await getDb();
  if (!db) return [];
  const conditions: ReturnType<typeof eq>[] = [eq(transactions.trainerId, trainerId)];
  if (startDate) conditions.push(sql`${transactions.date} >= ${startDate}::date` as any);
  if (endDate) conditions.push(sql`${transactions.date} <= ${endDate}::date` as any);
  return db.select().from(transactions)
    .where(and(...conditions))
    .orderBy(desc(transactions.date));
}

export async function createTransaction(data: InsertTransaction) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.insert(transactions).values(data).returning({ id: transactions.id });
  return result[0]?.id;
}

export async function updateTransaction(id: number, trainerId: number, data: Partial<InsertTransaction>) {
  const db = await getDb();
  if (!db) return;
  await db.update(transactions).set({ ...data, updatedAt: new Date() })
    .where(and(eq(transactions.id, id), eq(transactions.trainerId, trainerId)));
}

export async function deleteTransaction(id: number, trainerId: number) {
  const db = await getDb();
  if (!db) return;
  await db.delete(transactions).where(and(eq(transactions.id, id), eq(transactions.trainerId, trainerId)));
}

// Mark transaction as paid (baixa)
export async function markTransactionPaid(id: number, trainerId: number) {
  const db = await getDb();
  if (!db) return null;
  const [tx] = await db.select().from(transactions)
    .where(and(eq(transactions.id, id), eq(transactions.trainerId, trainerId)));
  if (!tx) return null;
  const today = new Date().toISOString().split('T')[0];
  await db.update(transactions)
    .set({ status: 'paid', paidAt: today, updatedAt: new Date() })
    .where(and(eq(transactions.id, id), eq(transactions.trainerId, trainerId)));
  return tx;
}

// Revert transaction from paid to pending (desfazer baixa)
export async function markTransactionPending(id: number, trainerId: number) {
  const db = await getDb();
  if (!db) return null;
  const [tx] = await db.select().from(transactions)
    .where(and(eq(transactions.id, id), eq(transactions.trainerId, trainerId)));
  if (!tx) return null;
  await db.update(transactions)
    .set({ status: 'pending', paidAt: null, updatedAt: new Date() })
    .where(and(eq(transactions.id, id), eq(transactions.trainerId, trainerId)));
  return tx;
}

// Get overdue clients: active clients with pending/overdue income transactions past dueDate
export async function getOverdueClients(trainerId: number) {
  const db = await getDb();
  if (!db) return [];
  const today = new Date().toISOString().split('T')[0];

  // Get all active clients
  const activeClients = await db.select().from(clients)
    .where(and(eq(clients.trainerId, trainerId), eq(clients.status, 'active')));

  // Get all pending/overdue income transactions with dueDate in the past
  const overdueTransactions = await db.select().from(transactions)
    .where(and(
      eq(transactions.trainerId, trainerId),
      eq(transactions.type, 'income'),
      sql`${transactions.status} IN ('pending', 'overdue')`,
      sql`${transactions.dueDate} IS NOT NULL`,
      sql`${transactions.dueDate} < ${today}::date`
    ));

  // Map clientId -> overdue transactions
  const overdueByClient: Record<number, any[]> = {};
  for (const t of overdueTransactions) {
    if (t.clientId) {
      if (!overdueByClient[t.clientId]) overdueByClient[t.clientId] = [];
      overdueByClient[t.clientId].push(t);
    }
  }

  return activeClients
    .filter(c => overdueByClient[c.id])
    .map(c => ({
      ...c,
      overdueTransactions: overdueByClient[c.id],
      totalOverdue: overdueByClient[c.id].reduce((sum: number, t: any) => sum + parseFloat(t.amount), 0),
      oldestDueDate: overdueByClient[c.id].reduce((oldest: string, t: any) => t.dueDate < oldest ? t.dueDate : oldest, overdueByClient[c.id][0].dueDate),
    }));
}

// Generate monthly charges for all active monthly-plan clients (skip inactive)
export async function generateMonthlyCharges(trainerId: number, month: number, year: number) {
  const db = await getDb();
  if (!db) return 0;

  // Only active clients with monthly plan
  const monthlyClients = await db.select().from(clients)
    .where(and(
      eq(clients.trainerId, trainerId),
      eq(clients.status, 'active'),
      eq(clients.planType, 'monthly')
    ));

  // Helper: get last valid day in a month
  const clampDay = (day: number, m: number, y: number) => {
    const lastDay = new Date(y, m, 0).getDate(); // day 0 of next month = last day of current month
    return Math.min(day, lastDay);
  };

  let created = 0;
  for (const client of monthlyClients) {
    if (!client.monthlyFee || !client.paymentDay) continue;
    const validDay = clampDay(client.paymentDay, month, year);
    const dueDate = `${year}-${String(month).padStart(2, '0')}-${String(validDay).padStart(2, '0')}`;

    // Check if charge already exists for this client/month
    const existing = await db.select({ id: transactions.id }).from(transactions)
      .where(and(
        eq(transactions.trainerId, trainerId),
        eq(transactions.clientId, client.id),
        eq(transactions.type, 'income'),
        sql`${transactions.dueDate} = ${dueDate}::date`
      ));
    if (existing.length > 0) continue;

    await db.insert(transactions).values({
      trainerId,
      clientId: client.id,
      type: 'income',
      category: 'Mensalidade',
      description: `Mensalidade ${client.name} - ${String(month).padStart(2, '0')}/${year}`,
      amount: client.monthlyFee,
      date: dueDate,
      dueDate,
      status: 'pending',
    });
    created++;
  }
  return created;
}

export async function getFinancialSummary(trainerId: number, month: number, year: number) {
  const db = await getDb();
  if (!db) return { income: 0, expenses: 0, pending: 0 };
  const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
  const lastDayOfMonth = new Date(year, month, 0).getDate(); // day 0 of next month = last day of current
  const endDate = `${year}-${String(month).padStart(2, '0')}-${String(lastDayOfMonth).padStart(2, '0')}`;
  const rows = await db.select().from(transactions)
    .where(and(
      eq(transactions.trainerId, trainerId),
      sql`${transactions.date} >= ${startDate}::date`,
      sql`${transactions.date} <= ${endDate}::date`
    ));
  let income = 0, expenses = 0, pending = 0;
  for (const row of rows) {
    const amt = parseFloat(row.amount);
    if (row.type === "income" && row.status === "paid") income += amt;
    if (row.type === "expense" && row.status === "paid") expenses += amt;
    if (row.status === "pending") pending += amt;
  }
  return { income, expenses, pending };
}

// ==================== DASHBOARD ====================

export async function getDashboardStats(trainerId: number) {
  const db = await getDb();
  if (!db) return { activeClients: 0, todayCompleted: 0, attendanceRate: 0, nextSession: null };

  const todayStr = new Date().toISOString().split('T')[0];

  const allClients = await db.select({ count: count() }).from(clients)
    .where(and(eq(clients.trainerId, trainerId), eq(clients.status, 'active')));

  const todayAppts = await db.select().from(appointments)
    .where(and(
      eq(appointments.trainerId, trainerId),
      sql`${appointments.date} = ${todayStr}::date`
    ));

  const todayCompleted = todayAppts.filter(a => a.status === 'completed').length;
  const todayTotal = todayAppts.length;
  const attendanceRate = todayTotal > 0 ? Math.round((todayCompleted / todayTotal) * 100) : 0;

  const nextSession = await db.select().from(appointments)
    .where(and(
      eq(appointments.trainerId, trainerId),
      eq(appointments.status, 'scheduled'),
      sql`${appointments.date} >= ${todayStr}::date`
    ))
    .orderBy(asc(appointments.date), asc(appointments.startTime))
    .limit(1);

  let nextSessionInfo = null;
  if (nextSession.length > 0) {
    const ns = nextSession[0];
    let clientName = ns.guestName || 'Convidado';
    if (ns.clientId) {
      const cl = await db.select({ name: clients.name }).from(clients).where(eq(clients.id, ns.clientId)).limit(1);
      if (cl.length > 0) clientName = cl[0].name;
    }
    nextSessionInfo = { time: ns.startTime, clientName, date: ns.date };
  }

  return {
    activeClients: allClients[0]?.count ?? 0,
    todayCompleted,
    attendanceRate,
    nextSession: nextSessionInfo,
  };
}

export async function getWeeklySessionsChart(trainerId: number) {
  const db = await getDb();
  if (!db) return [];

  const weeks: { week: string; total: number }[] = [];
  const now = new Date();

  for (let i = 7; i >= 0; i--) {
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - (i * 7) - now.getDay() + 1);
    weekStart.setHours(0, 0, 0, 0);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);

    const startStr = weekStart.toISOString().split('T')[0];
    const endStr = weekEnd.toISOString().split('T')[0];

    const result = await db.select({ count: count() }).from(appointments)
      .where(and(
        eq(appointments.trainerId, trainerId),
        sql`${appointments.date} >= ${startStr}::date`,
        sql`${appointments.date} <= ${endStr}::date`
      ));

    const label = `${weekStart.getDate()}/${weekStart.getMonth() + 1}`;
    weeks.push({ week: label, total: result[0]?.count ?? 0 });
  }

  return weeks;
}

export async function getSessionStatusChart(trainerId: number) {
  const db = await getDb();
  if (!db) return [];

  const result = await db.select({
    status: appointments.status,
    count: count()
  }).from(appointments)
    .where(eq(appointments.trainerId, trainerId))
    .groupBy(appointments.status);

  const labels: Record<string, string> = {
    scheduled: 'Agendadas',
    completed: 'Concluídas',
    cancelled: 'Canceladas',
    no_show: 'Faltas',
  };

  return result.map(r => ({
    name: labels[r.status] || r.status,
    value: r.count,
    status: r.status,
  }));
}

export async function getTodaySessions(trainerId: number) {
  const db = await getDb();
  if (!db) return [];

  const todayStr = new Date().toISOString().split('T')[0];

  const appts = await db.select().from(appointments)
    .where(and(
      eq(appointments.trainerId, trainerId),
      sql`${appointments.date} = ${todayStr}::date`
    ))
    .orderBy(asc(appointments.startTime));

  const result = [];
  for (const appt of appts) {
    let clientName = appt.guestName || 'Convidado';
    if (appt.clientId) {
      const cl = await db.select({ name: clients.name }).from(clients).where(eq(clients.id, appt.clientId)).limit(1);
      if (cl.length > 0) clientName = cl[0].name;
    }
    result.push({ ...appt, clientName });
  }

  return result;
}

// ==================== SESSIONS COUNTER ====================

export async function decrementSessionsRemaining(clientId: number, trainerId: number) {
  const db = await getDb();
  if (!db) return;
  await db.execute(
    sql`UPDATE clients SET "sessionsRemaining" = GREATEST(0, "sessionsRemaining" - 1)
        WHERE id = ${clientId} AND "trainerId" = ${trainerId}
        AND "planType" = 'package' AND "sessionsRemaining" > 0`
  );
}

// ==================== ADMIN STATS ====================

export async function getAdminDashboardStats() {
  const db = await getDb();
  if (!db) return { totalTrainers: 0, activeSubscriptions: 0, totalClients: 0, totalAppointments: 0 };
  const trainers = await db.select().from(users).where(eq(users.role, "user"));
  const allClients = await db.select({ count: count() }).from(clients);
  const allAppts = await db.select({ count: count() }).from(appointments);
  return {
    totalTrainers: trainers.length,
    activeSubscriptions: trainers.filter(t => t.subscriptionStatus === "active").length,
    totalClients: allClients[0]?.count ?? 0,
    totalAppointments: allAppts[0]?.count ?? 0,
  };
}

// ==================== AUTH ====================

export async function createAuthToken(userId: number, type: "email_confirmation" | "password_reset", expiresAt: Date): Promise<string> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const token = nanoid(32);
  await db.insert(authTokens).values({
    userId,
    token,
    type,
    expiresAt,
  });

  return token;
}

export async function getAuthToken(token: string) {
  const db = await getDb();
  if (!db) return null;

  const result = await db.select().from(authTokens).where(eq(authTokens.token, token)).limit(1);
  return result.length > 0 ? result[0] : null;
}

export async function deleteAuthToken(token: string): Promise<void> {
  const db = await getDb();
  if (!db) return;

  await db.delete(authTokens).where(eq(authTokens.token, token));
}

export async function getUserByEmail(email: string) {
  const db = await getDb();
  if (!db) return null;

  const result = await db.select().from(users).where(eq(users.email, email)).limit(1);
  return result.length > 0 ? result[0] : null;
}

export async function createUser(email: string, passwordHash: string, name?: string): Promise<typeof users.$inferSelect> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(users).values({
    email,
    passwordHash,
    name,
    emailVerified: false,
    loginMethod: "email",
    role: "user",
    subscriptionPlan: "free",
    subscriptionStatus: "trial",
    maxClients: 5,
  }).returning();

  return result[0];
}

export async function updateUserEmailVerified(userId: number): Promise<void> {
  const db = await getDb();
  if (!db) return;

  await db.update(users).set({ emailVerified: true }).where(eq(users.id, userId));
}

export async function updateUserPassword(userId: number, passwordHash: string): Promise<void> {
  const db = await getDb();
  if (!db) return;

  await db.update(users).set({ passwordHash }).where(eq(users.id, userId));
}

// ==================== CLIENT SESSION MANAGEMENT ====================

/**
 * Decrements sessionsRemaining for package-plan clients.
 * Called when an appointment is marked as completed.
 * Returns the new sessionsRemaining value, or null if not applicable.
 */
export async function decrementClientSessions(clientId: number, trainerId: number): Promise<number | null> {
  const db = await getDb();
  if (!db) return null;

  const result = await db.select({
    planType: clients.planType,
    sessionsRemaining: clients.sessionsRemaining,
  }).from(clients)
    .where(and(eq(clients.id, clientId), eq(clients.trainerId, trainerId)))
    .limit(1);

  const client = result[0];
  if (!client || client.planType !== "package") return null;
  if (client.sessionsRemaining === null || client.sessionsRemaining <= 0) return 0;

  const newCount = client.sessionsRemaining - 1;
  await db.update(clients)
    .set({ sessionsRemaining: newCount, updatedAt: new Date() })
    .where(and(eq(clients.id, clientId), eq(clients.trainerId, trainerId)));

  return newCount;
}

// ==================== FINANCIAL DASHBOARD ====================

/**
 * Returns a comprehensive financial dashboard for a trainer.
 * Rules:
 * - Only ACTIVE clients count (status = 'active')
 * - Consulting clients (clientType = 'consulting') are excluded from session/plan revenue
 * - Monthly plan: revenue = monthlyFee per active training client
 * - Package plan: revenue = packageValue per active training client with sessionsRemaining > 0
 * - Overdue: monthly clients whose paymentDay has already passed this month
 * - Expiring packages: training clients with sessionsRemaining <= 3
 */
export async function getFinancialDashboard(trainerId: number) {
  const db = await getDb();
  if (!db) return null;

  const today = new Date();
  const currentDay = today.getDate();
  const currentMonth = today.getMonth() + 1;
  const currentYear = today.getFullYear();

  // Get all clients for this trainer
  const allClients = await db.select().from(clients).where(eq(clients.trainerId, trainerId));

  // Filter: only active clients count for financial
  const activeClients = allClients.filter(c => c.status === 'active');
  const inactiveClients = allClients.filter(c => c.status === 'inactive');

  // Monthly plan clients (active, not consulting)
  const monthlyClients = activeClients.filter(c => c.planType === 'monthly');
  const packageClients = activeClients.filter(c => c.planType === 'package');
  const consultingClients = activeClients.filter(c => c.planType === 'consulting');

  // Monthly revenue expected
  const monthlyRevenue = monthlyClients.reduce((sum, c) => sum + (parseFloat(c.monthlyFee || '0') || 0), 0);

  // Package revenue (active packages with sessions remaining)
  const packageRevenue = packageClients
    .filter(c => (c.sessionsRemaining ?? 0) > 0)
    .reduce((sum, c) => sum + (parseFloat(c.packageValue || '0') || 0), 0);

  // Overdue: monthly clients whose paymentDay has passed this month
  const overdueClients = monthlyClients.filter(c => {
    const day = c.paymentDay ?? 5;
    return day < currentDay;
  });
  const overdueAmount = overdueClients.reduce((sum, c) => sum + (parseFloat(c.monthlyFee || '0') || 0), 0);

  // Expiring packages: package clients with sessionsRemaining <= 3
  const expiringPackages = packageClients.filter(c => (c.sessionsRemaining ?? 0) > 0 && (c.sessionsRemaining ?? 0) <= 3);

  // Completed sessions this month
  const monthStart = `${currentYear}-${String(currentMonth).padStart(2, '0')}-01`;
  const lastDayOfCurrentMonth = new Date(currentYear, currentMonth, 0).getDate();
  const monthEnd = `${currentYear}-${String(currentMonth).padStart(2, '0')}-${String(lastDayOfCurrentMonth).padStart(2, '0')}`;
  const completedThisMonth = await db.select({ count: count() }).from(appointments)
    .where(and(
      eq(appointments.trainerId, trainerId),
      eq(appointments.status, 'completed'),
      sql`${appointments.date} >= ${monthStart}::date`,
      sql`${appointments.date} <= ${monthEnd}::date`
    ));

  // Revenue last 6 months (from transactions)
  const sixMonthsAgo = new Date(today);
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
  const sixMonthsAgoStr = `${sixMonthsAgo.getFullYear()}-${String(sixMonthsAgo.getMonth() + 1).padStart(2, '0')}-01`;

  const recentTransactions = await db.select().from(transactions)
    .where(and(
      eq(transactions.trainerId, trainerId),
      eq(transactions.type, 'income'),
      eq(transactions.status, 'paid'),
      sql`${transactions.date} >= ${sixMonthsAgoStr}::date`
    ));

  // Group by month
  const monthlyChart: Record<string, number> = {};
  for (let i = 5; i >= 0; i--) {
    const d = new Date(today);
    d.setMonth(d.getMonth() - i);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    monthlyChart[key] = 0;
  }
  for (const t of recentTransactions) {
    const dateStr = typeof t.date === 'string' ? t.date : (t.date as Date).toISOString().split('T')[0];
    const key = dateStr.substring(0, 7); // YYYY-MM
    if (key in monthlyChart) monthlyChart[key] += parseFloat(t.amount);
  }

  const chartData = Object.entries(monthlyChart).map(([month, value]) => ({
    month,
    value: Math.round(value * 100) / 100,
  }));

  return {
    summary: {
      totalActiveClients: activeClients.length,
      monthlyPlanClients: monthlyClients.length,
      packagePlanClients: packageClients.length,
      consultingClients: consultingClients.length,
      inactiveClients: inactiveClients.length,
    },
    revenue: {
      monthlyExpected: Math.round(monthlyRevenue * 100) / 100,
      packageActive: Math.round(packageRevenue * 100) / 100,
      totalExpected: Math.round((monthlyRevenue + packageRevenue) * 100) / 100,
    },
    overdue: {
      count: overdueClients.length,
      amount: Math.round(overdueAmount * 100) / 100,
      clients: overdueClients.map(c => ({
        id: c.id,
        name: c.name,
        fee: parseFloat(c.monthlyFee || '0'),
        paymentDay: c.paymentDay,
        phone: c.phone,
      })),
    },
    expiringPackages: {
      count: expiringPackages.length,
      clients: expiringPackages.map(c => ({
        id: c.id,
        name: c.name,
        sessionsRemaining: c.sessionsRemaining ?? 0,
        packageSessions: c.packageSessions ?? 0,
        phone: c.phone,
      })),
    },
    completedSessionsThisMonth: completedThisMonth[0]?.count ?? 0,
    chartData,
    allClients: allClients.map(c => ({
      id: c.id,
      name: c.name,
      status: c.status,
      planType: c.planType,
      monthlyFee: c.monthlyFee ? parseFloat(c.monthlyFee) : null,
      paymentDay: c.paymentDay,
      packageSessions: c.packageSessions,
      sessionsRemaining: c.sessionsRemaining,
      packageValue: c.packageValue ? parseFloat(c.packageValue) : null,
      phone: c.phone,
    })),
  };
}

// ==================== BIOIMPEDANCE EXAMS ====================

export async function getBioimpedanceByClient(trainerId: number, clientId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(bioimpedanceExams)
    .where(and(eq(bioimpedanceExams.trainerId, trainerId), eq(bioimpedanceExams.clientId, clientId)))
    .orderBy(desc(bioimpedanceExams.date));
}

export async function createBioimpedanceExam(data: InsertBioimpedanceExam) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(bioimpedanceExams).values(data).returning({ id: bioimpedanceExams.id });
  return result[0];
}

export async function updateBioimpedanceExam(id: number, trainerId: number, data: Partial<InsertBioimpedanceExam>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(bioimpedanceExams).set(data)
    .where(and(eq(bioimpedanceExams.id, id), eq(bioimpedanceExams.trainerId, trainerId)));
  return { success: true };
}

export async function deleteBioimpedanceExam(id: number, trainerId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(bioimpedanceExams)
    .where(and(eq(bioimpedanceExams.id, id), eq(bioimpedanceExams.trainerId, trainerId)));
  return { success: true };
}
