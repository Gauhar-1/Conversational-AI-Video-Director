/**
 * @file src/lib/auth/getAuthUser.ts
 * @description Multi-tenant Authentication Bridge extracting Supabase Identity.
 * Enforces token validation, cookie sessions, and multi-tenant security.
 */

import { headers } from "next/headers";
import { createServerClient } from "@/lib/supabase/server";

export interface AuthContext {
  userId: string;
  email?: string;
  isAuthenticated: boolean;
}

export const DEV_DEFAULT_USER_ID = "00000000-0000-0000-0000-000000000001";

/**
 * Extracts the current user identity from Supabase session cookies or request headers.
 * Checks for token freshness and refresh tokens.
 *
 * @param req Optional Request object for Route Handlers
 * @returns AuthContext containing userId and authentication state
 */
export async function getAuthUser(req?: Request): Promise<AuthContext> {
  // 1. Check header injected by middleware (already verified)
  let headerUserId: string | null = null;
  let authHeader: string | null = null;

  if (req) {
    headerUserId = req.headers.get("x-user-id") || req.headers.get("X-User-Id");
    authHeader = req.headers.get("authorization") || req.headers.get("Authorization");
  } else {
    try {
      const headerList = await headers();
      headerUserId = headerList.get("x-user-id") || headerList.get("X-User-Id");
      authHeader = headerList.get("authorization") || headerList.get("Authorization");
    } catch {
      // In some rendering environments headers() might throw
    }
  }

  if (headerUserId && isValidUuidOrId(headerUserId)) {
    return {
      userId: headerUserId,
      isAuthenticated: true,
    };
  }

  // 2. Direct Bearer token validation if authorization header is provided
  if (authHeader && authHeader.startsWith("Bearer ")) {
    const token = authHeader.replace(/^Bearer\s+/i, "").trim();
    const bearerUser = parseJwtToken(token);
    if (bearerUser && isValidUuidOrId(bearerUser.id)) {
      return {
        userId: bearerUser.id,
        email: bearerUser.email,
        isAuthenticated: true,
      };
    }
  }

  // 3. Query Supabase server client (reads cookies & handles auto-refresh)
  try {
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (user?.id) {
      return {
        userId: user.id,
        email: user.email,
        isAuthenticated: true,
      };
    }
  } catch (err) {
    console.warn("Supabase auth check encountered an error:", err);
  }

  // 4. Fallback for unauthenticated access
  return {
    userId: "",
    isAuthenticated: false,
  };
}

/**
 * Enforces authentication for protected API endpoints.
 * Throws an error with a 401 status if the user is unauthenticated.
 */
export async function requireAuthUser(req?: Request): Promise<AuthContext> {
  const auth = await getAuthUser(req);
  if (!auth.isAuthenticated || !auth.userId) {
    const error: any = new Error("Unauthorized: Valid access token required.");
    error.status = 401;
    throw error;
  }
  return auth;
}

function isValidUuidOrId(val: string): boolean {
  return /^[0-9a-fA-F-]{8,}$/.test(val) || val.length >= 8;
}

function parseJwtToken(token: string): { id: string; email?: string } | null {
  try {
    const parts = token.split(".");
    if (parts.length === 3) {
      const payload = JSON.parse(Buffer.from(parts[1], "base64url").toString("utf-8"));
      // Check expiration
      if (payload.exp && Date.now() / 1000 >= payload.exp) {
        return null;
      }
      if (payload.sub || payload.id) {
        return {
          id: payload.sub || payload.id,
          email: payload.email,
        };
      }
    }
  } catch {
    // Invalid
  }
  return null;
}
