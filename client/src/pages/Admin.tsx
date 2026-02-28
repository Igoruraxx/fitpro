import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Shield, Users, Calendar, Crown, Edit, ArrowLeft, Loader2,
  Eye, UserCheck, AlertCircle, CheckCircle2, Zap, Lock
} from "lucide-react";
import { toast } from "sonner";
import { useLocation } from "wouter";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const planLabels: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  free:    { label: "Free",         color: "bg-gray-500/20 text-gray-400 border-gray-500/30",    icon: <Lock className="h-3 w-3" /> },
  basic:   { label: "Básico",       color: "bg-blue-500/20 text-blue-400 border-blue-500/30",    icon: <Zap className="h-3 w-3" /> },
  pro:     { label: "Pro",          color: "bg-orange-500/20 text-orange-400 border-orange-500/30", icon: <Crown className="h-3 w-3" /> },
  premium: { label: "Premium",      color: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30", icon: <Crown className="h-3 w-3" /> },
};

const statusColors: Record<string, string> = {
  active:    "bg-green-500/20 text-green-400 border-green-500/30",
  inactive:  "bg-red-500/20 text-red-400 border-red-500/30",
  trial:     "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  cancelled: "bg-red-500/20 text-red-400 border-red-500/30",
};

const statusLabels: Record<string, string> = {
  active: "Ativo", inactive: "Inativo", trial: "Trial", cancelled: "Cancelado",
};

