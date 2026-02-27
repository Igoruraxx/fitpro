import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
} from "recharts";
import {
  Users, CheckCircle2, TrendingUp, Clock, Calendar, ArrowUpRight,
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const STATUS_COLORS: Record<string, string> = {
  scheduled: "#6366f1",
  completed: "#10b981",
  cancelled: "#ef4444",
  no_show: "#f59e0b",
};

const STATUS_LABELS: Record<string, string> = {
  scheduled: "Agendado",
  completed: "Concluído",
  cancelled: "Cancelado",
  no_show: "Faltou",
};

const STATUS_DOT: Record<string, string> = {
  scheduled: "bg-indigo-500",
  completed: "bg-emerald-500",
  cancelled: "bg-red-500",
  no_show: "bg-amber-500",
};

const STATUS_BADGE: Record<string, string> = {
  scheduled: "badge-primary",
  completed: "badge-success",
  cancelled: "badge-danger",
  no_show: "badge-warning",
};

function StatCard({ icon: Icon, label, value, sub, iconClass }: {
  icon: any; label: string; value: string | number; sub?: string; iconClass: string;
}) {
  return (
    <Card className="shadow-sm hover:shadow-md transition-shadow">
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-muted-foreground mb-1">{label}</p>
            <p className="text-2xl font-bold text-foreground">{value}</p>
            {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
          </div>
          <div className={`p-2.5 rounded-xl shrink-0 ${iconClass}`}>
            <Icon className="h-4.5 w-4.5" style={{ width: 18, height: 18 }} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function Dashboard() {
  const { user } = useAuth();

  const { data: stats, isLoading: statsLoading } = trpc.dashboard.stats.useQuery(undefined, { retry: false });
  const { data: weeklyData = [], isLoading: weeklyLoading } = trpc.dashboard.weeklyChart.useQuery(undefined, { retry: false });
  const { data: statusData = [] } = trpc.dashboard.statusChart.useQuery(undefined, { retry: false });
  const { data: todaySessions = [], isLoading: todayLoading } = trpc.dashboard.todaySessions.useQuery(undefined, { retry: false });

  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return "Bom dia";
    if (hour < 18) return "Boa tarde";
    return "Boa noite";
  }, []);

  const firstName = user?.name?.split(" ")[0] || "Profissional";
  const today = format(new Date(), "EEEE, d 'de' MMMM", { locale: ptBR });

  return (
    <div className="space-y-6">
      {/* Greeting */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            {greeting}, {firstName}
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5 capitalize">{today}</p>
        </div>
        <div className="hidden sm:flex items-center gap-2 text-xs text-muted-foreground bg-card border border-border rounded-lg px-3 py-2 shadow-sm">
          <Calendar className="h-3.5 w-3.5" />
          <span>Hoje</span>
        </div>
      </div>

      {/* Stats cards */}
      {statsLoading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            icon={Users}
            label="Alunos ativos"
            value={stats?.activeClients ?? 0}
            iconClass="bg-indigo-50 text-indigo-600"
          />
          <StatCard
            icon={CheckCircle2}
            label="Sessões hoje"
            value={stats?.todayCompleted ?? 0}
            sub="concluídas"
            iconClass="bg-emerald-50 text-emerald-600"
          />
          <StatCard
            icon={TrendingUp}
            label="Taxa de presença"
            value={`${stats?.attendanceRate ?? 0}%`}
            sub="hoje"
            iconClass="bg-violet-50 text-violet-600"
          />
          <StatCard
            icon={Clock}
            label="Próxima sessão"
            value={stats?.nextSession?.time ?? "--:--"}
            sub={stats?.nextSession?.clientName ?? "Nenhuma agendada"}
            iconClass="bg-amber-50 text-amber-600"
          />
        </div>
      )}

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Bar chart */}
        <Card className="shadow-sm">
          <CardHeader className="pb-3 pt-5 px-5">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
                <Calendar className="h-4 w-4 text-primary" />
                Sessões por semana
              </CardTitle>
              <ArrowUpRight className="h-4 w-4 text-muted-foreground" />
            </div>
          </CardHeader>
          <CardContent className="px-3 pb-5">
            {weeklyLoading ? (
              <Skeleton className="h-44 w-full rounded-lg" />
            ) : (
              <ResponsiveContainer width="100%" height={176}>
                <BarChart data={weeklyData} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                  <XAxis
                    dataKey="week"
                    tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                    axisLine={false}
                    tickLine={false}
                    allowDecimals={false}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                      fontSize: "12px",
                      boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
                    }}
                    labelStyle={{ color: "hsl(var(--foreground))", fontWeight: 600 }}
                    formatter={(v: any) => [v, "Sessões"]}
                  />
                  <Bar dataKey="total" fill="#6366f1" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Pie chart */}
        <Card className="shadow-sm">
          <CardHeader className="pb-3 pt-5 px-5">
            <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" />
              Status das sessões
            </CardTitle>
          </CardHeader>
          <CardContent className="px-3 pb-5">
            {statusData.length === 0 ? (
              <div className="h-44 flex flex-col items-center justify-center text-sm text-muted-foreground gap-2">
                <TrendingUp className="h-8 w-8 opacity-20" />
                Nenhuma sessão registrada
              </div>
            ) : (
              <div className="flex items-center gap-4">
                <ResponsiveContainer width="60%" height={176}>
                  <PieChart>
                    <Pie
                      data={statusData}
                      cx="50%"
                      cy="50%"
                      innerRadius={45}
                      outerRadius={70}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {statusData.map((entry: any, index: number) => (
                        <Cell key={`cell-${index}`} fill={STATUS_COLORS[(entry as any).status] || "#6366f1"} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px",
                        fontSize: "12px",
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex-1 space-y-2">
                  {statusData.map((entry: any) => (
                    <div key={entry.status} className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-1.5">
                        <div className={`w-2 h-2 rounded-full ${STATUS_DOT[entry.status] || "bg-indigo-500"}`} />
                        <span className="text-muted-foreground">{STATUS_LABELS[entry.status] || entry.status}</span>
                      </div>
                      <span className="font-semibold text-foreground">{entry.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Today's sessions */}
      <Card className="shadow-sm">
        <CardHeader className="pb-3 pt-5 px-5">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Calendar className="h-4 w-4 text-primary" />
              Sessões de hoje
            </CardTitle>
            {todaySessions.length > 0 && (
              <span className="text-xs text-muted-foreground">
                {todaySessions.length} sessão{todaySessions.length !== 1 ? "ões" : ""}
              </span>
            )}
          </div>
        </CardHeader>
        <CardContent className="px-5 pb-5">
          {todayLoading ? (
            <div className="space-y-2">
              {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-14 rounded-xl" />)}
            </div>
          ) : todaySessions.length === 0 ? (
            <div className="text-center py-10">
              <Calendar className="h-10 w-10 mx-auto mb-3 text-muted-foreground/30" />
              <p className="text-sm text-muted-foreground">Nenhuma sessão agendada para hoje</p>
            </div>
          ) : (
            <div className="space-y-2">
              {todaySessions.map((session: any) => (
                <div
                  key={session.id}
                  className="flex items-center gap-4 p-3.5 rounded-xl bg-muted/40 hover:bg-muted/60 transition-colors border border-transparent hover:border-border"
                >
                  <div className="text-sm font-mono font-bold text-primary min-w-[48px]">
                    {session.startTime}
                  </div>
                  <div className={`w-1.5 h-8 rounded-full shrink-0 ${STATUS_DOT[session.status] || "bg-indigo-500"}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate">{session.clientName}</p>
                    {session.notes && (
                      <p className="text-xs text-muted-foreground truncate mt-0.5">{session.notes}</p>
                    )}
                  </div>
                  <span className={STATUS_BADGE[session.status] || "badge-neutral"}>
                    {STATUS_LABELS[session.status] || session.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
