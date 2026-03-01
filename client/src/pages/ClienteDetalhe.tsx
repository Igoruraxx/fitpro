import { trpc } from "@/lib/trpc";
import { useParams, useLocation } from "wouter";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import {
  ArrowLeft, Phone, Calendar, TrendingUp, Loader2,
  CheckCircle2, Clock, AlertCircle, MessageCircle,
  Camera, Activity, DollarSign, User, Dumbbell, Edit2, Trash2, AlertTriangle, CalendarClock
} from "lucide-react";
import { format, isPast, isToday } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";

const PLAN_LABELS: Record<string, string> = {
  monthly: "Mensalidade",
  package: "Pacote",
  consulting: "Consultoria",
};

const STATUS_LABELS: Record<string, string> = {
  active: "Ativo",
  inactive: "Inativo",
  trial: "Experimental",
};

const STATUS_COLORS: Record<string, string> = {
  active: "bg-emerald-50 text-emerald-700",
  inactive: "bg-red-50 text-red-700",
  trial: "bg-amber-50 text-amber-700",
};

const APPT_STATUS_LABELS: Record<string, string> = {
  scheduled: "Agendado",
  completed: "Concluído",
  cancelled: "Cancelado",
  no_show: "Faltou",
};

const APPT_STATUS_COLORS: Record<string, string> = {
  scheduled: "bg-blue-50 text-blue-700",
  completed: "bg-emerald-50 text-emerald-700",
  cancelled: "bg-slate-100 text-slate-500",
  no_show: "bg-red-50 text-red-700",
};

const TX_STATUS_LABELS: Record<string, string> = {
  paid: "Pago",
  pending: "Pendente",
  overdue: "Atrasado",
  cancelled: "Cancelado",
};

const TX_STATUS_COLORS: Record<string, string> = {
  paid: "bg-emerald-50 text-emerald-700",
  pending: "bg-amber-50 text-amber-700",
  overdue: "bg-red-50 text-red-700",
  cancelled: "bg-slate-100 text-slate-500",
};

type Tab = "overview" | "sessions" | "finances" | "evolution";

