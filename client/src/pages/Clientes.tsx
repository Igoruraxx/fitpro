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
import { Plus, Search, Phone, Mail, Target, Trash2, Edit, Users, Calendar } from "lucide-react";
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

const PLAN_LABELS: Record<string, string> = {
  monthly: "Mensal",
  package: "Pacote",
  free: "Gratuito",
};

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

export default function Clientes() {
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [deleteTarget, setDeleteTarget] = useState<any>(null);
  const [, setLocation] = useLocation();

  // Form fields
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [gender, setGender] = useState<string>("");
  const [goal, setGoal] = useState("");
  const [monthlyFee, setMonthlyFee] = useState("");
  const [sessionsPerWeek, setSessionsPerWeek] = useState("3");
  const [planType, setPlanType] = useState("monthly");
  const [status, setStatus] = useState("active");
  const [notes, setNotes] = useState("");

  const { data: clients = [], isLoading, refetch } = trpc.clients.list.useQuery();

  const createMutation = trpc.clients.create.useMutation({
    onSuccess: () => { toast.success("Aluno cadastrado!"); refetch(); setShowModal(false); },
    onError: (e) => toast.error(e.message),
  });

  const updateMutation = trpc.clients.update.useMutation({
    onSuccess: () => { toast.success("Aluno atualizado!"); refetch(); setShowModal(false); },
    onError: (e) => toast.error(e.message),
  });

  const deleteMutation = trpc.clients.delete.useMutation({
    onSuccess: () => { toast.success("Aluno excluído!"); refetch(); setDeleteTarget(null); },
    onError: (e) => toast.error(e.message),
  });

  const filtered = clients.filter((c: any) =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    (c.email && c.email.toLowerCase().includes(search.toLowerCase())) ||
    (c.phone && c.phone.includes(search))
  );

  const resetForm = () => {
    setName(""); setEmail(""); setPhone(""); setGender(""); setGoal("");
    setMonthlyFee(""); setSessionsPerWeek("3"); setPlanType("monthly");
    setStatus("active"); setNotes("");
  };

  const openNew = () => {
    setEditing(null);
    resetForm();
    setShowModal(true);
  };

  const openEdit = (c: any) => {
    setEditing(c);
    setName(c.name); setEmail(c.email || ""); setPhone(c.phone || "");
    setGender(c.gender || ""); setGoal(c.goal || "");
    setMonthlyFee(c.monthlyFee || ""); setSessionsPerWeek(String(c.paymentDay || 3));
    setPlanType("monthly"); setStatus(c.status || "active"); setNotes(c.notes || "");
    setShowModal(true);
  };

  const handleSubmit = () => {
    if (!name.trim()) { toast.error("Nome é obrigatório"); return; }
    const payload: any = {
      name, email: email || undefined, phone: phone || undefined,
      gender: gender || undefined, goal: goal || undefined,
      monthlyFee: monthlyFee || undefined, notes: notes || undefined,
      paymentDay: parseInt(sessionsPerWeek) || 3,
      status: status as any,
    };
    if (editing) {
      updateMutation.mutate({ id: editing.id, ...payload });
    } else {
      createMutation.mutate(payload);
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
          placeholder="Buscar por nome, e-mail ou telefone..."
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
          {filtered.map((client: any) => (
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
                </div>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground mt-0.5">
                  {client.goal && (
                    <span className="flex items-center gap-1">
                      <Target className="h-3 w-3" /> {client.goal}
                    </span>
                  )}
                  {client.email && (
                    <span className="flex items-center gap-1 truncate max-w-[160px]">
                      <Mail className="h-3 w-3 shrink-0" /> {client.email}
                    </span>
                  )}
                  {client.phone && (
                    <span className="flex items-center gap-1">
                      <Phone className="h-3 w-3" /> {client.phone}
                    </span>
                  )}
                  {client.paymentDay && (
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" /> {client.paymentDay}x/sem
                    </span>
                  )}
                </div>
              </div>
              {client.monthlyFee && (
                <div className="text-right shrink-0 hidden sm:block">
                  <div className="text-sm font-bold text-primary">R$ {parseFloat(client.monthlyFee).toFixed(0)}</div>
                  <div className="text-[10px] text-muted-foreground">/mês</div>
                </div>
              )}
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
          ))}
        </div>
      )}

      {/* Create/Edit Modal */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "Editar Aluno" : "Novo Aluno"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Nome completo *</Label>
              <Input className="mt-1" value={name} onChange={(e) => setName(e.target.value)} placeholder="Nome do aluno" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>E-mail</Label>
                <Input className="mt-1" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="email@exemplo.com" />
              </div>
              <div>
                <Label>Telefone</Label>
                <Input className="mt-1" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="(11) 99999-9999" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Plano</Label>
                <Select value={planType} onValueChange={setPlanType}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="monthly">Mensal</SelectItem>
                    <SelectItem value="package">Pacote</SelectItem>
                    <SelectItem value="free">Gratuito</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Sessões/semana</Label>
                <Select value={sessionsPerWeek} onValueChange={setSessionsPerWeek}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {[1,2,3,4,5,6,7].map(n => (
                      <SelectItem key={n} value={String(n)}>{n}x por semana</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
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
            </div>
            <div>
              <Label>Mensalidade (R$)</Label>
              <Input className="mt-1" type="number" value={monthlyFee} onChange={(e) => setMonthlyFee(e.target.value)} placeholder="0.00" />
            </div>
            <div>
              <Label>Objetivo</Label>
              <Input className="mt-1" value={goal} onChange={(e) => setGoal(e.target.value)} placeholder="Ex: Emagrecimento, Hipertrofia..." />
            </div>
            <div>
              <Label>Observações</Label>
              <Input className="mt-1" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Notas sobre o aluno..." />
            </div>
            <div className="flex gap-3 pt-2">
              <Button variant="outline" className="flex-1" onClick={() => setShowModal(false)}>Cancelar</Button>
              <Button className="flex-1" onClick={handleSubmit} disabled={createMutation.isPending || updateMutation.isPending}>
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
