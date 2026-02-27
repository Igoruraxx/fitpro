import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, adminProcedure, router } from "./_core/trpc";
import { z } from "zod";
import {
  getClientsByTrainer, getClientById, createClient, updateClient, deleteClient, countClientsByTrainer,
  getAppointmentsByTrainer, getAppointmentById, createAppointment, updateAppointment, deleteAppointment,
  getMeasurementsByClient, createMeasurement, deleteMeasurement,
  getPhotosByClient, createProgressPhoto, deleteProgressPhoto,
  getTransactionsByTrainer, createTransaction, updateTransaction, deleteTransaction, getFinancialSummary,
  updateUserProfile, getAllTrainers, getAdminDashboardStats,
} from "./db";
import { notifyOwner } from "./_core/notification";

export const appRouter = router({
  system: systemRouter,

  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),

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
      const { id, date, ...rest } = input;
      const data: Record<string, unknown> = { ...rest };
      if (date) data.date = new Date(date);
      await updateAppointment(id, ctx.user.id, data as any);
      return { success: true };
    }),
    delete: protectedProcedure.input(z.object({ id: z.number() })).mutation(async ({ ctx, input }) => {
      await deleteAppointment(input.id, ctx.user.id);
      return { success: true };
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
