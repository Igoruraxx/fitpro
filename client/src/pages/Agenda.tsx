import { trpc } from "@/lib/trpc";
import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { ChevronLeft, ChevronRight, Plus, Clock, List, Grid3X3, CalendarDays, Trash2, Edit, CheckCircle2, XCircle, UserX, Calendar } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import {
  format, addDays, subDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth,
  eachDayOfInterval, isSameDay, isToday, getDay, addWeeks, subWeeks, addMonths, subMonths,
} from "date-fns";
import { ptBR } from "date-fns/locale";

type ViewMode = "day" | "week" | "list" | "month";

const timeSlots = Array.from({ length: 15 }, (_, i) => {
  const h = i + 6;
  return `${String(h).padStart(2, "0")}:00`;
});

const durations = [30, 45, 60, 90, 120];

export default function Agenda() {
  const [viewMode, setViewMode] = useState<ViewMode>("week");
  const [currentDate, setCurrentDate] = useState(() => new Date());
  const [showModal, setShowModal] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [editingAppt, setEditingAppt] = useState<any>(null);
  const [isGuest, setIsGuest] = useState(false);

  // Form state
  const [formClientId, setFormClientId] = useState<string>("");
  const [formGuestName, setFormGuestName] = useState("");
  const [formTime, setFormTime] = useState("08:00");
  const [formDuration, setFormDuration] = useState(60);
  const [formNotes, setFormNotes] = useState("");

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
  const utils = trpc.useUtils();

  const createMutation = trpc.appointments.create.useMutation({
    onSuccess: () => { toast.success("Agendamento criado!"); refetch(); setShowModal(false); },
    onError: (e) => toast.error(e.message),
  });

  const updateMutation = trpc.appointments.update.useMutation({
    onSuccess: () => { toast.success("Agendamento atualizado!"); refetch(); setShowModal(false); },
    onError: (e) => toast.error(e.message),
  });

  const deleteMutation = trpc.appointments.delete.useMutation({
    onSuccess: () => { toast.success("Agendamento excluído!"); refetch(); },
    onError: (e) => toast.error(e.message),
  });

  const navigate = (dir: number) => {
    if (viewMode === "day") setCurrentDate(d => dir > 0 ? addDays(d, 1) : subDays(d, 1));
    else if (viewMode === "week" || viewMode === "list") setCurrentDate(d => dir > 0 ? addWeeks(d, 1) : subWeeks(d, 1));
    else setCurrentDate(d => dir > 0 ? addMonths(d, 1) : subMonths(d, 1));
  };

  const openNewAppt = (date?: Date) => {
    setEditingAppt(null);
    setSelectedDate(date || currentDate);
    setFormClientId("");
    setFormGuestName("");
    setFormTime("08:00");
    setFormDuration(60);
    setFormNotes("");
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
    };
    if (isGuest) {
      payload.guestName = formGuestName;
    } else if (formClientId) {
      payload.clientId = parseInt(formClientId);
    }
    if (editingAppt) {
      updateMutation.mutate({ id: editingAppt.id, ...payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const getClientName = (appt: any) => {
    if (appt.guestName) return appt.guestName + " (convidado)";
    if (appt.clientId) {
      const c = clientsList.find((cl: any) => cl.id === appt.clientId);
      return c?.name || "Cliente";
    }
    return "Sem cliente";
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed": return "bg-green-500/20 text-green-400 border-green-500/30";
      case "cancelled": return "bg-red-500/20 text-red-400 border-red-500/30";
      case "no_show": return "bg-yellow-500/20 text-yellow-400 border-yellow-500/30";
      default: return "bg-primary/20 text-primary border-primary/30";
    }
  };

  const STATUS_OPTIONS = [
    { value: "scheduled", label: "Agendado", icon: Calendar, color: "text-primary" },
    { value: "completed", label: "Concluído", icon: CheckCircle2, color: "text-green-400" },
    { value: "cancelled", label: "Cancelado", icon: XCircle, color: "text-red-400" },
    { value: "no_show", label: "Faltou", icon: UserX, color: "text-yellow-400" },
  ];

  const STATUS_LABELS: Record<string, string> = {
    scheduled: "Agendado",
    completed: "Concluído",
    cancelled: "Cancelado",
    no_show: "Faltou",
  };

  const quickUpdateStatus = (apptId: number, newStatus: string) => {
    updateMutation.mutate({ id: apptId, status: newStatus as any }, {
      onSuccess: () => { toast.success("Status atualizado!"); refetch(); },
    });
  };

  const renderStatusBadge = (appt: any) => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          onClick={(e) => e.stopPropagation()}
          className={`text-[10px] px-2 py-0.5 rounded-full border font-medium transition-opacity hover:opacity-80 ${getStatusColor(appt.status)}`}
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
  );

  const headerLabel = useMemo(() => {
    if (viewMode === "day") return format(currentDate, "d 'de' MMMM yyyy", { locale: ptBR });
    if (viewMode === "week" || viewMode === "list") {
      const s = startOfWeek(currentDate, { weekStartsOn: 1 });
      const e = endOfWeek(currentDate, { weekStartsOn: 1 });
      return `${format(s, "d MMM", { locale: ptBR })} – ${format(e, "d MMM yyyy", { locale: ptBR })}`;
    }
    return format(currentDate, "MMMM 'de' yyyy", { locale: ptBR });
  }, [currentDate, viewMode]);

  // ==================== RENDER VIEWS ====================

  const renderDayView = () => {
    const dayAppts = appointments.filter((a: any) => isSameDay(new Date(a.date), currentDate));
    return (
      <div className="space-y-1">
        {timeSlots.map((slot) => {
          const slotAppts = dayAppts.filter((a: any) => a.startTime === slot);
          return (
            <div key={slot} className="flex gap-3 min-h-[3.5rem] group">
              <span className="text-xs text-muted-foreground w-12 pt-1 shrink-0">{slot}</span>
              <div className="flex-1 border-t border-border/50 pt-1 space-y-1">
                {slotAppts.map((appt: any) => (
                  <button
                    key={appt.id}
                    onClick={() => openEditAppt(appt)}
                    className={`w-full text-left rounded-lg px-3 py-2 text-sm border ${getStatusColor(appt.status)} transition-colors hover:opacity-80`}
                  >
                    <div className="font-medium">{getClientName(appt)}</div>
                    <div className="text-xs opacity-70">{appt.startTime} - {appt.duration}min</div>
                  </button>
                ))}
                {slotAppts.length === 0 && (
                  <button
                    onClick={() => { setFormTime(slot); openNewAppt(currentDate); }}
                    className="w-full h-8 rounded-lg border border-dashed border-border/30 opacity-0 group-hover:opacity-100 transition-opacity text-xs text-muted-foreground hover:border-primary/50 hover:text-primary"
                  >
                    + Agendar
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const renderWeekView = () => {
    const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
    const days = eachDayOfInterval({ start: weekStart, end: addDays(weekStart, 6) });
    return (
      <div className="overflow-x-auto">
        <div className="grid grid-cols-7 gap-1 min-w-[600px]">
          {days.map((day) => {
            const dayAppts = appointments.filter((a: any) => isSameDay(new Date(a.date), day));
            const today = isToday(day);
            return (
              <div key={day.toISOString()} className="space-y-1">
                <div className={`text-center p-2 rounded-lg ${today ? "bg-primary text-primary-foreground" : ""}`}>
                  <div className="text-xs font-medium">{format(day, "EEE", { locale: ptBR })}</div>
                  <div className="text-lg font-bold">{format(day, "d")}</div>
                </div>
                <div className="space-y-1 min-h-[200px]">
                  {dayAppts.map((appt: any) => (
                    <button
                      key={appt.id}
                      onClick={() => openEditAppt(appt)}
                      className={`w-full text-left rounded-md px-2 py-1.5 text-xs border ${getStatusColor(appt.status)} transition-colors hover:opacity-80`}
                    >
                      <div className="font-medium truncate">{getClientName(appt)}</div>
                      <div className="opacity-70">{appt.startTime}</div>
                    </button>
                  ))}
                  <button
                    onClick={() => openNewAppt(day)}
                    className="w-full rounded-md border border-dashed border-border/40 py-1 text-xs text-muted-foreground hover:border-primary/50 hover:text-primary transition-colors"
                  >
                    +
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const renderListView = () => {
    const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
    const days = eachDayOfInterval({ start: weekStart, end: addDays(weekStart, 6) });
    return (
      <div className="space-y-3">
        {days.map((day) => {
          const dayAppts = appointments.filter((a: any) => isSameDay(new Date(a.date), day));
          const today = isToday(day);
          return (
            <div key={day.toISOString()} className={`rounded-xl border ${today ? "border-primary/50 bg-primary/5" : "border-border"} overflow-hidden`}>
              <div className="flex items-center justify-between px-4 py-3">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-sm font-bold ${today ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"}`}>
                    {format(day, "d")}
                  </div>
                  <div>
                    <div className="font-semibold capitalize">{format(day, "EEEE", { locale: ptBR })}{today && <span className="ml-2 text-xs text-primary font-normal">Hoje</span>}</div>
                    <div className="text-xs text-muted-foreground">{format(day, "d 'de' MMMM", { locale: ptBR })}</div>
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
                    {dayAppts.map((appt: any) => (
                      <div
                        key={appt.id}
                        className={`flex items-center justify-between rounded-lg px-3 py-2 border ${getStatusColor(appt.status)} transition-colors`}
                      >
                        <div className="flex-1 min-w-0 cursor-pointer" onClick={() => openEditAppt(appt)}>
                          <div className="font-medium text-sm truncate">{getClientName(appt)}</div>
                          <div className="text-xs opacity-70 flex items-center gap-1">
                            <Clock className="h-3 w-3" /> {appt.startTime} · {appt.duration}min
                          </div>
                        </div>
                        <div className="flex items-center gap-1 shrink-0 ml-2">
                          {renderStatusBadge(appt)}
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={(e) => { e.stopPropagation(); openEditAppt(appt); }}>
                            <Edit className="h-3 w-3" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={(e) => { e.stopPropagation(); deleteMutation.mutate({ id: appt.id }); }}>
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const renderMonthView = () => {
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(currentDate);
    const calStart = startOfWeek(monthStart, { weekStartsOn: 1 });
    const calEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
    const days = eachDayOfInterval({ start: calStart, end: calEnd });

    const totalAppts = appointments.length;
    const withAppts = new Set(appointments.map((a: any) => format(new Date(a.date), "yyyy-MM-dd"))).size;
    const freeDays = eachDayOfInterval({ start: monthStart, end: monthEnd }).length - withAppts;

    return (
      <div className="space-y-4">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-xl border border-border bg-card p-3 text-center">
            <div className="text-2xl font-bold text-primary">{totalAppts}</div>
            <div className="text-xs text-muted-foreground">Atendimentos</div>
          </div>
          <div className="rounded-xl border border-border bg-card p-3 text-center">
            <div className="text-2xl font-bold text-destructive">{withAppts}</div>
            <div className="text-xs text-muted-foreground">Com agenda</div>
          </div>
          <div className="rounded-xl border border-border bg-card p-3 text-center">
            <div className="text-2xl font-bold text-foreground">{freeDays}</div>
            <div className="text-xs text-muted-foreground">Dias livres</div>
          </div>
        </div>

        {/* Calendar grid */}
        <div className="grid grid-cols-7 gap-1">
          {["SEG", "TER", "QUA", "QUI", "SEX", "SÁB", "DOM"].map((d) => (
            <div key={d} className="text-center text-xs font-medium text-muted-foreground py-2">{d}</div>
          ))}
          {days.map((day) => {
            const dayStr = format(day, "yyyy-MM-dd");
            const dayAppts = appointments.filter((a: any) => format(new Date(a.date), "yyyy-MM-dd") === dayStr);
            const today = isToday(day);
            const inMonth = day.getMonth() === currentDate.getMonth();
            const hasAppts = dayAppts.length > 0;
            const allCompleted = hasAppts && dayAppts.every((a: any) => a.status === "completed");
            const someCompleted = hasAppts && dayAppts.some((a: any) => a.status === "completed") && !allCompleted;

            return (
              <button
                key={dayStr}
                onClick={() => openNewAppt(day)}
                className={`aspect-square rounded-lg flex flex-col items-center justify-center text-sm transition-colors relative ${
                  !inMonth ? "text-muted-foreground/30" :
                  today ? "bg-primary text-primary-foreground font-bold" :
                  "text-foreground hover:bg-accent"
                }`}
              >
                {format(day, "d")}
                {hasAppts && (
                  <div className={`absolute bottom-1 w-1.5 h-1.5 rounded-full ${
                    allCompleted ? "bg-green-400" : someCompleted ? "bg-yellow-400" : "bg-primary"
                  }`} />
                )}
              </button>
            );
          })}
        </div>

        {/* Legend */}
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-primary" /> Agendado</div>
          <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-yellow-400" /> Parcial</div>
          <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-green-400" /> Concluído</div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4 p-4 md:p-0">
      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold">Agenda</h2>
          <p className="text-sm text-muted-foreground">Gerencie seus atendimentos</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button variant="outline" size="sm" onClick={() => setCurrentDate(new Date())} className="text-primary border-primary/50">
            Hoje
          </Button>
          <div className="flex items-center border border-border rounded-lg overflow-hidden">
            {([
              { key: "day" as ViewMode, label: "Dia", icon: Clock },
              { key: "week" as ViewMode, label: "Sem", icon: Grid3X3 },
              { key: "list" as ViewMode, label: "Lista", icon: List },
              { key: "month" as ViewMode, label: "Mês", icon: CalendarDays },
            ]).map(({ key, label, icon: Icon }) => (
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
        <h3 className="text-lg font-semibold capitalize">{headerLabel}</h3>
        <Button variant="ghost" size="icon" onClick={() => navigate(1)}>
          <ChevronRight className="h-5 w-5" />
        </Button>
      </div>

      {/* View content */}
      {viewMode === "day" && renderDayView()}
      {viewMode === "week" && renderWeekView()}
      {viewMode === "list" && renderListView()}
      {viewMode === "month" && renderMonthView()}

      {/* FAB mobile */}
      <Button
        onClick={() => openNewAppt()}
        className="fixed bottom-20 right-4 md:bottom-6 md:right-6 h-14 w-14 rounded-full shadow-lg shadow-primary/25 z-40"
        size="icon"
      >
        <Plus className="h-6 w-6" />
      </Button>

      {/* Modal Agendar */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingAppt ? "Editar Atendimento" : "Agendar Atendimento"}</DialogTitle>
            {selectedDate && (
              <p className="text-sm text-muted-foreground">{format(selectedDate, "d 'de' MMMM", { locale: ptBR })}</p>
            )}
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-sm font-medium">Cliente cadastrado</Label>
              <Select value={formClientId} onValueChange={setFormClientId} disabled={isGuest}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Nenhum cliente" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nenhum cliente</SelectItem>
                  {clientsList.map((c: any) => (
                    <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-sm font-medium">Experimental</Label>
              <div className="flex items-center gap-2 mt-1">
                <Checkbox checked={isGuest} onCheckedChange={(v) => { setIsGuest(!!v); if (v) setFormClientId(""); }} />
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

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-sm font-medium">Horário</Label>
                <Select value={formTime} onValueChange={setFormTime}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {timeSlots.map((t) => (
                      <SelectItem key={t} value={t}>{t}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-sm font-medium">Duração</Label>
                <Select value={String(formDuration)} onValueChange={(v) => setFormDuration(parseInt(v))}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {durations.map((d) => (
                      <SelectItem key={d} value={String(d)}>{d} min</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label className="text-sm font-medium">Observações</Label>
              <Input
                className="mt-1"
                placeholder="Notas opcionais..."
                value={formNotes}
                onChange={(e) => setFormNotes(e.target.value)}
              />
            </div>

            {editingAppt && (
              <div>
                <Label className="text-sm font-medium">Status</Label>
                <Select
                  value={editingAppt.status}
                  onValueChange={(v) => setEditingAppt({ ...editingAppt, status: v })}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="scheduled">Agendado</SelectItem>
                    <SelectItem value="completed">Concluído</SelectItem>
                    <SelectItem value="cancelled">Cancelado</SelectItem>
                    <SelectItem value="no_show">Não compareceu</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <Button variant="outline" className="flex-1" onClick={() => setShowModal(false)}>
                Cancelar
              </Button>
              <Button className="flex-1" onClick={handleSubmit} disabled={createMutation.isPending || updateMutation.isPending}>
                {editingAppt ? "Salvar" : "Agendar"}
              </Button>
            </div>

            {editingAppt && (
              <Button
                variant="destructive"
                className="w-full"
                onClick={() => { deleteMutation.mutate({ id: editingAppt.id }); setShowModal(false); }}
              >
                <Trash2 className="h-4 w-4 mr-2" /> Excluir Agendamento
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
