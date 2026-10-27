/**
 * @file src/lib/supabase/server.ts
 * @description Supabase Server Client for Next.js App Router (Server Components & Route Handlers).
 * Manages cookie-based auth tokens via next/headers with automatic refresh token fallback.
 */

import { cookies } from "next/headers";
import type { SupabaseSession, SupabaseUser } from "./client";

/**
 * Creates an asynchronous server-side Supabase client using App Router cookies().
 */
export async function createServerClient() {
  const cookieStore = await cookies();
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

  // Attempt reading standard Supabase cookies
  let accessToken =
    cookieStore.get("sb-access-token")?.value ||
    cookieStore.get("sb-token")?.value ||
    cookieStore.getAll().find((c) => c.name.startsWith("sb-") && c.name.endsWith("-auth-token"))?.value ||
    null;

  const refreshToken = cookieStore.get("sb-refresh-token")?.value || null;
  const devSession = cookieStore.get("director_dev_session")?.value || null;

  return {
    auth: {
      /**
       * Retrieve authenticated user from Supabase using session token in cookies,
       * automatically refreshing if the access token has expired.
       */
      async getUser(): Promise<{ data: { user: SupabaseUser | null }; error: Error | null }> {
        // 1. If dev session is set, return deterministic developer identity
        if (devSession) {
          return {
            data: {
              user: {
                id: devSession,
                email: "developer@director.ai",
                role: "authenticated",
                user_metadata: { name: "Developer Session" },
              },
            },
            error: null,
          };
        }

        // 2. Validate current access token
        if (accessToken) {
          const isExpired = isTokenExpired(accessToken);
          if (!isExpired) {
            if (!supabaseUrl || !supabaseAnonKey) {
              const parsed = parseJwt(accessToken);
              if (parsed) return { data: { user: parsed }, error: null };
            } else {
              try {
                const res = await fetch(`${supabaseUrl}/auth/v1/user`, {
                  headers: {
                    apikey: supabaseAnonKey,
                    Authorization: `Bearer ${accessToken}`,
                  },
                  cache: "no-store",
                });

                if (res.ok) {
                  const user = await res.json();
                  return { data: { user }, error: null };
                }
              } catch (err: any) {
                // Network error, try refresh
              }
            }
          }
        }

        // 3. Access token missing or expired: Attempt refresh using refresh_token
        if (refreshToken && supabaseUrl && supabaseAnonKey) {
          try {
            const refreshRes = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=refresh_token`, {
              method: "POST",
              headers: {
                apikey: supabaseAnonKey,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({ refresh_token: refreshToken }),
              cache: "no-store",
            });

            if (refreshRes.ok) {
              const refreshed = await refreshRes.json();
              if (refreshed.access_token) {
                accessToken = refreshed.access_token;
                // Attempt writing updated cookies if in a mutable context
                try {
                  cookieStore.set("sb-access-token", refreshed.access_token, {
                    path: "/",
                    maxAge: refreshed.expires_in || 3600,
                    sameSite: "lax",
                  });
                  if (refreshed.refresh_token) {
                    cookieStore.set("sb-refresh-token", refreshed.refresh_token, {
                      path: "/",
                      maxAge: 30 * 24 * 3600,
                      sameSite: "lax",
                    });
                  }
                } catch {
                  // In Server Components cookieStore.set may not be permitted
                }

                return { data: { user: refreshed.user }, error: null };
              }
            }
          } catch (err: any) {
            return { data: { user: null }, error: err };
          }
        }

        // 4. Fallback: Parse unverified JWT payload if Supabase is unconfigured
        if (accessToken && (!supabaseUrl || !supabaseAnonKey)) {
          const parsed = parseJwt(accessToken);
          if (parsed) return { data: { user: parsed }, error: null };
        }

        return { data: { user: null }, error: null };
      },

      /**
       * Retrieve current session
       */
      async getSession(): Promise<{ data: { session: SupabaseSession | null }; error: Error | null }> {
        const { data, error } = await this.getUser();
        if (error || !data.user || !accessToken) {
          return { data: { session: null }, error };
        }
        return {
          data: {
            session: {
              access_token: accessToken,
              refresh_token: refreshToken || undefined,
              user: data.user,
            },
          },
          error: null,
        };
      },
    },
  };
}

function parseJwt(token: string): SupabaseUser | null {
  try {
    const parts = token.split(".");
    if (parts.length === 3) {
      const payload = JSON.parse(Buffer.from(parts[1], "base64url").toString("utf-8"));
      return {
        id: payload.sub || payload.id,
        email: payload.email,
        role: payload.role || "authenticated",
        user_metadata: payload.user_metadata || {},
      };
    }
  } catch {
    // Ignore invalid tokens
  }
  return null;
}

function isTokenExpired(token: string): boolean {
  try {
    const parts = token.split(".");
    if (parts.length === 3) {
      const payload = JSON.parse(Buffer.from(parts[1], "base64url").toString("utf-8"));
      if (payload.exp) {
        return Date.now() / 1000 >= payload.exp - 30;
      }
    }
  } catch {
    return true;
  }
  return false;
}
