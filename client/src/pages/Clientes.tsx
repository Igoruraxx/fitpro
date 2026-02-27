import { trpc } from "@/lib/trpc";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Search, Phone, Trash2, Edit, Users, Calendar, Package, CreditCard, Clock, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { useLocation } from "wouter";

const STATUS_STYLES: Record<string, string> = {
  active: "bg-green-500/20 text-green-400 border border-green-500/30",
  inactive: "bg-red-500/20 text-red-400 border border-red-500/30",
  trial: "bg-yellow-500/20 text-yellow-400 border border-yellow-500/30",
};

const STATUS_LABELS: Record<string, string> = {
  active: "Ativo",
  inactive: "Inativo",
  trial: "Pausado",
};

const WEEKDAYS = [
  { value: "1", label: "Seg" },
  { value: "2", label: "Ter" },
  { value: "3", label: "Qua" },
  { value: "4", label: "Qui" },
  { value: "5", label: "Sex" },
  { value: "6", label: "Sáb" },
  { value: "0", label: "Dom" },
];

function ClientSkeleton() {
  return (
    <div className="flex items-center gap-3 p-3 rounded-xl border border-border bg-card">
      <Skeleton className="h-11 w-11 rounded-full" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-3 w-48" />
      </div>
      <Skeleton className="h-8 w-16 rounded-full" />
    </div>
  );
}

function getNextWeekdayDate(weekday: number): string {
  const today = new Date();
  const diff = (weekday - today.getDay() + 7) % 7 || 7;
  const next = new Date(today);
  next.setDate(today.getDate() + diff);
  return next.toISOString().split("T")[0];
}

