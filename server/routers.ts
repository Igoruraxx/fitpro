import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, adminProcedure, router } from "./_core/trpc";
import { authRouter } from "./routers/auth";
import { z } from "zod";
import {
  getClientsByTrainer, getClientById, createClient, updateClient, deleteClient, countClientsByTrainer,
  getAppointmentsByTrainer, getAppointmentById, createAppointment, updateAppointment, deleteAppointment,
  deleteAppointmentsByGroup, decrementClientSessions,
  getMeasurementsByClient, createMeasurement, deleteMeasurement,
  getPhotosByClient, createProgressPhoto, deleteProgressPhoto,
  getTransactionsByTrainer, getTransactionsByClient, createTransaction, updateTransaction, deleteTransaction, getFinancialSummary, getFinancialDashboard,
  markTransactionPaid, markTransactionPending, getOverdueClients, generateMonthlyCharges,
  updateUserProfile, getAllTrainers, getAdminDashboardStats,
  getDashboardStats, getWeeklySessionsChart, getSessionStatusChart, getTodaySessions,
  getBioimpedanceByClient, createBioimpedanceExam, updateBioimpedanceExam, deleteBioimpedanceExam,
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

  // ==================== BIOIMPEDANCE ====================
  bioimpedance: router({
    list: protectedProcedure.input(z.object({ clientId: z.number() })).query(async ({ ctx, input }) => {
      return getBioimpedanceByClient(ctx.user.id, input.clientId);
    }),
    create: protectedProcedure.input(z.object({
      clientId: z.number(),
      date: z.string(),
      weight: z.string().optional(),
      muscleMass: z.string().optional(),
      musclePct: z.string().optional(),
      bodyFatPct: z.string().optional(),
      visceralFat: z.string().optional(),
      perimetria: z.string().optional(),
      dobras: z.string().optional(),
      imageBase64: z.string().optional(),
      notes: z.string().optional(),
    })).mutation(async ({ ctx, input }) => {
      let imageUrl: string | undefined;
      if (input.imageBase64) {
        const base64Data = input.imageBase64.replace(/^data:image\/\w+;base64,/, '');
        const buffer = Buffer.from(base64Data, 'base64');
        const ext = input.imageBase64.startsWith('data:image/png') ? 'png' : 'jpg';
        const key = `bio/${ctx.user.id}/${input.clientId}/${Date.now()}.${ext}`;
        const { url } = await storagePut(key, buffer, `image/${ext}`);
        imageUrl = url;
      }
      const { imageBase64, ...rest } = input;
      return createBioimpedanceExam({ ...rest, trainerId: ctx.user.id, imageUrl });
    }),
    update: protectedProcedure.input(z.object({
      id: z.number(),
      date: z.string().optional(),
      weight: z.string().optional(),
      muscleMass: z.string().optional(),
      musclePct: z.string().optional(),
      bodyFatPct: z.string().optional(),
      visceralFat: z.string().optional(),
      perimetria: z.string().optional(),
      dobras: z.string().optional(),
      notes: z.string().optional(),
    })).mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      return updateBioimpedanceExam(id, ctx.user.id, data);
    }),
    delete: protectedProcedure.input(z.object({ id: z.number() })).mutation(async ({ ctx, input }) => {
      return deleteBioimpedanceExam(input.id, ctx.user.id);
    }),
  }),

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
      phone: z.string().optional(),
      birthDate: z.string().optional(),
      gender: z.enum(["male", "female", "other"]).optional(),
      photoUrl: z.string().optional(),
      status: z.enum(["active", "inactive", "trial"]).optional(),
      planType: z.enum(["monthly", "package", "consulting"]).optional(),
      // Monthly plan
      monthlyFee: z.string().optional(),
      paymentDay: z.number().optional(),
      // Package plan
      packageSessions: z.number().optional(),
      sessionsRemaining: z.number().optional(),
      packageValue: z.string().optional(),
      // Session schedule
      sessionsPerWeek: z.number().optional(),
      sessionDays: z.string().optional(),
      sessionTime: z.string().optional(),
      sessionTimesPerDay: z.string().optional(), // JSON: {"1":"07:00","3":"08:00"}
      sessionDuration: z.number().optional(),
      // Prepaid
      prepaidValue: z.string().optional(),
      prepaidDueDate: z.string().optional(),
    })).mutation(async ({ ctx, input }) => {
      const count = await countClientsByTrainer(ctx.user.id);
      if (count >= ctx.user.maxClients) {
        throw new Error("Limite de clientes atingido. Faça upgrade do seu plano.");
      }
      const id = await createClient({ ...input, trainerId: ctx.user.id } as any);
      
      if (id && input.planType === 'package' && input.packageSessions && input.sessionDays && input.sessionsPerWeek) {
        const { generatePackageAppointments } = await import('./db');
        await generatePackageAppointments(
          id as number,
          ctx.user.id,
          input.packageSessions as number,
          input.sessionsPerWeek as number,
          input.sessionDays as string,
          input.sessionTime || null,
          input.sessionTimesPerDay || null,
          (input.sessionDuration || 60) as number
        );
      }
      
      return { id };
    }),
    update: protectedProcedure.input(z.object({
      id: z.number(),
      name: z.string().optional(),
      phone: z.string().optional(),
      birthDate: z.string().optional(),
      gender: z.enum(["male", "female", "other"]).optional(),
      photoUrl: z.string().optional(),
      status: z.enum(["active", "inactive", "trial"]).optional(),
      planType: z.enum(["monthly", "package", "consulting"]).optional(),
      // Monthly plan
      monthlyFee: z.string().optional(),
      paymentDay: z.number().optional(),
      // Package plan
      packageSessions: z.number().optional(),
      sessionsRemaining: z.number().optional(),
      packageValue: z.string().optional(),
      // Session schedule
      sessionsPerWeek: z.number().optional(),
      sessionDays: z.string().optional(),
      sessionTime: z.string().optional(),
      sessionTimesPerDay: z.string().optional(), // JSON: {"1":"07:00","3":"08:00"}
      sessionDuration: z.number().optional(),
      // Prepaid
      prepaidValue: z.string().optional(),
      prepaidDueDate: z.string().optional(),
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
    renewPackage: protectedProcedure.input(z.object({
      clientId: z.number(),
    })).mutation(async ({ ctx, input }) => {
      const client = await getClientById(input.clientId, ctx.user.id);
      if (!client) throw new Error("Cliente nao encontrado");
      if (client.planType !== "package") throw new Error("Cliente nao possui plano de pacote");
      if ((client.sessionsRemaining ?? 0) !== 0) throw new Error("Pacote ainda possui sessoes restantes");
      
      const sessionsUsed = (client.packageSessions ?? 0) - (client.sessionsRemaining ?? 0);
      
      await updateClient(input.clientId, ctx.user.id, {
        sessionsRemaining: client.packageSessions,
      } as any);
      
      const { recordPackageRenewal, generatePackageAppointments } = await import('./db');
      await recordPackageRenewal(input.clientId, ctx.user.id, sessionsUsed, client.packageSessions ?? 0);
      
      const now = new Date();
      const dateStr = now.toISOString().split('T')[0];
      await createTransaction({
        trainerId: ctx.user.id,
        clientId: input.clientId,
        type: 'income',
        date: dateStr,
        category: 'Pacote de Sessoes',
        amount: client.packageValue || '0',
        status: 'pending',
        createdAt: now,
        updatedAt: now,
      } as any);
      
      if (client.packageSessions && client.sessionDays && client.sessionsPerWeek) {
        await generatePackageAppointments(
          input.clientId,
          ctx.user.id,
          client.packageSessions as number,
          client.sessionsPerWeek as number,
          client.sessionDays as string,
          client.sessionTime || null,
          client.sessionTimesPerDay || null,
          (client.sessionDuration || 60) as number
        );
      }
      
      return { success: true };
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
    listByClient: protectedProcedure.input(z.object({ clientId: z.number() })).query(async ({ ctx, input }) => {
      // Return all appointments for a specific client (last 90 days + future)
      const past = new Date(); past.setDate(past.getDate() - 90);
      const future = new Date(); future.setDate(future.getDate() + 60);
      const startDate = past.toISOString().split('T')[0];
      const endDate = future.toISOString().split('T')[0];
      const all = await getAppointmentsByTrainer(ctx.user.id, startDate, endDate);
      return all.filter((a: any) => a.clientId === input.clientId);
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
      muscleGroups: z.string().optional(),
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
      muscleGroups: z.string().optional(),
    })).mutation(async ({ ctx, input }) => {
      const { id, ...rest } = input;
      // Get previous status to detect transition to 'completed'
      const prevAppt = await getAppointmentById(id, ctx.user.id);
      // Pass date as string directly to avoid timezone conversion issues
      await updateAppointment(id, ctx.user.id, rest as any);
      // Decrement sessionsRemaining for package-plan clients when session is completed
      if (input.status === 'completed' && prevAppt?.status !== 'completed' && prevAppt?.clientId) {
        const newCount = await decrementClientSessions(prevAppt.clientId, ctx.user.id);
        
        // Get client info to check if package is at 80% completion
        if (newCount !== null && newCount !== undefined) {
          const client = await getClientById(prevAppt.clientId, ctx.user.id);
          if (client && client.planType === 'package' && client.packageSessions) {
            const completedSessions = client.packageSessions - newCount;
            const completionPercentage = (completedSessions / client.packageSessions) * 100;
            
            // Notify when reaching 80% completion
            if (completionPercentage >= 80 && completionPercentage < 85) {
              await notifyOwner({
                title: '⚠️ Pacote próximo de finalizar',
                content: `O cliente ${client.name} atingiu 80% de conclusão do pacote. ${newCount} sessão(ões) restante(s) de ${client.packageSessions}.`
              });
            }
          }
        }
      }
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
    deleteFutureByClient: protectedProcedure.input(z.object({
      clientId: z.number(),
    })).mutation(async ({ ctx, input }) => {
      // Get all future appointments for this client
      const today = new Date().toISOString().split('T')[0];
      const future = new Date(); future.setDate(future.getDate() + 365);
      const endDate = future.toISOString().split('T')[0];
      
      const allAppts = await getAppointmentsByTrainer(ctx.user.id, today, endDate);
      const futureAppts = allAppts.filter((a: any) => 
        a.clientId === input.clientId && 
        a.status === 'scheduled' && 
        a.date >= today
      );
      
      // Delete each appointment
      for (const appt of futureAppts) {
        await deleteAppointment(appt.id, ctx.user.id);
      }
      
      return { success: true, deleted: futureAppts.length };
    }),
    deleteAllByClient: protectedProcedure.input(z.object({
      clientId: z.number(),
    })).mutation(async ({ ctx, input }) => {
      // Get all appointments for this client (past and future)
      const past = new Date(); past.setDate(past.getDate() - 365);
      const future = new Date(); future.setDate(future.getDate() + 365);
      const startDate = past.toISOString().split('T')[0];
      const endDate = future.toISOString().split('T')[0];
      
      const allAppts = await getAppointmentsByTrainer(ctx.user.id, startDate, endDate);
      const clientAppts = allAppts.filter((a: any) => a.clientId === input.clientId);
      
      // Delete each appointment
      for (const appt of clientAppts) {
        await deleteAppointment(appt.id, ctx.user.id);
      }
      
      return { success: true, deleted: clientAppts.length };
    }),
    // Get pending (scheduled) sessions for a specific client
    pendingByClient: protectedProcedure.input(z.object({ clientId: z.number() })).query(async ({ ctx, input }) => {
      const today = new Date().toISOString().split('T')[0];
      const future = new Date(); future.setDate(future.getDate() + 365);
      const endDate = future.toISOString().split('T')[0];
      const all = await getAppointmentsByTrainer(ctx.user.id, today, endDate);
      return all.filter((a: any) => a.clientId === input.clientId && a.status === 'scheduled');
    }),
    // Get all pending (scheduled) sessions grouped by client
    pendingGrouped: protectedProcedure.query(async ({ ctx }) => {
      const today = new Date().toISOString().split('T')[0];
      const future = new Date(); future.setDate(future.getDate() + 365);
      const endDate = future.toISOString().split('T')[0];
      const all = await getAppointmentsByTrainer(ctx.user.id, today, endDate);
      const scheduled = all.filter((a: any) => a.status === 'scheduled');
      // Group by clientId
      const grouped: Record<number, number> = {};
      for (const a of scheduled) {
        if (a.clientId) {
          grouped[a.clientId] = (grouped[a.clientId] || 0) + 1;
        }
      }
      return grouped;
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
      muscleGroups: z.string().optional(),
      recurrenceType: z.enum(["daily", "weekly", "biweekly", "monthly"]),
      recurrenceDays: z.string().optional(), // "1,3,5" for Mon,Wed,Fri
      timesPerDay: z.string().optional(), // JSON: {"1":"07:00","3":"08:00"}
    })).mutation(async ({ ctx, input }) => {
      const groupId = nanoid();
      const dates = generateRecurringDates(
        input.startDate,
        input.recurrenceType,
        input.recurrenceDays,
        input.endDate,
        input.occurrences ?? 8
      );
      // Parse per-day times if provided
      const timesPerDay: Record<string, string> = input.timesPerDay
        ? JSON.parse(input.timesPerDay)
        : {};
      const ids: number[] = [];
      for (const date of dates) {
        // Get weekday (0=Sun..6=Sat) to look up per-day time
        const d = new Date(date + "T12:00:00");
        const weekday = String(d.getDay());
        const startTime = timesPerDay[weekday] ?? input.startTime;
        const id = await createAppointment({
          trainerId: ctx.user.id,
          clientId: input.clientId ?? null,
          guestName: input.guestName ?? null,
          date: date as any,
          startTime,
          duration: input.duration,
          notes: input.notes ?? null,
          muscleGroups: input.muscleGroups ?? null,
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
    listByClient: protectedProcedure.input(z.object({ clientId: z.number() })).query(async ({ ctx, input }) => {
      return getTransactionsByClient(ctx.user.id, input.clientId);
    }),
    create: protectedProcedure.input(z.object({
      clientId: z.number().optional(),
      type: z.enum(["income", "expense"]),
      category: z.string(),
      description: z.string().optional(),
      amount: z.string(),
      date: z.string(),
      dueDate: z.string().optional(),
      status: z.enum(["pending", "paid", "overdue", "cancelled"]).default("pending"),
    })).mutation(async ({ ctx, input }) => {
      const id = await createTransaction({ ...input, trainerId: ctx.user.id } as any);
      return { id };
    }),
    markPaid: protectedProcedure.input(z.object({ id: z.number() })).mutation(async ({ ctx, input }) => {
      const tx = await markTransactionPaid(input.id, ctx.user.id);
      if (tx) {
        notifyOwner({
          title: `✅ Pagamento confirmado`,
          content: `${tx.description || tx.category} — R$ ${parseFloat(tx.amount as string).toFixed(2)} marcado como pago.`,
        }).catch(() => {});
      }
      return { success: true };
    }),
    markPending: protectedProcedure.input(z.object({ id: z.number() })).mutation(async ({ ctx, input }) => {
      const tx = await markTransactionPending(input.id, ctx.user.id);
      if (tx) {
        notifyOwner({
          title: `↩️ Baixa desfeita`,
          content: `${tx.description || tx.category} — R$ ${parseFloat(tx.amount as string).toFixed(2)} revertido para pendente.`,
        }).catch(() => {});
      }
      return { success: true };
    }),
    overdueClients: protectedProcedure.query(async ({ ctx }) => {
      return getOverdueClients(ctx.user.id);
    }),
    generateMonthlyCharges: protectedProcedure.input(z.object({
      month: z.number(),
      year: z.number(),
    })).mutation(async ({ ctx, input }) => {
      const count = await generateMonthlyCharges(ctx.user.id, input.month, input.year);
      if (count > 0) {
        const monthNames = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
        notifyOwner({
          title: `💰 ${count} cobrança${count !== 1 ? 's' : ''} gerada${count !== 1 ? 's' : ''}`,
          content: `Cobranças de ${monthNames[input.month - 1]}/${input.year} geradas automaticamente para ${count} aluno${count !== 1 ? 's' : ''} ativos.`,
        }).catch(() => {});
      }
      return { count };
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
    dashboard: protectedProcedure.query(async ({ ctx }) => {
      return getFinancialDashboard(ctx.user.id);
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
        date: date,
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
