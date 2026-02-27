import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { User, Mail, Phone, Award, FileText, Save, Crown, Users, Calendar, Loader2 } from "lucide-react";
import { toast } from "sonner";

const planLabels: Record<string, string> = {
  free: "Gratuito",
  basic: "Básico",
  pro: "Profissional",
  premium: "Premium",
};

const planColors: Record<string, string> = {
  free: "text-muted-foreground",
  basic: "text-blue-400",
  pro: "text-purple-400",
  premium: "text-yellow-400",
};

const planLimits: Record<string, { clients: number; features: string[] }> = {
  free: { clients: 5, features: ["Até 5 clientes", "Agenda básica", "Controle financeiro"] },
  basic: { clients: 20, features: ["Até 20 clientes", "Agenda completa", "Controle financeiro", "Evolução"] },
  pro: { clients: 50, features: ["Até 50 clientes", "Tudo do Básico", "Relatórios avançados", "Fotos de progresso"] },
  premium: { clients: 999, features: ["Clientes ilimitados", "Tudo do Pro", "Suporte prioritário", "API de integração"] },
};

export default function Perfil() {
  const { user, refresh } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [cref, setCref] = useState("");
  const [specialties, setSpecialties] = useState("");
  const [bio, setBio] = useState("");

  const { data: clientCount } = trpc.clients.count.useQuery();

  useEffect(() => {
    if (user) {
      setName(user.name || "");
      setEmail(user.email || "");
      setPhone((user as any).phone || "");
      setCref((user as any).cref || "");
      setSpecialties((user as any).specialties || "");
      setBio((user as any).bio || "");
    }
  }, [user]);

  const updateMutation = trpc.profile.update.useMutation({
    onSuccess: () => {
      toast.success("Perfil atualizado!");
      refresh();
    },
    onError: (e) => toast.error(e.message),
  });

  const handleSave = () => {
    updateMutation.mutate({
      name: name || undefined,
      email: email || undefined,
      phone: phone || undefined,
      cref: cref || undefined,
      specialties: specialties || undefined,
      bio: bio || undefined,
    });
  };

  if (!user) return null;

  const plan = (user as any).subscriptionPlan || "free";
  const status = (user as any).subscriptionStatus || "trial";
  const maxClients = (user as any).maxClients || 5;

  return (
    <div className="space-y-4 p-4 md:p-0 max-w-2xl">
      <div>
        <h2 className="text-2xl font-bold">Meu Perfil</h2>
        <p className="text-sm text-muted-foreground">Gerencie suas informações pessoais</p>
      </div>

      {/* Profile header */}
      <div className="rounded-xl border border-border bg-card p-5">
        <div className="flex items-center gap-4">
          <Avatar className="h-20 w-20 border-2 border-primary/30">
            <AvatarFallback className="bg-primary/20 text-primary text-2xl font-bold">
              {user.name?.charAt(0).toUpperCase() || "U"}
            </AvatarFallback>
          </Avatar>
          <div>
            <h3 className="text-xl font-bold">{user.name || "Usuário"}</h3>
            <div className="flex items-center gap-2 mt-1">
              <Crown className={`h-4 w-4 ${planColors[plan]}`} />
              <span className={`text-sm font-medium ${planColors[plan]}`}>Plano {planLabels[plan]}</span>
              <span className={`text-xs px-2 py-0.5 rounded-full ${
                status === "active" ? "bg-green-500/20 text-green-400" :
                status === "trial" ? "bg-yellow-500/20 text-yellow-400" :
                "bg-red-500/20 text-red-400"
              }`}>{status === "active" ? "Ativo" : status === "trial" ? "Trial" : "Inativo"}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Plan info */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Crown className="h-4 w-4 text-primary" /> Seu Plano
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Clientes</span>
            <span className="text-sm font-medium">{clientCount ?? 0} / {maxClients}</span>
          </div>
          <div className="w-full bg-muted rounded-full h-2">
            <div
              className="bg-primary rounded-full h-2 transition-all"
              style={{ width: `${Math.min(((clientCount ?? 0) / maxClients) * 100, 100)}%` }}
            />
          </div>
          <div className="space-y-1">
            {planLimits[plan]?.features.map((f, i) => (
              <div key={i} className="flex items-center gap-2 text-xs text-muted-foreground">
                <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                {f}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Edit form */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <User className="h-4 w-4 text-primary" /> Dados Pessoais
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <Label className="flex items-center gap-1"><User className="h-3.5 w-3.5" /> Nome</Label>
            <Input className="mt-1" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="flex items-center gap-1"><Mail className="h-3.5 w-3.5" /> Email</Label>
              <Input className="mt-1" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div>
              <Label className="flex items-center gap-1"><Phone className="h-3.5 w-3.5" /> Telefone</Label>
              <Input className="mt-1" value={phone} onChange={(e) => setPhone(e.target.value)} />
            </div>
          </div>
          <div>
            <Label className="flex items-center gap-1"><Award className="h-3.5 w-3.5" /> CREF</Label>
            <Input className="mt-1" value={cref} onChange={(e) => setCref(e.target.value)} placeholder="Ex: 012345-G/SP" />
          </div>
          <div>
            <Label className="flex items-center gap-1"><FileText className="h-3.5 w-3.5" /> Especialidades</Label>
            <Input className="mt-1" value={specialties} onChange={(e) => setSpecialties(e.target.value)} placeholder="Ex: Musculação, Funcional, Pilates" />
          </div>
          <div>
            <Label>Bio</Label>
            <Input className="mt-1" value={bio} onChange={(e) => setBio(e.target.value)} placeholder="Conte um pouco sobre você..." />
          </div>
          <Button onClick={handleSave} disabled={updateMutation.isPending} className="w-full">
            <Save className="h-4 w-4 mr-2" /> Salvar Alterações
          </Button>
        </CardContent>
      </Card>

      {/* Subscription plans */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Planos Disponíveis</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {(["basic", "pro", "premium"] as const).map((p) => (
              <div key={p} className={`rounded-xl border p-4 ${plan === p ? "border-primary bg-primary/5" : "border-border"}`}>
                <div className="flex items-center justify-between mb-2">
                  <span className={`font-bold ${planColors[p]}`}>{planLabels[p]}</span>
                  {plan === p && <span className="text-xs bg-primary/20 text-primary px-2 py-0.5 rounded-full">Atual</span>}
                </div>
                <div className="space-y-1">
                  {planLimits[p].features.map((f, i) => (
                    <div key={i} className="text-xs text-muted-foreground flex items-center gap-1">
                      <div className="w-1 h-1 rounded-full bg-muted-foreground" /> {f}
                    </div>
                  ))}
                </div>
                {plan !== p && (
                  <Button variant="outline" size="sm" className="w-full mt-3" onClick={() => toast.info("Funcionalidade de pagamento em breve!")}>
                    {plan === "free" || (plan === "basic" && (p === "pro" || p === "premium")) || (plan === "pro" && p === "premium") ? "Fazer Upgrade" : "Alterar Plano"}
                  </Button>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
