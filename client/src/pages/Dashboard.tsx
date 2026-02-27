import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from "recharts";
import {
  Users, CheckCircle2, TrendingUp, Clock, Calendar, Dumbbell,
} from "lucide-react";
import { motion } from "framer-motion";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const STATUS_COLORS: Record<string, string> = {
  scheduled: "#3B82F6",
  completed: "#22C55E",
  cancelled: "#EF4444",
  no_show: "#F59E0B",
};

const STATUS_LABELS: Record<string, string> = {
  scheduled: "Agendado",
  completed: "Concluído",
  cancelled: "Cancelado",
  no_show: "Faltou",
};

const STATUS_BADGE_VARIANT: Record<string, string> = {
  scheduled: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  completed: "bg-green-500/20 text-green-400 border-green-500/30",
  cancelled: "bg-red-500/20 text-red-400 border-red-500/30",
  no_show: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
};

const PIE_COLORS = ["#3B82F6", "#22C55E", "#EF4444", "#F59E0B"];

function StatCard({
  icon: Icon,
  label,
  value,
  sub,
  color,
  delay,
}: {
  icon: any;
  label: string;
  value: string | number;
  sub?: string;
  color: string;
  delay: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.4 }}
    >
      <Card className="border-border/50 hover:border-primary/40 transition-colors">
        <CardContent className="p-4">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs text-muted-foreground mb-1">{label}</p>
              <p className="text-2xl font-bold">{value}</p>
              {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
            </div>
            <div className={`p-2 rounded-xl ${color}`}>
              <Icon className="h-5 w-5" />
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

export default function Dashboard() {
  const { user } = useAuth();

  const { data: stats, isLoading: statsLoading } = trpc.dashboard.stats.useQuery(undefined, {
    retry: false,
  });
  const { data: weeklyData = [], isLoading: weeklyLoading } = trpc.dashboard.weeklyChart.useQuery(undefined, {
    retry: false,
  });
  const { data: statusData = [] } = trpc.dashboard.statusChart.useQuery(undefined, {
    retry: false,
  });
  const { data: todaySessions = [], isLoading: todayLoading } = trpc.dashboard.todaySessions.useQuery(undefined, {
    retry: false,
  });

  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return "Bom dia";
    if (hour < 18) return "Boa tarde";
    return "Boa noite";
  }, []);

  const firstName = user?.name?.split(" ")[0] || "Personal";
  const today = format(new Date(), "EEEE, d 'de' MMMM", { locale: ptBR });

  return (
    <div className="space-y-5 p-4 md:p-0">
      {/* Header greeting */}
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.4 }}
      >
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-2xl bg-primary/20">
            <Dumbbell className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h2 className="text-2xl font-bold">
              {greeting}, {firstName}! 👋
            </h2>
            <p className="text-sm text-muted-foreground capitalize">{today}</p>
          </div>
        </div>
      </motion.div>

      {/* Stats cards */}
      {statsLoading ? (
        <div className="grid grid-cols-2 gap-3">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          <StatCard
            icon={Users}
            label="Alunos ativos"
            value={stats?.activeClients ?? 0}
            color="bg-blue-500/20 text-blue-400"
            delay={0.1}
          />
          <StatCard
            icon={CheckCircle2}
            label="Sessões hoje"
            value={stats?.todayCompleted ?? 0}
            sub="concluídas"
            color="bg-green-500/20 text-green-400"
            delay={0.2}
          />
          <StatCard
            icon={TrendingUp}
            label="Taxa de presença"
            value={`${stats?.attendanceRate ?? 0}%`}
            sub="hoje"
            color="bg-purple-500/20 text-purple-400"
            delay={0.3}
          />
          <StatCard
            icon={Clock}
            label="Próxima sessão"
            value={stats?.nextSession?.time ?? "--:--"}
            sub={stats?.nextSession?.clientName ?? "Nenhuma agendada"}
            color="bg-orange-500/20 text-orange-400"
            delay={0.4}
          />
        </div>
      )}

      {/* Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Bar chart */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.4 }}
        >
          <Card className="border-border/50">
            <CardHeader className="pb-2 pt-4 px-4">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Calendar className="h-4 w-4 text-primary" />
                Sessões por semana
              </CardTitle>
            </CardHeader>
            <CardContent className="px-2 pb-4">
              {weeklyLoading ? (
                <Skeleton className="h-40 w-full rounded-lg" />
              ) : (
                <ResponsiveContainer width="100%" height={160}>
                  <BarChart data={weeklyData} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                    <XAxis
                      dataKey="week"
                      tick={{ fontSize: 10, fill: "rgba(255,255,255,0.4)" }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fontSize: 10, fill: "rgba(255,255,255,0.4)" }}
                      axisLine={false}
                      tickLine={false}
                      allowDecimals={false}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "rgba(15,20,50,0.95)",
                        border: "1px solid rgba(59,130,246,0.3)",
                        borderRadius: "8px",
                        fontSize: "12px",
                      }}
                      labelStyle={{ color: "rgba(255,255,255,0.7)" }}
                      formatter={(v: any) => [v, "Sessões"]}
                    />
                    <Bar dataKey="total" fill="#3B82F6" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Pie chart */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6, duration: 0.4 }}
        >
          <Card className="border-border/50">
            <CardHeader className="pb-2 pt-4 px-4">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-primary" />
                Status das sessões
              </CardTitle>
            </CardHeader>
            <CardContent className="px-2 pb-4">
              {statusData.length === 0 ? (
                <div className="h-40 flex items-center justify-center text-sm text-muted-foreground">
                  Nenhuma sessão registrada
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={160}>
                  <PieChart>
                    <Pie
                      data={statusData}
                      cx="50%"
                      cy="50%"
                      innerRadius={40}
                      outerRadius={65}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {statusData.map((entry: any, index: number) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={STATUS_COLORS[(entry as any).status] || PIE_COLORS[index % PIE_COLORS.length]}
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "rgba(15,20,50,0.95)",
                        border: "1px solid rgba(59,130,246,0.3)",
                        borderRadius: "8px",
                        fontSize: "12px",
                      }}
                    />
                    <Legend
                      iconType="circle"
                      iconSize={8}
                      wrapperStyle={{ fontSize: "11px" }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Today's sessions */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.7, duration: 0.4 }}
      >
        <Card className="border-border/50">
          <CardHeader className="pb-2 pt-4 px-4">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Calendar className="h-4 w-4 text-primary" />
              Sessões de hoje
              {todaySessions.length > 0 && (
                <span className="ml-auto text-xs text-muted-foreground font-normal">
                  {todaySessions.length} sessão{todaySessions.length !== 1 ? "ões" : ""}
                </span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            {todayLoading ? (
              <div className="space-y-2">
                {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-12 rounded-lg" />)}
              </div>
            ) : todaySessions.length === 0 ? (
              <div className="text-center py-8 text-sm text-muted-foreground">
                <Calendar className="h-8 w-8 mx-auto mb-2 opacity-30" />
                Nenhuma sessão agendada para hoje
              </div>
            ) : (
              <div className="space-y-2">
                {todaySessions.map((session: any) => (
                  <div
                    key={session.id}
                    className="flex items-center gap-3 p-3 rounded-xl bg-card/50 border border-border/50"
                  >
                    <div className="text-sm font-mono font-semibold text-primary min-w-[48px]">
                      {session.startTime}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{session.clientName}</p>
                      {session.notes && (
                        <p className="text-xs text-muted-foreground truncate">{session.notes}</p>
                      )}
                    </div>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full border font-medium ${STATUS_BADGE_VARIANT[session.status] || "bg-muted text-muted-foreground"}`}>
                      {STATUS_LABELS[session.status] || session.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
