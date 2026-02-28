import { trpc } from "@/lib/trpc";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Repeat2 } from "lucide-react";
import { useState, useMemo, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  ChevronLeft, ChevronRight, Plus, Clock, List, Grid3X3, CalendarDays,
  Trash2, CheckCircle2, XCircle, UserX, Calendar, MessageCircle, GripVertical,
  Dumbbell,
} from "lucide-react";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import {
  format, addDays, subDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth,
  eachDayOfInterval, isSameDay, isToday, addWeeks, subWeeks, addMonths, subMonths,
  parseISO,
} from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  DndContext, DragEndEvent, DragOverlay, DragStartEvent,
  PointerSensor, MouseSensor, TouchSensor, useSensor, useSensors, closestCenter,
} from "@dnd-kit/core";
import { useDraggable, useDroppable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { useAuth } from "@/_core/hooks/useAuth";

type ViewMode = "day" | "list" | "week" | "month";

const timeSlots = Array.from({ length: 16 }, (_, i) => {
  const h = i + 6;
  return `${String(h).padStart(2, "0")}:00`;
});

const durations = [30, 45, 60, 90, 120];

// ─── Muscle Groups ──────────────────────────────────────────────────────────

const MUSCLE_GROUPS = [
  { id: "chest",       label: "Peito",       emoji: "🫁" },
  { id: "back",        label: "Costas",      emoji: "🔙" },
  { id: "shoulders",   label: "Ombros",      emoji: "🏋️" },
  { id: "biceps",      label: "Bíceps",      emoji: "💪" },
  { id: "triceps",     label: "Tríceps",     emoji: "🦾" },
  { id: "forearms",    label: "Antebraço",   emoji: "🤜" },
  { id: "abs",         label: "Abdômen",     emoji: "🎯" },
  { id: "quads",       label: "Quadríceps",  emoji: "🦵" },
  { id: "hamstrings",  label: "Posterior",    emoji: "🦿" },
  { id: "glutes",      label: "Glúteos",     emoji: "🍑" },
  { id: "calves",      label: "Panturrilha", emoji: "🦶" },
  { id: "cardio",      label: "Cardio",      emoji: "❤️" },
  { id: "functional",  label: "Funcional",   emoji: "⚡" },
];

function getMuscleGroupLabel(id: string) {
  return MUSCLE_GROUPS.find(m => m.id === id);
}

function MuscleGroupBadges({ groups, compact = false }: { groups: string; compact?: boolean }) {
  if (!groups) return null;
  const ids = groups.split(",").filter(Boolean);
  if (ids.length === 0) return null;

  if (compact) {
    // Show only emojis in a tight row
    return (
      <div className="flex gap-0.5 flex-wrap">
        {ids.slice(0, 4).map(id => {
          const mg = getMuscleGroupLabel(id);
          return mg ? (
            <span key={id} className="text-[10px]" title={mg.label}>{mg.emoji}</span>
          ) : null;
        })}
        {ids.length > 4 && <span className="text-[10px] text-muted-foreground">+{ids.length - 4}</span>}
      </div>
    );
  }

  return (
    <div className="flex gap-1 flex-wrap">
      {ids.map(id => {
        const mg = getMuscleGroupLabel(id);
        return mg ? (
          <span
            key={id}
            className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-primary/10 text-[10px] font-medium text-primary"
            title={mg.label}
          >
            {mg.emoji} {mg.label}
          </span>
        ) : null;
      })}
    </div>
  );
}

// ─── Helpers ────────────────────────────────────────────────────────────────

/** Parse date string safely — avoids timezone issues with new Date("YYYY-MM-DD") */
function safeParseDate(dateStr: string): Date {
  // parseISO treats "YYYY-MM-DD" as local date, not UTC
  return parseISO(dateStr);
}

function getStatusStyle(status: string) {
  switch (status) {
    case "completed": return "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800";
    case "cancelled": return "bg-red-50 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-400 dark:border-red-800";
    case "no_show":   return "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800";
    default:          return "bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-400 dark:border-indigo-800";
  }
}

const STATUS_LABELS: Record<string, string> = {
  scheduled: "Agendado", completed: "Concluído",
  cancelled: "Cancelado", no_show: "Faltou",
};

const STATUS_OPTIONS = [
  { value: "scheduled",  label: "Agendado",  icon: Calendar,      color: "text-primary" },
  { value: "completed",  label: "Concluído", icon: CheckCircle2,  color: "text-green-400" },
  { value: "cancelled",  label: "Cancelado", icon: XCircle,       color: "text-red-400" },
  { value: "no_show",    label: "Faltou",    icon: UserX,         color: "text-yellow-400" },
];

function buildWhatsAppUrl(phone: string, clientName: string, date: Date, time: string) {
  const dateStr = format(date, "d 'de' MMMM", { locale: ptBR });
  const msg = encodeURIComponent(
    `Olá ${clientName}! 👋 Passando para confirmar sua sessão de treino no dia ${dateStr} às ${time}. Confirma? 💪`
  );
  const clean = phone.replace(/\D/g, "");
  return `https://wa.me/${clean.startsWith("55") ? clean : "55" + clean}?text=${msg}`;
}

// ─── Draggable appointment card ──────────────────────────────────────────────

function DraggableApptCard({
  appt, clientName, onEdit, onStatusChange, clientPhone, apptDate,
  compact = false,
}: {
  appt: any; clientName: string; onEdit: () => void;
  onStatusChange: (id: number, status: string) => void;
  clientPhone?: string; apptDate: Date; compact?: boolean;
}) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, isDragging } = useDraggable({
    id: `appt-${appt.id}`,
    data: { appt },
  });

  const style = { transform: CSS.Translate.toString(transform), opacity: isDragging ? 0.3 : 1 };
  const isCompleted = appt.status === "completed";

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group relative rounded-lg border text-sm transition-all select-none ${getStatusStyle(appt.status)} ${
        isCompleted ? "ring-1 ring-green-500/30" : ""
      }`}
    >
      {/* Drag handle — only this element initiates drag */}
      <div
        ref={setActivatorNodeRef}
        {...listeners}
        {...attributes}
        className="absolute left-0 top-0 bottom-0 w-5 flex items-center justify-center cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-50 hover:!opacity-100 transition-opacity z-10 rounded-l-lg hover:bg-white/10"
        title="Arrastar"
      >
        <GripVertical className="h-3.5 w-3.5" />
      </div>

      {/* Main content — clickable to edit */}
      <button
        onClick={onEdit}
        className={`w-full text-left ${compact ? "pl-5 pr-8 py-1.5" : "pl-5 pr-8 py-2"}`}
      >
        <div className={`font-medium truncate ${compact ? "text-xs" : "text-sm"}`}>{clientName}</div>
        {!compact && (
          <>
            <div className="text-xs opacity-70 flex items-center gap-1 mt-0.5">
              <Clock className="h-2.5 w-2.5" />
              {appt.startTime} · {appt.duration}min
            </div>
            {appt.muscleGroups && (
              <div className="mt-1">
                <MuscleGroupBadges groups={appt.muscleGroups} compact={false} />
              </div>
            )}
          </>
        )}
        {compact && (
          <>
            <div className="text-[10px] opacity-70">{appt.startTime}</div>
            {appt.muscleGroups && <MuscleGroupBadges groups={appt.muscleGroups} compact={true} />}
          </>
        )}
      </button>

      {/* Action buttons */}
      <div className="absolute right-1 top-1/2 -translate-y-1/2 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
        {!isCompleted && clientPhone && (
          <a
            href={buildWhatsAppUrl(clientPhone, clientName, apptDate, appt.startTime)}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            title="Confirmar via WhatsApp"
            className="h-6 w-6 flex items-center justify-center rounded text-green-400 hover:bg-green-500/20 transition-colors"
          >
            <MessageCircle className="h-3.5 w-3.5" />
          </a>
        )}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              onClick={(e) => e.stopPropagation()}
              className="h-6 w-6 flex items-center justify-center rounded hover:bg-white/10 transition-colors"
              title="Alterar status"
            >
              {isCompleted
                ? <CheckCircle2 className="h-3.5 w-3.5 text-green-400" />
                : <Calendar className="h-3.5 w-3.5 opacity-60" />
              }
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-40">
            {STATUS_OPTIONS.map((opt) => (
              <DropdownMenuItem
                key={opt.value}
                onClick={(e) => { e.stopPropagation(); onStatusChange(appt.id, opt.value); }}
                className={`cursor-pointer ${opt.color}`}
              >
                <opt.icon className="h-3.5 w-3.5 mr-2" />
                {opt.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}

// WhatsApp button standalone
function WhatsAppBtn({ phone, name, date, time }: { phone: string; name: string; date: Date; time: string }) {
  return (
    <a
      href={buildWhatsAppUrl(phone, name, date, time)}
      target="_blank"
      rel="noopener noreferrer"
      onClick={(e) => e.stopPropagation()}
      title="Confirmar via WhatsApp"
      className="h-7 w-7 flex items-center justify-center rounded-md bg-green-500/20 text-green-400 hover:bg-green-500/30 transition-colors shrink-0"
    >
      <MessageCircle className="h-4 w-4" />
    </a>
  );
}

// ─── Droppable time slot ─────────────────────────────────────────────────────

function DroppableSlot({
  id, children, className,
}: { id: string; children: React.ReactNode; className?: string }) {
  const { setNodeRef, isOver } = useDroppable({ id });
  return (
    <div
      ref={setNodeRef}
      className={`${className ?? ""} transition-colors ${isOver ? "bg-primary/10 ring-1 ring-primary/40 rounded-lg" : ""}`}
    >
      {children}
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────

export default function Agenda() {
  const { user } = useAuth();
  const [viewMode, setViewMode] = useState<ViewMode>("day");
  const [currentDate, setCurrentDate] = useState(() => new Date());
  const [showModal, setShowModal] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [editingAppt, setEditingAppt] = useState<any>(null);
  const [isGuest, setIsGuest] = useState(false);
  const [activeAppt, setActiveAppt] = useState<any>(null);

  // Form state
  const [formClientId, setFormClientId] = useState<string>("");
  const [formGuestName, setFormGuestName] = useState("");
  const [formTime, setFormTime] = useState("08:00");
  const [formDuration, setFormDuration] = useState(60);
  const [formNotes, setFormNotes] = useState("");
  const [formStatus, setFormStatus] = useState("scheduled");
  const [formMuscleGroups, setFormMuscleGroups] = useState<string[]>([]);

  // Recurrence state
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurrenceType, setRecurrenceType] = useState<"daily"|"weekly"|"biweekly"|"monthly">("weekly");
  const [recurrenceDays, setRecurrenceDays] = useState<number[]>([]);
  const [recurrenceEndDate, setRecurrenceEndDate] = useState("");
  const [recurrenceOccurrences, setRecurrenceOccurrences] = useState(8);
  const [recurrenceMode, setRecurrenceMode] = useState<"occurrences"|"endDate">("occurrences");
  const [showDeleteGroupDialog, setShowDeleteGroupDialog] = useState(false);
  const [pendingDeleteAppt, setPendingDeleteAppt] = useState<any>(null);

  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 5 } })
  );

  const { data: clientsList = [] } = trpc.clients.list.useQuery(undefined, { enabled: !!user });

  const dateRange = useMemo(() => {
    if (viewMode === "day") {
      return { start: format(currentDate, "yyyy-MM-dd"), end: format(currentDate, "yyyy-MM-dd") };
    }
    if (viewMode === "week" || viewMode === "list") {
      const s = startOfWeek(currentDate, { weekStartsOn: 1 });
      const e = endOfWeek(currentDate, { weekStartsOn: 1 });
      return { start: format(s, "yyyy-MM-dd"), end: format(e, "yyyy-MM-dd") };
    }
    const s = startOfMonth(currentDate);
    const e = endOfMonth(currentDate);
    return { start: format(s, "yyyy-MM-dd"), end: format(e, "yyyy-MM-dd") };
  }, [currentDate, viewMode]);

  const { data: appointments = [], refetch } = trpc.appointments.list.useQuery(
    {
      startDate: dateRange.start,
      endDate: dateRange.end,
    },
    { enabled: !!user }
  );

  const createMutation = trpc.appointments.create.useMutation({
    onSuccess: () => { toast.success("Agendamento criado!"); refetch(); setShowModal(false); },
    onError: (e) => toast.error(e.message),
  });

  const createRecurringMutation = trpc.appointments.createRecurring.useMutation({
    onSuccess: (data) => {
      toast.success(`${data.count} sessões recorrentes criadas! 🔁`);
      refetch();
      setShowModal(false);
    },
    onError: (e) => toast.error(e.message),
  });

  const updateMutation = trpc.appointments.update.useMutation({
    onSuccess: () => { toast.success("Salvo!"); refetch(); setShowModal(false); },
    onError: (e) => toast.error(e.message),
  });

  const deleteMutation = trpc.appointments.delete.useMutation({
    onSuccess: () => { toast.success("Excluído!"); refetch(); setShowModal(false); },
    onError: (e) => toast.error(e.message),
  });

  const handleDeleteClick = (appt: any) => {
    if (appt.recurrenceGroupId) {
      setPendingDeleteAppt(appt);
      setShowDeleteGroupDialog(true);
    } else {
      deleteMutation.mutate({ id: appt.id });
    }
  };

  const navigate = (dir: number) => {
    if (viewMode === "day") setCurrentDate(d => dir > 0 ? addDays(d, 1) : subDays(d, 1));
    else if (viewMode === "week" || viewMode === "list") setCurrentDate(d => dir > 0 ? addWeeks(d, 1) : subWeeks(d, 1));
    else setCurrentDate(d => dir > 0 ? addMonths(d, 1) : subMonths(d, 1));
  };

  const toggleMuscleGroup = (id: string) => {
    setFormMuscleGroups(prev =>
      prev.includes(id) ? prev.filter(g => g !== id) : [...prev, id]
    );
  };

  const openNewAppt = (date?: Date, time?: string) => {
    setEditingAppt(null);
    setSelectedDate(date || currentDate);
    setFormClientId("");
    setFormGuestName("");
    setFormTime(time || "08:00");
    setFormDuration(60);
    setFormNotes("");
    setFormStatus("scheduled");
    setFormMuscleGroups([]);
    setIsGuest(false);
    setIsRecurring(false);
    setRecurrenceType("weekly");
    setRecurrenceDays([]);
    setRecurrenceEndDate("");
    setRecurrenceOccurrences(8);
    setRecurrenceMode("occurrences");
    setShowModal(true);
  };

  const openEditAppt = (appt: any) => {
    setEditingAppt(appt);
    setSelectedDate(safeParseDate(appt.date));
    setFormClientId(appt.clientId ? String(appt.clientId) : "");
    setFormGuestName(appt.guestName || "");
    setFormTime(appt.startTime);
    setFormDuration(appt.duration);
    setFormNotes(appt.notes || "");
    setFormStatus(appt.status || "scheduled");
    setFormMuscleGroups(appt.muscleGroups ? appt.muscleGroups.split(",").filter(Boolean) : []);
    setIsGuest(!!appt.guestName && !appt.clientId);
    setShowModal(true);
  };

  const handleSubmit = () => {
    if (!selectedDate) return;
    const dateStr = format(selectedDate, "yyyy-MM-dd");
    const clientId = (!isGuest && formClientId && formClientId !== "none") ? parseInt(formClientId) : undefined;
    const guestName = isGuest ? formGuestName : undefined;
    const muscleGroups = formMuscleGroups.length > 0 ? formMuscleGroups.join(",") : undefined;

    if (editingAppt) {
      updateMutation.mutate({
        id: editingAppt.id,
        date: dateStr,
        startTime: formTime,
        duration: formDuration,
        notes: formNotes || undefined,
        status: formStatus as any,
        clientId,
        guestName,
        muscleGroups,
      });
      return;
    }

    if (isRecurring) {
      createRecurringMutation.mutate({
        startDate: dateStr,
        startTime: formTime,
        duration: formDuration,
        notes: formNotes || undefined,
        clientId,
        guestName,
        muscleGroups,
        recurrenceType,
        recurrenceDays: recurrenceDays.length > 0 ? recurrenceDays.join(",") : undefined,
        endDate: recurrenceMode === "endDate" && recurrenceEndDate ? recurrenceEndDate : undefined,
        occurrences: recurrenceMode === "occurrences" ? recurrenceOccurrences : 52,
      });
    } else {
      createMutation.mutate({
        date: dateStr,
        startTime: formTime,
        duration: formDuration,
        notes: formNotes || undefined,
        clientId,
        guestName,
        muscleGroups,
      });
    }
  };

  const markCompleted = () => {
    if (!editingAppt) return;
    updateMutation.mutate({ id: editingAppt.id, status: "completed" }, {
      onSuccess: () => { toast.success("Sessão concluída! ✅"); refetch(); setShowModal(false); },
    });
  };

  const quickUpdateStatus = useCallback((apptId: number, newStatus: string) => {
    updateMutation.mutate({ id: apptId, status: newStatus as any }, {
      onSuccess: () => { toast.success("Status atualizado!"); refetch(); },
    });
  }, [updateMutation, refetch]);

  const getClientInfo = (appt: any): { name: string; phone?: string } => {
    if (appt.guestName) return { name: appt.guestName + " (convidado)" };
    if (appt.clientId) {
      const c = clientsList.find((cl: any) => cl.id === appt.clientId);
      return { name: c?.name || "Cliente", phone: c?.phone ?? undefined };
    }
    return { name: "Sem cliente" };
  };

  // ─── Drag and Drop handlers ────────────────────────────────────────────────

  const handleDragStart = (event: DragStartEvent) => {
    const { data } = event.active;
    setActiveAppt(data.current?.appt ?? null);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveAppt(null);
    const { active, over } = event;
    if (!over) return;

    const apptId = parseInt(String(active.id).replace("appt-", ""));
    const overId = String(over.id);

    let newDate: string | undefined;
    let newTime: string | undefined;

    if (overId.startsWith("slot-")) {
      // format: "slot-YYYY-MM-DD-HH:MM"
      const raw = overId.replace("slot-", "");
      // Extract time (last 5 chars: HH:MM) and date (everything before)
      newTime = raw.slice(-5);
      newDate = raw.slice(0, -6); // remove "-HH:MM"
    } else if (overId.startsWith("day-")) {
      newDate = overId.replace("day-", "");
    }

    if (!newDate && !newTime) return;

    const appt = (appointments as any[]).find((a: any) => a.id === apptId);
    if (!appt) return;

    const currentApptDate = typeof appt.date === "string" ? appt.date : format(safeParseDate(appt.date), "yyyy-MM-dd");
    const finalDate = newDate || currentApptDate;
    const finalTime = newTime || appt.startTime;

    if (finalDate === currentApptDate && finalTime === appt.startTime) return;

    updateMutation.mutate(
      { id: apptId, date: finalDate, startTime: finalTime },
      { onSuccess: () => { toast.success("Horário atualizado!"); refetch(); } }
    );
  };

  const headerLabel = useMemo(() => {
    if (viewMode === "day") return format(currentDate, "EEEE, d 'de' MMMM yyyy", { locale: ptBR });
    if (viewMode === "week" || viewMode === "list") {
      const s = startOfWeek(currentDate, { weekStartsOn: 1 });
      const e = endOfWeek(currentDate, { weekStartsOn: 1 });
      return `${format(s, "d MMM", { locale: ptBR })} – ${format(e, "d MMM yyyy", { locale: ptBR })}`;
    }
    return format(currentDate, "MMMM 'de' yyyy", { locale: ptBR });
  }, [currentDate, viewMode]);

  // ─── VIEW: DIA ─────────────────────────────────────────────────────────────

  const renderDayView = () => {
    const dayAppts = (appointments as any[]).filter((a: any) =>
      isSameDay(safeParseDate(a.date), currentDate)
    );

    return (
      <div className="space-y-0">
        {timeSlots.map((slot, index) => {
          const slotAppts = dayAppts.filter((a: any) => a.startTime === slot);
          return (
            <div key={slot}>
              <DroppableSlot id={`slot-${format(currentDate, "yyyy-MM-dd")}-${slot}`}>
                <div className="flex gap-3 min-h-[3.5rem] group">
                  <span className="text-xs text-muted-foreground w-12 pt-2 shrink-0 select-none">{slot}</span>
                  <div className="flex-1 border-t border-border/30 pt-1 space-y-1">
                  {slotAppts.map((appt: any) => {
                    const { name, phone } = getClientInfo(appt);
                    return (
                      <DraggableApptCard
                        key={appt.id}
                        appt={appt}
                        clientName={name}
                        clientPhone={phone}
                        apptDate={currentDate}
                        onEdit={() => openEditAppt(appt)}
                        onStatusChange={quickUpdateStatus}
                      />
                    );
                  })}
                  {slotAppts.length === 0 && (
                    <button
                      onClick={() => openNewAppt(currentDate, slot)}
                      className="w-full h-8 rounded-lg border border-dashed border-border/20 opacity-0 group-hover:opacity-100 transition-opacity text-xs text-muted-foreground hover:border-primary/40 hover:text-primary"
                    >
                      + Agendar
                    </button>
                  )}
                </div>
              </div>
            </DroppableSlot>
            {index < timeSlots.length - 1 && <div className="h-0.5 bg-orange-500/30"></div>}
            </div>
          );
        })}
      </div>
    );
  };

  // ─── VIEW: LISTA ───────────────────────────────────────────────────────────

  const renderListView = () => {
    const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
    const days = eachDayOfInterval({ start: weekStart, end: addDays(weekStart, 6) });

    return (
      <div className="space-y-3">
        {days.map((day) => {
          const dayAppts = (appointments as any[])
            .filter((a: any) => isSameDay(safeParseDate(a.date), day))
            .sort((a: any, b: any) => a.startTime.localeCompare(b.startTime));
          const today = isToday(day);

          return (
            <DroppableSlot key={day.toISOString()} id={`day-${format(day, "yyyy-MM-dd")}`}>
              <div className={`rounded-xl border ${today ? "border-primary/50 bg-primary/5" : "border-border"} overflow-hidden`}>
                <div className="flex items-center justify-between px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-sm font-bold ${
                      today ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"
                    }`}>
                      {format(day, "d")}
                    </div>
                    <div>
                      <div className="font-semibold capitalize">
                        {format(day, "EEEE", { locale: ptBR })}
                        {today && <span className="ml-2 text-xs text-primary font-normal">Hoje</span>}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {format(day, "d 'de' MMMM", { locale: ptBR })}
                      </div>
                    </div>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => openNewAppt(day)} className="text-primary">
                    Adicionar <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>

                <div className="px-4 pb-3">
                  {dayAppts.length === 0 ? (
                    <p className="text-sm text-muted-foreground italic py-2">Nenhum atendimento agendado</p>
                  ) : (
                    <div className="space-y-2">
                      {dayAppts.map((appt: any) => {
                        const { name, phone } = getClientInfo(appt);
                        return (
                          <DraggableApptCard
                            key={appt.id}
                            appt={appt}
                            clientName={name}
                            clientPhone={phone}
                            apptDate={day}
                            onEdit={() => openEditAppt(appt)}
                            onStatusChange={quickUpdateStatus}
                          />
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </DroppableSlot>
          );
        })}
      </div>
    );
  };

  // ─── VIEW: MÊS ─────────────────────────────────────────────────────────────

  const renderMonthView = () => {
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(currentDate);
    const calStart = startOfWeek(monthStart, { weekStartsOn: 1 });
    const calEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
    const days = eachDayOfInterval({ start: calStart, end: calEnd });

    const totalAppts = (appointments as any[]).length;
    const withAppts = new Set((appointments as any[]).map((a: any) => format(safeParseDate(a.date), "yyyy-MM-dd"))).size;
    const freeDays = eachDayOfInterval({ start: monthStart, end: monthEnd }).length - withAppts;

    return (
      <div className="space-y-4">
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "Atendimentos", value: totalAppts, color: "text-primary" },
            { label: "Com agenda", value: withAppts, color: "text-blue-400" },
            { label: "Dias livres", value: freeDays, color: "text-muted-foreground" },
          ].map(({ label, value, color }) => (
            <div key={label} className="rounded-xl border border-border bg-card p-3 text-center">
              <div className={`text-2xl font-bold ${color}`}>{value}</div>
              <div className="text-xs text-muted-foreground">{label}</div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1">
          {["SEG", "TER", "QUA", "QUI", "SEX", "SÁB", "DOM"].map((d) => (
            <div key={d} className="text-center text-xs font-medium text-muted-foreground py-2">{d}</div>
          ))}
          {days.map((day) => {
            const dayStr = format(day, "yyyy-MM-dd");
            const dayAppts = (appointments as any[]).filter((a: any) => {
              const apptDate = typeof a.date === "string" ? a.date : format(safeParseDate(a.date), "yyyy-MM-dd");
              return apptDate === dayStr;
            });
            const today = isToday(day);
            const inMonth = day.getMonth() === currentDate.getMonth();
            const allCompleted = dayAppts.length > 0 && dayAppts.every((a: any) => a.status === "completed");
            const someCompleted = dayAppts.length > 0 && dayAppts.some((a: any) => a.status === "completed") && !allCompleted;

            return (
              <button
                key={dayStr}
                onClick={() => { setCurrentDate(day); setViewMode("day"); }}
                className={`aspect-square rounded-lg flex flex-col items-center justify-center text-sm transition-colors relative ${
                  !inMonth ? "text-muted-foreground/30" :
                  today ? "bg-primary text-primary-foreground font-bold" :
                  "hover:bg-accent/30 text-foreground"
                }`}
              >
                {format(day, "d")}
                {dayAppts.length > 0 && (
                  <div className={`w-1.5 h-1.5 rounded-full mt-0.5 ${
                    allCompleted ? "bg-green-400" :
                    someCompleted ? "bg-yellow-400" :
                    "bg-primary"
                  }`} />
                )}
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-primary" /> Agendado</div>
          <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-yellow-400" /> Parcial</div>
          <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-green-400" /> Concluído</div>
        </div>
      </div>
    );
  };

  // ─── RENDER ────────────────────────────────────────────────────────────────

  const viewTabs: { key: ViewMode; label: string; icon: any }[] = [
    { key: "day",   label: "Dia",   icon: Clock },
    { key: "list",  label: "Lista", icon: List },
    { key: "month", label: "Mês",   icon: CalendarDays },
  ];

  const activeApptInfo = activeAppt ? getClientInfo(activeAppt) : null;

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="space-y-4">
        {/* Toolbar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Navigation */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate(-1)}
              className="p-1.5 rounded-lg border border-border bg-card hover:bg-accent transition-colors"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              onClick={() => setCurrentDate(new Date())}
              className="px-3 py-1.5 text-xs font-medium rounded-lg border border-border bg-card hover:bg-accent transition-colors text-muted-foreground hover:text-foreground"
            >
              Hoje
            </button>
            <button
              onClick={() => navigate(1)}
              className="p-1.5 rounded-lg border border-border bg-card hover:bg-accent transition-colors"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
            <h3 className="text-sm font-semibold capitalize text-foreground ml-1">{headerLabel}</h3>
          </div>

          {/* View tabs */}
          <div className="flex items-center gap-2">
            <div className="flex items-center bg-muted rounded-lg p-0.5">
              {viewTabs.map(({ key, label, icon: Icon }) => (
                <button
                  key={key}
                  onClick={() => setViewMode(key)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                    viewMode === key
                      ? "bg-card text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* View content */}
        {viewMode === "day"   && renderDayView()}
        {viewMode === "list"  && renderListView()}
        {viewMode === "month" && renderMonthView()}

        {/* FAB */}
        <Button
          onClick={() => openNewAppt()}
          className="fixed bottom-20 right-4 md:bottom-6 md:right-6 h-14 w-14 rounded-full shadow-lg shadow-primary/25 z-40"
          size="icon"
        >
          <Plus className="h-6 w-6" />
        </Button>

        {/* DragOverlay */}
        <DragOverlay>
          {activeAppt && activeApptInfo && (
            <div className={`rounded-lg border px-3 py-2 text-sm shadow-xl cursor-grabbing ${getStatusStyle(activeAppt.status)}`}>
              <div className="font-medium">{activeApptInfo.name}</div>
              <div className="text-xs opacity-70">{activeAppt.startTime} · {activeAppt.duration}min</div>
              {activeAppt.muscleGroups && <MuscleGroupBadges groups={activeAppt.muscleGroups} compact={true} />}
            </div>
          )}
        </DragOverlay>

        {/* ─── Modal Agendar / Editar ─── */}
        <Dialog open={showModal} onOpenChange={setShowModal}>
          <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingAppt ? "Editar Atendimento" : "Agendar Atendimento"}
              </DialogTitle>
              <DialogDescription className="sr-only">
                {editingAppt ? "Edite os dados do atendimento" : "Preencha os dados para agendar um novo atendimento"}
              </DialogDescription>
              {selectedDate && (
                <p className="text-sm text-muted-foreground">
                  {format(selectedDate, "EEEE, d 'de' MMMM", { locale: ptBR })}
                </p>
              )}
            </DialogHeader>

            <div className="space-y-4">
              {/* Cliente */}
              <div>
                <Label className="text-sm font-medium">Cliente cadastrado</Label>
                <Select value={formClientId} onValueChange={setFormClientId} disabled={isGuest}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Nenhum cliente" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Nenhum cliente</SelectItem>
                    {(clientsList as any[]).map((c: any) => (
                      <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Experimental */}
              <div>
                <Label className="text-sm font-medium">Experimental</Label>
                <div className="flex items-center gap-2 mt-1">
                  <Checkbox
                    checked={isGuest}
                    onCheckedChange={(v) => { setIsGuest(!!v); if (v) setFormClientId(""); }}
                  />
                  <span className="text-sm text-muted-foreground">Agendar para convidado</span>
                </div>
                {isGuest && (
                  <Input
                    className="mt-2"
                    placeholder="Nome do convidado"
                    value={formGuestName}
                    onChange={(e) => setFormGuestName(e.target.value)}
                  />
                )}
              </div>

              {/* Horário + Duração */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-sm font-medium">Horário</Label>
                  <Select value={formTime} onValueChange={setFormTime}>
                    <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {timeSlots.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-sm font-medium">Duração</Label>
                  <Select value={String(formDuration)} onValueChange={(v) => setFormDuration(parseInt(v))}>
                    <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {durations.map((d) => <SelectItem key={d} value={String(d)}>{d} min</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Grupos Musculares */}
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Dumbbell className="h-4 w-4 text-primary" />
                  <Label className="text-sm font-medium">Membros Treinados</Label>
                </div>
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-1.5">
                  {MUSCLE_GROUPS.map((mg) => {
                    const isSelected = formMuscleGroups.includes(mg.id);
                    return (
                      <button
                        key={mg.id}
                        type="button"
                        onClick={() => toggleMuscleGroup(mg.id)}
                        className={`flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                          isSelected
                            ? "border-primary bg-primary/15 text-primary shadow-sm shadow-primary/20"
                            : "border-border bg-card text-muted-foreground hover:bg-accent/30 hover:border-primary/30"
                        }`}
                      >
                        <span className="text-sm">{mg.emoji}</span>
                        <span className="truncate">{mg.label}</span>
                      </button>
                    );
                  })}
                </div>
                {formMuscleGroups.length > 0 && (
                  <p className="text-xs text-muted-foreground mt-1.5">
                    {formMuscleGroups.length} grupo{formMuscleGroups.length !== 1 ? "s" : ""} selecionado{formMuscleGroups.length !== 1 ? "s" : ""}
                  </p>
                )}
              </div>

              {/* Observações */}
              <div>
                <Label className="text-sm font-medium">Observações</Label>
                <Input
                  className="mt-1"
                  placeholder="Notas opcionais..."
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                />
              </div>

              {/* ─── Recorrência (só ao criar) ─── */}
              {!editingAppt && (
                <div className="border border-border rounded-lg p-3 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Repeat2 className="h-4 w-4 text-primary" />
                      <Label className="text-sm font-medium cursor-pointer">Repetir sessão</Label>
                    </div>
                    <Checkbox
                      checked={isRecurring}
                      onCheckedChange={(v) => setIsRecurring(!!v)}
                    />
                  </div>

                  {isRecurring && (
                    <div className="space-y-3 pt-1">
                      <div>
                        <Label className="text-xs text-muted-foreground">Frequência</Label>
                        <Select value={recurrenceType} onValueChange={(v) => setRecurrenceType(v as any)}>
                          <SelectTrigger className="mt-1 h-8 text-sm"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="daily">Diária</SelectItem>
                            <SelectItem value="weekly">Semanal</SelectItem>
                            <SelectItem value="biweekly">Quinzenal</SelectItem>
                            <SelectItem value="monthly">Mensal</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {recurrenceType === "weekly" && (
                        <div>
                          <Label className="text-xs text-muted-foreground">Dias da semana</Label>
                          <div className="flex gap-1 mt-1 flex-wrap">
                            {["Dom","Seg","Ter","Qua","Qui","Sex","Sáb"].map((d, i) => (
                              <button
                                key={i}
                                type="button"
                                onClick={() => setRecurrenceDays(prev =>
                                  prev.includes(i) ? prev.filter(x => x !== i) : [...prev, i]
                                )}
                                className={`px-2 py-1 rounded text-xs font-medium border transition-colors ${
                                  recurrenceDays.includes(i)
                                    ? "bg-primary text-primary-foreground border-primary"
                                    : "border-border text-muted-foreground hover:border-primary/50"
                                }`}
                              >
                                {d}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      <div>
                        <Label className="text-xs text-muted-foreground">Término</Label>
                        <div className="flex gap-2 mt-1">
                          <button
                            type="button"
                            onClick={() => setRecurrenceMode("occurrences")}
                            className={`flex-1 py-1.5 rounded text-xs border transition-colors ${
                              recurrenceMode === "occurrences" ? "bg-primary/20 text-primary border-primary/50" : "border-border text-muted-foreground"
                            }`}
                          >
                            Nº de sessões
                          </button>
                          <button
                            type="button"
                            onClick={() => setRecurrenceMode("endDate")}
                            className={`flex-1 py-1.5 rounded text-xs border transition-colors ${
                              recurrenceMode === "endDate" ? "bg-primary/20 text-primary border-primary/50" : "border-border text-muted-foreground"
                            }`}
                          >
                            Data final
                          </button>
                        </div>
                      </div>

                      {recurrenceMode === "occurrences" ? (
                        <div>
                          <Label className="text-xs text-muted-foreground">Número de sessões</Label>
                          <div className="flex items-center gap-2 mt-1">
                            <button type="button" onClick={() => setRecurrenceOccurrences(n => Math.max(2, n - 1))}
                              className="w-7 h-7 rounded border border-border text-sm hover:bg-accent flex items-center justify-center">-</button>
                            <span className="text-sm font-medium w-8 text-center">{recurrenceOccurrences}</span>
                            <button type="button" onClick={() => setRecurrenceOccurrences(n => Math.min(52, n + 1))}
                              className="w-7 h-7 rounded border border-border text-sm hover:bg-accent flex items-center justify-center">+</button>
                            <span className="text-xs text-muted-foreground">sessões</span>
                          </div>
                        </div>
                      ) : (
                        <div>
                          <Label className="text-xs text-muted-foreground">Data final</Label>
                          <Input
                            type="date"
                            className="mt-1 h-8 text-sm"
                            value={recurrenceEndDate}
                            onChange={(e) => setRecurrenceEndDate(e.target.value)}
                          />
                        </div>
                      )}

                      <div className="bg-primary/5 rounded p-2 text-xs text-muted-foreground">
                        <Repeat2 className="h-3 w-3 inline mr-1 text-primary" />
                        {recurrenceMode === "occurrences"
                          ? `Serão criadas ${recurrenceOccurrences} sess${recurrenceOccurrences === 1 ? "ão" : "ões"} recorrentes`
                          : recurrenceEndDate
                            ? `Sessões até ${recurrenceEndDate}`
                            : "Defina a data final"
                        }
                        {recurrenceType === "weekly" && recurrenceDays.length > 0 && (
                          <span> · dias: {recurrenceDays.map(d => ["Dom","Seg","Ter","Qua","Qui","Sex","Sáb"][d]).join(", ")}</span>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Badge recorrência ao editar */}
              {editingAppt?.recurrenceGroupId && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Repeat2 className="h-3.5 w-3.5 text-primary" />
                  <span>Esta sessão faz parte de uma série recorrente</span>
                </div>
              )}

              {/* Status (só ao editar) */}
              {editingAppt && (
                <div>
                  <Label className="text-sm font-medium">Status</Label>
                  <Select value={formStatus} onValueChange={setFormStatus}>
                    <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="scheduled">Agendado</SelectItem>
                      <SelectItem value="completed">Concluído</SelectItem>
                      <SelectItem value="cancelled">Cancelado</SelectItem>
                      <SelectItem value="no_show">Não compareceu</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Botão Concluir Sessão */}
              {editingAppt && editingAppt.status !== "completed" && (
                <Button
                  className="w-full bg-green-600 hover:bg-green-700 text-white"
                  onClick={markCompleted}
                  disabled={updateMutation.isPending}
                >
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Concluir Sessão
                </Button>
              )}

              {/* WhatsApp no modal */}
              {editingAppt && editingAppt.status !== "completed" && (() => {
                const { name, phone } = getClientInfo(editingAppt);
                return phone ? (
                  <a
                    href={buildWhatsAppUrl(phone, name, safeParseDate(editingAppt.date), editingAppt.startTime)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full flex items-center justify-center gap-2 rounded-md border border-green-500/40 bg-green-500/10 text-green-400 hover:bg-green-500/20 transition-colors py-2 text-sm font-medium"
                  >
                    <MessageCircle className="h-4 w-4" />
                    Confirmar via WhatsApp
                  </a>
                ) : null;
              })()}

              {/* Ações principais */}
              <div className="flex gap-3 pt-1">
                <Button variant="outline" className="flex-1" onClick={() => setShowModal(false)}>
                  Cancelar
                </Button>
                <Button
                  className="flex-1"
                  onClick={handleSubmit}
                  disabled={createMutation.isPending || updateMutation.isPending}
                >
                  {editingAppt ? "Salvar" : "Agendar"}
                </Button>
              </div>

              {/* Excluir */}
              {editingAppt && (
                <Button
                  variant="destructive" className="w-full"
                  onClick={() => handleDeleteClick(editingAppt)}
                  disabled={deleteMutation.isPending}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  {editingAppt.recurrenceGroupId ? "Excluir Sessão..." : "Excluir Agendamento"}
                </Button>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* ─── AlertDialog: excluir sessão única ou toda a série ─── */}
      <AlertDialog open={showDeleteGroupDialog} onOpenChange={setShowDeleteGroupDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir agendamento recorrente</AlertDialogTitle>
            <AlertDialogDescription>
              Esta sessão faz parte de uma série recorrente. Deseja excluir apenas esta sessão ou todas as sessões da série?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col sm:flex-row gap-2">
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <Button
              variant="outline"
              className="border-destructive/50 text-destructive hover:bg-destructive/10"
              onClick={() => {
                if (pendingDeleteAppt) deleteMutation.mutate({ id: pendingDeleteAppt.id });
                setShowDeleteGroupDialog(false);
              }}
            >
              Só esta sessão
            </Button>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90"
              onClick={() => {
                if (pendingDeleteAppt) deleteMutation.mutate({ id: pendingDeleteAppt.id, deleteGroup: true });
                setShowDeleteGroupDialog(false);
              }}
            >
              Toda a série
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DndContext>
  );
}
