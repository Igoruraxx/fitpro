import { trpc } from "@/lib/trpc";
import { useParams, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ArrowLeft, Phone, Mail, Target, Calendar, TrendingUp, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function ClienteDetalhe() {
  const params = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const clientId = parseInt(params.id || "0");

  const { data: client, isLoading } = trpc.clients.getById.useQuery({ id: clientId });
  const { data: measurements = [] } = trpc.evolution.measurements.list.useQuery({ clientId });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!client) {
    return (
      <div className="p-4 text-center">
        <p className="text-muted-foreground">Cliente não encontrado</p>
        <Button variant="outline" className="mt-4" onClick={() => setLocation("/clientes")}>Voltar</Button>
      </div>
    );
  }

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
      <Button variant="ghost" size="sm" onClick={() => setLocation("/clientes")} className="text-muted-foreground">
        <ArrowLeft className="h-4 w-4 mr-1" /> Voltar
      </Button>

      {/* Profile card */}
      <div className="rounded-xl border border-border bg-card p-5">
        <div className="flex items-center gap-4">
          <Avatar className="h-16 w-16 border-2 border-primary/30">
            <AvatarFallback className="bg-primary/20 text-primary text-xl font-bold">
              {client.name.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold">{client.name}</h2>
              {getStatusBadge(client.status)}
            </div>
            <div className="flex flex-wrap gap-3 mt-2 text-sm text-muted-foreground">
              {client.phone && <span className="flex items-center gap-1"><Phone className="h-3.5 w-3.5" />{client.phone}</span>}

            </div>
          </div>
        </div>

        {client.monthlyFee && (
          <div className="mt-2 text-sm">
            <span className="text-muted-foreground">Mensalidade:</span>
            <span className="font-bold text-primary ml-2">R$ {parseFloat(client.monthlyFee).toFixed(2)}</span>
          </div>
        )}

      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-xl border border-border bg-card p-4 text-center">
          <Calendar className="h-5 w-5 text-primary mx-auto mb-1" />
          <div className="text-xs text-muted-foreground">Desde</div>
          <div className="text-sm font-semibold">{format(new Date(client.createdAt), "MMM yyyy", { locale: ptBR })}</div>
        </div>
        <div className="rounded-xl border border-border bg-card p-4 text-center">
          <TrendingUp className="h-5 w-5 text-primary mx-auto mb-1" />
          <div className="text-xs text-muted-foreground">Avaliações</div>
          <div className="text-sm font-semibold">{measurements.length}</div>
        </div>
      </div>

      {/* Recent measurements */}
      {measurements.length > 0 && (
        <div className="rounded-xl border border-border bg-card p-4">
          <h3 className="font-semibold mb-3">Últimas Medidas</h3>
          <div className="space-y-2">
            {measurements.slice(0, 3).map((m: any) => (
              <div key={m.id} className="flex items-center justify-between text-sm p-2 rounded-lg bg-muted/30">
                <span className="text-muted-foreground">{format(new Date(m.date), "dd/MM/yyyy")}</span>
                <div className="flex gap-3">
                  {m.weight && <span>Peso: <strong>{m.weight}kg</strong></span>}
                  {m.bodyFat && <span>BF: <strong>{m.bodyFat}%</strong></span>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
