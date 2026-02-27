import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Shield, Users, Calendar, Crown, BarChart3, Edit, ArrowLeft, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useLocation } from "wouter";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const planLabels: Record<string, string> = {
  free: "Gratuito",
  basic: "Básico",
  pro: "Profissional",
  premium: "Premium",
};

const statusLabels: Record<string, string> = {
  active: "Ativo",
  inactive: "Inativo",
  trial: "Trial",
  cancelled: "Cancelado",
};

export default function Admin() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [editingTrainer, setEditingTrainer] = useState<any>(null);
  const [editPlan, setEditPlan] = useState("");
  const [editStatus, setEditStatus] = useState("");
  const [editMaxClients, setEditMaxClients] = useState("");

  const { data: stats, isLoading: statsLoading } = trpc.admin.stats.useQuery(undefined, {
    retry: false,
  });
  const { data: trainers = [], refetch } = trpc.admin.trainers.useQuery(undefined, {
    retry: false,
  });

  const updateMutation = trpc.admin.updateTrainer.useMutation({
    onSuccess: () => { toast.success("Personal atualizado!"); refetch(); setEditingTrainer(null); },
    onError: (e) => toast.error(e.message),
  });

  if (!user || user.role !== "admin") {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <Shield className="h-12 w-12 text-muted-foreground/30 mb-4" />
        <h3 className="text-lg font-medium text-muted-foreground">Acesso Restrito</h3>
        <p className="text-sm text-muted-foreground/70 mt-1">Apenas administradores podem acessar esta página.</p>
        <Button variant="outline" className="mt-4" onClick={() => setLocation("/")}>Voltar</Button>
      </div>
    );
  }

  const openEdit = (trainer: any) => {
    setEditingTrainer(trainer);
    setEditPlan(trainer.subscriptionPlan);
    setEditStatus(trainer.subscriptionStatus);
    setEditMaxClients(String(trainer.maxClients));
  };

  const handleSave = () => {
    if (!editingTrainer) return;
    updateMutation.mutate({
      id: editingTrainer.id,
      subscriptionPlan: editPlan as any,
      subscriptionStatus: editStatus as any,
      maxClients: parseInt(editMaxClients) || 5,
    });
  };

  return (
    <div className="space-y-4 p-4 md:p-0">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => setLocation("/")}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Shield className="h-6 w-6 text-primary" /> Painel Admin
          </h2>
          <p className="text-sm text-muted-foreground">Gerencie personals e assinaturas</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card>
          <CardContent className="p-4 text-center">
            <Users className="h-5 w-5 text-primary mx-auto mb-1" />
            <div className="text-2xl font-bold">{stats?.totalTrainers ?? 0}</div>
            <div className="text-xs text-muted-foreground">Personals</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <Crown className="h-5 w-5 text-yellow-400 mx-auto mb-1" />
            <div className="text-2xl font-bold">{stats?.activeSubscriptions ?? 0}</div>
            <div className="text-xs text-muted-foreground">Assinaturas Ativas</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <Users className="h-5 w-5 text-green-400 mx-auto mb-1" />
            <div className="text-2xl font-bold">{stats?.totalClients ?? 0}</div>
            <div className="text-xs text-muted-foreground">Total Clientes</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <Calendar className="h-5 w-5 text-blue-400 mx-auto mb-1" />
            <div className="text-2xl font-bold">{stats?.totalAppointments ?? 0}</div>
            <div className="text-xs text-muted-foreground">Agendamentos</div>
          </CardContent>
        </Card>
      </div>

      {/* Trainers list */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Personals Cadastrados</CardTitle>
        </CardHeader>
        <CardContent>
          {trainers.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">Nenhum personal cadastrado ainda.</p>
          ) : (
            <div className="space-y-2">
              {trainers.map((trainer: any) => (
                <div key={trainer.id} className="flex items-center gap-3 p-3 rounded-xl border border-border bg-card/50 hover:bg-accent/30 transition-colors">
                  <Avatar className="h-10 w-10 border border-border">
                    <AvatarFallback className="bg-primary/20 text-primary text-sm font-bold">
                      {trainer.name?.charAt(0).toUpperCase() || "U"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm truncate">{trainer.name || "Sem nome"}</span>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                        trainer.subscriptionStatus === "active" ? "bg-green-500/20 text-green-400" :
                        trainer.subscriptionStatus === "trial" ? "bg-yellow-500/20 text-yellow-400" :
                        "bg-red-500/20 text-red-400"
                      }`}>{statusLabels[trainer.subscriptionStatus]}</span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                      <span>{trainer.email || "-"}</span>
                      <span className="flex items-center gap-1">
                        <Crown className="h-3 w-3" /> {planLabels[trainer.subscriptionPlan]}
                      </span>
                      <span>Max: {trainer.maxClients} clientes</span>
                    </div>
                    <div className="text-[10px] text-muted-foreground/60 mt-0.5">
                      Desde {format(new Date(trainer.createdAt), "dd/MM/yyyy", { locale: ptBR })}
                    </div>
                  </div>
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(trainer)}>
                    <Edit className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit modal */}
      <Dialog open={!!editingTrainer} onOpenChange={(v) => !v && setEditingTrainer(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Editar Personal</DialogTitle>
          </DialogHeader>
          {editingTrainer && (
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/30">
                <Avatar className="h-10 w-10">
                  <AvatarFallback className="bg-primary/20 text-primary">
                    {editingTrainer.name?.charAt(0).toUpperCase() || "U"}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <div className="font-semibold">{editingTrainer.name}</div>
                  <div className="text-xs text-muted-foreground">{editingTrainer.email}</div>
                </div>
              </div>
              <div>
                <Label>Plano</Label>
                <Select value={editPlan} onValueChange={setEditPlan}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="free">Gratuito</SelectItem>
                    <SelectItem value="basic">Básico</SelectItem>
                    <SelectItem value="pro">Profissional</SelectItem>
                    <SelectItem value="premium">Premium</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Status da Assinatura</Label>
                <Select value={editStatus} onValueChange={setEditStatus}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Ativo</SelectItem>
                    <SelectItem value="inactive">Inativo</SelectItem>
                    <SelectItem value="trial">Trial</SelectItem>
                    <SelectItem value="cancelled">Cancelado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Máximo de Clientes</Label>
                <Input className="mt-1" type="number" value={editMaxClients} onChange={(e) => setEditMaxClients(e.target.value)} />
              </div>
              <div className="flex gap-3 pt-2">
                <Button variant="outline" className="flex-1" onClick={() => setEditingTrainer(null)}>Cancelar</Button>
                <Button className="flex-1" onClick={handleSave} disabled={updateMutation.isPending}>Salvar</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
