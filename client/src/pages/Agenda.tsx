import { trpc } from "@/lib/trpc";
import { useState, useMemo, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  ChevronLeft, ChevronRight, Plus, Clock, List, Grid3X3, CalendarDays,
  Trash2, CheckCircle2, XCircle, UserX, Calendar, MessageCircle, GripVertical,
} from "lucide-react";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import {
  format, addDays, subDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth,
  eachDayOfInterval, isSameDay, isToday, addWeeks, subWeeks, addMonths, subMonths,
} from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  DndContext, DragEndEvent, DragOverlay, DragStartEvent,
  PointerSensor, useSensor, useSensors, closestCenter,
} from "@dnd-kit/core";
import { useDraggable, useDroppable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";

type ViewMode = "day" | "list" | "week" | "month";

const timeSlots = Array.from({ length: 16 }, (_, i) => {
  const h = i + 6;
  return `${String(h).padStart(2, "0")}:00`;
});

const durations = [30, 45, 60, 90, 120];

// ─── Helpers ────────────────────────────────────────────────────────────────

function getStatusStyle(status: string) {
  switch (status) {
    case "completed": return "bg-green-500/25 text-green-300 border-green-500/40";
    case "cancelled": return "bg-red-500/20 text-red-400 border-red-500/30";
    case "no_show":   return "bg-yellow-500/20 text-yellow-400 border-yellow-500/30";
    default:          return "bg-primary/20 text-primary border-primary/30";
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
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `appt-${appt.id}`,
    data: { appt },
  });

  const style = { transform: CSS.Translate.toString(transform), opacity: isDragging ? 0.4 : 1 };
  const isCompleted = appt.status === "completed";

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group relative rounded-lg border text-sm transition-all ${getStatusStyle(appt.status)} ${
        isCompleted ? "ring-1 ring-green-500/30" : ""
      }`}
    >
      {/* Drag handle */}
      <div
        {...listeners}
        {...attributes}
        className="absolute left-1 top-1/2 -translate-y-1/2 cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-60 transition-opacity z-10"
      >
        <GripVertical className="h-3.5 w-3.5" />
      </div>

      {/* Main content — clickable to edit */}
      <button
        onClick={onEdit}
        className={`w-full text-left ${compact ? "px-5 py-1.5" : "px-5 py-2"}`}
      >
        <div className={`font-medium truncate ${compact ? "text-xs" : "text-sm"}`}>{clientName}</div>
        {!compact && (
          <div className="text-xs opacity-70 flex items-center gap-1 mt-0.5">
            <Clock className="h-2.5 w-2.5" />
            {appt.startTime} · {appt.duration}min
          </div>
        )}
        {compact && <div className="text-[10px] opacity-70">{appt.startTime}</div>}
      </button>

      {/* Action buttons */}
      <div className="absolute right-1 top-1/2 -translate-y-1/2 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
        {/* WhatsApp — só para não concluídos com telefone */}
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
        {/* Status dropdown */}
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

// WhatsApp button standalone (always visible in list view)
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
  const [viewMode, setViewMode] = useState<ViewMode>("day");
  const [currentDate, setCurrentDate] = useState(() => new Date());
  const [showModal, setShowModal] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [editingAppt, setEditingAppt] = useState<any>(null);
  const [isGuest, setIsGuest] = useState(false);
  const [activeAppt, setActiveAppt] = useState<any>(null); // for DragOverlay

  // Form state
  const [formClientId, setFormClientId] = useState<string>("");
  const [formGuestName, setFormGuestName] = useState("");
  const [formTime, setFormTime] = useState("08:00");
  const [formDuration, setFormDuration] = useState(60);
  const [formNotes, setFormNotes] = useState("");
  const [formStatus, setFormStatus] = useState("scheduled");

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

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

  const { data: appointments = [], refetch } = trpc.appointments.list.useQuery({
    startDate: dateRange.start,
    endDate: dateRange.end,
  });

  const { data: clientsList = [] } = trpc.clients.list.useQuery();

  const createMutation = trpc.appointments.create.useMutation({
    onSuccess: () => { toast.success("Agendamento criado!"); refetch(); setShowModal(false); },
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

  const navigate = (dir: number) => {
    if (viewMode === "day") setCurrentDate(d => dir > 0 ? addDays(d, 1) : subDays(d, 1));
    else if (viewMode === "week" || viewMode === "list") setCurrentDate(d => dir > 0 ? addWeeks(d, 1) : subWeeks(d, 1));
    else setCurrentDate(d => dir > 0 ? addMonths(d, 1) : subMonths(d, 1));
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
    setIsGuest(false);
    setShowModal(true);
  };

  const openEditAppt = (appt: any) => {
    setEditingAppt(appt);
    setSelectedDate(new Date(appt.date));
    setFormClientId(appt.clientId ? String(appt.clientId) : "");
    setFormGuestName(appt.guestName || "");
    setFormTime(appt.startTime);
    setFormDuration(appt.duration);
    setFormNotes(appt.notes || "");
    setFormStatus(appt.status || "scheduled");
    setIsGuest(!!appt.guestName && !appt.clientId);
    setShowModal(true);
  };

  const handleSubmit = () => {
    if (!selectedDate) return;
    const payload: any = {
      date: format(selectedDate, "yyyy-MM-dd"),
      startTime: formTime,
      duration: formDuration,
      notes: formNotes || undefined,
      status: formStatus as any,
    };
    if (isGuest) payload.guestName = formGuestName;
    else if (formClientId && formClientId !== "none") payload.clientId = parseInt(formClientId);

    if (editingAppt) updateMutation.mutate({ id: editingAppt.id, ...payload });
    else createMutation.mutate(payload);
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
    const overId = String(over.id); // format: "slot-YYYY-MM-DD-HH:MM" or "day-YYYY-MM-DD"

    let newDate: string | undefined;
    let newTime: string | undefined;

    if (overId.startsWith("slot-")) {
      const parts = overId.replace("slot-", "").split("-");
      // slot-2026-02-27-08:00 → parts = ["2026","02","27","08:00"]
      newTime = parts[3];
      newDate = parts.slice(0, 3).join("-");
    } else if (overId.startsWith("day-")) {
      newDate = overId.replace("day-", "");
    }

    if (!newDate && !newTime) return;

    const appt = (appointments as any[]).find((a: any) => a.id === apptId);
    if (!appt) return;

    const finalDate = newDate || format(new Date(appt.date), "yyyy-MM-dd");
    const finalTime = newTime || appt.startTime;

    if (finalDate === format(new Date(appt.date), "yyyy-MM-dd") && finalTime === appt.startTime) return;

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
      isSameDay(new Date(a.date), currentDate)
    );

    return (
      <div className="space-y-0.5">
        {timeSlots.map((slot) => {
          const slotAppts = dayAppts.filter((a: any) => a.startTime === slot);
          return (
            <DroppableSlot key={slot} id={`slot-${format(currentDate, "yyyy-MM-dd")}-${slot}`}>
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
            .filter((a: any) => isSameDay(new Date(a.date), day))
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
                        const isCompleted = appt.status === "completed";
                        return (
                          <div
                            key={appt.id}
                            className={`flex items-center gap-2 rounded-lg px-3 py-2 border transition-colors ${getStatusStyle(appt.status)} ${
                              isCompleted ? "ring-1 ring-green-500/30" : ""
                            }`}
                          >
                            {/* Drag handle */}
                            <GripVertical className="h-4 w-4 opacity-30 shrink-0 cursor-grab" />

                            {/* Info */}
                            <div className="flex-1 min-w-0 cursor-pointer" onClick={() => openEditAppt(appt)}>
                              <div className="font-medium text-sm truncate flex items-center gap-1.5">
                                {isCompleted && <CheckCircle2 className="h-3.5 w-3.5 text-green-400 shrink-0" />}
                                {name}
                              </div>
                              <div className="text-xs opacity-70 flex items-center gap-1">
                                <Clock className="h-2.5 w-2.5" /> {appt.startTime} · {appt.duration}min
                              </div>
                            </div>

                            {/* Actions */}
                            <div className="flex items-center gap-1 shrink-0">
                              {/* WhatsApp — sempre visível se não concluído e tem telefone */}
                              {!isCompleted && phone && (
                                <WhatsAppBtn phone={phone} name={name} date={day} time={appt.startTime} />
                              )}

                              {/* Status dropdown */}
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <button
                                    onClick={(e) => e.stopPropagation()}
                                    className={`text-[10px] px-2 py-0.5 rounded-full border font-medium transition-opacity hover:opacity-80 ${getStatusStyle(appt.status)}`}
                                  >
                                    {STATUS_LABELS[appt.status] || appt.status}
                                  </button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-40">
                                  {STATUS_OPTIONS.map((opt) => (
                                    <DropdownMenuItem
                                      key={opt.value}
                                      onClick={(e) => { e.stopPropagation(); quickUpdateStatus(appt.id, opt.value); }}
                                      className={`cursor-pointer ${opt.color}`}
                                    >
                                      <opt.icon className="h-3.5 w-3.5 mr-2" />
                                      {opt.label}
                                    </DropdownMenuItem>
                                  ))}
                                </DropdownMenuContent>
                              </DropdownMenu>

                              <Button
                                variant="ghost" size="icon" className="h-7 w-7 text-destructive"
                                onClick={(e) => { e.stopPropagation(); deleteMutation.mutate({ id: appt.id }); }}
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
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

  // ─── VIEW: SEMANA ──────────────────────────────────────────────────────────

  const renderWeekView = () => {
    const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
    const days = eachDayOfInterval({ start: weekStart, end: addDays(weekStart, 6) });

    return (
      <div className="overflow-x-auto">
        <div className="grid grid-cols-7 gap-1 min-w-[560px]">
          {days.map((day) => {
            const dayAppts = (appointments as any[])
              .filter((a: any) => isSameDay(new Date(a.date), day))
              .sort((a: any, b: any) => a.startTime.localeCompare(b.startTime));
            const today = isToday(day);

            return (
              <DroppableSlot key={day.toISOString()} id={`day-${format(day, "yyyy-MM-dd")}`} className="space-y-1">
                {/* Day header */}
                <div className={`text-center p-2 rounded-lg ${today ? "bg-primary text-primary-foreground" : ""}`}>
                  <div className="text-xs font-medium">{format(day, "EEE", { locale: ptBR })}</div>
                  <div className="text-lg font-bold">{format(day, "d")}</div>
                </div>

                {/* Appointments */}
                <div className="space-y-1 min-h-[120px]">
                  {dayAppts.map((appt: any) => {
                    const { name, phone } = getClientInfo(appt);
                    const isCompleted = appt.status === "completed";
                    return (
                      <div
                        key={appt.id}
                        className={`group relative rounded-md border text-xs transition-all ${getStatusStyle(appt.status)} ${
                          isCompleted ? "ring-1 ring-green-500/30" : ""
                        }`}
                      >
                        <button
                          onClick={() => openEditAppt(appt)}
                          className="w-full text-left px-2 py-1.5"
                        >
                          <div className="font-medium truncate flex items-center gap-1">
                            {isCompleted && <CheckCircle2 className="h-2.5 w-2.5 text-green-400 shrink-0" />}
                            {name}
                          </div>
                          <div className="opacity-70">{appt.startTime}</div>
                        </button>
                        {/* WhatsApp inline */}
                        {!isCompleted && phone && (
                          <a
                            href={buildWhatsAppUrl(phone, name, day, appt.startTime)}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity h-5 w-5 flex items-center justify-center rounded bg-green-500/20 text-green-400"
                          >
                            <MessageCircle className="h-3 w-3" />
                          </a>
                        )}
                      </div>
                    );
                  })}

                  <button
                    onClick={() => openNewAppt(day)}
                    className="w-full rounded-md border border-dashed border-border/30 py-1 text-xs text-muted-foreground hover:border-primary/50 hover:text-primary transition-colors"
                  >
                    +
                  </button>
                </div>
              </DroppableSlot>
            );
          })}
        </div>
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
    const withAppts = new Set((appointments as any[]).map((a: any) => format(new Date(a.date), "yyyy-MM-dd"))).size;
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
            const dayAppts = (appointments as any[]).filter((a: any) => format(new Date(a.date), "yyyy-MM-dd") === dayStr);
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
                  "text-foreground hover:bg-accent"
                }`}
              >
                {format(day, "d")}
                {dayAppts.length > 0 && (
                  <div className={`absolute bottom-1 w-1.5 h-1.5 rounded-full ${
                    allCompleted ? "bg-green-400" : someCompleted ? "bg-yellow-400" : "bg-primary"
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
    { key: "week",  label: "Sem",   icon: Grid3X3 },
    { key: "month", label: "Mês",   icon: CalendarDays },
  ];

  // Get active appt info for DragOverlay
  const activeApptInfo = activeAppt ? getClientInfo(activeAppt) : null;

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="space-y-4 p-4 md:p-6">
        {/* Page header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-2xl font-bold">Agenda</h2>
            <p className="text-sm text-muted-foreground">Gerencie seus atendimentos</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Button
              variant="outline" size="sm"
              onClick={() => setCurrentDate(new Date())}
              className="text-primary border-primary/50"
            >
              Hoje
            </Button>
            <div className="flex items-center border border-border rounded-lg overflow-hidden">
              {viewTabs.map(({ key, label, icon: Icon }) => (
                <button
                  key={key}
                  onClick={() => setViewMode(key)}
                  className={`flex items-center gap-1 px-3 py-1.5 text-xs font-medium transition-colors ${
                    viewMode === key ? "bg-primary/20 text-primary" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <h3 className="text-base font-semibold capitalize text-center">{headerLabel}</h3>
          <Button variant="ghost" size="icon" onClick={() => navigate(1)}>
            <ChevronRight className="h-5 w-5" />
          </Button>
        </div>

        {/* View content */}
        {viewMode === "day"   && renderDayView()}
        {viewMode === "list"  && renderListView()}
        {viewMode === "week"  && renderWeekView()}
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
            </div>
          )}
        </DragOverlay>

        {/* ─── Modal Agendar / Editar ─── */}
        <Dialog open={showModal} onOpenChange={setShowModal}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>
                {editingAppt ? "Editar Atendimento" : "Agendar Atendimento"}
              </DialogTitle>
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

              {/* Botão Concluir Sessão — destaque verde */}
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

              {/* WhatsApp no modal — se não concluído e tem telefone */}
              {editingAppt && editingAppt.status !== "completed" && (() => {
                const { name, phone } = getClientInfo(editingAppt);
                return phone ? (
                  <a
                    href={buildWhatsAppUrl(phone, name, new Date(editingAppt.date), editingAppt.startTime)}
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
                  onClick={() => deleteMutation.mutate({ id: editingAppt.id })}
                  disabled={deleteMutation.isPending}
                >
                  <Trash2 className="h-4 w-4 mr-2" /> Excluir Agendamento
                </Button>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </DndContext>
  );
}
