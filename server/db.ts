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
} from "../drizzle/schema";
import { ENV } from './_core/env';
import { nanoid } from "nanoid";

let _db: ReturnType<typeof drizzle> | null = null;

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

export async function createClient(data: InsertClient) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.insert(clients).values(data).returning({ id: clients.id });
  return result[0]?.id;
}

export async function updateClient(id: number, trainerId: number, data: Partial<InsertClient>) {
  const db = await getDb();
  if (!db) return;
  await db.update(clients).set({ ...data, updatedAt: new Date() })
    .where(and(eq(clients.id, id), eq(clients.trainerId, trainerId)));
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

export async function getFinancialSummary(trainerId: number, month: number, year: number) {
  const db = await getDb();
  if (!db) return { income: 0, expenses: 0, pending: 0 };
  const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
  const endDate = `${year}-${String(month).padStart(2, '0')}-31`;
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
