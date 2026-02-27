import { trpc } from "@/lib/trpc";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Plus, Search, Phone, Mail, Target, Trash2, Edit, Users, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useLocation } from "wouter";

export default function Clientes() {
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [, setLocation] = useLocation();

  // Form
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [gender, setGender] = useState<string>("");
  const [goal, setGoal] = useState("");
  const [monthlyFee, setMonthlyFee] = useState("");
  const [notes, setNotes] = useState("");

  const { data: clients = [], isLoading, refetch } = trpc.clients.list.useQuery();

  const createMutation = trpc.clients.create.useMutation({
    onSuccess: () => { toast.success("Cliente cadastrado!"); refetch(); setShowModal(false); },
    onError: (e) => toast.error(e.message),
  });

  const updateMutation = trpc.clients.update.useMutation({
    onSuccess: () => { toast.success("Cliente atualizado!"); refetch(); setShowModal(false); },
    onError: (e) => toast.error(e.message),
  });

  const deleteMutation = trpc.clients.delete.useMutation({
    onSuccess: () => { toast.success("Cliente excluído!"); refetch(); },
    onError: (e) => toast.error(e.message),
  });

  const filtered = clients.filter((c: any) =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    (c.email && c.email.toLowerCase().includes(search.toLowerCase()))
  );

  const openNew = () => {
    setEditing(null);
    setName(""); setEmail(""); setPhone(""); setGender(""); setGoal(""); setMonthlyFee(""); setNotes("");
    setShowModal(true);
  };

  const openEdit = (c: any) => {
    setEditing(c);
    setName(c.name); setEmail(c.email || ""); setPhone(c.phone || ""); setGender(c.gender || "");
    setGoal(c.goal || ""); setMonthlyFee(c.monthlyFee || ""); setNotes(c.notes || "");
    setShowModal(true);
  };

  const handleSubmit = () => {
    if (!name.trim()) { toast.error("Nome é obrigatório"); return; }
    const payload: any = {
      name, email: email || undefined, phone: phone || undefined,
      gender: gender || undefined, goal: goal || undefined,
      monthlyFee: monthlyFee || undefined, notes: notes || undefined,
    };
    if (editing) {
      updateMutation.mutate({ id: editing.id, ...payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active": return <span className="text-xs px-2 py-0.5 rounded-full bg-green-500/20 text-green-400">Ativo</span>;
      case "inactive": return <span className="text-xs px-2 py-0.5 rounded-full bg-red-500/20 text-red-400">Inativo</span>;
      case "trial": return <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-500/20 text-yellow-400">Experimental</span>;
      default: return null;
    }
  };

  return (
    <div className="space-y-4 p-4 md:p-0">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold">Clientes</h2>
          <p className="text-sm text-muted-foreground">{clients.length} cliente(s) cadastrado(s)</p>
        </div>
        <Button onClick={openNew}>
          <Plus className="h-4 w-4 mr-2" /> Novo Cliente
        </Button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar cliente..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Users className="h-12 w-12 text-muted-foreground/30 mb-4" />
          <h3 className="text-lg font-medium text-muted-foreground">Nenhum cliente encontrado</h3>
          <p className="text-sm text-muted-foreground/70 mt-1">Cadastre seu primeiro cliente para começar.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((client: any) => (
            <div
              key={client.id}
              className="flex items-center gap-3 p-3 rounded-xl border border-border bg-card hover:bg-accent/50 transition-colors cursor-pointer"
              onClick={() => setLocation(`/clientes/${client.id}`)}
            >
              <Avatar className="h-11 w-11 border border-border">
                <AvatarFallback className="bg-primary/20 text-primary text-sm font-bold">
                  {client.name.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-sm truncate">{client.name}</span>
                  {getStatusBadge(client.status)}
                </div>
                <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                  {client.phone && <span className="flex items-center gap-1"><Phone className="h-3 w-3" />{client.phone}</span>}
                  {client.email && <span className="flex items-center gap-1"><Mail className="h-3 w-3" />{client.email}</span>}
                </div>
                {client.goal && (
                  <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                    <Target className="h-3 w-3" /> {client.goal}
                  </div>
                )}
              </div>
              {client.monthlyFee && (
                <div className="text-right shrink-0">
                  <div className="text-sm font-bold text-primary">R$ {parseFloat(client.monthlyFee).toFixed(2)}</div>
                  <div className="text-[10px] text-muted-foreground">/mês</div>
                </div>
              )}
              <div className="flex gap-1 shrink-0">
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => { e.stopPropagation(); openEdit(client); }}>
                  <Edit className="h-3.5 w-3.5" />
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={(e) => { e.stopPropagation(); deleteMutation.mutate({ id: client.id }); }}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? "Editar Cliente" : "Novo Cliente"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Nome *</Label>
              <Input className="mt-1" value={name} onChange={(e) => setName(e.target.value)} placeholder="Nome completo" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Email</Label>
                <Input className="mt-1" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="email@exemplo.com" />
              </div>
              <div>
                <Label>Telefone</Label>
                <Input className="mt-1" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="(11) 99999-9999" />
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
                <Label>Mensalidade (R$)</Label>
                <Input className="mt-1" type="number" value={monthlyFee} onChange={(e) => setMonthlyFee(e.target.value)} placeholder="0.00" />
              </div>
            </div>
            <div>
              <Label>Objetivo</Label>
              <Input className="mt-1" value={goal} onChange={(e) => setGoal(e.target.value)} placeholder="Ex: Emagrecimento, Hipertrofia..." />
            </div>
            <div>
              <Label>Observações</Label>
              <Input className="mt-1" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Notas sobre o cliente..." />
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
    </div>
  );
}
