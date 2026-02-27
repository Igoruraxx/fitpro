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
    <div className="space-y-4 p-4 md:p-0">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold">Finanças</h2>
          <p className="text-sm text-muted-foreground">Controle suas receitas e despesas</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => openNew("income")} className="bg-green-600 hover:bg-green-700">
            <Plus className="h-4 w-4 mr-1" /> Receita
          </Button>
          <Button onClick={() => openNew("expense")} variant="destructive">
            <Plus className="h-4 w-4 mr-1" /> Despesa
          </Button>
        </div>
      </div>

      {/* Month nav */}
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="icon" onClick={() => navigateMonth(-1)}>
          <ChevronLeft className="h-5 w-5" />
        </Button>
        <h3 className="text-lg font-semibold capitalize">
          {format(new Date(year, month - 1), "MMMM yyyy", { locale: ptBR })}
        </h3>
        <Button variant="ghost" size="icon" onClick={() => navigateMonth(1)}>
          <ChevronRight className="h-5 w-5" />
        </Button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="rounded-xl border border-border bg-card p-3">
          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
            <TrendingUp className="h-3.5 w-3.5 text-green-400" /> Receitas
          </div>
          <div className="text-lg font-bold text-green-400">R$ {(summary?.income || 0).toFixed(2)}</div>
        </div>
        <div className="rounded-xl border border-border bg-card p-3">
          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
            <TrendingDown className="h-3.5 w-3.5 text-red-400" /> Despesas
          </div>
          <div className="text-lg font-bold text-red-400">R$ {(summary?.expenses || 0).toFixed(2)}</div>
        </div>
        <div className="rounded-xl border border-border bg-card p-3">
          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
            <DollarSign className="h-3.5 w-3.5 text-primary" /> Saldo
          </div>
          <div className={`text-lg font-bold ${balance >= 0 ? "text-green-400" : "text-red-400"}`}>
            R$ {balance.toFixed(2)}
          </div>
        </div>
        <div className="rounded-xl border border-border bg-card p-3">
          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
            <Clock className="h-3.5 w-3.5 text-yellow-400" /> Pendente
          </div>
          <div className="text-lg font-bold text-yellow-400">R$ {(summary?.pending || 0).toFixed(2)}</div>
        </div>
      </div>

      {/* Chart */}
      {chartData.length > 0 && (
        <div className="rounded-xl border border-border bg-card p-4">
          <h3 className="font-semibold mb-3">Por Categoria</h3>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
              <XAxis dataKey="name" tick={{ fontSize: 10, fill: "#888" }} />
              <YAxis tick={{ fontSize: 10, fill: "#888" }} />
              <Tooltip contentStyle={{ background: "#1a1f3a", border: "1px solid #333", borderRadius: 8 }} />
              <Bar dataKey="value" fill="#3B82F6" radius={[4, 4, 0, 0]} />
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
            <div key={t.id} className="flex items-center gap-3 p-3 rounded-xl border border-border bg-card">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${
                t.type === "income" ? "bg-green-500/20" : "bg-red-500/20"
              }`}>
                {t.type === "income" ? <TrendingUp className="h-5 w-5 text-green-400" /> : <TrendingDown className="h-5 w-5 text-red-400" />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm truncate">{t.category}</span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                    t.status === "paid" ? "bg-green-500/20 text-green-400" :
                    t.status === "overdue" ? "bg-red-500/20 text-red-400" :
                    t.status === "cancelled" ? "bg-muted text-muted-foreground" :
                    "bg-yellow-500/20 text-yellow-400"
                  }`}>{t.status === "paid" ? "Pago" : t.status === "pending" ? "Pendente" : t.status === "overdue" ? "Atrasado" : "Cancelado"}</span>
                </div>
                {t.description && <p className="text-xs text-muted-foreground truncate">{t.description}</p>}
                <p className="text-xs text-muted-foreground">{format(new Date(t.date), "dd/MM/yyyy")}</p>
              </div>
              <div className={`text-sm font-bold shrink-0 ${t.type === "income" ? "text-green-400" : "text-red-400"}`}>
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
