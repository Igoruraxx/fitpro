import { useEffect, useState } from "react";

const LOGO_URL = "https://d2xsxph8kpxj0f.cloudfront.net/310519663385249362/5UbJ997E6SHYZid72bThxF/fitpro-logo_005e8846.png";

interface SplashScreenProps {
  onFinish: () => void;
}

export default function SplashScreen({ onFinish }: SplashScreenProps) {
  const [phase, setPhase] = useState<"enter" | "hold" | "exit">("enter");

  useEffect(() => {
    // Fase 1: logo entra (0 → 600ms)
    const holdTimer = setTimeout(() => setPhase("hold"), 600);
    // Fase 2: segura (600 → 1800ms)
    const exitTimer = setTimeout(() => setPhase("exit"), 1800);
    // Fase 3: sai e chama onFinish (1800 → 2300ms)
    const doneTimer = setTimeout(() => onFinish(), 2300);

    return () => {
      clearTimeout(holdTimer);
      clearTimeout(exitTimer);
      clearTimeout(doneTimer);
    };
  }, [onFinish]);

  return (
    <div
      className="fixed inset-0 z-[9999] flex flex-col items-center justify-center"
      style={{
        background: "linear-gradient(135deg, #0d4f4f 0%, #0a3a3a 50%, #1a1a2e 100%)",
        opacity: phase === "exit" ? 0 : 1,
        transition: phase === "exit" ? "opacity 0.5s ease-out" : "none",
      }}
    >
      {/* Logo container com animação */}
      <div
        style={{
          transform: phase === "enter" ? "scale(0.5) translateY(20px)" : "scale(1) translateY(0)",
          opacity: phase === "enter" ? 0 : 1,
          transition: "transform 0.6s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.4s ease-out",
        }}
        className="flex flex-col items-center gap-6"
      >
        {/* Logo com brilho pulsante */}
        <div
          className="relative"
          style={{
            filter: phase === "hold" ? "drop-shadow(0 0 24px rgba(234, 88, 12, 0.6))" : "drop-shadow(0 0 8px rgba(234, 88, 12, 0.3))",
            transition: "filter 0.8s ease-in-out",
          }}
        >
          <img
            src={LOGO_URL}
            alt="FitPro"
            className="w-32 h-32 object-contain"
          />
        </div>

        {/* Nome do app */}
        <div className="text-center">
          <h1
            className="text-4xl font-extrabold tracking-widest"
            style={{ color: "#f97316", letterSpacing: "0.25em" }}
          >
            FITPRO
          </h1>
          <p className="text-sm mt-1 font-medium" style={{ color: "#5eead4", letterSpacing: "0.15em" }}>
            AGENDA PERSONAL
          </p>
        </div>

        {/* Barra de loading animada */}
        <div className="w-40 h-1 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.15)" }}>
          <div
            className="h-full rounded-full"
            style={{
              background: "linear-gradient(90deg, #f97316, #ea580c)",
              width: phase === "enter" ? "0%" : "100%",
              transition: "width 1.2s ease-out",
            }}
          />
        </div>
      </div>
    </div>
  );
}
