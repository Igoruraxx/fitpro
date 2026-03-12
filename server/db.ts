import { eq, and, desc, asc, sql, count, gte } from "drizzle-orm";
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

export async function getDb() {
  if (!_db) {
    // Prefer DATABASE_URL for standard PostgreSQL connection
    let connStr = process.env.DATABASE_URL || ENV.supabaseDbUrl;

    // Auto-patch Supabase connection strings for Vercel IPv4 compatibility
    if (connStr && connStr.includes("supabase.com") && connStr.includes(":5432")) {
      console.log("[Database] Patching Supabase URL for IPv4 compatibility (pooler port 6543)");
      connStr = connStr.replace(":5432", ":6543");
    }

    if (!connStr) {
      console.warn("[Database] No connection string available. Set DATABASE_URL.");
      return null;
    }
    try {
      // Standard PostgreSQL connection. Use ssl: 'require' for most cloud providers.
      // But we can make it more flexible based on env.
      const ssl = process.env.DB_SSL === 'false' ? false : 'require';
      const client = postgres(connStr, {
        max: 10,
        ssl,
        connect_timeout: 5, // 10 seconds timeout
      });
      _db = drizzle(client);
      console.log("[Database] Connected to PostgreSQL");

      // Basic connectivity check
      await _db.execute(sql`SELECT 1`);
      console.log("[Database] Connection verified");
    } catch (error) {
      console.error("[Database] Critical connection failure:", error);
      
      // Helper function to check if error is a timeout error
      const isTimeoutError = (err: unknown): boolean => {
        return (
          err !== null &&
          typeof err === "object" &&
          "message" in err &&
          typeof err.message === "string" &&
          err.message.includes("timeout")
        );
      };
      
      // Helper to check if connection string is for Supabase
      const isSupabaseConnection = (url: string): boolean => {
        try {
          const parsed = new URL(url.startsWith('postgresql://') ? url : `postgresql://${url}`);
          return parsed.hostname.endsWith('.supabase.com') || parsed.hostname === 'supabase.com';
        } catch {
          // If URL parsing fails, we can't reliably determine if it's Supabase
          return false;
        }
      };
      
      if (isTimeoutError(error) && isSupabaseConnection(connStr) && !connStr.includes("6543")) {
        console.error("HINT: Supabase removed IPv4 support for direct connections (port 5432). Please use the Transaction Pooler URL (port 6543) in your DATABASE_URL for Vercel deployments.");
      }
      _db = null;
      if (process.env.NODE_ENV === "production") {
        throw error; // Fail fast in production
      }
    }
  }
  return _db;
}

// ==================== USERS ====================

/** @deprecated using email login now */
export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    console.warn("[Database] upsertUser called without openId, skipping.");
    return;
  }
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
  // Get all trainers (role = user)
  const trainers = await db.select().from(users).orderBy(desc(users.createdAt));
  // Get client counts per trainer
  const clientCounts = await db
    .select({ trainerId: clients.trainerId, count: count() })
    .from(clients)
    .where(eq(clients.status, 'active'))
    .groupBy(clients.trainerId);
  const countMap = new Map(clientCounts.map(c => [c.trainerId, Number(c.count)]));
  return trainers.map(t => ({ ...t, activeClients: countMap.get(t.id) ?? 0 }));
}

