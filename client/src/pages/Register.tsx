import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Loader2, AlertCircle, CheckCircle } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

const registerSchema = z.object({
  name: z.string().min(2, "Nome deve ter no mínimo 2 caracteres"),
  email: z.string().email("E-mail inválido"),
  password: z.string().min(8, "Senha deve ter no mínimo 8 caracteres"),
  confirmPassword: z.string(),
}).refine(data => data.password === data.confirmPassword, {
  message: "As senhas não correspondem",
  path: ["confirmPassword"],
});

type RegisterForm = z.infer<typeof registerSchema>;

export default function Register() {
  const [, setLocation] = useLocation();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const registerMutation = trpc.auth.register.useMutation();

  const form = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
      confirmPassword: "",
    },
  });

  async function onSubmit(values: RegisterForm) {
    try {
      await registerMutation.mutateAsync({
        name: values.name,
        email: values.email,
        password: values.password,
      });

      toast.success("Cadastro realizado com sucesso! Faça login para continuar.");
      window.location.href = "/login";
    } catch (error: any) {
      if (error.data?.code === "CONFLICT") {
        form.setError("email", { message: "Este e-mail já está registrado" });
      } else {
        toast.error(error.message || "Erro ao cadastrar");
      }
    }
  }

  const passwordValue = form.watch("password");
  const passwordStrength = getPasswordStrength(passwordValue);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-2">
          <div className="flex items-center justify-center mb-4">
            <div className="w-16 h-16 flex items-center justify-center">
              <img src="https://d2xsxph8kpxj0f.cloudfront.net/310519663385249362/5UbJ997E6SHYZid72bThxF/fitpro-logo_005e8846.png" alt="FitPro Logo" className="w-16 h-16 object-contain" />
            </div>
          </div>
          <CardTitle className="text-center text-2xl">FITPRO</CardTitle>
          <CardDescription className="text-center">Crie sua conta de personal trainer</CardDescription>
        </CardHeader>

        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              {/* Name */}
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome completo</FormLabel>
                    <FormControl>
                      <Input placeholder="João Silva" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Email */}
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>E-mail</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="seu@email.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Password */}
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Senha</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input
                          type={showPassword ? "text" : "password"}
                          placeholder="Mínimo 8 caracteres"
                          {...field}
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        >
                          {showPassword ? "👁️" : "👁️‍🗨️"}
                        </button>
                      </div>
                    </FormControl>
                    <FormMessage />

                    {/* Password Strength Indicator */}
                    {passwordValue && (
                      <div className="mt-2 space-y-2">
                        <div className="flex gap-1">
                          {[0, 1, 2, 3].map((i) => (
                            <div
                              key={i}
                              className={`h-1 flex-1 rounded-full transition-colors ${
                                i < passwordStrength.score
                                  ? passwordStrength.color
                                  : "bg-muted"
                              }`}
                            />
                          ))}
                        </div>
                        <p className={`text-xs ${passwordStrength.color}`}>
                          {passwordStrength.text}
                        </p>
                      </div>
                    )}
                  </FormItem>
                )}
              />

              {/* Confirm Password */}
              <FormField
                control={form.control}
                name="confirmPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Confirmar senha</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input
                          type={showConfirmPassword ? "text" : "password"}
                          placeholder="Repita a senha"
                          {...field}
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        >
                          {showConfirmPassword ? "👁️" : "👁️‍🗨️"}
                        </button>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Submit Button */}
              <Button
                type="submit"
                className="w-full"
                disabled={registerMutation.isPending}
              >
                {registerMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Cadastrando...
                  </>
                ) : (
                  "Criar conta"
                )}
              </Button>

              {/* Error Alert */}
              {registerMutation.isError && (
                <div className="flex gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
                  <AlertCircle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-destructive">
                    {registerMutation.error?.message || "Erro ao cadastrar"}
                  </p>
                </div>
              )}

              {/* Success Alert */}
              {registerMutation.isSuccess && (
                <div className="flex gap-2 p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
                  <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-green-500">
                    Cadastro realizado! Verifique seu e-mail.
                  </p>
                </div>
              )}
            </form>
          </Form>

          {/* Login Link */}
          <div className="mt-6 text-center text-sm">
            <p className="text-muted-foreground">
              Já tem conta?{" "}
              <a href="/login" className="text-primary hover:underline font-medium">
                Faça login
              </a>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function getPasswordStrength(password: string) {
  let score = 0;
  let text = "Fraca";
  let color = "bg-red-500";

  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++;
  if (/\d/.test(password)) score++;

  if (score <= 1) {
    text = "Fraca";
    color = "bg-red-500";
  } else if (score === 2) {
    text = "Regular";
    color = "bg-yellow-500";
  } else if (score === 3) {
    text = "Boa";
    color = "bg-blue-500";
  } else {
    text = "Muito forte";
    color = "bg-green-500";
  }

  return { score, text, color };
}
