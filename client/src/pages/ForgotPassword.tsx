import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Loader2, AlertCircle, CheckCircle, ArrowLeft } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

const forgotPasswordSchema = z.object({
  email: z.string().email("E-mail inválido"),
});

type ForgotPasswordForm = z.infer<typeof forgotPasswordSchema>;

export default function ForgotPassword() {
  const [, setLocation] = useLocation();
  const [submitted, setSubmitted] = useState(false);
  const forgotPasswordMutation = trpc.auth.forgotPassword.useMutation();

  const form = useForm<ForgotPasswordForm>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: {
      email: "",
    },
  });

  async function onSubmit(values: ForgotPasswordForm) {
    try {
      await forgotPasswordMutation.mutateAsync({
        email: values.email,
      });

      setSubmitted(true);
      toast.success("Se o e-mail estiver registrado, você receberá um link para redefinir a senha.");
    } catch (error: any) {
      toast.error(error.message || "Erro ao enviar e-mail de recuperação");
    }
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="space-y-2">
            <div className="flex items-center justify-center mb-4">
              <div className="w-12 h-12 bg-green-500/20 rounded-lg flex items-center justify-center">
                <CheckCircle className="h-6 w-6 text-green-500" />
              </div>
            </div>
            <CardTitle className="text-center text-2xl">E-mail enviado!</CardTitle>
            <CardDescription className="text-center">
              Se o e-mail estiver registrado, você receberá um link para redefinir a senha em breve.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Verifique sua caixa de entrada e spam. O link para redefinir a senha expira em 1 hora.
            </p>

            <Button
              onClick={() => setLocation("/login")}
              className="w-full"
            >
              Voltar ao login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
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
          <CardTitle className="text-center text-2xl">Recuperar Senha</CardTitle>
          <CardDescription className="text-center">
            Digite seu e-mail para receber um link de recuperação
          </CardDescription>
        </CardHeader>

        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
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

              {/* Submit Button */}
              <Button
                type="submit"
                className="w-full"
                disabled={forgotPasswordMutation.isPending}
              >
                {forgotPasswordMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Enviando...
                  </>
                ) : (
                  "Enviar link de recuperação"
                )}
              </Button>

              {/* Error Alert */}
              {forgotPasswordMutation.isError && (
                <div className="flex gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
                  <AlertCircle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-destructive">
                    {forgotPasswordMutation.error?.message || "Erro ao enviar e-mail"}
                  </p>
                </div>
              )}
            </form>
          </Form>

          {/* Back to Login Link */}
          <div className="mt-6 text-center">
            <a href="/login" className="inline-flex items-center gap-2 text-sm text-primary hover:underline">
              <ArrowLeft className="h-4 w-4" />
              Voltar ao login
            </a>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
