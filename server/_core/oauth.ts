import type { Express, Request, Response } from "express";

// Manus OAuth is disabled - using custom email/password authentication
export function registerOAuthRoutes(app: Express) {
  // Redirect any OAuth callback attempts to login page
  app.get("/api/oauth/callback", (_req: Request, res: Response) => {
    res.redirect(302, "/login");
  });
}
