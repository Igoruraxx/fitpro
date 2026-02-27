import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, AlertCircle, CheckCircle, Mail } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

export default function ConfirmEmail() {
  const [, setLocation] = useLocation();
  const [token, setToken] = useState("");
  const [isConfirming, setIsConfirming] = useState(false);
  const confirmEmailMutation = trpc.auth.confirmEmail.useMutation();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tokenParam = params.get("token");
    
    if (tokenParam) {
      setToken(tokenParam);
      // Auto-confirm if token is present
      confirmEmailAutomatically(tokenParam);
    }
  }, []);

  async function confirmEmailAutomatically(confirmToken: string) {
    setIsConfirming(true);
    try {
      await confirmEmailMutation.mutateAsync({
        token: confirmToken,
      });

      toast.success("E-mail confirmado com sucesso!");
      setTimeout(() => {
        setLocation("/login");
      }, 2000);
    } catch (error: any) {
      if (error.data?.code === "BAD_REQUEST") {
        toast.error("Token inválido ou expirado");
      } else {
        toast.error(error.message || "Erro ao confirmar e-mail");
      }
      setIsConfirming(false);
    }
  }

  async function handleManualConfirm() {
    if (!token) {
      toast.error("Token não encontrado");
      return;
    }

    await confirmEmailAutomatically(token);
  }

  if (isConfirming || confirmEmailMutation.isPending) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="space-y-2">
            <div className="flex items-center justify-center mb-4">
              <div className="w-12 h-12 bg-primary rounded-lg flex items-center justify-center animate-pulse">
                <Loader2 className="h-6 w-6 text-white animate-spin" />
              </div>
            </div>
            <CardTitle className="text-center text-2xl">Confirmando E-mail</CardTitle>
            <CardDescription className="text-center">
              Aguarde um momento...
            </CardDescription>
          </CardHeader>

          <CardContent>
            <p className="text-sm text-muted-foreground text-center">
              Estamos confirmando seu e-mail. Você será redirecionado em breve.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (confirmEmailMutation.isSuccess) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="space-y-2">
            <div className="flex items-center justify-center mb-4">
              <div className="w-12 h-12 bg-green-500/20 rounded-lg flex items-center justify-center">
                <CheckCircle className="h-6 w-6 text-green-500" />
              </div>
            </div>
            <CardTitle className="text-center text-2xl">E-mail Confirmado!</CardTitle>
            <CardDescription className="text-center">
              Sua conta foi ativada com sucesso
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Você pode agora fazer login com sua conta.
            </p>

            <Button
              onClick={() => setLocation("/login")}
              className="w-full"
            >
              Ir para Login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (confirmEmailMutation.isError) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="space-y-2">
            <div className="flex items-center justify-center mb-4">
              <div className="w-12 h-12 bg-destructive/20 rounded-lg flex items-center justify-center">
                <AlertCircle className="h-6 w-6 text-destructive" />
              </div>
            </div>
            <CardTitle className="text-center text-2xl">Erro na Confirmação</CardTitle>
            <CardDescription className="text-center">
              Não conseguimos confirmar seu e-mail
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              {confirmEmailMutation.error?.message || "O link de confirmação pode ter expirado. Solicite um novo link."}
            </p>

            <div className="space-y-2">
              <Button
                onClick={() => setLocation("/register")}
                className="w-full"
              >
                Voltar ao Cadastro
              </Button>
              <Button
                onClick={() => setLocation("/login")}
                variant="outline"
                className="w-full"
              >
                Ir para Login
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // No token provided - show manual confirmation option
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-2">
          <div className="flex items-center justify-center mb-4">
            <div className="w-12 h-12 bg-primary rounded-lg flex items-center justify-center">
              <Mail className="h-6 w-6 text-white" />
            </div>
          </div>
          <CardTitle className="text-center text-2xl">Confirme seu E-mail</CardTitle>
          <CardDescription className="text-center">
            Verifique sua caixa de entrada
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Enviamos um link de confirmação para seu e-mail. Clique no link para ativar sua conta.
          </p>

          <div className="p-3 bg-muted rounded-lg">
            <p className="text-xs text-muted-foreground">
              💡 Se não encontrar o e-mail, verifique a pasta de spam.
            </p>
          </div>

          <Button
            onClick={() => setLocation("/login")}
            className="w-full"
          >
            Ir para Login
          </Button>

          <Button
            onClick={handleManualConfirm}
            variant="outline"
            className="w-full"
            disabled={!token}
          >
            Confirmar Manualmente
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