export default function Clientes() {
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [deleteTarget, setDeleteTarget] = useState<any>(null);
  const [, setLocation] = useLocation();

  // Form fields
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [gender, setGender] = useState<string>("");
  const [status, setStatus] = useState("active");
  const [planType, setPlanType] = useState("monthly");

  // Monthly plan
  const [monthlyFee, setMonthlyFee] = useState("");
  const [paymentDay, setPaymentDay] = useState("5");

  // Package plan
  const [packageSessions, setPackageSessions] = useState("10");
  const [packageValue, setPackageValue] = useState("");

  // Session schedule
  const [sessionsPerWeek, setSessionsPerWeek] = useState("3");
  const [selectedDays, setSelectedDays] = useState<string[]>(["1", "3", "5"]);
  const [sessionTime, setSessionTime] = useState("07:00");
  const [sessionDuration, setSessionDuration] = useState("60");

  // Prepaid
  const [prepaidValue, setPrepaidValue] = useState("");
  const [prepaidDueDate, setPrepaidDueDate] = useState("");

  // Auto-schedule toggle
  const [autoSchedule, setAutoSchedule] = useState(true);

  const utils = trpc.useUtils();

  const { data: clients = [], isLoading } = trpc.clients.list.useQuery();

  const createMutation = trpc.clients.create.useMutation({
    onSuccess: () => { toast.success("Aluno cadastrado!"); utils.clients.list.invalidate(); setShowModal(false); },
    onError: (e) => toast.error(e.message),
  });

  const createRecurringMutation = trpc.appointments.createRecurring.useMutation({
    onSuccess: (data) => toast.success(`${data.count} sessões agendadas automaticamente!`),
    onError: (e) => toast.error("Erro ao agendar sessões: " + e.message),
  });

  const updateMutation = trpc.clients.update.useMutation({
    onSuccess: () => { toast.success("Aluno atualizado!"); utils.clients.list.invalidate(); setShowModal(false); },
    onError: (e) => toast.error(e.message),
  });

  const deleteMutation = trpc.clients.delete.useMutation({
    onSuccess: () => { toast.success("Aluno excluído!"); utils.clients.list.invalidate(); setDeleteTarget(null); },
    onError: (e) => toast.error(e.message),
  });

  const filtered = clients.filter((c: any) =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    (c.phone && c.phone.includes(search))
  );

  const resetForm = () => {
    setName(""); setPhone(""); setGender(""); setStatus("active");
    setPlanType("monthly"); setMonthlyFee(""); setPaymentDay("5");
    setPackageSessions("10"); setPackageValue("");
    setSessionsPerWeek("3"); setSelectedDays(["1", "3", "5"]);
    setSessionTime("07:00"); setSessionDuration("60");
    setPrepaidValue(""); setPrepaidDueDate(""); setAutoSchedule(true);
  };

  const openNew = () => {
    setEditing(null);
    resetForm();
    setShowModal(true);
  };

  const openEdit = (c: any) => {
    setEditing(c);
    setName(c.name); setPhone(c.phone || ""); setGender(c.gender || "");
    setStatus(c.status || "active"); setPlanType(c.planType || "monthly");
    setMonthlyFee(c.monthlyFee || ""); setPaymentDay(String(c.paymentDay || 5));
    setPackageSessions(String(c.packageSessions || 10)); setPackageValue(c.packageValue || "");
    setSessionsPerWeek(String(c.sessionsPerWeek || 3));
    setSelectedDays(c.sessionDays ? c.sessionDays.split(",") : ["1", "3", "5"]);
    setSessionTime(c.sessionTime || "07:00"); setSessionDuration(String(c.sessionDuration || 60));
    setPrepaidValue(c.prepaidValue || ""); setPrepaidDueDate(c.prepaidDueDate || "");
    setAutoSchedule(false); // Don't auto-schedule on edit
    setShowModal(true);
  };

  const toggleDay = (day: string) => {
    setSelectedDays(prev =>
      prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]
    );
  };

  const handleSubmit = async () => {
    if (!name.trim()) { toast.error("Nome é obrigatório"); return; }
    if (selectedDays.length === 0) { toast.error("Selecione pelo menos um dia de treino"); return; }

    const payload: any = {
      name,
      phone: phone || undefined,
      gender: gender || undefined,
      status: status as any,
      planType: planType as any,
      sessionsPerWeek: parseInt(sessionsPerWeek) || 3,
      sessionDays: selectedDays.sort().join(","),
      sessionTime,
      sessionDuration: parseInt(sessionDuration) || 60,
    };

    if (planType === "monthly") {
      payload.monthlyFee = monthlyFee || undefined;
      payload.paymentDay = parseInt(paymentDay) || undefined;
    } else if (planType === "package") {
      payload.packageSessions = parseInt(packageSessions) || undefined;
      payload.sessionsRemaining = parseInt(packageSessions) || undefined;
      payload.packageValue = packageValue || undefined;
    }

    if (prepaidValue) payload.prepaidValue = prepaidValue;
    if (prepaidDueDate) payload.prepaidDueDate = prepaidDueDate;

    if (editing) {
      updateMutation.mutate({ id: editing.id, ...payload });
    } else {
      const result = await createMutation.mutateAsync(payload);
      // Auto-schedule sessions for the next 4 weeks
      if (autoSchedule && result?.id && selectedDays.length > 0) {
        const today = new Date().toISOString().split("T")[0];
        const fourWeeksLater = new Date();
        fourWeeksLater.setDate(fourWeeksLater.getDate() + 28);
        const endDate = fourWeeksLater.toISOString().split("T")[0];

        await createRecurringMutation.mutateAsync({
          clientId: result.id,
          startDate: today,
          endDate,
          startTime: sessionTime,
          duration: parseInt(sessionDuration) || 60,
          recurrenceType: "weekly",
          recurrenceDays: selectedDays.sort().join(","),
        });
      }
    }
  };

  const activeCount = clients.filter((c: any) => c.status === "active").length;

  return (
    <div className="space-y-4 p-4 md:p-0">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold">Alunos</h2>
          <p className="text-sm text-muted-foreground">
            {activeCount} ativo{activeCount !== 1 ? "s" : ""} · {clients.length} total
          </p>
        </div>
        <Button onClick={openNew}>
          <Plus className="h-4 w-4 mr-2" /> Novo Aluno
        </Button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por nome ou telefone..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* List */}
      {isLoading ? (
        <div className="space-y-2">
          {[...Array(4)].map((_, i) => <ClientSkeleton key={i} />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Users className="h-12 w-12 text-muted-foreground/30 mb-4" />
          <h3 className="text-lg font-medium text-muted-foreground">
            {search ? "Nenhum aluno encontrado" : "Nenhum aluno cadastrado"}
          </h3>
          <p className="text-sm text-muted-foreground/70 mt-1">
            {search ? "Tente outro termo de busca." : "Cadastre seu primeiro aluno para começar."}
          </p>
          {!search && (
            <Button className="mt-4" onClick={openNew}>
              <Plus className="h-4 w-4 mr-2" /> Cadastrar Aluno
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((client: any) => {
            const isPackage = client.planType === "package";
            const sessionsLow = isPackage && client.sessionsRemaining !== null && client.sessionsRemaining <= 3;

            return (
              <div
                key={client.id}
                className="flex items-center gap-3 p-3 rounded-xl border border-border bg-card hover:bg-accent/30 transition-colors cursor-pointer"
                onClick={() => setLocation(`/clientes/${client.id}`)}
              >
                <Avatar className="h-11 w-11 border border-border shrink-0">
                  <AvatarFallback className="bg-primary/20 text-primary text-sm font-bold">
                    {client.name.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-sm">{client.name}</span>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${STATUS_STYLES[client.status] || ""}`}>
                      {STATUS_LABELS[client.status] || client.status}
                    </span>
                    {sessionsLow && (
                      <span className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-medium bg-orange-500/20 text-orange-400 border border-orange-500/30">
                        <AlertTriangle className="h-2.5 w-2.5" />
                        {client.sessionsRemaining === 0 ? "Sem sessões" : `${client.sessionsRemaining} restante${client.sessionsRemaining !== 1 ? "s" : ""}`}
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground mt-0.5">
                    {client.phone && (
                      <span className="flex items-center gap-1">
                        <Phone className="h-3 w-3" /> {client.phone}
                      </span>
                    )}
                    {client.sessionDays && (
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {client.sessionsPerWeek}x/sem · {client.sessionTime}
                      </span>
                    )}
                    {isPackage && client.sessionsRemaining !== null && !sessionsLow && (
                      <span className="flex items-center gap-1">
                        <Package className="h-3 w-3" /> {client.sessionsRemaining}/{client.packageSessions} sessões
                      </span>
                    )}
                  </div>
                </div>
                {/* Plan value */}
                <div className="text-right shrink-0 hidden sm:block">
                  {client.planType === "monthly" && client.monthlyFee && (
                    <>
                      <div className="text-sm font-bold text-primary">R$ {parseFloat(client.monthlyFee).toFixed(0)}</div>
                      <div className="text-[10px] text-muted-foreground">/mês</div>
                    </>
                  )}
                  {client.planType === "package" && client.packageValue && (
                    <>
                      <div className="text-sm font-bold text-primary">R$ {parseFloat(client.packageValue).toFixed(0)}</div>
                      <div className="text-[10px] text-muted-foreground">pacote</div>
                    </>
                  )}
                </div>
                <div className="flex gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(client)}>
                    <Edit className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="ghost" size="icon"
                    className="h-8 w-8 text-destructive hover:text-destructive"
                    onClick={() => setDeleteTarget(client)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create/Edit Modal */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "Editar Aluno" : "Novo Aluno"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">

            {/* Basic Info */}
            <div>
              <Label>Nome completo *</Label>
              <Input className="mt-1" value={name} onChange={(e) => setName(e.target.value)} placeholder="Nome do aluno" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Telefone</Label>
                <Input className="mt-1" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="(11) 99999-9999" />
              </div>
              <div>
                <Label>Gênero</Label>
                <Select value={gender} onValueChange={setGender}>
                  <SelectTrigger className="mt-1"><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="male">Masculino</SelectItem>
                    <SelectItem value="female">Feminino</SelectItem>
                    <SelectItem value="other">Outro</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Status */}
            <div>
              <Label>Status</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Ativo</SelectItem>
                  <SelectItem value="inactive">Inativo</SelectItem>
                  <SelectItem value="trial">Pausado</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Plan Type */}
            <div className="border-t border-border pt-4">
              <Label className="text-sm font-semibold text-foreground">Tipo de Plano</Label>
              <div className="grid grid-cols-2 gap-2 mt-2">
                <button
                  type="button"
                  onClick={() => setPlanType("monthly")}
                  className={`flex items-center gap-2 p-3 rounded-lg border text-sm font-medium transition-colors ${
                    planType === "monthly"
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border bg-card text-muted-foreground hover:bg-accent/30"
                  }`}
                >
                  <CreditCard className="h-4 w-4" />
                  Mensalidade
                </button>
                <button
                  type="button"
                  onClick={() => setPlanType("package")}
                  className={`flex items-center gap-2 p-3 rounded-lg border text-sm font-medium transition-colors ${
                    planType === "package"
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border bg-card text-muted-foreground hover:bg-accent/30"
                  }`}
                >
                  <Package className="h-4 w-4" />
                  Pacote de Aulas
                </button>
              </div>
            </div>

            {/* Monthly Plan Fields */}
            {planType === "monthly" && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Mensalidade (R$)</Label>
                  <Input className="mt-1" type="number" value={monthlyFee} onChange={(e) => setMonthlyFee(e.target.value)} placeholder="0,00" />
                </div>
                <div>
                  <Label>Dia de vencimento</Label>
                  <Select value={paymentDay} onValueChange={setPaymentDay}>
                    <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {[1,5,10,15,20,25,28,30].map(d => (
                        <SelectItem key={d} value={String(d)}>Dia {d}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            {/* Package Plan Fields */}
            {planType === "package" && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Quantidade de aulas</Label>
                  <Input className="mt-1" type="number" value={packageSessions} onChange={(e) => setPackageSessions(e.target.value)} placeholder="10" />
                </div>
                <div>
                  <Label>Valor do pacote (R$)</Label>
                  <Input className="mt-1" type="number" value={packageValue} onChange={(e) => setPackageValue(e.target.value)} placeholder="0,00" />
                </div>
              </div>
            )}

            {/* Session Schedule */}
            <div className="border-t border-border pt-4">
              <Label className="text-sm font-semibold text-foreground">Horário de Treino</Label>

              {/* Days of week */}
              <div className="mt-2">
                <Label className="text-xs text-muted-foreground">Dias da semana</Label>
                <div className="flex gap-1.5 mt-1.5 flex-wrap">
                  {WEEKDAYS.map((day) => (
                    <button
                      key={day.value}
                      type="button"
                      onClick={() => toggleDay(day.value)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                        selectedDays.includes(day.value)
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border bg-card text-muted-foreground hover:bg-accent/30"
                      }`}
                    >
                      {day.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3 mt-3">
                <div>
                  <Label className="text-xs text-muted-foreground">Horário</Label>
                  <Input className="mt-1" type="time" value={sessionTime} onChange={(e) => setSessionTime(e.target.value)} />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Duração (min)</Label>
                  <Select value={sessionDuration} onValueChange={setSessionDuration}>
                    <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="30">30 min</SelectItem>
                      <SelectItem value="45">45 min</SelectItem>
                      <SelectItem value="60">60 min</SelectItem>
                      <SelectItem value="90">90 min</SelectItem>
                      <SelectItem value="120">120 min</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Sessões/sem</Label>
                  <Select value={sessionsPerWeek} onValueChange={setSessionsPerWeek}>
                    <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {[1,2,3,4,5,6,7].map(n => (
                        <SelectItem key={n} value={String(n)}>{n}x</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Prepaid */}
            <div className="border-t border-border pt-4">
              <Label className="text-sm font-semibold text-foreground">Pagamento Antecipado (opcional)</Label>
              <div className="grid grid-cols-2 gap-3 mt-2">
                <div>
                  <Label className="text-xs text-muted-foreground">Valor (R$)</Label>
                  <Input className="mt-1" type="number" value={prepaidValue} onChange={(e) => setPrepaidValue(e.target.value)} placeholder="0,00" />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Próximo vencimento</Label>
                  <Input className="mt-1" type="date" value={prepaidDueDate} onChange={(e) => setPrepaidDueDate(e.target.value)} />
                </div>
              </div>
            </div>

            {/* Auto-schedule toggle (only for new clients) */}
            {!editing && (
              <div className="flex items-center gap-3 p-3 rounded-lg bg-primary/5 border border-primary/20">
                <Checkbox
                  id="autoSchedule"
                  checked={autoSchedule}
                  onCheckedChange={(v) => setAutoSchedule(Boolean(v))}
                />
                <div>
                  <label htmlFor="autoSchedule" className="text-sm font-medium cursor-pointer">
                    Agendar próximas 4 semanas automaticamente
                  </label>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Cria sessões recorrentes com base nos dias e horário selecionados
                  </p>
                </div>
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <Button variant="outline" className="flex-1" onClick={() => setShowModal(false)}>Cancelar</Button>
              <Button
                className="flex-1"
                onClick={handleSubmit}
                disabled={createMutation.isPending || updateMutation.isPending}
              >
                {editing ? "Salvar" : "Cadastrar"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(v) => !v && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir aluno?</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir <strong>{deleteTarget?.name}</strong>? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90"
              onClick={() => deleteTarget && deleteMutation.mutate({ id: deleteTarget.id })}
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