export default function Admin() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();

  // Redirecionar se não for admin
  if (!user || user.role !== 'admin') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-red-400 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-foreground mb-2">Acesso Negado</h1>
          <p className="text-muted-foreground mb-6">Apenas administradores podem acessar esta página.</p>
          <Button onClick={() => setLocation('/')} variant="default">Voltar para Home</Button>
        </div>
      </div>
    );
  }
  const [editingTrainer, setEditingTrainer] = useState<any>(null);
  const [editPlan, setEditPlan] = useState("");
  const [editStatus, setEditStatus] = useState("");
  const [editMaxClients, setEditMaxClients] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  const utils = trpc.useUtils();

  const { data: stats, isLoading: statsLoading } = trpc.admin.stats.useQuery(undefined, { retry: false });
  const { data: trainers = [], refetch, isLoading: trainersLoading } = trpc.admin.trainers.useQuery(undefined, { retry: false });
  const { data: impStatus } = trpc.admin.impersonationStatus.useQuery();

  const updateMutation = trpc.admin.updateTrainer.useMutation({
    onSuccess: () => { toast.success("Personal atualizado!"); refetch(); setEditingTrainer(null); },
    onError: (e) => toast.error(e.message),
  });

  const updatePlanMutation = trpc.admin.updatePlan.useMutation({
    onSuccess: () => { toast.success("Plano atualizado!"); refetch(); },
    onError: (e) => toast.error(e.message),
  });

  const impersonateMutation = trpc.admin.impersonate.useMutation({
    onSuccess: () => {
      toast.success("Modo de visualização ativado! Redirecionando...");
      utils.invalidate();
      setTimeout(() => setLocation("/"), 800);
    },
    onError: (e) => toast.error(e.message),
  });

  const stopImpersonatingMutation = trpc.admin.stopImpersonating.useMutation({
    onSuccess: () => {
      toast.success("Voltando ao painel admin...");
      utils.invalidate();
      setTimeout(() => setLocation("/admin"), 800);
    },
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

  const filteredTrainers = trainers.filter((t: any) =>
    !searchQuery ||
    t.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const freeCount = trainers.filter((t: any) => t.subscriptionPlan === "free").length;
  const proCount = trainers.filter((t: any) => ["pro", "premium"].includes(t.subscriptionPlan)).length;

  return (
    <div className="space-y-4 p-4 md:p-0 pb-24">
      {/* Impersonation banner */}
      {impStatus?.isImpersonating && (
        <div className="flex items-center justify-between gap-3 p-3 rounded-xl bg-orange-500/10 border border-orange-500/30 text-orange-400">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Eye className="h-4 w-4" />
            Visualizando como: <strong>{impStatus.targetUser?.name}</strong>
          </div>
          <Button
            size="sm"
            variant="outline"
            className="border-orange-500/40 text-orange-400 hover:bg-orange-500/20 h-7 text-xs"
            onClick={() => stopImpersonatingMutation.mutate()}
            disabled={stopImpersonatingMutation.isPending}
          >
            {stopImpersonatingMutation.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : "Voltar ao Admin"}
          </Button>
        </div>
      )}

      {/* Header */}
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
            <div className="text-2xl font-bold">{statsLoading ? "—" : stats?.totalTrainers ?? 0}</div>
            <div className="text-xs text-muted-foreground">Personals</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <Crown className="h-5 w-5 text-orange-400 mx-auto mb-1" />
            <div className="text-2xl font-bold">{proCount}</div>
            <div className="text-xs text-muted-foreground">Plano Pro</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <Lock className="h-5 w-5 text-gray-400 mx-auto mb-1" />
            <div className="text-2xl font-bold">{freeCount}</div>
            <div className="text-xs text-muted-foreground">Plano Free</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <Calendar className="h-5 w-5 text-blue-400 mx-auto mb-1" />
            <div className="text-2xl font-bold">{statsLoading ? "—" : stats?.totalClients ?? 0}</div>
            <div className="text-xs text-muted-foreground">Total Alunos</div>
          </CardContent>
        </Card>
      </div>

      {/* Planos Free vs Pro */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm text-muted-foreground font-medium">Comparativo de Planos</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 rounded-xl border border-gray-500/20 bg-gray-500/5">
              <div className="flex items-center gap-2 mb-2">
                <Lock className="h-4 w-4 text-gray-400" />
                <span className="font-semibold text-sm">Free</span>
              </div>
              <ul className="text-xs text-muted-foreground space-y-1">
                <li className="flex items-center gap-1"><CheckCircle2 className="h-3 w-3 text-green-400" /> Até 5 alunos</li>
                <li className="flex items-center gap-1"><CheckCircle2 className="h-3 w-3 text-green-400" /> Agenda básica</li>
                <li className="flex items-center gap-1"><CheckCircle2 className="h-3 w-3 text-green-400" /> Financeiro básico</li>
                <li className="flex items-center gap-1"><AlertCircle className="h-3 w-3 text-red-400" /> Sem gráficos</li>
                <li className="flex items-center gap-1"><AlertCircle className="h-3 w-3 text-red-400" /> Sem relatórios</li>
                <li className="flex items-center gap-1"><AlertCircle className="h-3 w-3 text-red-400" /> Sem evolução</li>
              </ul>
            </div>
            <div className="p-3 rounded-xl border border-orange-500/30 bg-orange-500/5">
              <div className="flex items-center gap-2 mb-2">
                <Crown className="h-4 w-4 text-orange-400" />
                <span className="font-semibold text-sm text-orange-400">Pro</span>
              </div>
              <ul className="text-xs text-muted-foreground space-y-1">
                <li className="flex items-center gap-1"><CheckCircle2 className="h-3 w-3 text-green-400" /> Alunos ilimitados</li>
                <li className="flex items-center gap-1"><CheckCircle2 className="h-3 w-3 text-green-400" /> Agenda completa</li>
                <li className="flex items-center gap-1"><CheckCircle2 className="h-3 w-3 text-green-400" /> Financeiro completo</li>
                <li className="flex items-center gap-1"><CheckCircle2 className="h-3 w-3 text-green-400" /> Gráficos e dashboards</li>
                <li className="flex items-center gap-1"><CheckCircle2 className="h-3 w-3 text-green-400" /> Relatórios PDF</li>
                <li className="flex items-center gap-1"><CheckCircle2 className="h-3 w-3 text-green-400" /> Aba Evolução</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Search */}
      <div className="relative">
        <Input
          placeholder="Buscar personal por nome ou e-mail..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-4"
        />
      </div>

      {/* Trainers list */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Personals Cadastrados</CardTitle>
        </CardHeader>
        <CardContent>
          {trainersLoading ? (
            <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
          ) : filteredTrainers.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">Nenhum personal encontrado.</p>
          ) : (
            <div className="space-y-2">
              {filteredTrainers.map((trainer: any) => {
                const plan = planLabels[trainer.subscriptionPlan] ?? planLabels.free;
                const isMe = trainer.id === user.id;
                return (
                  <div key={trainer.id} className={`flex items-center gap-3 p-3 rounded-xl border transition-colors ${isMe ? "border-primary/40 bg-primary/5" : "border-border bg-card/50 hover:bg-accent/30"}`}>
                    <Avatar className="h-10 w-10 border border-border flex-shrink-0">
                      {trainer.photoUrl && <AvatarImage src={trainer.photoUrl} />}
                      <AvatarFallback className="bg-primary/20 text-primary text-sm font-bold">
                        {trainer.name?.charAt(0).toUpperCase() || "U"}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-sm truncate">{trainer.name || "Sem nome"}</span>
                        {isMe && <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-primary/40 text-primary">Você</Badge>}
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full border flex items-center gap-1 ${plan.color}`}>
                          {plan.icon} {plan.label}
                        </span>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full border ${statusColors[trainer.subscriptionStatus] ?? ""}`}>
                          {statusLabels[trainer.subscriptionStatus] ?? trainer.subscriptionStatus}
                        </span>
                      </div>
                      <div className="text-xs text-muted-foreground mt-0.5 truncate">{trainer.email || "—"}</div>
                      <div className="flex items-center gap-3 text-[10px] text-muted-foreground/60 mt-0.5">
                        <span>{trainer.activeClients ?? 0} alunos ativos</span>
                        <span>Max: {trainer.maxClients}</span>
                        <span>Desde {format(new Date(trainer.createdAt), "dd/MM/yy", { locale: ptBR })}</span>
                      </div>
                    </div>
                    <div className="flex flex-col gap-1 flex-shrink-0">
                      {/* Quick plan toggle */}
                      {!isMe && (
                        <Button
                          variant="outline"
                          size="sm"
                          className={`h-7 text-[10px] px-2 ${trainer.subscriptionPlan === "pro" ? "border-orange-500/40 text-orange-400 hover:bg-orange-500/10" : "border-gray-500/40 text-gray-400 hover:bg-gray-500/10"}`}
                          onClick={() => updatePlanMutation.mutate({ userId: trainer.id, plan: trainer.subscriptionPlan === "pro" ? "free" : "pro" })}
                          disabled={updatePlanMutation.isPending}
                        >
                          {updatePlanMutation.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : trainer.subscriptionPlan === "pro" ? "→ Free" : "→ Pro"}
                        </Button>
                      )}
                      {/* View as trainer */}
                      {!isMe && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 text-[10px] px-2 border-blue-500/40 text-blue-400 hover:bg-blue-500/10"
                          onClick={() => impersonateMutation.mutate({ targetUserId: trainer.id })}
                          disabled={impersonateMutation.isPending}
                        >
                          {impersonateMutation.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <><Eye className="h-3 w-3 mr-1" />Ver</>}
                        </Button>
                      )}
                      {/* Edit */}
                      <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => openEdit(trainer)}>
                        <Edit className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                );
              })}
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
                    <SelectItem value="free">Free (até 5 alunos)</SelectItem>
                    <SelectItem value="pro">Pro (ilimitado)</SelectItem>
                    <SelectItem value="basic">Básico</SelectItem>
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
                <Button className="flex-1" onClick={handleSave} disabled={updateMutation.isPending}>
                  {updateMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Salvar"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
