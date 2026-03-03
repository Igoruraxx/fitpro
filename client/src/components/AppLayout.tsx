import { useAuth } from "@/_core/hooks/useAuth";
import { useIsMobile } from "@/hooks/useMobile";
import {
  LayoutDashboard, Calendar, Users, TrendingUp, DollarSign, User,
  LogOut, Shield, Loader2, Image, Activity, BarChart3,
  ChevronRight, Settings, Menu, X, Eye, Crown, Lock, CheckCircle2,
  ArrowLeft,
} from "lucide-react";
import { useLocation } from "wouter";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { useEffect, useState } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { OfflineIndicator } from "./OfflineIndicator";
import { InstallPrompt } from "./InstallPrompt";

// Nav groups for better organization
const navGroups = [
  {
    label: "Principal",
    items: [
      { icon: LayoutDashboard, label: "Dashboard", path: "/dashboard" },
      { icon: Calendar, label: "Agenda", path: "/" },
    ],
  },
  {
    label: "Clientes",
    items: [
      { icon: Users, label: "Alunos", path: "/clientes" },
      { icon: Image, label: "Fotos", path: "/fotos" },
      { icon: TrendingUp, label: "Evolução", path: "/evolucao" },
    ],
  },
  {
    label: "Gestão",
    items: [
      { icon: DollarSign, label: "Financeiro", path: "/financas" },
      { icon: BarChart3, label: "Relatórios", path: "/relatorio-planos" },
    ],
  },
];

const mobileNavItems = [
  { icon: Calendar, label: "Agenda", path: "/" },
  { icon: Users, label: "Alunos", path: "/clientes" },
  { icon: DollarSign, label: "Financeiro", path: "/financas" },
  { icon: Image, label: "Fotos", path: "/fotos" },
  { icon: TrendingUp, label: "Evolução", path: "/evolucao" },
];

const PAGE_TITLES: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/": "Agenda",
  "/clientes": "Alunos",
  "/fotos": "Fotos de Progresso",
  "/evolucao": "Evolução",
  "/relatorio-planos": "Relatórios",
  "/financas": "Financeiro",
  "/perfil": "Perfil",
  "/admin": "Administração",
};

function getPageTitle(location: string): string {
  if (location.startsWith("/clientes/")) return "Detalhe do Aluno";
  return PAGE_TITLES[location] || "FITPRO";
}

