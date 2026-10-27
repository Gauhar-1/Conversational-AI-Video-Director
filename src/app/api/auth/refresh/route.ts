/**
 * @file src/app/api/auth/refresh/route.ts
 * @description API Route to auto-refresh access token using refresh_token in cookies.
 * Keeps user session alive seamlessly.
 */

import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function POST(req: Request) {
  try {
    const cookieStore = await cookies();
    const body = await req.json().catch(() => ({}));
    const refreshToken = body.refreshToken || cookieStore.get("sb-refresh-token")?.value;

    if (!refreshToken) {
      return NextResponse.json({ error: "Refresh token missing." }, { status: 401 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
      // Dev mode: Rotate token
      const devUser = {
        id: "00000000-0000-0000-0000-000000000001",
        email: "developer@director.ai",
        role: "authenticated",
      };

      const b64 = Buffer.from(
        JSON.stringify({
          sub: devUser.id,
          email: devUser.email,
          role: devUser.role,
          exp: Math.floor(Date.now() / 1000) + 3600,
        })
      ).toString("base64url");

      const devToken = `eyJhbGciOiJIUzI1NiJ9.${b64}.mocksignature`;
      const newRefresh = `mock-refresh-${Date.now()}`;

      const res = NextResponse.json({
        user: devUser,
        session: {
          access_token: devToken,
          refresh_token: newRefresh,
          expires_in: 3600,
          user: devUser,
        },
      });

      res.cookies.set("sb-access-token", devToken, { path: "/", maxAge: 3600, sameSite: "lax" });
      res.cookies.set("sb-refresh-token", newRefresh, { path: "/", maxAge: 30 * 24 * 3600, sameSite: "lax" });
      return res;
    }

    // Call Supabase Refresh Token Endpoint
    const refreshRes = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=refresh_token`, {
      method: "POST",
      headers: {
        apikey: supabaseAnonKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ refresh_token: refreshToken }),
    });

    const data = await refreshRes.json();

    if (!refreshRes.ok) {
      // Refresh token expired or revoked: clear cookies
      const failRes = NextResponse.json({ error: "Session expired. Please log in again." }, { status: 401 });
      failRes.cookies.set("sb-access-token", "", { path: "/", maxAge: 0 });
      failRes.cookies.set("sb-refresh-token", "", { path: "/", maxAge: 0 });
      return failRes;
    }

    const response = NextResponse.json({
      user: data.user,
      session: {
        access_token: data.access_token,
        refresh_token: data.refresh_token,
        expires_in: data.expires_in,
        user: data.user,
      },
    });

    response.cookies.set("sb-access-token", data.access_token, {
      path: "/",
      maxAge: data.expires_in || 3600,
      sameSite: "lax",
    });

    if (data.refresh_token) {
      response.cookies.set("sb-refresh-token", data.refresh_token, {
        path: "/",
        maxAge: 30 * 24 * 3600,
        sameSite: "lax",
      });
    }

    return response;
  } catch (error: any) {
    console.error("Refresh API Error:", error);
    return NextResponse.json({ error: error.message || "Failed to refresh token" }, { status: 500 });
  }
}
