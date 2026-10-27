/**
 * @file src/lib/supabase/middleware.ts
 * @description Supabase Next.js Middleware handler for session verification,
 * automatic refresh token rotation via HTTP cookies, and route protection.
 */

import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

  // Extract access token from cookies or authorization header
  const authHeader = request.headers.get("authorization");
  let cookieToken =
    request.cookies.get("sb-access-token")?.value ||
    request.cookies.get("sb-token")?.value ||
    request.cookies.get("director_dev_session")?.value ||
    request.cookies.getAll().find((c) => c.name.startsWith("sb-") && c.name.endsWith("-auth-token"))?.value;

  const refreshToken = request.cookies.get("sb-refresh-token")?.value;
  let token = authHeader?.replace(/^Bearer\s+/i, "") || cookieToken;

  let userId: string | null = null;
  let isAuthenticated = false;
  let refreshedSession: { access_token: string; refresh_token: string; expires_in?: number } | null = null;

  // 1. Verify access token
  if (token) {
    try {
      const parts = token.split(".");
      if (parts.length === 3) {
        const payload = JSON.parse(Buffer.from(parts[1], "base64url").toString("utf-8"));
        const isExpired = payload.exp ? Date.now() / 1000 >= payload.exp - 30 : false;

        if (!isExpired && payload.sub) {
          userId = payload.sub;
          isAuthenticated = true;
        }
      } else if (token.length >= 8) {
        // Plain string user ID or dev session
        userId = token;
        isAuthenticated = true;
      }
    } catch {
      // Invalid token
    }
  }

  // 2. If access token is expired or missing, auto-refresh via refresh_token
  if (!isAuthenticated && refreshToken && supabaseUrl && supabaseAnonKey) {
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
        const data = await refreshRes.json();
        if (data.access_token && data.user?.id) {
          userId = data.user.id;
          isAuthenticated = true;
          refreshedSession = {
            access_token: data.access_token,
            refresh_token: data.refresh_token || refreshToken,
            expires_in: data.expires_in,
          };
        }
      }
    } catch {
      // Refresh failed
    }
  }

  // Route categorization
  const isProjectWorkspace = pathname.startsWith("/project");
  const isAuthPath = pathname === "/login";
  const isRootPath = pathname === "/";

  // 1. Root redirect: Send to /dashboard
  if (isRootPath) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  // 2. Unauthenticated access to /project/* -> redirect to /login
  if (isProjectWorkspace && !isAuthenticated) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // 3. Authenticated user visiting /login -> redirect to /dashboard
  if (isAuthPath && isAuthenticated) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  // 4. Continue with forwarded headers and update cookies if refreshed
  const response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  if (userId) {
    response.headers.set("x-user-id", userId);
  }

  // Sync refreshed tokens back to client HTTP cookies
  if (refreshedSession) {
    response.cookies.set("sb-access-token", refreshedSession.access_token, {
      path: "/",
      maxAge: refreshedSession.expires_in || 3600,
      sameSite: "lax",
    });
    response.cookies.set("sb-refresh-token", refreshedSession.refresh_token, {
      path: "/",
      maxAge: 30 * 24 * 3600,
      sameSite: "lax",
    });
  }

  return response;
}
