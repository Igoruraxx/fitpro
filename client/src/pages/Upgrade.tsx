import { useAuth } from "@/_core/hooks/useAuth";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { useState } from "react";
import { PlanSelector, Plan } from "@/components/PlanSelector";
import {
  Check, X, Crown, Zap, BarChart3, TrendingUp, FileText,
  Users, Calendar, DollarSign, Loader2, ArrowRight, X as XIcon,
} from "lucide-react";

const FEATURES = [
  { name: "Alunos Ativos", free: "Até 5", pro: "Ilimitados", icon: Users },
  { name: "Agenda Completa", free: "Sim", pro: "Sim", icon: Calendar },
  { name: "Financeiro Básico", free: "Sim", pro: "Sim", icon: DollarSign },
  { name: "Gráficos de Evolução", free: "Não", pro: "Sim", icon: TrendingUp },
  { name: "Relatórios Detalhados", free: "Não", pro: "Sim", icon: FileText },
  { name: "Fotos de Progresso", free: "Não", pro: "Sim", icon: BarChart3 },
];

export default function Upgrade() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [showPaymentPlans, setShowPaymentPlans] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);

  const plansQuery = trpc.payments.getPlans.useQuery();
  const createCheckoutMutation = trpc.payments.createCheckout.useMutation({
    onSuccess: (data) => {
      window.location.href = data.checkoutUrl;
    },
    onError: (e) => toast.error(e.message),
  });

  const requestTrialMutation = trpc.users.requestTrial.useMutation({
    onSuccess: () => {
      toast.success("Trial de 7 dias ativado!", {
        description: "Agora você tem acesso a todos os recursos Pro.",
      });
      setLocation("/dashboard");
    },
    onError: (e) => toast.error(e.message),
  });

  const isPro = user?.subscriptionPlan === "pro";
  const hasTrialRequested = (user as any)?.trialRequestedAt;

  const handleSelectPlan = (plan: Plan) => {
    setSelectedPlan(plan);
    createCheckoutMutation.mutate({
      planKey: plan.key,
      returnUrl: window.location.origin + "/dashboard",
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-orange-500/5">
      {/* Header */}
      <div className="border-b border-border/50 bg-background/80 backdrop-blur-sm sticky top-0 z-40">
        <div className="container max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Crown className="h-6 w-6 text-orange-400" />
            <h1 className="text-xl font-bold text-foreground">Planos FitPro</h1>
          </div>
          <Button
            variant="outline"
            onClick={() => setLocation("/dashboard")}
            className="gap-2"
          >
            <ArrowRight className="h-4 w-4" />
            Voltar
          </Button>
        </div>
      </div>

      {/* Hero Section */}
      <div className="container max-w-6xl mx-auto px-4 py-12 md:py-16">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            Escolha o Plano Ideal para Seu Negócio
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Comece grátis com até 5 alunos ou desbloqueie recursos ilimitados com o plano Pro
          </p>
        </div>

        {/* Plans Grid */}
        <div className="grid md:grid-cols-2 gap-8 mb-12">
          {/* Free Plan */}
          <Card className="relative border-2 border-border/50 hover:border-border transition-colors overflow-hidden">
            <div className="p-8">
              <div className="mb-6">
                <h3 className="text-2xl font-bold text-foreground mb-2">Free</h3>
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-bold text-foreground">R$ 0</span>
                  <span className="text-muted-foreground">/mês</span>
                </div>
              </div>

              <p className="text-sm text-muted-foreground mb-6">
                Perfeito para começar com até 5 alunos
              </p>

              <Button
                disabled
                className="w-full mb-8 bg-muted text-muted-foreground cursor-not-allowed"
              >
                Seu Plano Atual
              </Button>

              <div className="space-y-4">
                {FEATURES.map((feature) => (
                  <div key={feature.name} className="flex items-start gap-3">
                    {feature.free === "Sim" ? (
                      <Check className="h-5 w-5 text-green-500 shrink-0 mt-0.5" />
                    ) : (
                      <X className="h-5 w-5 text-muted-foreground/30 shrink-0 mt-0.5" />
                    )}
                    <div className="flex-1">
                      <p className="font-medium text-foreground text-sm">
                        {feature.name}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {feature.free}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </Card>

          {/* Pro Plan */}
          <Card className="relative border-2 border-orange-500/50 hover:border-orange-500 transition-colors overflow-hidden shadow-lg shadow-orange-500/10">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-orange-400 to-orange-600" />
            <div className="absolute top-4 right-4 bg-orange-500/10 border border-orange-500/20 rounded-full px-3 py-1">
              <span className="text-xs font-semibold text-orange-400">POPULAR</span>
            </div>

            <div className="p-8">
              <div className="mb-6">
                <h3 className="text-2xl font-bold text-foreground mb-2 flex items-center gap-2">
                  <Crown className="h-5 w-5 text-orange-400" />
                  Pro
                </h3>
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-bold text-foreground">R$ 24,90</span>
                  <span className="text-muted-foreground">/mês</span>
                </div>
              </div>

              <p className="text-sm text-muted-foreground mb-6">
                Alunos ilimitados + acesso a todas as funcionalidades
              </p>

              {isPro ? (
                <Button disabled className="w-full mb-8 bg-green-500/20 text-green-400 border border-green-500/30 cursor-not-allowed">
                  Seu Plano Atual
                </Button>
              ) : hasTrialRequested ? (
                <Button disabled className="w-full mb-8 bg-muted text-muted-foreground cursor-not-allowed">
                  Trial Já Utilizado
                </Button>
              ) : (
                <>
                  <Button
                    onClick={() => requestTrialMutation.mutate()}
                    disabled={requestTrialMutation.isPending}
                    className="w-full mb-4 bg-orange-500 hover:bg-orange-600 text-white"
                  >
                    {requestTrialMutation.isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        Ativando...
                      </>
                    ) : (
                      <>
                        <Zap className="h-4 w-4 mr-2" />
                        Teste 7 Dias Grátis
                      </>
                    )}
                  </Button>

                  <Button
                    onClick={() => setShowPaymentPlans(true)}
                    variant="outline"
                    className="w-full mb-8 border-orange-500/30 text-orange-400 hover:bg-orange-500/10"
                  >
                    Assinar Agora
                  </Button>
                </>
              )}

              <div className="space-y-4">
                {FEATURES.map((feature) => (
                  <div key={feature.name} className="flex items-start gap-3">
                    <Check className="h-5 w-5 text-green-500 shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <p className="font-medium text-foreground text-sm">
                        {feature.name}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {feature.pro}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </Card>
        </div>

        {/* Payment Plans Modal */}
        {showPaymentPlans && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <Card className="w-full max-w-4xl max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b border-border flex items-center justify-between sticky top-0 bg-background">
                <h2 className="text-2xl font-bold">Escolha seu Plano de Assinatura</h2>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowPaymentPlans(false)}
                >
                  <XIcon className="h-4 w-4" />
                </Button>
              </div>
              <div className="p-6">
                {plansQuery.isLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                ) : plansQuery.data ? (
                  <PlanSelector
                    plans={plansQuery.data}
                    onSelectPlan={handleSelectPlan}
                    loading={createCheckoutMutation.isPending}
                    selectedPlan={selectedPlan || undefined}
                  />
                ) : null}
              </div>
            </Card>
          </div>
        )}

        {/* FAQ Section */}
        <div className="max-w-2xl mx-auto">
          <h3 className="text-2xl font-bold text-foreground mb-8 text-center">
            Perguntas Frequentes
          </h3>

          <div className="space-y-6">
            <div className="border border-border/50 rounded-lg p-6 hover:border-border transition-colors">
              <h4 className="font-semibold text-foreground mb-2">
                Posso mudar de plano a qualquer momento?
              </h4>
              <p className="text-sm text-muted-foreground">
                Sim! Você pode fazer upgrade do seu plano a qualquer momento. Alterações entram em vigor imediatamente.
              </p>
            </div>

            <div className="border border-border/50 rounded-lg p-6 hover:border-border transition-colors">
              <h4 className="font-semibold text-foreground mb-2">
                O trial de 7 dias tem limite de funcionalidades?
              </h4>
              <p className="text-sm text-muted-foreground">
                Não! Durante o trial você tem acesso completo a todos os recursos Pro. Sem restrições, sem cartão de crédito necessário.
              </p>
            </div>

            <div className="border border-border/50 rounded-lg p-6 hover:border-border transition-colors">
              <h4 className="font-semibold text-foreground mb-2">
                Há desconto para pagamento anual?
              </h4>
              <p className="text-sm text-muted-foreground">
                Sim! Planos anuais têm até 20% de desconto. Clique em "Assinar Agora" para ver todos os planos disponíveis com seus descontos progressivos.
              </p>
            </div>
          </div>
        </div>

        {/* CTA Section */}
        <div className="mt-16 text-center">
          <div className="inline-block bg-gradient-to-r from-orange-500/10 to-orange-600/10 border border-orange-500/20 rounded-lg p-8 max-w-md">
            <h3 className="text-lg font-bold text-foreground mb-2">
              Pronto para crescer?
            </h3>
            <p className="text-sm text-muted-foreground mb-6">
              Comece com 7 dias de trial completo. Sem cartão de crédito necessário.
            </p>
            {!isPro && !hasTrialRequested && (
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
                  <>
                    <Zap className="h-4 w-4 mr-2" />
                    Ativar Trial Agora
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
