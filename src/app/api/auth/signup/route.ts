/**
 * @file src/app/api/auth/signup/route.ts
 * @description API Route for User Registration via Supabase GoTrue.
 * Creates user and automatically issues session cookies if email confirmation is disabled.
 */

import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json({ error: "Email and password are required." }, { status: 400 });
    }

    if (password.length < 6) {
      return NextResponse.json({ error: "Password must be at least 6 characters." }, { status: 400 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
      // Local development fallback
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
      });

      res.cookies.set("sb-refresh-token", devRefresh, {
        path: "/",
        maxAge: 30 * 24 * 3600,
        sameSite: "lax",
      });

      return res;
    }

    // Call Supabase GoTrue SignUp Endpoint
    const authRes = await fetch(`${supabaseUrl}/auth/v1/signup`, {
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
        { error: data.error_description || data.msg || data.message || "Failed to create account." },
        { status: authRes.status }
      );
    }

    const response = NextResponse.json({
      user: data.user || data,
      session: data.session || (data.access_token ? {
        access_token: data.access_token,
        refresh_token: data.refresh_token,
        expires_in: data.expires_in,
        user: data.user,
      } : null),
      message: !data.session ? "Registration successful! Please check your email to confirm your account." : undefined,
    });

    // If auto-logged in, write session cookies
    if (data.session?.access_token || data.access_token) {
      const token = data.session?.access_token || data.access_token;
      const refresh = data.session?.refresh_token || data.refresh_token;
      const expiresIn = data.session?.expires_in || data.expires_in || 3600;

      response.cookies.set("sb-access-token", token, {
        path: "/",
        maxAge: expiresIn,
        sameSite: "lax",
      });

      if (refresh) {
        response.cookies.set("sb-refresh-token", refresh, {
          path: "/",
          maxAge: 30 * 24 * 3600,
          sameSite: "lax",
        });
      }
    }

    return response;
  } catch (error: any) {
    console.error("Signup API Error:", error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}
