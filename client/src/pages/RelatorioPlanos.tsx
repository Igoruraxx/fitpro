import { useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { Users, DollarSign, TrendingUp, Package } from "lucide-react";
import { trpc } from "@/lib/trpc";

const PLAN_COLORS: Record<string, string> = {
  monthly: "#3b82f6",
  package: "#8b5cf6",
  consulting: "#ec4899",
};

const PLAN_LABELS: Record<string, string> = {
  monthly: "Mensalidade",
  package: "Pacote",
  consulting: "Consultoria",
};

export default function RelatorioPlanos() {
  const { data: clients = [] } = trpc.clients.list.useQuery();

  const stats = useMemo(() => {
    const byPlan: Record<string, any> = {
      monthly: { count: 0, revenue: 0, label: "Mensalidade" },
      package: { count: 0, revenue: 0, label: "Pacote" },
      consulting: { count: 0, revenue: 0, label: "Consultoria" },
    };

    clients.forEach((client: any) => {
      const plan = client.planType || "monthly";
      if (!byPlan[plan]) {
        byPlan[plan] = { count: 0, revenue: 0, label: PLAN_LABELS[plan] || plan };
      }

      byPlan[plan].count += 1;

      // Calculate revenue
      if (plan === "monthly" && client.monthlyFee) {
        byPlan[plan].revenue += parseFloat(client.monthlyFee) || 0;
      } else if (plan === "package" && client.packageValue) {
        byPlan[plan].revenue += parseFloat(client.packageValue) || 0;
      }
    });

    const totalClients = clients.length;
    const totalRevenue = Object.values(byPlan).reduce((sum: number, p: any) => sum + p.revenue, 0);
    const avgRevenuePerClient = totalClients > 0 ? totalRevenue / totalClients : 0;

    const pieData = Object.entries(byPlan).map(([key, data]: [string, any]) => ({
      name: data.label,
      value: data.count,
      color: PLAN_COLORS[key],
    }));

    const barData = Object.entries(byPlan).map(([key, data]: [string, any]) => ({
      name: data.label,
      revenue: data.revenue,
      color: PLAN_COLORS[key],
    }));

    return {
      byPlan,
      totalClients,
      totalRevenue,
      avgRevenuePerClient,
      pieData,
      barData,
    };
  }, [clients]);

  return (
    <div className="space-y-6 p-4 md:p-0">
      <div>
        <h2 className="text-2xl font-bold">Relatorio de Planos</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Distribuicao de alunos e receita por tipo de plano
        </p>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Users className="h-4 w-4" />
              Total de Alunos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalClients}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Receita Total
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              R$ {stats.totalRevenue.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Receita Media
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              R$ {stats.avgRevenuePerClient.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Package className="h-4 w-4" />
              Tipos de Plano
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">3</div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Distribution of Clients */}
        <Card>
          <CardHeader>
            <CardTitle>Distribuicao de Alunos</CardTitle>
            <CardDescription>Por tipo de plano</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={stats.pieData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, value }) => `${name}: ${value}`}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {stats.pieData.map((entry: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Revenue by Plan */}
        <Card>
          <CardHeader>
            <CardTitle>Receita por Plano</CardTitle>
            <CardDescription>Receita total por tipo de plano</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={stats.barData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip formatter={(value: any) => `R$ ${value.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`} />
                <Bar dataKey="revenue" fill="#3b82f6">
                  {stats.barData.map((entry: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle>Detalhamento por Plano</CardTitle>
          <CardDescription>Metricas detalhadas de cada tipo de plano</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {Object.entries(stats.byPlan).map(([key, data]: [string, any]) => (
              <div key={key} className="flex items-center justify-between p-4 rounded-lg border border-border">
                <div className="flex items-center gap-3">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: PLAN_COLORS[key] }}
                  ></div>
                  <div>
                    <p className="font-medium">{data.label}</p>
                    <p className="text-sm text-muted-foreground">
                      {data.count} aluno{data.count !== 1 ? "s" : ""}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-semibold">
                    R$ {data.revenue.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {data.count > 0
                      ? `R$ ${(data.revenue / data.count).toLocaleString("pt-BR", { minimumFractionDigits: 2 })} por aluno`
                      : "Sem alunos"}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
