import { trpc } from "@/lib/trpc";
import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, TrendingUp, TrendingDown, Clock, DollarSign, Trash2, Edit, ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { format, startOfMonth, endOfMonth } from "date-fns";
import { ptBR } from "date-fns/locale";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

const categories = {
  income: ["Mensalidade", "Aula avulsa", "Consultoria", "Outro"],
  expense: ["Aluguel", "Equipamento", "Marketing", "Transporte", "Alimentação", "Outro"],
};

export default function Financas() {
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<any>(null);

  // Form
  const [formType, setFormType] = useState<"income" | "expense">("income");
  const [formCategory, setFormCategory] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formAmount, setFormAmount] = useState("");
  const [formDate, setFormDate] = useState(format(now, "yyyy-MM-dd"));
  const [formStatus, setFormStatus] = useState<string>("pending");
  const [formClientId, setFormClientId] = useState<string>("");

  const startDate = format(new Date(year, month - 1, 1), "yyyy-MM-dd");
  const endDate = format(endOfMonth(new Date(year, month - 1, 1)), "yyyy-MM-dd");

  const { data: transactions = [], refetch } = trpc.finances.list.useQuery({ startDate, endDate });
  const { data: summary } = trpc.finances.summary.useQuery({ month, year });
  const { data: clients = [] } = trpc.clients.list.useQuery();

  const createMutation = trpc.finances.create.useMutation({
    onSuccess: () => { toast.success("Transação criada!"); refetch(); setShowModal(false); },
    onError: (e) => toast.error(e.message),
  });

  const updateMutation = trpc.finances.update.useMutation({
    onSuccess: () => { toast.success("Transação atualizada!"); refetch(); setShowModal(false); },
    onError: (e) => toast.error(e.message),
  });

  const deleteMutation = trpc.finances.delete.useMutation({
    onSuccess: () => { toast.success("Transação excluída!"); refetch(); },
    onError: (e) => toast.error(e.message),
  });

  const navigateMonth = (dir: number) => {
    let m = month + dir;
    let y = year;
    if (m > 12) { m = 1; y++; }
    if (m < 1) { m = 12; y--; }
    setMonth(m); setYear(y);
  };

  const openNew = (type: "income" | "expense" = "income") => {
    setEditing(null);
    setFormType(type); setFormCategory(""); setFormDescription("");
    setFormAmount(""); setFormDate(format(now, "yyyy-MM-dd"));
    setFormStatus("pending"); setFormClientId("");
    setShowModal(true);
  };

  const openEdit = (t: any) => {
    setEditing(t);
    setFormType(t.type); setFormCategory(t.category); setFormDescription(t.description || "");
    setFormAmount(t.amount); setFormDate(format(new Date(t.date), "yyyy-MM-dd"));
    setFormStatus(t.status); setFormClientId(t.clientId ? String(t.clientId) : "");
    setShowModal(true);
  };

  const handleSubmit = () => {
    if (!formCategory) { toast.error("Selecione uma categoria"); return; }
    if (!formAmount) { toast.error("Informe o valor"); return; }
    const payload: any = {
      type: formType, category: formCategory, description: formDescription || undefined,
      amount: formAmount, date: formDate, status: formStatus,
      clientId: formClientId ? parseInt(formClientId) : undefined,
    };
    if (editing) {
      updateMutation.mutate({ id: editing.id, ...payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const balance = (summary?.income || 0) - (summary?.expenses || 0);

  // Chart data by category
  const chartData = useMemo(() => {
    const byCategory: Record<string, number> = {};
    transactions.forEach((t: any) => {
      const key = t.category;
      byCategory[key] = (byCategory[key] || 0) + parseFloat(t.amount);
    });
    return Object.entries(byCategory).map(([name, value]) => ({ name, value }));
  }, [transactions]);

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
        <div className="flex gap-2">
          <Button onClick={() => openNew("income")} size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white">
            <Plus className="h-4 w-4 mr-1" /> Receita
          </Button>
          <Button onClick={() => openNew("expense")} size="sm" variant="destructive">
            <Plus className="h-4 w-4 mr-1" /> Despesa
          </Button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
          <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground mb-2">
            <div className="p-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40">
              <TrendingUp className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
            </div>
            Receitas
          </div>
          <div className="text-xl font-bold text-emerald-600 dark:text-emerald-400">R$ {(summary?.income || 0).toFixed(2)}</div>
        </div>
        <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
          <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground mb-2">
            <div className="p-1.5 rounded-lg bg-red-50 dark:bg-red-950/40">
              <TrendingDown className="h-3.5 w-3.5 text-red-600 dark:text-red-400" />
            </div>
            Despesas
          </div>
          <div className="text-xl font-bold text-red-600 dark:text-red-400">R$ {(summary?.expenses || 0).toFixed(2)}</div>
        </div>
        <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
          <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground mb-2">
            <div className="p-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/40">
              <DollarSign className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
            </div>
            Saldo
          </div>
          <div className={`text-xl font-bold ${balance >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}>
            R$ {balance.toFixed(2)}
          </div>
        </div>
        <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
          <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground mb-2">
            <div className="p-1.5 rounded-lg bg-amber-50 dark:bg-amber-950/40">
              <Clock className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
            </div>
            Pendente
          </div>
          <div className="text-xl font-bold text-amber-600 dark:text-amber-400">R$ {(summary?.pending || 0).toFixed(2)}</div>
        </div>
      </div>

      {/* Chart */}
      {chartData.length > 0 && (
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <h3 className="text-sm font-semibold text-foreground mb-4">Receitas por Categoria</h3>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={chartData} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "8px",
                  fontSize: "12px",
                  boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
                }}
                formatter={(v: any) => [`R$ ${Number(v).toFixed(2)}`, "Valor"]}
              />
              <Bar dataKey="value" fill="#6366f1" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Transactions list */}
      <div className="space-y-2">
        {transactions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <DollarSign className="h-12 w-12 text-muted-foreground/30 mb-4" />
            <h3 className="text-lg font-medium text-muted-foreground">Nenhuma transação</h3>
            <p className="text-sm text-muted-foreground/70 mt-1">Registre receitas e despesas para acompanhar suas finanças.</p>
          </div>
        ) : (
          transactions.map((t: any) => (
            <div key={t.id} className="flex items-center gap-3 p-3.5 rounded-xl border border-border bg-card hover:bg-muted/30 transition-colors shadow-sm">
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                t.type === "income" ? "bg-emerald-50 dark:bg-emerald-950/40" : "bg-red-50 dark:bg-red-950/40"
              }`}>
                {t.type === "income"
                  ? <TrendingUp className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                  : <TrendingDown className="h-4 w-4 text-red-600 dark:text-red-400" />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-sm text-foreground truncate">{t.category}</span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
                    t.status === "paid" ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400" :
                    t.status === "overdue" ? "bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-400" :
                    t.status === "cancelled" ? "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400" :
                    "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400"
                  }`}>{t.status === "paid" ? "Pago" : t.status === "pending" ? "Pendente" : t.status === "overdue" ? "Atrasado" : "Cancelado"}</span>
                </div>
                {t.description && <p className="text-xs text-muted-foreground truncate mt-0.5">{t.description}</p>}
                <p className="text-xs text-muted-foreground mt-0.5">{format(new Date(t.date), "dd/MM/yyyy")}</p>
              </div>
              <div className={`text-sm font-bold shrink-0 ${
                t.type === "income" ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"
              }`}>
                {t.type === "income" ? "+" : "-"}R$ {parseFloat(t.amount).toFixed(2)}
              </div>
              <div className="flex gap-1 shrink-0">
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(t)}>
                  <Edit className="h-3.5 w-3.5" />
                </Button>
                <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => deleteMutation.mutate({ id: t.id })}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Modal */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? "Editar Transação" : formType === "income" ? "Nova Receita" : "Nova Despesa"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <Button
                variant={formType === "income" ? "default" : "outline"}
                onClick={() => { setFormType("income"); setFormCategory(""); }}
                className={formType === "income" ? "bg-green-600 hover:bg-green-700" : ""}
              >
                <TrendingUp className="h-4 w-4 mr-1" /> Receita
              </Button>
              <Button
                variant={formType === "expense" ? "default" : "outline"}
                onClick={() => { setFormType("expense"); setFormCategory(""); }}
                className={formType === "expense" ? "bg-red-600 hover:bg-red-700" : ""}
              >
                <TrendingDown className="h-4 w-4 mr-1" /> Despesa
              </Button>
            </div>
            <div>
              <Label>Categoria *</Label>
              <Select value={formCategory} onValueChange={setFormCategory}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  {categories[formType].map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {formType === "income" && (
              <div>
                <Label>Cliente (opcional)</Label>
                <Select value={formClientId} onValueChange={setFormClientId}>
                  <SelectTrigger className="mt-1"><SelectValue placeholder="Nenhum" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Nenhum</SelectItem>
                    {clients.map((c: any) => (
                      <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div>
              <Label>Valor (R$) *</Label>
              <Input className="mt-1" type="number" step="0.01" value={formAmount} onChange={(e) => setFormAmount(e.target.value)} placeholder="0.00" />
            </div>
            <div>
              <Label>Data</Label>
              <Input className="mt-1" type="date" value={formDate} onChange={(e) => setFormDate(e.target.value)} />
            </div>
            <div>
              <Label>Status</Label>
              <Select value={formStatus} onValueChange={setFormStatus}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pendente</SelectItem>
                  <SelectItem value="paid">Pago</SelectItem>
                  <SelectItem value="overdue">Atrasado</SelectItem>
                  <SelectItem value="cancelled">Cancelado</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Descrição</Label>
              <Input className="mt-1" value={formDescription} onChange={(e) => setFormDescription(e.target.value)} placeholder="Descrição opcional..." />
            </div>
            <div className="flex gap-3 pt-2">
              <Button variant="outline" className="flex-1" onClick={() => setShowModal(false)}>Cancelar</Button>
              <Button className="flex-1" onClick={handleSubmit} disabled={createMutation.isPending || updateMutation.isPending}>
                {editing ? "Salvar" : "Criar"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
