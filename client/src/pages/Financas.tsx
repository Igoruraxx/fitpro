import { trpc } from "@/lib/trpc";
import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  TrendingUp, Clock, AlertCircle, CheckCircle2, Users,
  MessageCircle, RefreshCw, ChevronLeft, ChevronRight, DollarSign, Edit, Trash2
} from "lucide-react";
import { toast } from "sonner";
import { format, endOfMonth } from "date-fns";
import { ptBR } from "date-fns/locale";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

const STATUS_LABELS: Record<string, string> = {
  paid: "Pago",
  pending: "Pendente",
  overdue: "Atrasado",
  cancelled: "Cancelado",
};

const STATUS_STYLES: Record<string, string> = {
  paid: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400",
  pending: "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400",
  overdue: "bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-400",
  cancelled: "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400",
};

export default function Financas() {
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [showOverdue, setShowOverdue] = useState(false);
  const [editingStatus, setEditingStatus] = useState<any>(null);
  const [newStatus, setNewStatus] = useState("pending");

  const startDate = format(new Date(year, month - 1, 1), "yyyy-MM-dd");
  const endDate = format(endOfMonth(new Date(year, month - 1, 1)), "yyyy-MM-dd");

  const { data: allTransactions = [], refetch } = trpc.finances.list.useQuery({ startDate, endDate });
  const { data: summary } = trpc.finances.summary.useQuery({ month, year });
  const { data: clients = [] } = trpc.clients.list.useQuery();
  const { data: overdueClients = [] } = trpc.finances.overdueClients.useQuery();

  // Only income transactions linked to clients
  const transactions = useMemo(
    () => (allTransactions as any[]).filter((t) => t.type === "income"),
    [allTransactions]
  );

  const markPaidMutation = trpc.finances.markPaid.useMutation({
    onSuccess: () => { toast.success("Pagamento confirmado!"); refetch(); },
    onError: (e) => toast.error(e.message),
  });

  const updateMutation = trpc.finances.update.useMutation({
    onSuccess: () => { toast.success("Status atualizado!"); refetch(); setEditingStatus(null); },
    onError: (e) => toast.error(e.message),
  });

  const deleteMutation = trpc.finances.delete.useMutation({
    onSuccess: () => { toast.success("Cobrança removida!"); refetch(); },
    onError: (e) => toast.error(e.message),
  });

  const generateChargesMutation = trpc.finances.generateMonthlyCharges.useMutation({
    onSuccess: (data) => {
      if (data.count === 0) {
        toast.info("Nenhuma cobrança nova gerada. Verifique se os alunos têm mensalidade configurada.");
      } else {
        toast.success(`${data.count} cobrança${data.count !== 1 ? "s" : ""} gerada${data.count !== 1 ? "s" : ""} para ${format(new Date(year, month - 1), "MMMM/yyyy", { locale: ptBR })}`);
      }
      refetch();
    },
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

  const chartData = useMemo(() => {
    const byCategory: Record<string, number> = {};
    transactions.forEach((t: any) => {
      if (t.status === "paid") {
        byCategory[t.category] = (byCategory[t.category] || 0) + parseFloat(t.amount);
      }
    });
    return Object.entries(byCategory).map(([name, value]) => ({ name, value }));
  }, [transactions]);

  const clientMap = useMemo(() => {
    const map: Record<number, any> = {};
    (clients as any[]).forEach((c) => { map[c.id] = c; });
    return map;
  }, [clients]);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigateMonth(-1)}
            className="p-1.5 rounded-lg border border-border bg-card hover:bg-accent transition-colors"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <h2 className="text-base font-semibold capitalize text-foreground">
            {format(new Date(year, month - 1), "MMMM yyyy", { locale: ptBR })}
          </h2>
          <button
            onClick={() => navigateMonth(1)}
            className="p-1.5 rounded-lg border border-border bg-card hover:bg-accent transition-colors"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => generateChargesMutation.mutate({ month, year })}
          disabled={generateChargesMutation.isPending}
          className="text-xs self-end sm:self-auto"
        >
          <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${generateChargesMutation.isPending ? "animate-spin" : ""}`} />
          Gerar Cobranças do Mês
        </Button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
          <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground mb-2">
            <div className="p-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40">
              <TrendingUp className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
            </div>
            Recebido
          </div>
          <div className="text-xl font-bold text-emerald-600 dark:text-emerald-400">
            R$ {totalReceived.toFixed(2)}
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
          <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground mb-2">
            <div className="p-1.5 rounded-lg bg-amber-50 dark:bg-amber-950/40">
              <Clock className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
            </div>
            Pendente
          </div>
          <div className="text-xl font-bold text-amber-600 dark:text-amber-400">
            R$ {totalPending.toFixed(2)}
          </div>
        </div>

        <div
          className={`rounded-xl border p-4 shadow-sm col-span-2 sm:col-span-1 ${
            overdueCount > 0
              ? "border-red-200 bg-red-50 dark:border-red-900/50 dark:bg-red-950/20 cursor-pointer hover:bg-red-100 dark:hover:bg-red-950/30 transition-colors"
              : "border-border bg-card"
          }`}
          onClick={() => overdueCount > 0 && setShowOverdue(true)}
        >
          <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground mb-2">
            <div className={`p-1.5 rounded-lg ${overdueCount > 0 ? "bg-red-100 dark:bg-red-900/40" : "bg-slate-100 dark:bg-slate-800"}`}>
              <AlertCircle className={`h-3.5 w-3.5 ${overdueCount > 0 ? "text-red-600 dark:text-red-400" : "text-slate-400"}`} />
            </div>
            <span className={overdueCount > 0 ? "text-red-700 dark:text-red-400" : ""}>Inadimplentes</span>
          </div>
          <div className={`text-xl font-bold ${overdueCount > 0 ? "text-red-600 dark:text-red-400" : "text-muted-foreground"}`}>
            {overdueCount} aluno{overdueCount !== 1 ? "s" : ""}
          </div>
          {overdueCount > 0 && (
            <p className="text-[10px] text-red-500 dark:text-red-400 mt-1">Toque para ver detalhes</p>
          )}
        </div>
      </div>

      {/* Chart */}
      {chartData.length > 0 && (
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <h3 className="text-sm font-semibold text-foreground mb-4">Receitas Confirmadas por Categoria</h3>
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={chartData} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: "12px" }}
                formatter={(v: any) => [`R$ ${Number(v).toFixed(2)}`, "Recebido"]}
              />
              <Bar dataKey="value" fill="#10b981" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

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
            <p className="text-xs text-muted-foreground/70 mt-1 max-w-[240px]">
              Clique em "Gerar Cobranças do Mês" para criar automaticamente as mensalidades dos alunos ativos.
            </p>
            <Button
              variant="outline"
              size="sm"
              className="mt-4 text-xs"
              onClick={() => generateChargesMutation.mutate({ month, year })}
              disabled={generateChargesMutation.isPending}
            >
              <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${generateChargesMutation.isPending ? "animate-spin" : ""}`} />
              Gerar Cobranças
            </Button>
          </div>
        ) : (
          transactions.map((t: any) => {
            const client = t.clientId ? clientMap[t.clientId] : null;
            return (
              <div key={t.id} className="flex items-center gap-3 p-3.5 rounded-xl border border-border bg-card hover:bg-muted/30 transition-colors shadow-sm">
                {/* Status icon */}
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                  t.status === "paid"
                    ? "bg-emerald-50 dark:bg-emerald-950/40"
                    : t.status === "overdue"
                    ? "bg-red-50 dark:bg-red-950/40"
                    : "bg-amber-50 dark:bg-amber-950/40"
                }`}>
                  {t.status === "paid"
                    ? <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                    : t.status === "overdue"
                    ? <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
                    : <Clock className="h-4 w-4 text-amber-600 dark:text-amber-400" />}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-sm text-foreground">{t.category}</span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${STATUS_STYLES[t.status] || STATUS_STYLES.pending}`}>
                      {STATUS_LABELS[t.status] || t.status}
                    </span>
                  </div>
                  {client && (
                    <div className="flex items-center gap-1 mt-0.5">
                      <Users className="h-3 w-3 text-muted-foreground/60 shrink-0" />
                      <span className="text-xs text-muted-foreground truncate">{client.name}</span>
                    </div>
                  )}
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {format(new Date(t.date + "T12:00:00"), "dd/MM/yyyy")}
                    {t.dueDate && t.status !== "paid" && (
                      <span className="ml-2 text-amber-600 dark:text-amber-400">
                        · vence {format(new Date(t.dueDate + "T12:00:00"), "dd/MM")}
                      </span>
                    )}
                  </p>
                </div>

                {/* Amount */}
                <div className="text-sm font-bold shrink-0 text-emerald-600 dark:text-emerald-400">
                  R$ {parseFloat(t.amount).toFixed(2)}
                </div>

                {/* Actions */}
                <div className="flex gap-1 shrink-0">
                  {t.status !== "paid" && (
                    <Button
                      variant="ghost" size="icon"
                      className="h-7 w-7 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/40"
                      title="Dar baixa"
                      onClick={() => markPaidMutation.mutate({ id: t.id })}
                      disabled={markPaidMutation.isPending}
                    >
                      <CheckCircle2 className="h-3.5 w-3.5" />
                    </Button>
                  )}
                  {client?.phone && t.status !== "paid" && (
                    <Button
                      variant="ghost" size="icon"
                      className="h-7 w-7 text-green-600 hover:text-green-700 hover:bg-green-50 dark:hover:bg-green-950/40"
                      title="Cobrar via WhatsApp"
                      onClick={() => sendWhatsApp(client, parseFloat(t.amount))}
                    >
                      <MessageCircle className="h-3.5 w-3.5" />
                    </Button>
                  )}
                  <Button
                    variant="ghost" size="icon"
                    className="h-7 w-7"
                    title="Alterar status"
                    onClick={() => { setEditingStatus(t); setNewStatus(t.status); }}
                  >
                    <Edit className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="ghost" size="icon"
                    className="h-7 w-7 text-destructive"
                    title="Remover cobrança"
                    onClick={() => deleteMutation.mutate({ id: t.id })}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Edit status modal */}
      <Dialog open={!!editingStatus} onOpenChange={() => setEditingStatus(null)}>
        <DialogContent className="sm:max-w-xs">
          <DialogHeader>
            <DialogTitle>Alterar Status</DialogTitle>
          </DialogHeader>
          {editingStatus && (
            <div className="space-y-4">
              <div>
                <p className="text-sm text-muted-foreground mb-1">
                  {editingStatus.category} — R$ {parseFloat(editingStatus.amount).toFixed(2)}
                </p>
                <Select value={newStatus} onValueChange={setNewStatus}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pendente</SelectItem>
                    <SelectItem value="paid">Pago</SelectItem>
                    <SelectItem value="overdue">Atrasado</SelectItem>
                    <SelectItem value="cancelled">Cancelado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex gap-3">
                <Button variant="outline" className="flex-1" onClick={() => setEditingStatus(null)}>Cancelar</Button>
                <Button
                  className="flex-1"
                  onClick={() => updateMutation.mutate({ id: editingStatus.id, status: newStatus as any })}
                  disabled={updateMutation.isPending}
                >
                  Salvar
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Overdue clients modal */}
      <Dialog open={showOverdue} onOpenChange={setShowOverdue}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600 dark:text-red-400">
              <AlertCircle className="h-5 w-5" />
              Alunos Inadimplentes
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 max-h-[60vh] overflow-y-auto">
            {(overdueClients as any[]).length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">Nenhum aluno inadimplente.</p>
            ) : (
              (overdueClients as any[]).map((client: any) => (
                <div key={client.id} className="flex items-center gap-3 p-3 rounded-lg border border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-950/20">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm text-foreground">{client.name}</p>
                    <p className="text-xs text-red-600 dark:text-red-400 mt-0.5">
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
    </div>
  );
}
