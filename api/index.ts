import "dotenv/config";
import express from "express";
import type { Request, Response, NextFunction } from "express";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { appRouter } from "../server/routers";
import { createContext } from "../server/_core/context";

const app = express();

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

app.use(
  "/api/trpc",
  createExpressMiddleware({
    router: appRouter,
    createContext,
  })
);

// Global error handler – must be after all routes.
// Ensures unhandled Express errors return JSON instead of an HTML/plain-text
// Vercel error page that would cause "Unexpected token" JSON parse failures
// on the client.
app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  console.error("[Server Error]", err);
  res.status(500).json({
    message: "Erro interno do servidor. Tente novamente mais tarde.",
  });
});

export default app;
module.exports = app;
