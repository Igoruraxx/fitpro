import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { useIsMobile } from "@/hooks/useMobile";
import { Calendar, Users, TrendingUp, DollarSign, User, LogOut, Shield, Loader2 } from "lucide-react";
import { useLocation } from "wouter";
import { Button } from "./ui/button";
import { Avatar, AvatarFallback } from "./ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";

const navItems = [
  { icon: Calendar, label: "Agenda", path: "/" },
  { icon: Users, label: "Clientes", path: "/clientes" },
  { icon: TrendingUp, label: "Evolução", path: "/evolucao" },
  { icon: DollarSign, label: "Finanças", path: "/financas" },
  { icon: User, label: "Perfil", path: "/perfil" },
];

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, loading, logout } = useAuth();
  const [location, setLocation] = useLocation();
  const isMobile = useIsMobile();

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-6 p-8 max-w-md w-full text-center">
          <div className="flex items-center gap-3 mb-4">
            <Calendar className="h-10 w-10 text-primary" />
            <div className="text-left">
              <h1 className="text-2xl font-extrabold text-primary tracking-tight">FITPRO</h1>
              <p className="text-xs text-muted-foreground uppercase tracking-widest">Agenda Personal</p>
            </div>
          </div>
          <p className="text-muted-foreground">
            Gerencie seus clientes, agenda e finanças em um só lugar.
          </p>
          <Button
            onClick={() => { window.location.href = getLoginUrl(); }}
            size="lg"
            className="w-full"
          >
            Entrar
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex h-14 items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <Calendar className="h-7 w-7 text-primary" />
            <div>
              <h1 className="text-lg font-extrabold text-primary tracking-tight leading-none">FITPRO</h1>
              <p className="text-[10px] text-muted-foreground uppercase tracking-widest">Agenda Personal</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {user.role === "admin" && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setLocation("/admin")}
                className="text-muted-foreground hover:text-primary"
              >
                <Shield className="h-4 w-4" />
                {!isMobile && <span className="ml-1">Admin</span>}
              </Button>
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
        <div className="flex flex-1">
          <nav className="w-56 border-r border-border bg-card/50 p-3 space-y-1 shrink-0">
            {navItems.map((item) => {
              const isActive = location === item.path || (item.path !== "/" && location.startsWith(item.path));
              return (
                <button
                  key={item.path}
                  onClick={() => setLocation(item.path)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? "bg-primary/15 text-primary"
                      : "text-muted-foreground hover:bg-accent hover:text-foreground"
                  }`}
                >
                  <item.icon className="h-5 w-5" />
                  {item.label}
                </button>
              );
            })}
          </nav>
          <main className="flex-1 p-6 overflow-auto">{children}</main>
        </div>
      ) : (
        <>
          <main className="flex-1 pb-20 overflow-auto">{children}</main>
          {/* Bottom Navigation Mobile */}
          <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 safe-area-bottom">
            <div className="flex items-center justify-around h-16">
              {navItems.map((item) => {
                const isActive = location === item.path || (item.path !== "/" && location.startsWith(item.path));
                return (
                  <button
                    key={item.path}
                    onClick={() => setLocation(item.path)}
                    className={`flex flex-col items-center justify-center gap-0.5 w-full h-full transition-colors ${
                      isActive ? "text-primary" : "text-muted-foreground"
                    }`}
                  >
                    <item.icon className={`h-5 w-5 ${isActive ? "text-primary" : ""}`} />
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
