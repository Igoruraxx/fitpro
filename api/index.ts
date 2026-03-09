import express from "express";

const app = express();

// Health check before loading heavy dependencies
app.get("/api/ping", (_req, res) => {
  res.json({ ok: true, ts: Date.now() });
});

app.use(
  express.json({
    limit: "50mb",
    verify: (req: any, _res, buf) => {
      if (req.url?.includes("/webhooks")) {
        (req as any).rawBody = buf;
      }
    },
  })
);
app.use(express.urlencoded({ limit: "50mb", extended: true }));

let initialized = false;
let initError: string | null = null;

async function initApp() {
  if (initialized) return;
  try {
    const { registerOAuthRoutes } = await import("../server/_core/oauth");
    const { appRouter } = await import("../server/routers");
    const { createContext } = await import("../server/_core/context");
    const { handleAbacashWebhook } = await import("../server/webhooks/abacash");
    const { abacatepayWebhookRouter } = await import("../server/webhooks/abacatepay");
    const { createExpressMiddleware } = await import("@trpc/server/adapters/express");

    registerOAuthRoutes(app);
    app.post("/api/webhooks/abacash", handleAbacashWebhook);
    app.use("/api/webhooks", abacatepayWebhookRouter);
    app.use("/api/trpc", createExpressMiddleware({ router: appRouter, createContext }));
    initialized = true;
  } catch (err: any) {
    initError = String(err?.stack || err);
    console.error("[API] Init error:", initError);
  }
}

app.use(async (req, res, next) => {
  if (req.path === "/api/ping") return next();
  await initApp();
  if (initError) {
    return res.status(500).json({ error: "Server initialization failed", detail: initError });
  }
  next();
});

export default app;