export async function updateUserPlan(userId: number, plan: 'free' | 'pro') {
  const db = await getDb();
  if (!db) return;
  await db.update(users)
    .set({
      subscriptionPlan: plan,
      subscriptionStatus: plan === 'pro' ? 'active' : 'trial',
      maxClients: plan === 'pro' ? 9999 : 5,
      updatedAt: new Date(),
    })
    .where(eq(users.id, userId));
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
    // Pacote não tem vencimento — data = hoje apenas para referência, sem dueDate
    dueDate = now.toISOString().split('T')[0];
    category = 'Pacote de Sessões';
  }

  if (!amount) return;
  if (!dueDate && planType !== 'package') return;

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
    // Pacotes não têm dueDate — nunca salvar dueDate para pacotes
    const updateData: Record<string, unknown> = { amount, updatedAt: new Date() };
    if (planType !== 'package') updateData.dueDate = dueDate;
    await db.update(transactions)
      .set(updateData as any)
      .where(eq(transactions.id, existing[0].id));
  } else {
    // Create new charge
    const clientRow = await getClientById(clientId, trainerId);
    const clientName = clientRow?.name ?? 'Aluno';
    const insertDate = dueDate ?? now.toISOString().split('T')[0];
    await db.insert(transactions).values({
      trainerId,
      clientId,
      type: 'income',
      category,
      description: `${category} - ${clientName}`,
      amount,
      date: insertDate,
      // Pacotes não têm dueDate — null para não aparecer como inadimplente
      ...(planType !== 'package' && dueDate ? { dueDate } : {}),
      status: 'pending',
    } as any);
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

/**
 * Bulk delete appointments for a specific client with optional filters.
 * Replaces N+1 query pattern.
 */
export async function deleteAppointmentsByClient(params: {
  trainerId: number;
  clientId: number;
  startDate?: string;
  status?: "scheduled" | "completed" | "cancelled" | "no_show";
}) {
  const db = await getDb();
  if (!db) return 0;

  const conditions = [
    eq(appointments.trainerId, params.trainerId),
    eq(appointments.clientId, params.clientId)
  ];

  if (params.startDate) {
    conditions.push(sql`${appointments.date} >= ${params.startDate}::date` as any);
  }

  if (params.status) {
    conditions.push(eq(appointments.status, params.status));
  }

  const result = await db.delete(appointments)
    .where(and(...conditions))
    .returning({ id: appointments.id });

  return result.length;
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

  // Prefetch existing transactions for this month to avoid N+1 query
  const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
  const lastDay = new Date(year, month, 0).getDate();
  const endDate = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

  const existingTransactions = await db.select({
    clientId: transactions.clientId,
    dueDate: transactions.dueDate
  })
    .from(transactions)
    .where(and(
      eq(transactions.trainerId, trainerId),
      eq(transactions.type, 'income'),
      sql`${transactions.dueDate} >= ${startDate}::date`,
      sql`${transactions.dueDate} <= ${endDate}::date`
    ));

  // Map clientId -> Set of dueDates already charged
  const existingMap = new Map<number, Set<string>>();
  for (const tx of existingTransactions) {
    if (tx.clientId && tx.dueDate) {
      if (!existingMap.has(tx.clientId)) {
        existingMap.set(tx.clientId, new Set());
      }
      // Drizzle might return Date object or string depending on driver; normalize to string
      const dateStr = typeof tx.dueDate === 'string' ? tx.dueDate : (tx.dueDate as Date).toISOString().split('T')[0];
      existingMap.get(tx.clientId)!.add(dateStr);
    }
  }

  let created = 0;
  for (const client of monthlyClients) {
    if (!client.monthlyFee || !client.paymentDay) continue;
    const validDay = clampDay(client.paymentDay, month, year);
    const dueDate = `${year}-${String(month).padStart(2, '0')}-${String(validDay).padStart(2, '0')}`;

    // Check if charge already exists for this client/month using pre-fetched data
    if (existingMap.get(client.id)?.has(dueDate)) continue;

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

  const appts = await db.select({
      appointment: appointments,
      clientName: clients.name,
    })
    .from(appointments)
    .leftJoin(clients, eq(appointments.clientId, clients.id))
    .where(and(
      eq(appointments.trainerId, trainerId),
      sql`${appointments.date} = ${todayStr}::date`
    ))
    .orderBy(asc(appointments.startTime));

  const result = appts.map(row => {
    return {
      ...row.appointment,
      clientName: row.clientName || row.appointment.guestName || 'Convidado',
    };
  });

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
    emailVerified: true,
    loginMethod: "email",
    role: "user",
    subscriptionPlan: "free",
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


// ==================== AUTO-SCHEDULING ====================

/**
 * Generate appointments for a package-plan client based on:
 * - sessionDays: comma-separated weekday numbers (0-6, 0=Sunday)
 * - sessionsPerWeek: how many sessions per week
 * - packageSessions: total sessions to schedule
 * - sessionTime or sessionTimesPerDay: time(s) for each session
 * - sessionDuration: duration in minutes
 */
export async function generatePackageAppointments(
  clientId: number,
  trainerId: number,
  packageSessions: number,
  sessionsPerWeek: number,
  sessionDays: string,
  sessionTime: string | null,
  sessionTimesPerDay: string | null,
  sessionDuration: number = 60
): Promise<number> {
  const db = await getDb();
  if (!db) return 0;

  // Calculate how many sessions can actually be created
  const { canCreate } = await calculateMaxSessionsToCreate(clientId, packageSessions);
  if (canCreate <= 0) return 0; // All sessions already created

  const daysArray = sessionDays.split(',').map(d => parseInt(d.trim())).filter(d => !isNaN(d));
  if (daysArray.length === 0) return 0;

  let timesPerDay: Record<number, string> = {};
  if (sessionTimesPerDay) {
    try {
      timesPerDay = JSON.parse(sessionTimesPerDay);
    } catch {
      daysArray.forEach(d => {
        timesPerDay[d] = sessionTime || '07:00';
      });
    }
  } else if (sessionTime) {
    daysArray.forEach(d => {
      timesPerDay[d] = sessionTime;
    });
  }

  let sessionsGenerated = 0;
  const startDate = new Date();
  startDate.setHours(0, 0, 0, 0);

  let currentDate = new Date(startDate);
  while (sessionsGenerated < canCreate) {
    const dayOfWeek = currentDate.getDay();

    if (daysArray.includes(dayOfWeek)) {
      const timeStr = timesPerDay[dayOfWeek] || sessionTime || '07:00';
      const dateStr = currentDate.toISOString().split('T')[0];

      await db.insert(appointments).values({
        trainerId,
        clientId,
        date: dateStr,
        startTime: timeStr,
        duration: sessionDuration,
        status: 'scheduled',
        notes: null,
        guestName: null,
        recurrenceGroupId: null,
        muscleGroups: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any);

      sessionsGenerated++;
    }

    currentDate.setDate(currentDate.getDate() + 1);
  }

  return sessionsGenerated;
}

/**
 * Calculate how many sessions can be created without exceeding the package limit
 * Returns: { canCreate: number, totalExisting: number, packageLimit: number }
 */
export async function calculateMaxSessionsToCreate(
  clientId: number,
  packageSessions: number
): Promise<{ canCreate: number; totalExisting: number; packageLimit: number }> {
  const db = await getDb();
  if (!db) return { canCreate: 0, totalExisting: 0, packageLimit: packageSessions };

  // Count all future appointments (date >= today) with status 'scheduled'
  const today = new Date().toISOString().split('T')[0];
  const futureAppointments = await db
    .select()
    .from(appointments)
    .where(
      and(
        eq(appointments.clientId, clientId),
        eq(appointments.status, 'scheduled'),
        gte(appointments.date, today)
      )
    );

  const totalExisting = futureAppointments.length;
  const canCreate = Math.max(0, packageSessions - totalExisting);

  return { canCreate, totalExisting, packageLimit: packageSessions };
}

/**
 * Record a package renewal in the client's renovationHistory
 */
export async function recordPackageRenewal(
  clientId: number,
  trainerId: number,
  sessionsUsed: number,
  newSessions: number
): Promise<void> {
  const db = await getDb();
  if (!db) return;

  const client = await db.select().from(clients)
    .where(and(eq(clients.id, clientId), eq(clients.trainerId, trainerId)))
    .limit(1);

  if (!client[0]) return;

  let history: any[] = [];
  if (client[0].renovationHistory) {
    try {
      history = JSON.parse(client[0].renovationHistory);
    } catch {
      history = [];
    }
  }

  history.push({
    date: new Date().toISOString().split('T')[0],
    sessionsUsed,
    newSessions,
  });

  await db.update(clients)
    .set({
      renovationHistory: JSON.stringify(history),
      updatedAt: new Date(),
    })
    .where(and(eq(clients.id, clientId), eq(clients.trainerId, trainerId)));
}
