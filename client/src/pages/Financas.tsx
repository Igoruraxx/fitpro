import { trpc } from "@/lib/trpc";
import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  TrendingUp, Clock, AlertCircle, CheckCircle2, Users,
  MessageCircle, ChevronLeft, ChevronRight, DollarSign, Calendar, Trash2, CalendarClock
} from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { format, endOfMonth, isPast, isToday } from "date-fns";
import { ptBR } from "date-fns/locale";

const STATUS_LABELS: Record<string, string> = {
  paid: "Pago",
  pending: "Pendente",
  overdue: "Atrasado",
  cancelled: "Cancelado",
};

const STATUS_STYLES: Record<string, string> = {
  paid: "bg-emerald-50 text-emerald-700",
  pending: "bg-amber-50 text-amber-700",
  overdue: "bg-red-50 text-red-700",
  cancelled: "bg-slate-100 text-slate-500",
};

export default function Financas() {
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [showOverdue, setShowOverdue] = useState(false);

  const startDate = format(new Date(year, month - 1, 1), "yyyy-MM-dd");
  const endDate = format(endOfMonth(new Date(year, month - 1, 1)), "yyyy-MM-dd");

  const utils = trpc.useUtils();
  const { data: allTransactions = [] } = trpc.finances.list.useQuery({ startDate, endDate });
  const { data: summary } = trpc.finances.summary.useQuery({ month, year });
  const { data: clients = [] } = trpc.clients.list.useQuery();
  const { data: overdueClients = [] } = trpc.finances.overdueClients.useQuery();
  const { data: pendingGrouped = {} } = trpc.appointments.pendingGrouped.useQuery();

  // Only income transactions
  const transactions = useMemo(
    () => (allTransactions as any[]).filter((t) => t.type === "income"),
    [allTransactions]
  );

  const refetchAll = () => {
    utils.finances.list.invalidate();
    utils.finances.summary.invalidate();
    utils.finances.overdueClients.invalidate();
  };

  const markPaidMutation = trpc.finances.markPaid.useMutation({
    onSuccess: () => { toast.success("Pagamento confirmado!"); refetchAll(); },
    onError: (e) => toast.error(e.message),
  });

  const markPendingMutation = trpc.finances.markPending.useMutation({
    onSuccess: () => { toast.success("Baixa desfeita!"); refetchAll(); },
    onError: (e) => toast.error(e.message),
  });

  const [transactionToDelete, setTransactionToDelete] = useState<any>(null);

  const deleteTransactionMutation = trpc.finances.delete.useMutation({
    onSuccess: () => { toast.success("Pagamento deletado!"); refetchAll(); setTransactionToDelete(null); },
    onError: (e) => toast.error(e.message),
  });

  const navigateMonth = (dir: number) => {
    let m = month + dir;
    let y = year;
    if (m > 12) { m = 1; y++; }
    if (m < 1) { m = 12; y--; }
    setMonth(m); setYear(y);
  };

  const sendWhatsApp = (client: any, amount?: number) => {
    const phone = client.phone?.replace(/\D/g, "");
    if (!phone) { toast.error("Aluno sem telefone cadastrado"); return; }
    const total = (amount || client.totalOverdue || 0).toFixed(2);
    const msg = encodeURIComponent(
      `Olá ${client.name}! 😊\n\nPassando para lembrar que há um pagamento pendente de R$ ${total} em aberto.\n\nQualquer dúvida, estou à disposição! 🏋️`
    );
    window.open(`https://wa.me/55${phone}?text=${msg}`, "_blank");
  };

  const totalReceived = summary?.income || 0;
  const totalPending = summary?.pending || 0;
  const overdueCount = (overdueClients as any[]).length;

  const clientMap = useMemo(() => {
    const map: Record<number, any> = {};
    (clients as any[]).forEach((c) => { map[c.id] = c; });
    return map;
  }, [clients]);

  // Determine if a transaction is overdue (dueDate in the past and not paid)
  const isOverdue = (t: any) => {
    if (t.status === "paid" || t.status === "cancelled") return false;
    if (!t.dueDate) return false;
    const due = new Date(t.dueDate + "T12:00:00");
    return isPast(due) && !isToday(due);
  };

  return (
    <div className="space-y-5">
      {/* Month navigation */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigateMonth(-1)}
          className="p-1.5 rounded-lg border border-border bg-card hover:bg-accent transition-colors"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <h2 className="text-base font-semibold capitalize text-foreground min-w-[140px] text-center">
          {format(new Date(year, month - 1), "MMMM yyyy", { locale: ptBR })}
        </h2>
        <button
          onClick={() => navigateMonth(1)}
          className="p-1.5 rounded-lg border border-border bg-card hover:bg-accent transition-colors"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
          <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground mb-2">
            <div className="p-1.5 rounded-lg bg-emerald-50">
              <TrendingUp className="h-3.5 w-3.5 text-emerald-600" />
            </div>
            Recebido
          </div>
          <div className="text-xl font-bold text-emerald-600">
            R$ {totalReceived.toFixed(2)}
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
          <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground mb-2">
            <div className="p-1.5 rounded-lg bg-amber-50">
              <Clock className="h-3.5 w-3.5 text-amber-600" />
            </div>
            Pendente
          </div>
          <div className="text-xl font-bold text-amber-600">
            R$ {totalPending.toFixed(2)}
          </div>
        </div>

        <div
          className={`rounded-xl border p-4 shadow-sm col-span-2 sm:col-span-1 ${
            overdueCount > 0
              ? "border-red-200 bg-red-50 cursor-pointer hover:bg-red-100 transition-colors"
              : "border-border bg-card"
          }`}
          onClick={() => overdueCount > 0 && setShowOverdue(true)}
        >
          <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground mb-2">
            <div className={`p-1.5 rounded-lg ${overdueCount > 0 ? "bg-red-100" : "bg-slate-100"}`}>
              <AlertCircle className={`h-3.5 w-3.5 ${overdueCount > 0 ? "text-red-600" : "text-slate-400"}`} />
            </div>
            <span className={overdueCount > 0 ? "text-red-700" : ""}>Inadimplentes</span>
          </div>
          <div className={`text-xl font-bold ${overdueCount > 0 ? "text-red-600" : "text-muted-foreground"}`}>
            {overdueCount} aluno{overdueCount !== 1 ? "s" : ""}
          </div>
          {overdueCount > 0 && (
            <p className="text-[10px] text-red-500 mt-1">Toque para ver detalhes</p>
          )}
        </div>
      </div>

      {/* Expired packages section */}
      {(() => {
        const expiredPackages = (clients as any[]).filter(
          c => c.planType === 'package' && (c.sessionsRemaining ?? 0) === 0
        );
        if (expiredPackages.length === 0) return null;
        return (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-orange-600" />
                Pacotes Esgotados
              </h3>
              <span className="text-xs text-muted-foreground">{expiredPackages.length} cliente{expiredPackages.length !== 1 ? "s" : ""}</span>
            </div>
            <div className="space-y-2">
              {expiredPackages.map((client: any) => (
                <div key={client.id} className="flex items-center gap-3 p-3.5 rounded-xl border border-orange-300 bg-orange-50 shadow-sm">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 bg-orange-100">
                    <AlertCircle className="h-4 w-4 text-orange-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm text-foreground">{client.name}</p>
                    <p className="text-xs text-orange-600 mt-0.5">
                      Pacote de {client.packageSessions} sessões • R$ {parseFloat(client.packageValue || 0).toFixed(2)}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    className="bg-orange-600 hover:bg-orange-700 text-white shrink-0"
                    onClick={() => {
                      const renewBtn = document.querySelector(`[data-renew-client="${client.id}"]`) as HTMLButtonElement;
                      if (renewBtn) renewBtn.click();
                    }}
                  >
                    Renovar
                  </Button>
                </div>
              ))}
            </div>
          </div>
        );
      })()}

      {/* Transactions list */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-foreground">Cobranças do mês</h3>
          <span className="text-xs text-muted-foreground">{transactions.length} registro{transactions.length !== 1 ? "s" : ""}</span>
        </div>

        {transactions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center rounded-xl border border-dashed border-border bg-card/50">
            <DollarSign className="h-10 w-10 text-muted-foreground/30 mb-3" />
            <h3 className="text-sm font-medium text-muted-foreground">Nenhuma cobrança este mês</h3>
            <p className="text-xs text-muted-foreground/70 mt-1 max-w-[260px]">
              As cobranças são criadas automaticamente ao cadastrar alunos com plano Mensal ou Pacote.
            </p>
          </div>
        ) : (
          transactions.map((t: any) => {
            const client = t.clientId ? clientMap[t.clientId] : null;
            const overdue = isOverdue(t);
            const effectiveStatus = overdue && t.status === "pending" ? "overdue" : t.status;
            // Verifica se pacote atingiu 80% de conclusão
            const isPackageNearEnd80 = client &&
              (t.category === "Pacote de Sessões" || t.category === "Pacote de Sessoes") &&
              client.packageSessions &&
              client.sessionsRemaining !== null &&
              ((client.packageSessions - (client.sessionsRemaining ?? 0)) / client.packageSessions) >= 0.8;

            return (
              <div
                key={t.id}
                className={`flex items-center gap-3 p-3.5 rounded-xl border transition-colors shadow-sm ${
                  t.status === "paid"
                    ? "border-emerald-200 bg-emerald-100/40 hover:bg-emerald-100/50"
                    : overdue
                    ? "border-red-200 bg-red-100/40 hover:bg-red-100/50"
                    : isPackageNearEnd80
                    ? "border-orange-300 bg-orange-50 hover:bg-orange-100/50"
                    : "border-amber-200 bg-amber-100/40 hover:bg-amber-100/50"
                }`}
              >
                {/* Status icon */}
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                  effectiveStatus === "paid"
                    ? "bg-emerald-50"
                    : effectiveStatus === "overdue"
                    ? "bg-red-100"
                    : "bg-amber-50"
                }`}>
                  {effectiveStatus === "paid"
                    ? <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    : effectiveStatus === "overdue"
                    ? <AlertCircle className="h-4 w-4 text-red-600" />
                    : <Clock className="h-4 w-4 text-amber-600" />}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-sm text-foreground">{client?.name || t.category}</span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${STATUS_STYLES[effectiveStatus] || STATUS_STYLES.pending}`}>
                      {STATUS_LABELS[effectiveStatus] || effectiveStatus}
                    </span>
                  </div>
                  {t.category && (
                    <div className="flex items-center gap-1 mt-0.5">
                      <span className="text-xs text-muted-foreground">{t.category}</span>
                    </div>
                  )}
                  {/* Barra de progresso de sessões para pacotes */}
                  {(t.category === "Pacote de Sessoes" || t.category === "Pacote de Sess\u00f5es") && client && (
                    <div className="mt-2 space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">
                          {client.packageSessions && client.sessionsRemaining !== null
                            ? `${client.packageSessions - client.sessionsRemaining} de ${client.packageSessions} sessões concluídas`
                            : "Sem dados"}
                        </span>
                        <span className="font-medium text-muted-foreground">
                          {client.packageSessions && client.sessionsRemaining !== null
                            ? `${Math.round(((client.packageSessions - client.sessionsRemaining) / client.packageSessions) * 100)}% · ${client.sessionsRemaining} restante${client.sessionsRemaining !== 1 ? 's' : ''}`
                            : "0%"}
                        </span>
                      </div>
                      <Progress
                        value={
                          client.packageSessions && client.sessionsRemaining !== null
                            ? ((client.packageSessions - client.sessionsRemaining) / client.packageSessions) * 100
                            : 0
                        }
                        className="h-1.5"
                      />
                      {/* Sessões pendentes agendadas */}
                      {(pendingGrouped as any)[client.id] > 0 && (
                        <div className="flex items-center gap-1 mt-1">
                          <CalendarClock className="h-3 w-3 text-blue-500 shrink-0" />
                          <span className="text-xs text-blue-600 font-medium">
                            {(pendingGrouped as any)[client.id]} sessão(ões) agendada(s) pendente(s)
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                  {t.dueDate && t.category !== "Pacote de Sessoes" && (
                    <div className="flex items-center gap-1 mt-0.5">
                      <Calendar className="h-3 w-3 text-muted-foreground/60 shrink-0" />
                      <span className={`text-xs ${overdue ? "text-red-600 font-medium" : "text-muted-foreground"}`}>
                        Vence {format(new Date(t.dueDate + "T12:00:00"), "dd/MM/yyyy")}
                        {overdue && " · Em atraso"}
                      </span>
                    </div>
                  )}
                </div>

                {/* Amount */}
                <div className={`text-sm font-bold shrink-0 ${overdue ? "text-red-600" : "text-emerald-600"}`}>
                  R$ {parseFloat(t.amount).toFixed(2)}
                </div>

                {/* Actions */}
                <div className="flex gap-1 shrink-0">
                  {/* Dar baixa — always visible for unpaid */}
                  {t.status !== "paid" && (
                    <Button
                      variant="ghost" size="icon"
                      className="h-8 w-8 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
                      title="Dar baixa (marcar como pago)"
                      onClick={() => markPaidMutation.mutate({ id: t.id })}
                      disabled={markPaidMutation.isPending}
                    >
                      <CheckCircle2 className="h-4 w-4" />
                    </Button>
                  )}
                  {/* Desfazer baixa — only for paid */}
                  {t.status === "paid" && (
                    <Button
                      variant="ghost" size="icon"
                      className="h-8 w-8 text-amber-600 hover:text-amber-700 hover:bg-amber-50"
                      title="Desfazer baixa (reverter para pendente)"
                      onClick={() => markPendingMutation.mutate({ id: t.id })}
                      disabled={markPendingMutation.isPending}
                    >
                      <Clock className="h-4 w-4" />
                    </Button>
                  )}
                  {/* WhatsApp — only for overdue */}
                  {overdue && client?.phone && (
                    <Button
                      variant="ghost" size="icon"
                      className="h-8 w-8 text-green-600 hover:text-green-700 hover:bg-green-50"
                      title="Cobrar via WhatsApp"
                      onClick={() => sendWhatsApp(client, parseFloat(t.amount))}
                    >
                      <MessageCircle className="h-4 w-4" />
                    </Button>
                  )}
                  {/* Delete */}
                  <Button
                    variant="ghost" size="icon"
                    className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50"
                    title="Deletar pagamento"
                    onClick={() => setTransactionToDelete(t)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Overdue clients modal */}
      <Dialog open={showOverdue} onOpenChange={setShowOverdue}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <AlertCircle className="h-5 w-5" />
              Alunos Inadimplentes
            </DialogTitle>
            <DialogDescription className="sr-only">Lista de alunos com pagamentos em atraso</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 max-h-[60vh] overflow-y-auto">
            {(overdueClients as any[]).length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">Nenhum aluno inadimplente.</p>
            ) : (
              (overdueClients as any[]).map((client: any) => (
                <div key={client.id} className="flex items-center gap-3 p-3 rounded-lg border border-red-200 bg-red-50">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm text-foreground">{client.name}</p>
                    <p className="text-xs text-red-600 mt-0.5">
                      R$ {client.totalOverdue?.toFixed(2)} em atraso
                    </p>
                    {client.oldestDueDate && (
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        Desde {format(new Date(client.oldestDueDate + "T12:00:00"), "dd/MM/yyyy")}
                      </p>
                    )}
                  </div>
                  {client.phone && (
                    <Button
                      size="sm"
                      className="bg-green-600 hover:bg-green-700 text-white shrink-0"
                      onClick={() => sendWhatsApp(client)}
                    >
                      <MessageCircle className="h-3.5 w-3.5 mr-1" />
                      WhatsApp
                    </Button>
                  )}
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog: Confirmar exclusão de pagamento */}
      <AlertDialog open={!!transactionToDelete} onOpenChange={(open) => !open && setTransactionToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Deletar pagamento?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. O pagamento de R$ {transactionToDelete ? parseFloat(transactionToDelete.amount).toFixed(2) : "0.00"} será permanentemente deletado.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (transactionToDelete) {
                  deleteTransactionMutation.mutate({ id: transactionToDelete.id });
                }
              }}
              disabled={deleteTransactionMutation.isPending}
              className="bg-red-600 hover:bg-red-700"
            >
              {deleteTransactionMutation.isPending ? "Deletando..." : "Deletar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
