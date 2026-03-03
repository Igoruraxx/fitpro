import { useAuth } from "@/_core/hooks/useAuth";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { useState } from "react";
import {
  Crown, Shield, Search, Filter, Loader2, MoreVertical, Eye, Trash2,
  Users, Calendar, TrendingUp, AlertCircle, CheckCircle2,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function Admin() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [search, setSearch] = useState("");
  const [planFilter, setPlanFilter] = useState<"all" | "free" | "pro">("all");
  const [originFilter, setOriginFilter] = useState<"all" | "payment" | "courtesy" | "trial">("all");
  const [selectedPersonal, setSelectedPersonal] = useState<any>(null);
  const [showActionDialog, setShowActionDialog] = useState<"convert" | "cancel" | null>(null);
  const [courtesyDays, setCourtesyDays] = useState("365");

  const personalsQuery = trpc.admin.listPersonals.useQuery({
    search,
    planFilter,
    originFilter,
  });

  const convertToProMutation = trpc.admin.convertToProCourtesy.useMutation({
    onSuccess: (data) => {
      toast.success(data.message);
      personalsQuery.refetch();
      setShowActionDialog(null);
      setSelectedPersonal(null);
    },
    onError: (e: any) => toast.error(e.message),
  });

  const cancelProMutation = trpc.admin.cancelProSubscription.useMutation({
    onSuccess: (data) => {
      toast.success(data.message);
      personalsQuery.refetch();
      setShowActionDialog(null);
      setSelectedPersonal(null);
    },
    onError: (e: any) => toast.error(e.message),
  });

  const utils = trpc.useUtils();
  const impersonateMutation = trpc.admin.impersonatePersonal.useMutation({
    onSuccess: (data) => {
      toast.success(data.message);
      utils.auth.me.invalidate();
      setTimeout(() => setLocation("/dashboard"), 800);
    },
    onError: (e: any) => toast.error(e.message),
  });

  const isImpersonating = !!(user as any)?.isImpersonating;
  const isAdmin = user?.role === "admin" || isImpersonating;

  if (!user || !isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <Shield className="h-12 w-12 text-muted-foreground/30 mb-4" />
        <h3 className="text-lg font-medium text-muted-foreground">Acesso Restrito</h3>
        <p className="text-sm text-muted-foreground mt-2">Apenas administradores podem acessar este painel</p>
      </div>
    );
  }

  const personals = personalsQuery.data || [];
  const planColors: Record<string, string> = {
    free: "bg-green-500/10 text-green-400 border-green-500/20",
    pro: "bg-orange-500/10 text-orange-400 border-orange-500/20",
  };

  const originLabels = {
    payment: "Pagamento",
    courtesy: "Cortesia",
    trial: "Trial 7 dias",
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
          <Shield className="h-8 w-8 text-orange-400" />
          Painel Administrativo
        </h1>
        <p className="text-muted-foreground mt-2">Gerenciar personals, planos e assinaturas</p>
      </div>

      {/* Filters */}
      <Card className="p-4 border-border/50">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>

          <Select value={planFilter} onValueChange={(v: any) => setPlanFilter(v)}>
            <SelectTrigger>
              <SelectValue placeholder="Filtrar por plano" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os planos</SelectItem>
              <SelectItem value="free">Free</SelectItem>
              <SelectItem value="pro">Pro</SelectItem>
            </SelectContent>
          </Select>

          <Select value={originFilter} onValueChange={(v: any) => setOriginFilter(v)}>
            <SelectTrigger>
              <SelectValue placeholder="Filtrar por origem" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as origens</SelectItem>
              <SelectItem value="payment">Pagamento</SelectItem>
              <SelectItem value="courtesy">Cortesia</SelectItem>
              <SelectItem value="trial">Trial</SelectItem>
            </SelectContent>
          </Select>

          <Button
            variant="outline"
            onClick={() => {
              setSearch("");
              setPlanFilter("all");
              setOriginFilter("all");
            }}
          >
            <Filter className="h-4 w-4 mr-2" />
            Limpar Filtros
          </Button>
        </div>
      </Card>

      {/* Personals Table */}
      <Card className="border-border/50 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 border-b border-border/50">
              <tr>
                <th className="px-6 py-3 text-left font-semibold text-foreground">Nome</th>
                <th className="px-6 py-3 text-left font-semibold text-foreground">Clientes</th>
                <th className="px-6 py-3 text-left font-semibold text-foreground">Plano</th>
                <th className="px-6 py-3 text-left font-semibold text-foreground">Origem</th>
                <th className="px-6 py-3 text-left font-semibold text-foreground">Expiração</th>
                <th className="px-6 py-3 text-left font-semibold text-foreground">Status</th>
                <th className="px-6 py-3 text-right font-semibold text-foreground">Ações</th>
              </tr>
            </thead>
            <tbody>
              {personalsQuery.isLoading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                  </td>
                </tr>
              ) : personals.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-muted-foreground">
                    Nenhum personal encontrado
                  </td>
                </tr>
              ) : (
                personals.map((personal) => (
                  <tr key={personal.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-medium text-foreground">{personal.name}</div>
                      <div className="text-xs text-muted-foreground">{personal.email}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1 text-foreground">
                        <Users className="h-4 w-4 text-muted-foreground" />
                        {personal.clientCount}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium border ${planColors[personal.plan]}`}>
                        {personal.plan === "pro" ? (
                          <span className="flex items-center gap-1">
                            <Crown className="h-3 w-3" />
                            Pro
                          </span>
                        ) : (
                          "Free"
                        )}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {personal.plan === "pro" && personal.proSource ? (
                        <span className="text-xs text-muted-foreground">
                          {originLabels[personal.proSource as keyof typeof originLabels] || personal.proSource}
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {personal.plan === "pro" && personal.expiresAt ? (
                        <div className="text-xs">
                          <div className="text-foreground">
                            {new Date(personal.expiresAt).toLocaleDateString("pt-BR")}
                          </div>
                          <div className={personal.daysRemaining! <= 7 ? "text-red-400" : "text-muted-foreground"}>
                            {personal.daysRemaining! > 0
                              ? `${personal.daysRemaining} dias`
                              : "Expirado"}
                          </div>
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        {personal.status === "active" ? (
                          <CheckCircle2 className="h-4 w-4 text-green-500" />
                        ) : (
                          <AlertCircle className="h-4 w-4 text-yellow-500" />
                        )}
                        <span className="text-xs text-muted-foreground capitalize">
                          {personal.status || "—"}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48">
                          <DropdownMenuItem
                            onClick={() => impersonateMutation.mutate({ personalId: personal.id })}
                            disabled={impersonateMutation.isPending}
                          >
                            <Eye className="h-4 w-4 mr-2" />
                            Impersonar
                          </DropdownMenuItem>

                          {personal.plan === "free" && (
                            <DropdownMenuItem
                              onClick={() => {
                                setSelectedPersonal(personal);
                                setShowActionDialog("convert");
                              }}
                            >
                              <Crown className="h-4 w-4 mr-2" />
                              Converter para Pro
                            </DropdownMenuItem>
                          )}

                          {personal.plan === "pro" && (
                            <DropdownMenuItem
                              onClick={() => {
                                setSelectedPersonal(personal);
                                setShowActionDialog("cancel");
                              }}
                              className="text-red-400"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Cancelar Pro
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Convert to Pro Dialog */}
      <Dialog open={showActionDialog === "convert"} onOpenChange={() => setShowActionDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Converter para Pro (Cortesia)</DialogTitle>
            <DialogDescription>
              Conceder acesso Pro como cortesia para {selectedPersonal?.name}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-foreground">Dias válidos</label>
              <Input
                type="number"
                min="1"
                max="365"
                value={courtesyDays}
                onChange={(e) => setCourtesyDays(e.target.value)}
                className="mt-1"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Padrão: 365 dias (1 ano)
              </p>
            </div>

            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => setShowActionDialog(null)}
                className="flex-1"
              >
                Cancelar
              </Button>
              <Button
                onClick={() =>
                  convertToProMutation.mutate({
                    personalId: selectedPersonal.id,
                    daysValid: parseInt(courtesyDays) || 365,
                  })
                }
                disabled={convertToProMutation.isPending}
                className="flex-1 bg-orange-500 hover:bg-orange-600"
              >
                {convertToProMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Crown className="h-4 w-4 mr-2" />
                )}
                Conceder
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Cancel Pro Dialog */}
      <Dialog open={showActionDialog === "cancel"} onOpenChange={() => setShowActionDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-red-400">Cancelar Assinatura Pro</DialogTitle>
            <DialogDescription>
              Você tem certeza que deseja cancelar a assinatura Pro de {selectedPersonal?.name}?
            </DialogDescription>
          </DialogHeader>

          <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 text-sm text-red-400">
            <AlertCircle className="h-4 w-4 inline mr-2" />
            Esta ação não pode ser desfeita. O personal voltará ao plano Free.
          </div>

          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={() => setShowActionDialog(null)}
              className="flex-1"
            >
              Não, Manter
            </Button>
            <Button
              onClick={() => cancelProMutation.mutate({ personalId: selectedPersonal.id })}
              disabled={cancelProMutation.isPending}
              className="flex-1 bg-red-500 hover:bg-red-600"
            >
              {cancelProMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Trash2 className="h-4 w-4 mr-2" />
              )}
              Sim, Cancelar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
