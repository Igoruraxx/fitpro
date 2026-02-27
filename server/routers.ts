import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, adminProcedure, router } from "./_core/trpc";
import { authRouter } from "./routers/auth";
import { z } from "zod";
import {
  getClientsByTrainer, getClientById, createClient, updateClient, deleteClient, countClientsByTrainer,
  getAppointmentsByTrainer, getAppointmentById, createAppointment, updateAppointment, deleteAppointment,
  deleteAppointmentsByGroup,
  getMeasurementsByClient, createMeasurement, deleteMeasurement,
  getPhotosByClient, createProgressPhoto, deleteProgressPhoto,
  getTransactionsByTrainer, createTransaction, updateTransaction, deleteTransaction, getFinancialSummary,
  updateUserProfile, getAllTrainers, getAdminDashboardStats,
  getDashboardStats, getWeeklySessionsChart, getSessionStatusChart, getTodaySessions,
} from "./db";
import { nanoid } from "nanoid";
import { storagePut } from "./storage";
import { notifyOwner } from "./_core/notification";

// ==================== RECURRENCE HELPER ====================
/**
 * Generates an array of YYYY-MM-DD date strings for recurring appointments.
 * Supports daily, weekly (with specific weekdays), biweekly, and monthly patterns.
 */
function generateRecurringDates(
  startDate: string,
  recurrenceType: "daily" | "weekly" | "biweekly" | "monthly",
  recurrenceDays: string | undefined,
  endDate: string | undefined,
  maxOccurrences: number
): string[] {
  const dates: string[] = [];
  const start = new Date(startDate + "T12:00:00"); // noon to avoid DST issues
  const end = endDate ? new Date(endDate + "T23:59:59") : null;
  const limit = Math.min(maxOccurrences, 52); // safety cap at 52 occurrences

  // Parse allowed weekdays (0=Sun,1=Mon,...,6=Sat)
  const allowedDays = recurrenceDays
    ? recurrenceDays.split(",").map(Number)
    : null;

  const fmt = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

  if (recurrenceType === "weekly" && allowedDays && allowedDays.length > 0) {
    // Walk day by day for up to 52 weeks, collecting matching weekdays
    const cursor = new Date(start);
    let weeks = 0;
    while (dates.length < limit) {
      if (end && cursor > end) break;
      if (allowedDays.includes(cursor.getDay())) {
        if (cursor >= start) dates.push(fmt(cursor));
      }
      cursor.setDate(cursor.getDate() + 1);
      // Stop after scanning 52 weeks
      weeks = Math.floor((cursor.getTime() - start.getTime()) / (7 * 24 * 3600 * 1000));
      if (weeks > 52) break;
    }
  } else {
    const cursor = new Date(start);
    while (dates.length < limit) {
      if (end && cursor > end) break;
      dates.push(fmt(cursor));
      switch (recurrenceType) {
        case "daily":    cursor.setDate(cursor.getDate() + 1); break;
        case "weekly":   cursor.setDate(cursor.getDate() + 7); break;
        case "biweekly": cursor.setDate(cursor.getDate() + 14); break;
        case "monthly":  cursor.setMonth(cursor.getMonth() + 1); break;
      }
    }
  }
  return dates;
}

