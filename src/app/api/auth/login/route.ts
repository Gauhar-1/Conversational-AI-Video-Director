/**
 * @file src/app/api/auth/login/route.ts
 * @description API Route for User Authentication via Supabase GoTrue.
 * Issues access_token and refresh_token, writing them into HTTP cookies.
 */

import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json({ error: "Email and password are required." }, { status: 400 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
      // Local development fallback: Return deterministic dev session
      const devUser = {
        id: "00000000-0000-0000-0000-000000000001",
        email,
        role: "authenticated",
        user_metadata: { name: email.split("@")[0] },
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
      const devRefresh = `mock-refresh-${Date.now()}`;

      const res = NextResponse.json({
        user: devUser,
        session: {
          access_token: devToken,
          refresh_token: devRefresh,
          expires_in: 3600,
          user: devUser,
        },
      });

      res.cookies.set("sb-access-token", devToken, {
        path: "/",
        maxAge: 3600,
        sameSite: "lax",
        httpOnly: false,
      });

      res.cookies.set("sb-refresh-token", devRefresh, {
        path: "/",
        maxAge: 30 * 24 * 3600,
        sameSite: "lax",
        httpOnly: false,
      });

      return res;
    }

    // Call Supabase GoTrue Token Endpoint
    const authRes = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=password`, {
      method: "POST",
      headers: {
        apikey: supabaseAnonKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email, password }),
    });

    const data = await authRes.json();

    if (!authRes.ok) {
      return NextResponse.json(
        { error: data.error_description || data.msg || data.message || "Invalid email or password." },
        { status: authRes.status }
      );
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

    // Write access token (short lived)
    response.cookies.set("sb-access-token", data.access_token, {
      path: "/",
      maxAge: data.expires_in || 3600,
      sameSite: "lax",
      httpOnly: false,
    });

    // Write refresh token (long lived for auto-login)
    if (data.refresh_token) {
      response.cookies.set("sb-refresh-token", data.refresh_token, {
        path: "/",
        maxAge: 30 * 24 * 3600,
        sameSite: "lax",
        httpOnly: false,
      });
    }

    return response;
  } catch (error: any) {
    console.error("Login API Error:", error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}
