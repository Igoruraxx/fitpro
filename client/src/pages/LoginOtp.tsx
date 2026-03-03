import { useState, useRef, useEffect, useCallback } from "react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, AlertCircle, CheckCircle, Mail, ArrowLeft, KeyRound } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

type Step = "email" | "otp" | "name";

export default function LoginOtp() {
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [otpDigits, setOtpDigits] = useState(["", "", "", "", "", ""]);
  const [name, setName] = useState("");
  const [isNewUser, setIsNewUser] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const sendOtpMutation = trpc.auth.sendOtp.useMutation();
  const verifyOtpMutation = trpc.auth.verifyOtp.useMutation();

  // Countdown timer for resend
  useEffect(() => {
    if (countdown <= 0) return;
    const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
    return () => clearTimeout(timer);
  }, [countdown]);

  // Auto-focus first OTP input when step changes to OTP
  useEffect(() => {
    if (step === "otp") {
      setTimeout(() => inputRefs.current[0]?.focus(), 100);
    }
  }, [step]);

  const handleSendOtp = useCallback(async () => {
    const emailSchema = z.string().email();
    if (!emailSchema.safeParse(email).success) {
      toast.error("Digite um e-mail válido");
      return;
    }

    try {
      const result = await sendOtpMutation.mutateAsync({ email });
      setIsNewUser(result.isNewUser);
      setStep("otp");
      setCountdown(60);
      toast.success(result.message);
    } catch (error: any) {
      toast.error(error.message || "Erro ao enviar código");
    }
  }, [email, sendOtpMutation]);

  const handleOtpChange = useCallback((index: number, value: string) => {
    // Only allow digits
    const digit = value.replace(/\D/g, "").slice(-1);
    const newDigits = [...otpDigits];
    newDigits[index] = digit;
    setOtpDigits(newDigits);

    // Auto-advance to next input
    if (digit && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    // Auto-submit when all 6 digits are filled
    if (digit && index === 5) {
      const code = newDigits.join("");
      if (code.length === 6) {
        handleVerifyOtp(code);
      }
    }
  }, [otpDigits]);

  const handleOtpKeyDown = useCallback((index: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !otpDigits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  }, [otpDigits]);

  const handleOtpPaste = useCallback((e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (pasted.length === 6) {
      const digits = pasted.split("");
      setOtpDigits(digits);
      inputRefs.current[5]?.focus();
      handleVerifyOtp(pasted);
    }
  }, []);

  const handleVerifyOtp = useCallback(async (codeOverride?: string) => {
    const code = codeOverride || otpDigits.join("");
    if (code.length !== 6) {
      toast.error("Digite o código completo de 6 dígitos");
      return;
    }

    try {
      const result = await verifyOtpMutation.mutateAsync({
        email,
        code,
        name: name || undefined,
      });

      if (result.needsName) {
        setStep("name");
        return;
      }

      toast.success(result.isNewUser ? "Conta criada com sucesso!" : "Login realizado!");
      window.location.href = "/dashboard";
    } catch (error: any) {
      toast.error(error.message || "Código inválido");
      // Clear OTP inputs on error
      setOtpDigits(["", "", "", "", "", ""]);
      inputRefs.current[0]?.focus();
    }
  }, [email, name, otpDigits, verifyOtpMutation]);

  const handleNameSubmit = useCallback(async () => {
    if (!name.trim() || name.trim().length < 2) {
      toast.error("Digite seu nome completo (mínimo 2 caracteres)");
      return;
    }

    try {
      const code = otpDigits.join("");
      const result = await verifyOtpMutation.mutateAsync({
        email,
        code,
        name: name.trim(),
      });

      toast.success("Conta criada com sucesso!");
      window.location.href = "/dashboard";
    } catch (error: any) {
      toast.error(error.message || "Erro ao completar cadastro");
    }
  }, [email, name, otpDigits, verifyOtpMutation]);

  const handleResend = useCallback(async () => {
    if (countdown > 0) return;
    try {
      const result = await sendOtpMutation.mutateAsync({ email });
      setCountdown(60);
      setOtpDigits(["", "", "", "", "", ""]);
      toast.success("Novo código enviado!");
      inputRefs.current[0]?.focus();
    } catch (error: any) {
      toast.error(error.message || "Erro ao reenviar código");
    }
  }, [countdown, email, sendOtpMutation]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-2">
          <div className="flex items-center justify-center mb-4">
            <div className="w-16 h-16 flex items-center justify-center">
              <img
                src="https://d2xsxph8kpxj0f.cloudfront.net/310519663385249362/5UbJ997E6SHYZid72bThxF/fitpro-logo_005e8846.png"
                alt="FitPro Logo"
                className="w-16 h-16 object-contain"
              />
            </div>
          </div>
          <CardTitle className="text-center text-2xl">FITPRO</CardTitle>
          <CardDescription className="text-center">
            {step === "email" && "Entre com seu e-mail para receber um código"}
            {step === "otp" && "Digite o código enviado para seu e-mail"}
            {step === "name" && "Complete seu cadastro"}
          </CardDescription>
        </CardHeader>

        <CardContent>
          {/* ==================== STEP 1: EMAIL ==================== */}
          {step === "email" && (
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">E-mail</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="email"
                    placeholder="seu@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSendOtp()}
                    className="pl-10"
                    autoFocus
                  />
                </div>
              </div>

              <Button
                onClick={handleSendOtp}
                className="w-full"
                disabled={sendOtpMutation.isPending || !email}
              >
                {sendOtpMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Enviando...
                  </>
                ) : (
                  "Enviar código"
                )}
              </Button>

              {/* Divider */}
              <div className="relative my-4">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-muted"></div>
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-card px-2 text-muted-foreground">Ou</span>
                </div>
              </div>

              <div className="text-center text-sm">
                <p className="text-muted-foreground">
                  Prefere usar senha?{" "}
                  <a href="/login" className="text-primary hover:underline font-medium">
                    Login com senha
                  </a>
                </p>
              </div>
            </div>
          )}

          {/* ==================== STEP 2: OTP CODE ==================== */}
          {step === "otp" && (
            <div className="space-y-6">
              {/* Back button */}
              <button
                onClick={() => {
                  setStep("email");
                  setOtpDigits(["", "", "", "", "", ""]);
                }}
                className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                <ArrowLeft className="h-4 w-4" />
                Alterar e-mail
              </button>

              <div className="text-center">
                <div className="inline-flex items-center gap-2 bg-muted/50 rounded-lg px-4 py-2 mb-4">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">{email}</span>
                </div>
              </div>

              {/* OTP Input Grid */}
              <div className="flex justify-center gap-2" onPaste={handleOtpPaste}>
                {otpDigits.map((digit, i) => (
                  <Input
                    key={i}
                    ref={(el) => { inputRefs.current[i] = el; }}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleOtpChange(i, e.target.value)}
                    onKeyDown={(e) => handleOtpKeyDown(i, e)}
                    className="w-12 h-14 text-center text-xl font-bold"
                    autoComplete="one-time-code"
                  />
                ))}
              </div>

              <Button
                onClick={() => handleVerifyOtp()}
                className="w-full"
                disabled={verifyOtpMutation.isPending || otpDigits.join("").length !== 6}
              >
                {verifyOtpMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Verificando...
                  </>
                ) : (
                  <>
                    <KeyRound className="mr-2 h-4 w-4" />
                    Verificar código
                  </>
                )}
              </Button>

              {/* Resend */}
              <div className="text-center">
                {countdown > 0 ? (
                  <p className="text-sm text-muted-foreground">
                    Reenviar código em <span className="font-medium text-foreground">{countdown}s</span>
                  </p>
                ) : (
                  <button
                    onClick={handleResend}
                    disabled={sendOtpMutation.isPending}
                    className="text-sm text-primary hover:underline font-medium"
                  >
                    {sendOtpMutation.isPending ? "Reenviando..." : "Reenviar código"}
                  </button>
                )}
              </div>

              {/* Error */}
              {verifyOtpMutation.isError && (
                <div className="flex gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
                  <AlertCircle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-destructive">
                    {verifyOtpMutation.error?.message || "Código inválido"}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* ==================== STEP 3: NAME (NEW USER) ==================== */}
          {step === "name" && (
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-3 bg-green-500/10 border border-green-500/20 rounded-lg mb-4">
                <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0" />
                <p className="text-sm text-green-600">
                  E-mail verificado! Complete seu cadastro.
                </p>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Seu nome completo</label>
                <Input
                  placeholder="João Silva"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleNameSubmit()}
                  autoFocus
                />
                <p className="text-xs text-muted-foreground">
                  Este nome será exibido para seus clientes
                </p>
              </div>

              <Button
                onClick={handleNameSubmit}
                className="w-full"
                disabled={verifyOtpMutation.isPending || !name.trim()}
              >
                {verifyOtpMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Criando conta...
                  </>
                ) : (
                  "Criar conta"
                )}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
