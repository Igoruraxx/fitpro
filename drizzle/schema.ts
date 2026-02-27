import {
  integer, pgEnum, pgTable, text, timestamp, varchar, decimal, boolean, date, serial
} from "drizzle-orm/pg-core";

// ==================== ENUMS ====================
export const roleEnum = pgEnum("role", ["user", "admin"]);
export const subscriptionPlanEnum = pgEnum("subscription_plan", ["free", "basic", "pro", "premium"]);
export const subscriptionStatusEnum = pgEnum("subscription_status", ["active", "inactive", "trial", "cancelled"]);
export const genderEnum = pgEnum("gender", ["male", "female", "other"]);
export const clientStatusEnum = pgEnum("client_status", ["active", "inactive", "trial"]);
export const planTypeEnum = pgEnum("plan_type", ["monthly", "package"]);
export const appointmentStatusEnum = pgEnum("appointment_status", ["scheduled", "completed", "cancelled", "no_show"]);
export const recurrenceTypeEnum = pgEnum("recurrence_type", ["none", "daily", "weekly", "biweekly", "monthly"]);
export const photoTypeEnum = pgEnum("photo_type", ["front", "back", "side_left", "side_right", "other"]);
export const transactionTypeEnum = pgEnum("transaction_type", ["income", "expense"]);
export const transactionStatusEnum = pgEnum("transaction_status", ["pending", "paid", "overdue", "cancelled"]);

// ==================== USERS ====================
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: roleEnum("role").default("user").notNull(),
  phone: varchar("phone", { length: 20 }),
  photoUrl: text("photoUrl"),
  specialties: text("specialties"),
  bio: text("bio"),
  cref: varchar("cref", { length: 20 }),
  subscriptionPlan: subscriptionPlanEnum("subscriptionPlan").default("free").notNull(),
  subscriptionStatus: subscriptionStatusEnum("subscriptionStatus").default("trial").notNull(),
  subscriptionExpiresAt: timestamp("subscriptionExpiresAt"),
  maxClients: integer("maxClients").default(5).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// ==================== CLIENTS ====================
export const clients = pgTable("clients", {
  id: serial("id").primaryKey(),
  trainerId: integer("trainerId").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  phone: varchar("phone", { length: 20 }),
  birthDate: date("birthDate"),
  gender: genderEnum("gender"),
  photoUrl: text("photoUrl"),
  status: clientStatusEnum("status").default("active").notNull(),

  // Plan type: monthly subscription or session package
  planType: planTypeEnum("planType").default("monthly").notNull(),

  // Monthly plan fields
  monthlyFee: decimal("monthlyFee", { precision: 10, scale: 2 }),
  paymentDay: integer("paymentDay"),  // day of month (1-31) for monthly billing

  // Package plan fields
  packageSessions: integer("packageSessions"),      // total sessions purchased
  sessionsRemaining: integer("sessionsRemaining"),   // countdown — decremented on each completed session
  packageValue: decimal("packageValue", { precision: 10, scale: 2 }),

  // Weekly schedule (shared by both plan types)
  sessionsPerWeek: integer("sessionsPerWeek").default(3),
  sessionDays: varchar("sessionDays", { length: 20 }),  // comma-separated weekday numbers e.g. "1,3,5"
  sessionTime: varchar("sessionTime", { length: 5 }),   // default start time HH:MM
  sessionDuration: integer("sessionDuration").default(60),  // minutes

  // Prepaid / advance payment
  prepaidValue: decimal("prepaidValue", { precision: 10, scale: 2 }),
  prepaidDueDate: date("prepaidDueDate"),

  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type Client = typeof clients.$inferSelect;
export type InsertClient = typeof clients.$inferInsert;

// ==================== APPOINTMENTS ====================
export const appointments = pgTable("appointments", {
  id: serial("id").primaryKey(),
  trainerId: integer("trainerId").notNull(),
  clientId: integer("clientId"),
  guestName: varchar("guestName", { length: 255 }),
  date: date("date").notNull(),
  startTime: varchar("startTime", { length: 5 }).notNull(), // HH:MM
  duration: integer("duration").default(60).notNull(), // minutes
  status: appointmentStatusEnum("status").default("scheduled").notNull(),
  notes: text("notes"),
  // Recurrence fields
  recurrenceGroupId: varchar("recurrenceGroupId", { length: 36 }),
  recurrenceType: recurrenceTypeEnum("recurrenceType").default("none").notNull(),
  recurrenceDays: varchar("recurrenceDays", { length: 20 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type Appointment = typeof appointments.$inferSelect;
export type InsertAppointment = typeof appointments.$inferInsert;

// ==================== BODY MEASUREMENTS ====================
export const bodyMeasurements = pgTable("bodyMeasurements", {
  id: serial("id").primaryKey(),
  trainerId: integer("trainerId").notNull(),
  clientId: integer("clientId").notNull(),
  date: date("date").notNull(),
  weight: decimal("weight", { precision: 5, scale: 2 }),
  height: decimal("height", { precision: 5, scale: 2 }),
  bodyFat: decimal("bodyFat", { precision: 5, scale: 2 }),
  chest: decimal("chest", { precision: 5, scale: 2 }),
  waist: decimal("waist", { precision: 5, scale: 2 }),
  hips: decimal("hips", { precision: 5, scale: 2 }),
  leftArm: decimal("leftArm", { precision: 5, scale: 2 }),
  rightArm: decimal("rightArm", { precision: 5, scale: 2 }),
  leftThigh: decimal("leftThigh", { precision: 5, scale: 2 }),
  rightThigh: decimal("rightThigh", { precision: 5, scale: 2 }),
  leftCalf: decimal("leftCalf", { precision: 5, scale: 2 }),
  rightCalf: decimal("rightCalf", { precision: 5, scale: 2 }),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type BodyMeasurement = typeof bodyMeasurements.$inferSelect;
export type InsertBodyMeasurement = typeof bodyMeasurements.$inferInsert;

// ==================== PROGRESS PHOTOS ====================
export const progressPhotos = pgTable("progressPhotos", {
  id: serial("id").primaryKey(),
  trainerId: integer("trainerId").notNull(),
  clientId: integer("clientId").notNull(),
  photoUrl: text("photoUrl").notNull(),
  photoType: photoTypeEnum("photoType").default("front").notNull(),
  date: date("date").notNull(),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type ProgressPhoto = typeof progressPhotos.$inferSelect;
export type InsertProgressPhoto = typeof progressPhotos.$inferInsert;

// ==================== FINANCIAL TRANSACTIONS ====================
export const transactions = pgTable("transactions", {
  id: serial("id").primaryKey(),
  trainerId: integer("trainerId").notNull(),
  clientId: integer("clientId"),
  type: transactionTypeEnum("type").notNull(),
  category: varchar("category", { length: 100 }).notNull(),
  description: text("description"),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  date: date("date").notNull(),
  status: transactionStatusEnum("status").default("pending").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type Transaction = typeof transactions.$inferSelect;
export type InsertTransaction = typeof transactions.$inferInsert;
