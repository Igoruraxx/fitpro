import "dotenv/config";
import express from "express";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "../server/_core/oauth";
import { appRouter } from "../server/routers";
import { createContext } from "../server/_core/context";
import { handleAbacashWebhook } from "../server/webhooks/abacash";
import { abacatepayWebhookRouter } from "../server/webhooks/abacatepay";

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

registerOAuthRoutes(app);

app.post("/api/webhooks/abacash", handleAbacashWebhook);
app.use("/api/webhooks", abacatepayWebhookRouter);

app.use(
  "/api/trpc",
  createExpressMiddleware({
    router: appRouter,
    createContext,
  })
);

export default app;
module.exports = app;
