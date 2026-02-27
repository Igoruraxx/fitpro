import { useAuth } from "@/_core/hooks/useAuth";
import { useIsMobile } from "@/hooks/useMobile";
import {
  LayoutDashboard, Calendar, Users, TrendingUp, DollarSign, User,
  LogOut, Shield, Loader2, Dumbbell, Image, ChevronRight, Activity,
} from "lucide-react";
import { useLocation } from "wouter";
import { Avatar, AvatarFallback } from "./ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { useEffect } from "react";

const navItems = [
  { icon: LayoutDashboard, label: "Dashboard", path: "/dashboard" },
  { icon: Calendar, label: "Agenda", path: "/" },
  { icon: Users, label: "Alunos", path: "/clientes" },
  { icon: Image, label: "Fotos", path: "/fotos" },
  { icon: Activity, label: "Bioimpedância", path: "/bioimpedancia" },
  { icon: TrendingUp, label: "Evolução", path: "/evolucao" },
  { icon: DollarSign, label: "Finanças", path: "/financas" },
  { icon: User, label: "Perfil", path: "/perfil" },
];

// Mobile bottom nav shows only the 5 most important items
const mobileNavItems = [
  { icon: Calendar, label: "Agenda", path: "/" },
  { icon: Users, label: "Alunos", path: "/clientes" },
  { icon: DollarSign, label: "Finanças", path: "/financas" },
  { icon: Image, label: "Fotos", path: "/fotos" },
  { icon: Activity, label: "Bio", path: "/bioimpedancia" },
];

const PAGE_TITLES: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/": "Agenda",
  "/clientes": "Alunos",
  "/fotos": "Fotos de Progresso",
  "/bioimpedancia": "Bioimpedância",
  "/evolucao": "Evolução",
  "/financas": "Finanças",
  "/perfil": "Perfil",
  "/admin": "Painel Admin",
};

function getPageTitle(location: string): string {
  if (location.startsWith("/clientes/")) return "Detalhe do Aluno";
  return PAGE_TITLES[location] || "FITPRO";
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, loading, logout } = useAuth();
  const [location, setLocation] = useLocation();
  const isMobile = useIsMobile();

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!loading && !user) {
      window.location.href = "/login";
    }
  }, [loading, user]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    // Show loading while redirecting
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const pageTitle = getPageTitle(location);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex h-14 items-center justify-between px-4">
          {/* Logo */}
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-xl bg-primary/20">
              <Dumbbell className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-base font-extrabold text-primary tracking-tight leading-none">FITPRO</h1>
              <p className="text-[9px] text-muted-foreground uppercase tracking-widest">Agenda Personal</p>
            </div>
          </div>

          {/* Page title (desktop) */}
          {!isMobile && (
            <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <ChevronRight className="h-3.5 w-3.5" />
              <span className="font-medium text-foreground">{pageTitle}</span>
            </div>
          )}

          {/* Right actions */}
          <div className="flex items-center gap-2">
            {user.role === "admin" && (
              <button
                onClick={() => setLocation("/admin")}
                className="flex items-center gap-1 text-muted-foreground hover:text-primary transition-colors text-sm px-2 py-1 rounded-lg hover:bg-accent/50"
              >
                <Shield className="h-4 w-4" />
                {!isMobile && <span className="ml-1">Admin</span>}
              </button>
            )}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-2 rounded-lg px-2 py-1 hover:bg-accent transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                  <Avatar className="h-8 w-8 border border-border">
                    <AvatarFallback className="text-xs font-medium bg-primary/20 text-primary">
                      {user.name?.charAt(0).toUpperCase() || "U"}
                    </AvatarFallback>
                  </Avatar>
                  {!isMobile && (
                    <span className="text-sm font-medium truncate max-w-[120px]">{user.name || "Usuário"}</span>
                  )}
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <div className="px-2 py-1.5">
                  <p className="text-sm font-medium">{user.name || "Usuário"}</p>
                  <p className="text-xs text-muted-foreground">{user.email || ""}</p>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setLocation("/perfil")} className="cursor-pointer">
                  <User className="mr-2 h-4 w-4" />
                  Meu Perfil
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={logout} className="cursor-pointer text-destructive focus:text-destructive">
                  <LogOut className="mr-2 h-4 w-4" />
                  Sair
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      {/* Desktop sidebar + content */}
      {!isMobile ? (
        <div className="flex flex-1 overflow-hidden">
          <nav className="w-56 border-r border-border bg-card/30 flex flex-col shrink-0">
            <div className="flex-1 p-3 space-y-0.5 overflow-y-auto">
              {navItems.map((item) => {
                const active = item.path === "/" ? location === "/" : item.path === "/dashboard" ? location === "/dashboard" : location.startsWith(item.path);
                return (
                  <button
                    key={item.path}
                    onClick={() => setLocation(item.path)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                      active
                        ? "bg-primary/15 text-primary"
                        : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
                    }`}
                  >
                    <item.icon className="h-4.5 w-4.5 shrink-0" style={{ width: 18, height: 18 }} />
                    {item.label}
                  </button>
                );
              })}
            </div>

            {/* Sidebar footer with trainer info */}
            <div className="border-t border-border p-3">
              <div className="flex items-center gap-2.5 px-2 py-1.5">
                <Avatar className="h-8 w-8 border border-border shrink-0">
                  <AvatarFallback className="text-xs font-bold bg-primary/20 text-primary">
                    {user.name?.charAt(0).toUpperCase() || "U"}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold truncate">{user.name || "Personal Trainer"}</p>
                  <p className="text-[10px] text-muted-foreground truncate">
                    {(user as any).cref ? `CREF ${(user as any).cref}` : "Personal Trainer"}
                  </p>
                </div>
                <button
                  onClick={logout}
                  className="text-muted-foreground hover:text-destructive transition-colors p-1 rounded"
                  title="Sair"
                >
                  <LogOut className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          </nav>

          <main className="flex-1 p-6 overflow-auto">{children}</main>
        </div>
      ) : (
        <>
          {/* Mobile page title */}
          <div className="px-4 pt-3 pb-1">
            <h2 className="text-lg font-bold">{pageTitle}</h2>
          </div>
          <main className="flex-1 pb-20 overflow-auto">{children}</main>
          {/* Bottom Navigation Mobile */}
          <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <div className="flex items-center justify-around h-16">
              {mobileNavItems.map((item) => {
                const active = item.path === "/" ? location === "/" : item.path === "/dashboard" ? location === "/dashboard" : location.startsWith(item.path);
                return (
                  <button
                    key={item.path}
                    onClick={() => setLocation(item.path)}
                    className={`flex flex-col items-center justify-center gap-0.5 w-full h-full transition-colors ${
                      active ? "text-primary" : "text-muted-foreground"
                    }`}
                  >
                    <item.icon className="h-5 w-5" />
                    <span className="text-[10px] font-medium">{item.label}</span>
                  </button>
                );
              })}
            </div>
          </nav>
        </>
      )}
    </div>
  );
}