export const appRouter = router({
  system: systemRouter,

  auth: authRouter,

  // ==================== PROFILE ====================
  profile: router({
    update: protectedProcedure.input(z.object({
      name: z.string().optional(),
      phone: z.string().optional(),
      email: z.string().optional(),
      specialties: z.string().optional(),
      bio: z.string().optional(),
      cref: z.string().optional(),
      photoUrl: z.string().optional(),
    })).mutation(async ({ ctx, input }) => {
      await updateUserProfile(ctx.user.id, input);
      return { success: true };
    }),
  }),

  // ==================== CLIENTS ====================
  clients: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      return getClientsByTrainer(ctx.user.id);
    }),
    getById: protectedProcedure.input(z.object({ id: z.number() })).query(async ({ ctx, input }) => {
      return getClientById(input.id, ctx.user.id);
    }),
    create: protectedProcedure.input(z.object({
      name: z.string().min(1),
      email: z.string().optional(),
      phone: z.string().optional(),
      birthDate: z.string().optional(),
      gender: z.enum(["male", "female", "other"]).optional(),
      photoUrl: z.string().optional(),
      notes: z.string().optional(),
      goal: z.string().optional(),
      status: z.enum(["active", "inactive", "trial"]).optional(),
      monthlyFee: z.string().optional(),
      paymentDay: z.number().optional(),
    })).mutation(async ({ ctx, input }) => {
      const count = await countClientsByTrainer(ctx.user.id);
      if (count >= ctx.user.maxClients) {
        throw new Error("Limite de clientes atingido. Faça upgrade do seu plano.");
      }
      const id = await createClient({ ...input, trainerId: ctx.user.id } as any);
      return { id };
    }),
    update: protectedProcedure.input(z.object({
      id: z.number(),
      name: z.string().optional(),
      email: z.string().optional(),
      phone: z.string().optional(),
      birthDate: z.string().optional(),
      gender: z.enum(["male", "female", "other"]).optional(),
      photoUrl: z.string().optional(),
      notes: z.string().optional(),
      goal: z.string().optional(),
      status: z.enum(["active", "inactive", "trial"]).optional(),
      monthlyFee: z.string().optional(),
      paymentDay: z.number().optional(),
    })).mutation(async ({ ctx, input }) => {
      const { id, birthDate, ...rest } = input;
      const data: Record<string, unknown> = { ...rest };
      if (birthDate) data.birthDate = new Date(birthDate);
      await updateClient(id, ctx.user.id, data as any);
      return { success: true };
    }),
    delete: protectedProcedure.input(z.object({ id: z.number() })).mutation(async ({ ctx, input }) => {
      await deleteClient(input.id, ctx.user.id);
      return { success: true };
    }),
    count: protectedProcedure.query(async ({ ctx }) => {
      return countClientsByTrainer(ctx.user.id);
    }),
  }),

  // ==================== APPOINTMENTS ====================
  appointments: router({
    list: protectedProcedure.input(z.object({
      startDate: z.string(),
      endDate: z.string(),
    })).query(async ({ ctx, input }) => {
      return getAppointmentsByTrainer(ctx.user.id, input.startDate, input.endDate);
    }),
    getById: protectedProcedure.input(z.object({ id: z.number() })).query(async ({ ctx, input }) => {
      return getAppointmentById(input.id, ctx.user.id);
    }),
    create: protectedProcedure.input(z.object({
      clientId: z.number().optional(),
      guestName: z.string().optional(),
      date: z.string(),
      startTime: z.string(),
      duration: z.number().default(60),
      notes: z.string().optional(),
    })).mutation(async ({ ctx, input }) => {
      const id = await createAppointment({ ...input, date: input.date, trainerId: ctx.user.id } as any);
      return { id };
    }),
    update: protectedProcedure.input(z.object({
      id: z.number(),
      clientId: z.number().optional(),
      guestName: z.string().optional(),
      date: z.string().optional(),
      startTime: z.string().optional(),
      duration: z.number().optional(),
      status: z.enum(["scheduled", "completed", "cancelled", "no_show"]).optional(),
      notes: z.string().optional(),
    })).mutation(async ({ ctx, input }) => {
      const { id, ...rest } = input;
      // Pass date as string directly to avoid timezone conversion issues
      await updateAppointment(id, ctx.user.id, rest as any);
      return { success: true };
    }),
    delete: protectedProcedure.input(z.object({
      id: z.number(),
      deleteGroup: z.boolean().optional(),
    })).mutation(async ({ ctx, input }) => {
      if (input.deleteGroup) {
        // Get the appointment to find its recurrenceGroupId
        const appt = await getAppointmentById(input.id, ctx.user.id);
        if (appt?.recurrenceGroupId) {
          await deleteAppointmentsByGroup(appt.recurrenceGroupId, ctx.user.id);
          return { success: true, deleted: 'group' };
        }
      }
      await deleteAppointment(input.id, ctx.user.id);
      return { success: true, deleted: 'single' };
    }),
    // Create multiple recurring appointments at once
    createRecurring: protectedProcedure.input(z.object({
      clientId: z.number().optional(),
      guestName: z.string().optional(),
      startDate: z.string(),           // YYYY-MM-DD first occurrence
      endDate: z.string().optional(),  // YYYY-MM-DD last possible date
      occurrences: z.number().optional().default(8), // max occurrences if no endDate
      startTime: z.string(),
      duration: z.number().default(60),
      notes: z.string().optional(),
      recurrenceType: z.enum(["daily", "weekly", "biweekly", "monthly"]),
      recurrenceDays: z.string().optional(), // "1,3,5" for Mon,Wed,Fri
    })).mutation(async ({ ctx, input }) => {
      const groupId = nanoid();
      const dates = generateRecurringDates(
        input.startDate,
        input.recurrenceType,
        input.recurrenceDays,
        input.endDate,
        input.occurrences ?? 8
      );
      const ids: number[] = [];
      for (const date of dates) {
        const id = await createAppointment({
          trainerId: ctx.user.id,
          clientId: input.clientId ?? null,
          guestName: input.guestName ?? null,
          date: date as any,
          startTime: input.startTime,
          duration: input.duration,
          notes: input.notes ?? null,
          recurrenceGroupId: groupId,
          recurrenceType: input.recurrenceType,
          recurrenceDays: input.recurrenceDays ?? null,
        } as any);
        if (id) ids.push(id);
      }
      return { success: true, count: ids.length, groupId };
    }),
  }),

  // ==================== EVOLUTION ====================
  evolution: router({
    measurements: router({
      list: protectedProcedure.input(z.object({ clientId: z.number() })).query(async ({ ctx, input }) => {
        return getMeasurementsByClient(ctx.user.id, input.clientId);
      }),
      create: protectedProcedure.input(z.object({
        clientId: z.number(),
        date: z.string(),
        weight: z.string().optional(),
        height: z.string().optional(),
        bodyFat: z.string().optional(),
        chest: z.string().optional(),
        waist: z.string().optional(),
        hips: z.string().optional(),
        leftArm: z.string().optional(),
        rightArm: z.string().optional(),
        leftThigh: z.string().optional(),
        rightThigh: z.string().optional(),
        leftCalf: z.string().optional(),
        rightCalf: z.string().optional(),
        notes: z.string().optional(),
      })).mutation(async ({ ctx, input }) => {
        const id = await createMeasurement({ ...input, trainerId: ctx.user.id } as any);
        return { id };
      }),
      delete: protectedProcedure.input(z.object({ id: z.number() })).mutation(async ({ ctx, input }) => {
        await deleteMeasurement(input.id, ctx.user.id);
        return { success: true };
      }),
    }),
    photos: router({
      list: protectedProcedure.input(z.object({ clientId: z.number() })).query(async ({ ctx, input }) => {
        return getPhotosByClient(ctx.user.id, input.clientId);
      }),
      create: protectedProcedure.input(z.object({
        clientId: z.number(),
        photoUrl: z.string(),
        photoType: z.enum(["front", "back", "side_left", "side_right", "other"]).default("front"),
        date: z.string(),
        notes: z.string().optional(),
      })).mutation(async ({ ctx, input }) => {
        const id = await createProgressPhoto({ ...input, trainerId: ctx.user.id } as any);
        return { id };
      }),
      delete: protectedProcedure.input(z.object({ id: z.number() })).mutation(async ({ ctx, input }) => {
        await deleteProgressPhoto(input.id, ctx.user.id);
        return { success: true };
      }),
    }),
  }),

  // ==================== FINANCES ====================
  finances: router({
    list: protectedProcedure.input(z.object({
      startDate: z.string().optional(),
      endDate: z.string().optional(),
    })).query(async ({ ctx, input }) => {
      return getTransactionsByTrainer(ctx.user.id, input.startDate, input.endDate);
    }),
    create: protectedProcedure.input(z.object({
      clientId: z.number().optional(),
      type: z.enum(["income", "expense"]),
      category: z.string(),
      description: z.string().optional(),
      amount: z.string(),
      date: z.string(),
      status: z.enum(["pending", "paid", "overdue", "cancelled"]).default("pending"),
    })).mutation(async ({ ctx, input }) => {
      const id = await createTransaction({ ...input, trainerId: ctx.user.id } as any);
      return { id };
    }),
    update: protectedProcedure.input(z.object({
      id: z.number(),
      clientId: z.number().optional(),
      type: z.enum(["income", "expense"]).optional(),
      category: z.string().optional(),
      description: z.string().optional(),
      amount: z.string().optional(),
      date: z.string().optional(),
      status: z.enum(["pending", "paid", "overdue", "cancelled"]).optional(),
    })).mutation(async ({ ctx, input }) => {
      const { id, date, ...rest } = input;
      const data: Record<string, unknown> = { ...rest };
      if (date) data.date = new Date(date);
      await updateTransaction(id, ctx.user.id, data as any);
      return { success: true };
    }),
    delete: protectedProcedure.input(z.object({ id: z.number() })).mutation(async ({ ctx, input }) => {
      await deleteTransaction(input.id, ctx.user.id);
      return { success: true };
    }),
    summary: protectedProcedure.input(z.object({
      month: z.number(),
      year: z.number(),
    })).query(async ({ ctx, input }) => {
      return getFinancialSummary(ctx.user.id, input.month, input.year);
    }),
  }),

  // ==================== DASHBOARD ====================
  dashboard: router({
    stats: protectedProcedure.query(async ({ ctx }) => {
      return getDashboardStats(ctx.user.id);
    }),
    weeklyChart: protectedProcedure.query(async ({ ctx }) => {
      return getWeeklySessionsChart(ctx.user.id);
    }),
    statusChart: protectedProcedure.query(async ({ ctx }) => {
      return getSessionStatusChart(ctx.user.id);
    }),
    todaySessions: protectedProcedure.query(async ({ ctx }) => {
      return getTodaySessions(ctx.user.id);
    }),
  }),

  // ==================== PHOTO UPLOAD ====================
  photos: router({
    upload: protectedProcedure.input(z.object({
      clientId: z.number(),
      photoType: z.enum(["front", "back", "side_left", "side_right", "other"]).default("front"),
      date: z.string(),
      notes: z.string().optional(),
      fileBase64: z.string(),
      fileName: z.string(),
      mimeType: z.string().default("image/jpeg"),
    })).mutation(async ({ ctx, input }) => {
      const { fileBase64, fileName, mimeType, clientId, photoType, date, notes } = input;
      const buffer = Buffer.from(fileBase64, "base64");
      const key = `photos/${ctx.user.id}/${clientId}/${Date.now()}-${fileName}`;
      const { url } = await storagePut(key, buffer, mimeType);
      const id = await createProgressPhoto({
        trainerId: ctx.user.id,
        clientId,
        photoUrl: url,
        photoType,
        date: new Date(date) as any,
        notes,
      } as any);
      return { id, url };
    }),
    listAll: protectedProcedure.input(z.object({
      clientId: z.number().optional(),
    })).query(async ({ ctx, input }) => {
      if (input.clientId) {
        return getPhotosByClient(ctx.user.id, input.clientId);
      }
      return getPhotosByClient(ctx.user.id, 0); // all photos
    }),
    delete: protectedProcedure.input(z.object({ id: z.number() })).mutation(async ({ ctx, input }) => {
      await deleteProgressPhoto(input.id, ctx.user.id);
      return { success: true };
    }),
  }),

  // ==================== ADMIN ====================
  admin: router({
    stats: adminProcedure.query(async () => {
      return getAdminDashboardStats();
    }),
    trainers: adminProcedure.query(async () => {
      return getAllTrainers();
    }),
    updateTrainer: adminProcedure.input(z.object({
      id: z.number(),
      subscriptionPlan: z.enum(["free", "basic", "pro", "premium"]).optional(),
      subscriptionStatus: z.enum(["active", "inactive", "trial", "cancelled"]).optional(),
      maxClients: z.number().optional(),
    })).mutation(async ({ input }) => {
      const { id, ...data } = input;
      await updateUserProfile(id, data);
      return { success: true };
    }),
  }),
});

export type AppRouter = typeof appRouter;