function isActive(path: string, location: string): boolean {
  if (path === "/") return location === "/";
  if (path === "/dashboard") return location === "/dashboard";
  return location.startsWith(path);
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, loading, logout } = useAuth();
  const [location, setLocation] = useLocation();
  const isMobile = useIsMobile();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showTrialModal, setShowTrialModal] = useState(false);
  const utils = trpc.useUtils();

  const requestTrialMutation = trpc.users.requestTrial.useMutation({
    onSuccess: () => {
      toast.success("Trial de 7 dias ativado!", { description: "Aproveite todas as funcionalidades Pro." });
      setShowTrialModal(false);
      utils.invalidate();
    },
    onError: (error: any) => {
      toast.error("Nao foi possivel ativar o trial", { description: error.message });
    },
  });

  // Impersonation state
  const isImpersonating = !!(user as any)?.isImpersonating;
  const adminUser = (user as any)?.adminUser;
  const stopImpersonatingMutation = trpc.auth.stopImpersonating.useMutation({
    onSuccess: (data) => {
      toast.success(data.message);
      utils.auth.me.invalidate();
      setTimeout(() => setLocation("/admin"), 500);
    },
    onError: (e: any) => toast.error(e.message),
  });

  const isPro = user ? ["pro", "premium", "basic"].includes((user as any).subscriptionPlan ?? "free") || user.role === "admin" || isImpersonating : false;
  const isFree = !isPro;

  // Check if trial has expired
  useEffect(() => {
    if (!user || user.role === "admin") return;
    
    const proSource = (user as any).proSource;
    const proExpiresAt = (user as any).proExpiresAt;
    
    // Only show notification for trial users
    if (proSource === "trial" && proExpiresAt) {
      const expiresDate = new Date(proExpiresAt);
      const now = new Date();
      const daysLeft = Math.ceil((expiresDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      
      // Show notification if trial has expired
      if (daysLeft <= 0) {
        toast.error("Seu trial de 7 dias expirou!", {
          description: "Faça upgrade para Pro para continuar.",
        });
      }
    }
  }, [user?.id]);

  useEffect(() => {
    if (!loading && !user) {
      window.location.href = "/login";
    }
  }, [loading, user]);

  // Close sidebar on route change (mobile)
  useEffect(() => {
    setSidebarOpen(false);
  }, [location]);

  if (loading || !user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-7 w-7 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Carregando...</p>
        </div>
      </div>
    );
  }

  const pageTitle = getPageTitle(location);

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="h-16 flex items-center px-5 border-b border-border shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 flex items-center justify-center shrink-0">
            <img src="https://d2xsxph8kpxj0f.cloudfront.net/310519663385249362/5UbJ997E6SHYZid72bThxF/fitpro-logo_005e8846.png" alt="FitPro" className="w-8 h-8 object-contain" />
          </div>
          <div>
            <p className="text-sm font-bold text-foreground leading-none">FITPRO</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">Gestão Profissional</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-5">
        {navGroups.map((group) => (
          <div key={group.label}>
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider px-3 mb-1.5">
              {group.label}
            </p>
            <div className="space-y-0.5">
              {group.items.map((item) => {
                const active = isActive(item.path, location);
                // Free plan restrictions
                const isLocked = isFree && (item.path === "/evolucao" || item.path === "/relatorio-planos" || item.path === "/dashboard" || item.path === "/fotos");
                return (
                  <button
                    key={item.path}
                    onClick={() => {
                      if (isLocked) {
                        setShowTrialModal(true);
                        return;
                      }
                      setLocation(item.path);
                    }}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all duration-150 ${
                      active
                        ? "bg-primary text-primary-foreground font-medium shadow-sm"
                        : isLocked
                        ? "text-muted-foreground/40 cursor-not-allowed"
                        : "text-muted-foreground hover:bg-accent hover:text-accent-foreground font-normal"
                    }`}
                  >
                    <item.icon className="shrink-0" style={{ width: 16, height: 16 }} />
                    <span className="flex-1 text-left">{item.label}</span>
                    {isLocked && <Lock style={{ width: 12, height: 12 }} className="text-muted-foreground/40" />}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* User footer */}
      <div className="border-t border-border p-3 shrink-0">
        {/* Plan badge */}
        {isFree && (
          <div className="mx-3 mb-2 p-2 rounded-lg bg-orange-500/10 border border-orange-500/20 flex items-center gap-2">
            <Crown className="h-3.5 w-3.5 text-orange-400 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-semibold text-orange-400">Plano Free</p>
              <p className="text-[9px] text-muted-foreground">Upgrade para Pro</p>
            </div>
          </div>
        )}
        {(user.role === "admin" || isImpersonating) && (
          <>
            {isImpersonating && (
              <button
                onClick={() => stopImpersonatingMutation.mutate()}
                disabled={stopImpersonatingMutation.isPending}
                className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-orange-400 hover:bg-orange-500/10 transition-all mb-1"
              >
                <ArrowLeft style={{ width: 16, height: 16 }} className="shrink-0" />
                <span>Voltar ao Admin</span>
              </button>
            )}
            <button
              onClick={() => setLocation("/admin")}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-all mb-1"
            >
              <Shield style={{ width: 16, height: 16 }} className="shrink-0" />
              <span>Administração</span>
            </button>
          </>
        )}
        <div className="flex items-center gap-3 px-3 py-2">
          <Avatar className="h-8 w-8 shrink-0">
            {(user as any).photoUrl && <AvatarImage src={(user as any).photoUrl} />}
            <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
              {user.name?.charAt(0).toUpperCase() || "U"}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-foreground truncate">{user.name || "Usuário"}</p>
            <p className="text-[10px] text-muted-foreground truncate">
              {(user as any).cref ? `CREF ${(user as any).cref}` : user.email || ""}
            </p>
          </div>
          <button
            onClick={logout}
            className="text-muted-foreground hover:text-destructive transition-colors p-1 rounded-md hover:bg-destructive/10"
            title="Sair"
          >
            <LogOut style={{ width: 14, height: 14 }} />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background flex">
      {/* Desktop Sidebar */}
      {!isMobile && (
        <aside className="w-60 shrink-0 border-r border-border bg-card flex flex-col fixed inset-y-0 left-0 z-30">
          <SidebarContent />
        </aside>
      )}

      {/* Mobile Sidebar Overlay */}
      {isMobile && sidebarOpen && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
            onClick={() => setSidebarOpen(false)}
          />
          <aside className="fixed inset-y-0 left-0 z-50 w-64 bg-card border-r border-border shadow-xl flex flex-col">
            <SidebarContent />
          </aside>
        </>
      )}

      {/* Main content area */}
      <div className={`flex flex-col flex-1 min-w-0 ${!isMobile ? "ml-60" : ""}`}>
        {/* Topbar */}
        <header className="h-14 border-b border-border bg-card/80 backdrop-blur-sm sticky top-0 z-20 flex items-center justify-between px-5 shrink-0">
          <div className="flex items-center gap-3">
            {isMobile && (
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="p-1.5 rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
              >
                {sidebarOpen ? <X style={{ width: 18, height: 18 }} /> : <Menu style={{ width: 18, height: 18 }} />}
              </button>
            )}
            <div className="flex items-center gap-2 text-sm">
              <span className="text-muted-foreground hidden sm:block">FITPRO</span>
              <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/50 hidden sm:block" />
              <span className="font-semibold text-foreground">{pageTitle}</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg hover:bg-accent transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                  <Avatar className="h-7 w-7">
                    {(user as any).photoUrl && <AvatarImage src={(user as any).photoUrl} />}
                    <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
                      {user.name?.charAt(0).toUpperCase() || "U"}
                    </AvatarFallback>
                  </Avatar>
                  {!isMobile && (
                    <span className="text-sm font-medium text-foreground truncate max-w-[120px]">
                      {user.name || "Usuário"}
                    </span>
                  )}
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52">
                <div className="px-3 py-2">
                  <p className="text-sm font-semibold">{user.name || "Usuário"}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{user.email || ""}</p>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setLocation("/perfil")}>
                  <User className="mr-2 h-4 w-4" />
                  Meu Perfil
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setLocation("/perfil")}>
                  <Settings className="mr-2 h-4 w-4" />
                  Configurações
                </DropdownMenuItem>
                {(user.role === "admin" || isImpersonating) && (
                  <>
                    <DropdownMenuSeparator />
                    {isImpersonating && (
                      <DropdownMenuItem
                        onClick={() => stopImpersonatingMutation.mutate()}
                        disabled={stopImpersonatingMutation.isPending}
                        className="text-orange-400 focus:text-orange-400"
                      >
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Voltar ao Admin
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuItem onClick={() => setLocation("/admin")}>
                      <Shield className="mr-2 h-4 w-4" />
                      Administração
                    </DropdownMenuItem>
                  </>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={logout} className="text-destructive focus:text-destructive">
                  <LogOut className="mr-2 h-4 w-4" />
                  Sair
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {/* Impersonation banner */}
        {isImpersonating && (
          <div className="bg-orange-500/15 border-b border-orange-500/30 px-4 py-2 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-sm text-orange-400 min-w-0">
              <Eye className="h-4 w-4 shrink-0" />
              <span className="truncate">
                <span className="font-medium">Impersonando:</span>{" "}
                {user.name || user.email}
              </span>
            </div>
            <button
              onClick={() => stopImpersonatingMutation.mutate()}
              disabled={stopImpersonatingMutation.isPending}
              className="text-xs font-medium text-orange-400 hover:text-orange-300 bg-orange-500/20 hover:bg-orange-500/30 px-3 py-1 rounded-md transition-colors whitespace-nowrap"
            >
              {stopImpersonatingMutation.isPending ? "Voltando..." : "Parar"}
            </button>
          </div>
        )}

        {/* Page content */}
        <main className={`flex-1 overflow-auto ${isMobile ? "pb-20" : ""}`}>
          <div className="p-5 md:p-6 max-w-[1400px] mx-auto">
            {children}
          </div>
        </main>

        {/* Mobile Bottom Navigation */}
        {isMobile && (
          <nav className="fixed bottom-0 left-0 right-0 z-30 bg-card border-t border-border mobile-nav" style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 0px)' }}>
            <div className="flex items-center justify-around h-16 px-1">
              {mobileNavItems.map((item) => {
                const active = isActive(item.path, location);
                const isLocked = isFree && (item.path === "/evolucao" || item.path === "/fotos");
                return (
                  <button
                    key={item.path}
                    onClick={() => {
                      if (isLocked) {
                        setShowTrialModal(true);
                        return;
                      }
                      setLocation(item.path);
                    }}
                    className={`flex flex-col items-center justify-center gap-1 flex-1 h-full transition-all ${
                      active ? "text-primary" : isLocked ? "text-muted-foreground/30" : "text-muted-foreground"
                    }`}
                  >
                    {item.path === "/dashboard" ? (
                      <div className={`p-0.5 rounded-lg transition-all ${active ? "bg-primary/10" : ""}`}>
                        <img
                          src="https://d2xsxph8kpxj0f.cloudfront.net/310519663385249362/5UbJ997E6SHYZid72bThxF/fitpro-logo_005e8846.png"
                          alt="FitPro"
                          style={{ width: 22, height: 22, objectFit: "contain", opacity: active ? 1 : 0.5 }}
                        />
                      </div>
                    ) : (
                      <div className={`p-1 rounded-lg transition-all ${active ? "bg-primary/10" : ""}`}>
                        <item.icon style={{ width: 18, height: 18 }} />
                      </div>
                    )}
                    <span className={`text-[9px] font-medium ${active ? "text-primary" : ""}`}>{item.label}</span>
                  </button>
                );
              })}
            </div>
          </nav>
        )}

        {/* Trial Modal */}
        {showTrialModal && (
          <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
            <div className="bg-card rounded-lg shadow-lg max-w-sm w-full p-6 border border-border">
              <div className="flex items-center gap-3 mb-4">
                <Crown className="h-6 w-6 text-orange-400" />
                <h2 className="text-lg font-bold text-foreground">Teste Pro por 7 Dias</h2>
              </div>
              <p className="text-sm text-muted-foreground mb-6">
                Desbloqueie acesso completo a gráficos, relatórios e evolução de clientes. Sua solicitação só pode ser feita uma única vez.
              </p>
              <div className="space-y-3 mb-6">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="h-4 w-4 text-green-400 mt-0.5 shrink-0" />
                  <span className="text-sm text-muted-foreground">Acesso a todos os gráficos de evolução</span>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="h-4 w-4 text-green-400 mt-0.5 shrink-0" />
                  <span className="text-sm text-muted-foreground">Relatórios detalhados de planos</span>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="h-4 w-4 text-green-400 mt-0.5 shrink-0" />
                  <span className="text-sm text-muted-foreground">Dashboard com métricas completas</span>
                </div>
              </div>
              <div className="flex flex-col gap-3">
                <Button
                  onClick={() => requestTrialMutation.mutate()}
                  disabled={requestTrialMutation.isPending}
                  className="w-full bg-orange-500 hover:bg-orange-600 text-white"
                >
                  {requestTrialMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Ativando...
                    </>
                  ) : (
                    "Ativar Trial"
                  )}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowTrialModal(false);
                    setLocation("/upgrade");
                  }}
                  className="w-full"
                >
                  Ver Planos
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
      <OfflineIndicator />
      <InstallPrompt />
    </div>
  );
}
