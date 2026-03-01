import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check, Zap } from "lucide-react";
import { cn } from "@/lib/utils";

export interface Plan {
  id: string;
  key: "monthly" | "quarterly" | "semiannual" | "annual";
  name: string;
  cycle: string;
  price: number;
  priceCents: number;
  discount: number;
  billingPeriod: string;
}

interface PlanSelectorProps {
  plans: Plan[];
  onSelectPlan: (plan: Plan) => void;
  loading?: boolean;
  selectedPlan?: Plan;
}

export function PlanSelector({
  plans,
  onSelectPlan,
  loading = false,
  selectedPlan,
}: PlanSelectorProps) {
  const [hoveredPlan, setHoveredPlan] = useState<string | null>(null);

  // Sort plans by price
  const sortedPlans = [...plans].sort((a, b) => a.price - b.price);

  // Find the best value (highest discount)
  const bestValue = sortedPlans.reduce((best, current) =>
    current.discount > best.discount ? current : best
  );

  return (
    <div className="w-full space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-3xl font-bold">Escolha seu Plano</h2>
        <p className="text-muted-foreground">
          Descontos progressivos para planos anuais
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {sortedPlans.map((plan) => {
          const isSelected = selectedPlan?.key === plan.key;
          const isBestValue = plan.key === bestValue.key;
          const monthlyEquivalent = plan.price / (plan.cycle === "monthly" ? 1 : plan.cycle === "quarterly" ? 3 : plan.cycle === "semiannual" ? 6 : 12);

          return (
            <Card
              key={plan.key}
              className={cn(
                "relative transition-all duration-200 cursor-pointer",
                isSelected && "ring-2 ring-primary",
                hoveredPlan === plan.key && "shadow-lg",
                isBestValue && "md:scale-105 md:shadow-lg"
              )}
              onMouseEnter={() => setHoveredPlan(plan.key)}
              onMouseLeave={() => setHoveredPlan(null)}
            >
              {isBestValue && (
                <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                  <Badge className="bg-gradient-to-r from-amber-400 to-orange-500 text-white">
                    <Zap className="h-3 w-3 mr-1" />
                    Melhor Valor
                  </Badge>
                </div>
              )}

              <CardHeader className="pb-3">
                <CardTitle className="text-lg">{plan.name}</CardTitle>
                <CardDescription className="text-xs">
                  {plan.billingPeriod}
                </CardDescription>
              </CardHeader>

              <CardContent className="space-y-4">
                {/* Price */}
                <div className="space-y-1">
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-bold">
                      R$ {plan.price.toFixed(2)}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    R$ {monthlyEquivalent.toFixed(2)}/mês
                  </p>
                </div>

                {/* Discount badge */}
                {plan.discount > 0 && (
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="text-xs">
                      {plan.discount}% de desconto
                    </Badge>
                  </div>
                )}

                {/* Features */}
                <div className="space-y-2 pt-2">
                  <div className="flex items-center gap-2 text-sm">
                    <Check className="h-4 w-4 text-green-600" />
                    <span>Alunos ilimitados</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Check className="h-4 w-4 text-green-600" />
                    <span>Fotos de progresso</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Check className="h-4 w-4 text-green-600" />
                    <span>Evolução completa</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Check className="h-4 w-4 text-green-600" />
                    <span>Relatórios avançados</span>
                  </div>
                </div>

                {/* Select button */}
                <Button
                  onClick={() => onSelectPlan(plan)}
                  disabled={loading || isSelected}
                  variant={isSelected ? "default" : "outline"}
                  className="w-full mt-4"
                  size="sm"
                >
                  {isSelected ? "Selecionado" : "Escolher"}
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Info text */}
      <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900 rounded-lg p-4 text-sm text-blue-900 dark:text-blue-100">
        <p>
          💳 Você será redirecionado para completar o pagamento de forma segura com Abacash.
          A assinatura será ativada imediatamente após a confirmação.
        </p>
      </div>
    </div>
  );
}