export default function ClienteDetalhe() {
  const params = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState<Tab>("overview");
  const [sessionToComplete, setSessionToComplete] = useState<any>(null);
  const [showDeleteFutureDialog, setShowDeleteFutureDialog] = useState(false);
  const [showDeleteAllDialog, setShowDeleteAllDialog] = useState(false);
  const clientId = parseInt(params.id || "0");

  const utils = trpc.useUtils();
  const { data: client, isLoading } = trpc.clients.getById.useQuery({ id: clientId });
  const { data: appointments = [] } = trpc.appointments.listByClient.useQuery({ clientId });
  const { data: transactions = [] } = trpc.finances.listByClient.useQuery({ clientId });
  const { data: photos = [] } = trpc.photos.listAll.useQuery({ clientId });
  const { data: bioExams = [] } = trpc.bioimpedance.list.useQuery({ clientId });
  const { data: pendingSessions = [], isLoading: isPendingLoading } = trpc.appointments.pendingByClient.useQuery({ clientId });

  const markPaidMutation = trpc.finances.markPaid.useMutation({
    onSuccess: () => {
      toast.success("Pagamento confirmado!");
      utils.finances.listByClient.invalidate({ clientId });
      utils.finances.overdueClients.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const markPendingMutation = trpc.finances.markPending.useMutation({
    onSuccess: () => {
      toast.success("Baixa desfeita!");
      utils.finances.listByClient.invalidate({ clientId });
      utils.finances.overdueClients.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const completeSessionMutation = trpc.appointments.update.useMutation({
    onSuccess: () => {
      toast.success("Sessão concluída!");
      utils.appointments.listByClient.invalidate({ clientId });
      utils.appointments.pendingByClient.invalidate({ clientId });
    },
    onError: (e) => toast.error(e.message),
  });

  const deleteFutureAppointmentsMutation = trpc.appointments.deleteFutureByClient.useMutation({
    onSuccess: (data) => {
      toast.success(`${data.deleted} agendamento(s) futuro(s) excluído(s)!`);
      utils.appointments.listByClient.invalidate({ clientId });
      utils.appointments.pendingByClient.invalidate({ clientId });
      setShowDeleteFutureDialog(false);
    },
    onError: (e) => toast.error(e.message),
  });

  const deleteAllAppointmentsMutation = trpc.appointments.deleteAllByClient.useMutation({
    onSuccess: (data) => {
      toast.success(`${data.deleted} agendamento(s) excluído(s)!`);
      utils.appointments.listByClient.invalidate({ clientId });
      utils.appointments.pendingByClient.invalidate({ clientId });
      setShowDeleteAllDialog(false);
    },
    onError: (e) => toast.error(e.message),
  });

  const renewPackageMutation = trpc.clients.renewPackage.useMutation({
    onSuccess: () => {
      toast.success("Pacote renovado! Recebimento lançado no financeiro.");
      utils.clients.getById.invalidate({ id: clientId });
      utils.finances.listByClient.invalidate({ clientId });
      utils.appointments.listByClient.invalidate({ clientId });
      utils.appointments.pendingByClient.invalidate({ clientId });
    },
    onError: (e) => toast.error(e.message),
  });

  const appointmentsQuery = trpc.appointments.listByClient.useQuery({ clientId });
  const generateRemainingMutation = trpc.clients.generateRemainingAppointments.useMutation({
    onSuccess: async (data) => {
      toast.success(data.message);
      await utils.appointments.listByClient.invalidate({ clientId });
      await utils.appointments.pendingByClient.invalidate({ clientId });
      await utils.clients.getById.invalidate({ id: clientId });
      appointmentsQuery.refetch();
    },
    onError: (e) => toast.error(e.message),
  });


  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!client) {
    return (
      <div className="p-4 text-center">
        <p className="text-muted-foreground">Cliente não encontrado</p>
        <Button variant="outline" className="mt-4" onClick={() => setLocation("/clientes")}>Voltar</Button>
      </div>
    );
  }

  // Contar apenas agendamentos futuros (data >= hoje)
  const today = new Date().toISOString().split('T')[0];
  const futureAppointments = (appointments as any[]).filter(a => {
    const apptDate = new Date(a.date).toISOString().split('T')[0];
    return apptDate >= today;
  });
  const completedSessions = (appointments as any[]).filter(a => a.status === "completed").length;
  const totalSessions = futureAppointments.length;
  
  // Calcular quantas sessões já foram criadas (agendadas)
  const totalPackageSessions = client.packageSessions ?? 0;
  const sessionsCreated = totalPackageSessions - (client.sessionsRemaining ?? 0);
  const allSessionsCreated = (client.sessionsRemaining ?? 0) <= 0 && totalSessions >= totalPackageSessions;
  const paidTransactions = (transactions as any[]).filter(t => t.status === "paid");
  const totalPaid = paidTransactions.reduce((s, t) => s + parseFloat(t.amount), 0);
  const pendingTransactions = (transactions as any[]).filter(t => t.status !== "paid" && t.status !== "cancelled");

  const sendWhatsApp = () => {
    const phone = client.phone?.replace(/\D/g, "");
    if (!phone) { toast.error("Aluno sem telefone cadastrado"); return; }
    const msg = encodeURIComponent(`Olá ${client.name}! 😊`);
    window.open(`https://wa.me/55${phone}?text=${msg}`, "_blank");
  };

  const isOverdue = (t: any) => {
    if (t.status === "paid" || t.status === "cancelled") return false;
    if (!t.dueDate) return false;
    const due = new Date(t.dueDate + "T12:00:00");
    return isPast(due) && !isToday(due);
  };

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: "overview", label: "Visão Geral", icon: <User className="h-3.5 w-3.5" /> },
    { id: "sessions", label: "Sessões", icon: <Dumbbell className="h-3.5 w-3.5" /> },
    { id: "finances", label: "Financeiro", icon: <DollarSign className="h-3.5 w-3.5" /> },
    { id: "evolution", label: "Evolução", icon: <TrendingUp className="h-3.5 w-3.5" /> },
  ];

  return (
    <div className="space-y-4">
      {/* Back button */}
      <Button variant="ghost" size="sm" onClick={() => setLocation("/clientes")} className="text-muted-foreground -ml-2">
        <ArrowLeft className="h-4 w-4 mr-1" /> Voltar para Alunos
      </Button>

      {/* Profile card */}
      <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
        <div className="flex items-start gap-4">
          <Avatar className="h-16 w-16 border-2 border-primary/20 shrink-0">
            {client.photoUrl ? (
              <img src={client.photoUrl} alt={client.name} className="h-full w-full object-cover rounded-full" />
            ) : (
              <AvatarFallback className="bg-primary/10 text-primary text-xl font-bold">
                {client.name.charAt(0).toUpperCase()}
              </AvatarFallback>
            )}
          </Avatar>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-xl font-bold text-foreground">{client.name}</h2>
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[client.status] || ""}`}>
                {STATUS_LABELS[client.status] || client.status}
              </span>
            </div>
            <div className="flex flex-wrap gap-3 mt-1.5 text-sm text-muted-foreground">
              {client.phone && (
                <button onClick={sendWhatsApp} className="flex items-center gap-1 hover:text-foreground transition-colors">
                  <Phone className="h-3.5 w-3.5" />
                  {client.phone}
                </button>
              )}
              <span className="flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5" />
                Desde {format(new Date(client.createdAt), "MMM yyyy", { locale: ptBR })}
              </span>
            </div>
            <div className="mt-2 flex items-center gap-2">
              <span className="text-xs px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 font-medium">
                {PLAN_LABELS[client.planType] || client.planType}
              </span>
              {client.planType === "monthly" && client.monthlyFee && (
                <span className="text-sm font-semibold text-primary">R$ {parseFloat(client.monthlyFee).toFixed(2)}/mês</span>
              )}
              {client.planType === "package" && client.sessionsRemaining !== null && (
                <span className="text-sm font-semibold text-primary">{client.sessionsRemaining} sessões restantes</span>
              )}
            </div>
          </div>
        </div>

        {/* Quick stats */}
        <div className="grid grid-cols-3 gap-3 mt-4 pt-4 border-t border-border">
          <div className="text-center">
            <div className="text-lg font-bold text-foreground">{completedSessions}</div>
            <div className="text-xs text-muted-foreground">Concluídas</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-bold text-foreground">{(bioExams as any[]).length}</div>
            <div className="text-xs text-muted-foreground">Avaliações</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-bold text-emerald-600">R$ {totalPaid.toFixed(2)}</div>
            <div className="text-xs text-muted-foreground">Pago</div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-muted/40 rounded-xl p-1">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-2 rounded-lg text-xs font-medium transition-colors ${
              activeTab === tab.id
                ? "bg-white text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab.icon}
            <span className="hidden sm:inline">{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Tab: Visão Geral */}
      {activeTab === "overview" && (
        <div className="space-y-4">
          {/* Plan details */}
          <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
            <h3 className="text-sm font-semibold text-foreground mb-3">Detalhes do Plano</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Tipo de plano</span>
                <span className="font-medium">{PLAN_LABELS[client.planType]}</span>
              </div>
              {client.planType === "monthly" && (
                <>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Mensalidade</span>
                    <span className="font-medium text-primary">R$ {parseFloat(client.monthlyFee || "0").toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Vencimento</span>
                    <span className="font-medium">Dia {client.paymentDay}</span>
                  </div>
                </>
              )}
              {client.planType === "package" && (
                <>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Valor do pacote</span>
                    <span className="font-medium text-primary">R$ {parseFloat(client.packageValue || "0").toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Sessões contratadas</span>
                    <span className="font-medium">{client.packageSessions}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Sessões restantes</span>
                    <span className={`font-medium ${(client.sessionsRemaining ?? 0) <= 3 ? "text-amber-600" : "text-foreground"}`}>
                      {client.sessionsRemaining ?? 0}
                    </span>
                  </div>
                  {/* Botões de ação do pacote */}
                  <div className="flex flex-col gap-2 mt-2">
                    {/* Botão criar sessões restantes - aparece apenas se há sessões não criadas */}
                    {sessionsCreated < totalPackageSessions && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="w-full text-blue-600 border-blue-300 hover:bg-blue-50"
                        onClick={() => {
                          const confirmGen = window.confirm(
                            `Criar agendamentos para as ${client.sessionsRemaining} sessões restantes?\nSerão geradas nas datas futuras conforme os dias e horários configurados.`
                          );
                          if (confirmGen) {
                            generateRemainingMutation.mutate({ clientId });
                          }
                        }}
                        disabled={generateRemainingMutation.isPending}
                      >
                        <CalendarClock className="h-4 w-4 mr-2" />
                        {generateRemainingMutation.isPending ? "Agendando..." : `Criar ${client.sessionsRemaining} Sessões Restantes`}
                      </Button>
                    )}
                    {/* Botão renovar pacote - aparece quando sessões chegam a 0 ou menos */}
                    {(client.sessionsRemaining ?? 0) <= 0 && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="w-full text-primary border-primary hover:bg-primary/5"
                        onClick={() => {
                          const confirmRenew = window.confirm(
                            `Renovar pacote de ${client.packageSessions} sessões por R$ ${parseFloat(client.packageValue || "0").toFixed(2)}?\nUma nova entrada será lançada no financeiro.`
                          );
                          if (confirmRenew) {
                            renewPackageMutation.mutate({ clientId });
                          }
                        }}
                        disabled={renewPackageMutation.isPending}
                      >
                        {renewPackageMutation.isPending ? "Renovando..." : "Renovar Pacote"}
                      </Button>
                    )}
                    {/* Indicador: todas as sessões já foram criadas */}
                    {totalSessions >= totalPackageSessions && totalPackageSessions > 0 && (
                      <div className="flex items-center gap-2 p-2 rounded-lg bg-emerald-50 border border-emerald-200">
                        <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                        <span className="text-xs text-emerald-700 font-medium">
                          Todas as {totalPackageSessions} sessões já foram criadas
                        </span>
                      </div>
                    )}
                  </div>
                  {/* Sessões pendentes agendadas */}
                  {((pendingSessions as any[]).length > 0 || isPendingLoading) && (
                    <div className="flex items-center gap-2 mt-1 p-2 rounded-lg bg-blue-50 border border-blue-100">
                      {isPendingLoading ? (
                        <>
                          <Loader2 className="h-4 w-4 text-blue-500 shrink-0 animate-spin" />
                          <span className="text-xs text-blue-700 font-medium">Recalculando sessões pendentes...</span>
                        </>
                      ) : (
                        <>
                          <CalendarClock className="h-4 w-4 text-blue-500 shrink-0" />
                          <span className="text-xs text-blue-700 font-medium">
                            {(pendingSessions as any[]).length} sessão(ões) agendada(s) pendente(s)
                          </span>
                        </>
                      )}
                    </div>
                  )}
                </>
              )}
              {client.sessionsPerWeek && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Frequência</span>
                  <span className="font-medium">{client.sessionsPerWeek}x por semana</span>
                </div>
              )}
              {client.sessionTimesPerDay && (() => {
                try {
                  const timesObj = typeof client.sessionTimesPerDay === 'string'
                    ? JSON.parse(client.sessionTimesPerDay)
                    : client.sessionTimesPerDay;
                  const dayNames: Record<string, string> = { '0':'Dom','1':'Seg','2':'Ter','3':'Qua','4':'Qui','5':'Sex','6':'Sáb' };
                  const entries = Object.entries(timesObj) as [string, string][];
                  if (entries.length > 0) return (
                    <div>
                      <span className="text-muted-foreground text-xs block mb-1">Horários por dia</span>
                      <div className="flex flex-wrap gap-1">
                        {entries.sort((a,b)=>Number(a[0])-Number(b[0])).map(([day, time]) => (
                          <span key={day} className="text-xs bg-muted rounded px-2 py-0.5 font-medium">{dayNames[day] ?? day}: {time}</span>
                        ))}
                      </div>
                    </div>
                  );
                } catch { return null; }
              })()}
              {/* Histórico de renovações */}
              {client.planType === 'package' && client.renovationHistory && (() => {
                try {
                  const history = typeof client.renovationHistory === 'string'
                    ? JSON.parse(client.renovationHistory)
                    : client.renovationHistory;
                  if (Array.isArray(history) && history.length > 0) {
                    return (
                      <div className="mt-4 pt-4 border-t">
                        <h4 className="text-xs font-semibold text-muted-foreground mb-3 uppercase tracking-wide">Histórico de Renovações</h4>
                        <div className="space-y-2">
                          {history.map((renewal: any, idx: number) => (
                            <div key={idx} className="flex items-start gap-3 text-xs">
                              <div className="w-2 h-2 rounded-full bg-primary mt-1.5 shrink-0" />
                              <div className="flex-1">
                                <p className="font-medium text-foreground">
                                  {renewal.newSessions} sessões renovadas
                                </p>
                                <p className="text-muted-foreground">
                                  {renewal.sessionsUsed} sessões usadas • {format(new Date(renewal.date), 'dd/MM/yyyy')}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  }
                  return null;
                } catch { return null; }
              })()}
              {client.sessionTime && !client.sessionTimesPerDay && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Horário padrão</span>
                  <span className="font-medium">{client.sessionTime}</span>
                </div>
              )}
              {client.birthDate && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Data de nascimento</span>
                  <span className="font-medium">{format(new Date(client.birthDate + "T12:00:00"), "dd/MM/yyyy")}</span>
                </div>
              )}
            </div>
          </div>

          {/* Pending charges */}
          {pendingTransactions.length > 0 && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
              <h3 className="text-sm font-semibold text-amber-800 mb-2 flex items-center gap-2">
                <AlertCircle className="h-4 w-4" />
                Cobranças Pendentes
              </h3>
              <div className="space-y-2">
                {(pendingTransactions as any[]).map((t: any) => {
                  const overdue = isOverdue(t);
                  return (
                    <div key={t.id} className="flex items-center justify-between">
                      <div>
                        <span className="text-sm font-medium text-amber-900">{t.category}</span>
                        {t.dueDate && (
                          <span className={`text-xs ml-2 ${overdue ? "text-red-600 font-medium" : "text-amber-700"}`}>
                            · {overdue ? "Venceu" : "Vence"} {format(new Date(t.dueDate + "T12:00:00"), "dd/MM/yyyy")}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-amber-900">R$ {parseFloat(t.amount).toFixed(2)}</span>
                        <Button
                          size="sm" variant="ghost"
                          className="h-7 text-emerald-700 hover:bg-emerald-100 text-xs px-2"
                          onClick={() => markPaidMutation.mutate({ id: t.id })}
                          disabled={markPaidMutation.isPending}
                        >
                          <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                          Baixa
                        </Button>
                        {overdue && client.phone && (
                          <Button
                            size="sm" variant="ghost"
                            className="h-7 text-green-700 hover:bg-green-100 text-xs px-2"
                            onClick={() => {
                              const phone = client.phone?.replace(/\D/g, "");
                              const msg = encodeURIComponent(`Olá ${client.name}! 😊\n\nPassando para lembrar que há um pagamento pendente de R$ ${parseFloat(t.amount).toFixed(2)} em aberto.\n\nQualquer dúvida, estou à disposição! 🏋️`);
                              window.open(`https://wa.me/55${phone}?text=${msg}`, "_blank");
                            }}
                          >
                            <MessageCircle className="h-3.5 w-3.5 mr-1" />
                            WhatsApp
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Recent sessions */}
          {(appointments as any[]).length > 0 && (
            <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-foreground">Últimas Sessões</h3>
                <button onClick={() => setActiveTab("sessions")} className="text-xs text-primary hover:underline">Ver todas</button>
              </div>
              <div className="space-y-2">
                {(appointments as any[]).slice(0, 4).map((a: any) => {
                  // Check if package is near completion (80%+)
                  const isPackageNearEnd = client?.planType === 'package' && 
                    client?.packageSessions && 
                    client?.sessionsRemaining !== null && 
                    ((client.packageSessions - client.sessionsRemaining) / client.packageSessions) >= 0.8;
                  
                  return (
                    <div 
                      key={a.id} 
                      className={`flex items-center justify-between text-sm py-1.5 px-2 border-b border-border/50 last:border-0 rounded-lg transition-colors ${
                        isPackageNearEnd ? 'bg-amber-50 border-amber-200' : ''
                      }`}
                    >
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        {isPackageNearEnd && (
                          <AlertTriangle className="h-4 w-4 text-amber-600 flex-shrink-0" />
                        )}
                        <span className="text-muted-foreground truncate">{format(new Date(a.date + "T12:00:00"), "dd/MM/yyyy")} · {a.startTime}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        {isPackageNearEnd && (
                          <span className="text-xs text-amber-700 font-medium flex-shrink-0">{client?.sessionsRemaining} restante{client?.sessionsRemaining !== 1 ? 's' : ''}</span>
                        )}
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${APPT_STATUS_COLORS[a.status] || ""}`}>
                          {APPT_STATUS_LABELS[a.status] || a.status}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tab: Sessões */}
      {activeTab === "sessions" && (
        <div className="space-y-2">
          <div className="flex flex-col gap-2 mb-3 sm:flex-row sm:items-center sm:justify-between">
            <span className="text-sm text-muted-foreground">{totalSessions} sessão{totalSessions !== 1 ? "ões" : ""} · {completedSessions} concluída{completedSessions !== 1 ? "s" : ""}</span>
            <div className="flex gap-2 flex-wrap">
              <Button
                size="sm"
                variant="outline"
                className="text-xs h-7 text-red-600 hover:text-red-700 hover:bg-red-50 flex-1 sm:flex-none"
                onClick={() => setShowDeleteFutureDialog(true)}
              >
                <Trash2 className="h-3 w-3 mr-1" />
                Excluir Futuros
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="text-xs h-7 text-red-700 hover:text-red-800 hover:bg-red-100 border-red-300 flex-1 sm:flex-none"
                onClick={() => setShowDeleteAllDialog(true)}
              >
                <Trash2 className="h-3 w-3 mr-1" />
                Excluir Todos
              </Button>
            </div>
          </div>
          {(appointments as any[]).length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center rounded-xl border border-dashed border-border bg-card/50">
              <Dumbbell className="h-10 w-10 text-muted-foreground/30 mb-3" />
              <p className="text-sm text-muted-foreground">Nenhuma sessão registrada</p>
            </div>
          ) : (
            (appointments as any[]).map((a: any) => {
              const isPackageNearEnd80 = client?.planType === 'package' &&
                client?.packageSessions &&
                client?.sessionsRemaining !== null &&
                ((client.packageSessions - (client.sessionsRemaining ?? 0)) / client.packageSessions) >= 0.8;
              const isPendingSession = a.status === 'scheduled';
              const highlightAmber = isPackageNearEnd80 && isPendingSession;
              return (
              <div key={a.id} className={`flex items-center gap-3 p-3.5 rounded-xl border shadow-sm ${
                highlightAmber ? 'border-amber-300 bg-amber-50' : 'border-border bg-card'
              }`}>
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                  highlightAmber ? 'bg-amber-100' : APPT_STATUS_COLORS[a.status]?.replace("text-", "bg-").replace("-700", "-100") || "bg-slate-100"
                }`}>
                  {highlightAmber ? <AlertTriangle className="h-4 w-4 text-amber-600" />
                    : a.status === "completed" ? <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    : a.status === "cancelled" ? <AlertCircle className="h-4 w-4 text-slate-400" />
                    : a.status === "no_show" ? <AlertCircle className="h-4 w-4 text-red-500" />
                    : <Clock className="h-4 w-4 text-blue-600" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-foreground">
                      {format(new Date(a.date + "T12:00:00"), "dd/MM/yyyy", { locale: ptBR })}
                    </span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
                      highlightAmber ? 'bg-amber-100 text-amber-700' : APPT_STATUS_COLORS[a.status] || ""
                    }`}>
                      {highlightAmber ? 'Pacote quase esgotado' : APPT_STATUS_LABELS[a.status] || a.status}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">{a.startTime} · {a.duration} min</p>
                  {a.muscleGroups && (
                    <p className="text-xs text-muted-foreground/70 mt-0.5 truncate">{a.muscleGroups.replace(/,/g, ", ")}</p>
                  )}
                </div>
                {a.status === "scheduled" && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="shrink-0"
                    onClick={() => setSessionToComplete(a)}
                  >
                    Concluir
                  </Button>
                )}
              </div>
              );
            })
          )}
        </div>
      )}

      {/* Tab: Financeiro */}
      {activeTab === "finances" && (
        <div className="space-y-2">
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="rounded-xl border border-border bg-card p-4 shadow-sm text-center">
              <div className="text-lg font-bold text-emerald-600">R$ {totalPaid.toFixed(2)}</div>
              <div className="text-xs text-muted-foreground mt-0.5">Total Pago</div>
            </div>
            <div className="rounded-xl border border-border bg-card p-4 shadow-sm text-center">
              <div className="text-lg font-bold text-amber-600">
                R$ {pendingTransactions.reduce((s, t) => s + parseFloat(t.amount), 0).toFixed(2)}
              </div>
              <div className="text-xs text-muted-foreground mt-0.5">Pendente</div>
            </div>
          </div>

          {(transactions as any[]).length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center rounded-xl border border-dashed border-border bg-card/50">
              <DollarSign className="h-10 w-10 text-muted-foreground/30 mb-3" />
              <p className="text-sm text-muted-foreground">Nenhuma cobrança registrada</p>
            </div>
          ) : (
            (transactions as any[]).map((t: any) => {
              const overdue = isOverdue(t);
              const effectiveStatus = overdue && t.status === "pending" ? "overdue" : t.status;
              return (
                <div key={t.id} className={`flex items-center gap-3 p-3.5 rounded-xl border shadow-sm ${
                  t.status === "paid"
                    ? "border-emerald-200 bg-emerald-100/40"
                    : overdue
                    ? "border-red-200 bg-red-100/40"
                    : "border-amber-200 bg-amber-100/40"
                }`}>
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                    effectiveStatus === "paid" ? "bg-emerald-50" : effectiveStatus === "overdue" ? "bg-red-100" : "bg-amber-50"
                  }`}>
                    {effectiveStatus === "paid" ? <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                      : effectiveStatus === "overdue" ? <AlertCircle className="h-4 w-4 text-red-600" />
                      : <Clock className="h-4 w-4 text-amber-600" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-foreground">{t.category}</span>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${TX_STATUS_COLORS[effectiveStatus] || ""}`}>
                        {TX_STATUS_LABELS[effectiveStatus] || effectiveStatus}
                      </span>
                    </div>
                    {t.dueDate && (
                      <p className={`text-xs mt-0.5 ${overdue ? "text-red-600 font-medium" : "text-muted-foreground"}`}>
                        {overdue ? "Venceu" : "Vence"} {format(new Date(t.dueDate + "T12:00:00"), "dd/MM/yyyy")}
                      </p>
                    )}
                  </div>
                  <div className={`text-sm font-bold shrink-0 ${overdue ? "text-red-600" : effectiveStatus === "paid" ? "text-emerald-600" : "text-amber-600"}`}>
                    R$ {parseFloat(t.amount).toFixed(2)}
                  </div>
                  {t.status !== "paid" && (
                    <div className="flex gap-1 shrink-0">
                      <Button
                        variant="ghost" size="icon"
                        className="h-8 w-8 text-emerald-600 hover:bg-emerald-50"
                        title="Dar baixa"
                        onClick={() => markPaidMutation.mutate({ id: t.id })}
                        disabled={markPaidMutation.isPending}
                      >
                        <CheckCircle2 className="h-4 w-4" />
                      </Button>
                      {overdue && client.phone && (
                        <Button
                          variant="ghost" size="icon"
                          className="h-8 w-8 text-green-600 hover:bg-green-50"
                          title="Cobrar via WhatsApp"
                          onClick={() => {
                            const phone = client.phone?.replace(/\D/g, "");
                            const msg = encodeURIComponent(`Olá ${client.name}! 😊\n\nPassando para lembrar que há um pagamento pendente de R$ ${parseFloat(t.amount).toFixed(2)} em aberto.\n\nQualquer dúvida, estou à disposição! 🂪`);
                            window.open(`https://wa.me/55${phone}?text=${msg}`, "_blank");
                          }}
                        >
                          <MessageCircle className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  )}
                  {t.status === "paid" && (
                    <Button
                      variant="ghost" size="icon"
                      className="h-8 w-8 text-amber-600 hover:bg-amber-50"
                      title="Desfazer baixa"
                      onClick={() => markPendingMutation.mutate({ id: t.id })}
                      disabled={markPendingMutation.isPending}
                    >
                      <Clock className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Tab: Evolução */}
      {activeTab === "evolution" && (
        <div className="space-y-4">
          {/* Bioimpedance */}
          <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <Activity className="h-4 w-4 text-primary" />
                Bioimpedância
              </h3>
              <Button size="sm" variant="outline" className="text-xs h-7"
                onClick={() => setLocation(`/evolucao?clientId=${clientId}`)}>
                Ver tudo
              </Button>
            </div>
            {(bioExams as any[]).length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">Nenhum exame registrado</p>
            ) : (
              <div className="space-y-3">
                {(bioExams as any[]).slice(0, 3).map((exam: any) => (
                  <div key={exam.id} className="rounded-lg bg-muted/30 p-3 space-y-2">
                    <span className="text-xs text-muted-foreground">{format(new Date(exam.date + "T12:00:00"), "dd/MM/yyyy")}</span>
                    <div className="space-y-1 text-xs">
                      {exam.weight && <div className="flex justify-between"><span className="text-muted-foreground">Peso:</span> <strong>{exam.weight}kg</strong></div>}
                      {exam.bodyFatPct && <div className="flex justify-between"><span className="text-muted-foreground">Gordura:</span> <strong>{exam.bodyFatPct}%</strong></div>}
                      {exam.musclePct && <div className="flex justify-between"><span className="text-muted-foreground">Músculo:</span> <strong>{exam.musclePct}%</strong></div>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Photos */}
          <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <Camera className="h-4 w-4 text-primary" />
                Fotos de Progresso
              </h3>
              <Button size="sm" variant="outline" className="text-xs h-7"
                onClick={() => setLocation(`/fotos?clientId=${clientId}`)}>
                Ver tudo
              </Button>
            </div>
            {(photos as any[]).length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">Nenhuma foto registrada</p>
            ) : (
              <div className="grid grid-cols-4 gap-2">
                {(photos as any[]).slice(0, 8).map((photo: any) => (
                  <div key={photo.id} className="aspect-square rounded-lg overflow-hidden bg-muted">
                    <img src={photo.photoUrl} alt="" className="w-full h-full object-cover" />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Dialog: Confirmar conclusão de sessão */}
      <AlertDialog open={!!sessionToComplete} onOpenChange={(open) => !open && setSessionToComplete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Concluir sessão?</AlertDialogTitle>
            <AlertDialogDescription>
              Deseja marcar a sessão de {sessionToComplete?.startTime} em {sessionToComplete?.date ? format(new Date(sessionToComplete.date + "T12:00:00"), "dd/MM/yyyy") : ""} como concluída?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (sessionToComplete) {
                  completeSessionMutation.mutate({
                    id: sessionToComplete.id,
                    status: "completed"
                  });
                  setSessionToComplete(null);
                }
              }}
              disabled={completeSessionMutation.isPending}
            >
              {completeSessionMutation.isPending ? "Concluindo..." : "Concluir"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Dialog: Confirmar exclusão de agendamentos futuros */}
      <AlertDialog open={showDeleteFutureDialog} onOpenChange={setShowDeleteFutureDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir todos os agendamentos futuros?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. Todos os agendamentos futuros deste cliente serão permanentemente deletados.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                deleteFutureAppointmentsMutation.mutate({ clientId });
              }}
              disabled={deleteFutureAppointmentsMutation.isPending}
              className="bg-red-600 hover:bg-red-700"
            >
              {deleteFutureAppointmentsMutation.isPending ? "Excluindo..." : "Excluir Tudo"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Dialog: Confirmar exclusão de todos os agendamentos */}
      <AlertDialog open={showDeleteAllDialog} onOpenChange={setShowDeleteAllDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir TODOS os agendamentos?</AlertDialogTitle>
            <AlertDialogDescription>
              ⚠️ Esta ação não pode ser desfeita. Todos os agendamentos deste cliente (passados, presentes e futuros) serão permanentemente deletados.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                deleteAllAppointmentsMutation.mutate({ clientId });
              }}
              disabled={deleteAllAppointmentsMutation.isPending}
              className="bg-red-700 hover:bg-red-800"
            >
              {deleteAllAppointmentsMutation.isPending ? "Excluindo..." : "Excluir Todos"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
