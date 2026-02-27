import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, decimal, boolean, date } from "drizzle-orm/mysql-core";

// ==================== USERS ====================
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  phone: varchar("phone", { length: 20 }),
  photoUrl: text("photoUrl"),
  specialties: text("specialties"),
  bio: text("bio"),
  cref: varchar("cref", { length: 20 }),
  subscriptionPlan: mysqlEnum("subscriptionPlan", ["free", "basic", "pro", "premium"]).default("free").notNull(),
  subscriptionStatus: mysqlEnum("subscriptionStatus", ["active", "inactive", "trial", "cancelled"]).default("trial").notNull(),
  subscriptionExpiresAt: timestamp("subscriptionExpiresAt"),
  maxClients: int("maxClients").default(5).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// ==================== CLIENTS ====================
export const clients = mysqlTable("clients", {
  id: int("id").autoincrement().primaryKey(),
  trainerId: int("trainerId").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  email: varchar("email", { length: 320 }),
  phone: varchar("phone", { length: 20 }),
  birthDate: date("birthDate"),
  gender: mysqlEnum("gender", ["male", "female", "other"]),
  photoUrl: text("photoUrl"),
  notes: text("notes"),
  goal: text("goal"),
  status: mysqlEnum("status", ["active", "inactive", "trial"]).default("active").notNull(),
  monthlyFee: decimal("monthlyFee", { precision: 10, scale: 2 }),
  paymentDay: int("paymentDay"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Client = typeof clients.$inferSelect;
export type InsertClient = typeof clients.$inferInsert;

// ==================== APPOINTMENTS ====================
export const appointments = mysqlTable("appointments", {
  id: int("id").autoincrement().primaryKey(),
  trainerId: int("trainerId").notNull(),
  clientId: int("clientId"),
  guestName: varchar("guestName", { length: 255 }),
  date: date("date").notNull(),
  startTime: varchar("startTime", { length: 5 }).notNull(), // HH:MM
  duration: int("duration").default(60).notNull(), // minutes
  status: mysqlEnum("status", ["scheduled", "completed", "cancelled", "no_show"]).default("scheduled").notNull(),
  notes: text("notes"),
  // Recurrence fields
  recurrenceGroupId: varchar("recurrenceGroupId", { length: 36 }), // UUID grouping recurring sessions
  recurrenceType: mysqlEnum("recurrenceType", ["none", "daily", "weekly", "biweekly", "monthly"]).default("none").notNull(),
  recurrenceDays: varchar("recurrenceDays", { length: 20 }), // comma-separated weekday numbers e.g. "1,3,5"
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Appointment = typeof appointments.$inferSelect;
export type InsertAppointment = typeof appointments.$inferInsert;

// ==================== BODY MEASUREMENTS ====================
export const bodyMeasurements = mysqlTable("bodyMeasurements", {
  id: int("id").autoincrement().primaryKey(),
  trainerId: int("trainerId").notNull(),
  clientId: int("clientId").notNull(),
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
export const progressPhotos = mysqlTable("progressPhotos", {
  id: int("id").autoincrement().primaryKey(),
  trainerId: int("trainerId").notNull(),
  clientId: int("clientId").notNull(),
  photoUrl: text("photoUrl").notNull(),
  photoType: mysqlEnum("photoType", ["front", "back", "side_left", "side_right", "other"]).default("front").notNull(),
  date: date("date").notNull(),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type ProgressPhoto = typeof progressPhotos.$inferSelect;
export type InsertProgressPhoto = typeof progressPhotos.$inferInsert;

// ==================== FINANCIAL TRANSACTIONS ====================
export const transactions = mysqlTable("transactions", {
  id: int("id").autoincrement().primaryKey(),
  trainerId: int("trainerId").notNull(),
  clientId: int("clientId"),
  type: mysqlEnum("type", ["income", "expense"]).notNull(),
  category: varchar("category", { length: 100 }).notNull(),
  description: text("description"),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  date: date("date").notNull(),
  status: mysqlEnum("status", ["pending", "paid", "overdue", "cancelled"]).default("pending").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Transaction = typeof transactions.$inferSelect;
export type InsertTransaction = typeof transactions.$inferInsert;
