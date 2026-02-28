import { useState, useEffect } from "react";
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

const resetPasswordSchema = z.object({
  password: z.string().min(8, "Senha deve ter no mínimo 8 caracteres"),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "As senhas não coincidem",
  path: ["confirmPassword"],
});

type ResetPasswordForm = z.infer<typeof resetPasswordSchema>;

export default function ResetPassword() {
  const [, setLocation] = useLocation();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [token, setToken] = useState("");
  const resetPasswordMutation = trpc.auth.resetPassword.useMutation();

  const form = useForm<ResetPasswordForm>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      password: "",
      confirmPassword: "",
    },
  });

  // Get token from URL query parameter
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tokenParam = params.get("token");
    if (tokenParam) {
      setToken(tokenParam);
    } else {
      toast.error("Token inválido ou expirado");
      setLocation("/forgot-password");
    }
  }, [setLocation]);

  async function onSubmit(values: ResetPasswordForm) {
    if (!token) {
      toast.error("Token inválido");
      return;
    }

    try {
      await resetPasswordMutation.mutateAsync({
        token,
        password: values.password,
      });

      toast.success("Senha redefinida com sucesso!");
      setLocation("/login");
    } catch (error: any) {
      if (error.data?.code === "BAD_REQUEST") {
        toast.error("Token inválido ou expirado. Solicite um novo link de recuperação.");
        setLocation("/forgot-password");
      } else {
        toast.error(error.message || "Erro ao redefinir senha");
      }
    }
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-2">
          <div className="flex items-center justify-center mb-4">
            <div className="w-16 h-16 flex items-center justify-center">
              <img src="https://d2xsxph8kpxj0f.cloudfront.net/310519663385249362/5UbJ997E6SHYZid72bThxF/fitpro-logo_005e8846.png" alt="FitPro Logo" className="w-16 h-16 object-contain" />
            </div>
          </div>
          <CardTitle className="text-center text-2xl">Nova Senha</CardTitle>
          <CardDescription className="text-center">
            Digite sua nova senha
          </CardDescription>
        </CardHeader>

        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              {/* Password */}
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nova Senha</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input
                          type={showPassword ? "text" : "password"}
                          placeholder="Sua nova senha"
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
                  </FormItem>
                )}
              />

              {/* Confirm Password */}
              <FormField
                control={form.control}
                name="confirmPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Confirmar Senha</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input
                          type={showConfirmPassword ? "text" : "password"}
                          placeholder="Confirme sua nova senha"
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
                disabled={resetPasswordMutation.isPending}
              >
                {resetPasswordMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Redefinindo...
                  </>
                ) : (
                  "Redefinir Senha"
                )}
              </Button>

              {/* Error Alert */}
              {resetPasswordMutation.isError && (
                <div className="flex gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
                  <AlertCircle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-destructive">
                    {resetPasswordMutation.error?.message || "Erro ao redefinir senha"}
                  </p>
                </div>
              )}

              {/* Success Alert */}
              {resetPasswordMutation.isSuccess && (
                <div className="flex gap-2 p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
                  <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-green-500">
                    Senha redefinida! Redirecionando para login...
                  </p>
                </div>
              )}
            </form>
          </Form>

          {/* Password Requirements */}
          <div className="mt-6 p-3 bg-muted rounded-lg">
            <p className="text-xs font-medium text-muted-foreground mb-2">Requisitos da senha:</p>
            <ul className="text-xs text-muted-foreground space-y-1">
              <li>✓ Mínimo 8 caracteres</li>
              <li>✓ Letras maiúsculas e minúsculas</li>
              <li>✓ Números</li>
              <li>✓ Caracteres especiais (!@#$%)</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
