import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import type { Request, Response } from "express";
import type { User } from "../../drizzle/schema";
import { parse as parseCookieHeader } from "cookie";
import { jwtVerify } from "jose";
import { getUserById } from "../db";
import { ENV } from "./env";
import { COOKIE_NAME } from "@shared/const";

export type TrpcContext = {
  req: Request;
  res: Response;
  user: User | null;
  adminUser: User | null; // set when admin is impersonating someone
};

function getSessionSecret() {
  return new TextEncoder().encode(ENV.cookieSecret);
}

async function authenticateRequest(req: CreateExpressContextOptions["req"]): Promise<{ user: User | null; adminUser: User | null }> {
  try {
    const cookieHeader = req.headers.cookie;
    if (!cookieHeader) return { user: null, adminUser: null };

    const cookies = parseCookieHeader(cookieHeader);
    const sessionCookie = cookies[COOKIE_NAME];
    if (!sessionCookie) return { user: null, adminUser: null };

    const secretKey = getSessionSecret();
    const { payload } = await jwtVerify(sessionCookie, secretKey, {
      algorithms: ["HS256"],
    });

    const userId = payload.userId as number | undefined;
    if (!userId) return { user: null, adminUser: null };

    const realUser = await getUserById(userId);
    if (!realUser) return { user: null, adminUser: null };

    // Check if admin is impersonating another user
    const impersonatingId = payload.impersonatingUserId as number | undefined;
    if (impersonatingId && realUser.role === 'admin') {
      const impersonatedUser = await getUserById(impersonatingId);
      if (impersonatedUser) {
        return { user: impersonatedUser, adminUser: realUser };
      }
    }

    return { user: realUser, adminUser: null };
  } catch {
    return { user: null, adminUser: null };
  }
}

export async function createContext(
  opts: CreateExpressContextOptions
): Promise<TrpcContext> {
  const { user, adminUser } = await authenticateRequest(opts.req);

  return {
    req: opts.req,
    res: opts.res,
    user,
    adminUser,
  };
}
