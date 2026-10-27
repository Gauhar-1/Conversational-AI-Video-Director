/**
 * @file src/app/auth/callback/route.ts
 * @description OAuth Callback Handler for Supabase Google/GitHub authentications.
 * Exchanges authorization code for access and refresh tokens, setting HTTP cookies.
 */

import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const requestUrl = new URL(req.url);
  const code = requestUrl.searchParams.get("code");
  const next = requestUrl.searchParams.get("next") || "/dashboard";

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (code && supabaseUrl && supabaseAnonKey) {
    try {
      const tokenRes = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=pkce`, {
        method: "POST",
        headers: {
          apikey: supabaseAnonKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          auth_code: code,
          code_verifier: requestUrl.searchParams.get("code_verifier") || "",
        }),
      });

      if (tokenRes.ok) {
        const data = await tokenRes.json();
        const response = NextResponse.redirect(new URL(next, requestUrl.origin));

        if (data.access_token) {
          response.cookies.set("sb-access-token", data.access_token, {
            path: "/",
            maxAge: data.expires_in || 3600,
            sameSite: "lax",
          });
        }

        if (data.refresh_token) {
          response.cookies.set("sb-refresh-token", data.refresh_token, {
            path: "/",
            maxAge: 30 * 24 * 3600,
            sameSite: "lax",
          });
        }

        return response;
      }
    } catch (err) {
      console.error("OAuth code exchange error:", err);
    }
  }

  // If client-side hash based flow is used, render a lightweight client helper
  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>Authenticating...</title>
      </head>
      <body style="background:#09090b;color:#f4f4f5;font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;">
        <div style="text-align:center;">
          <p style="font-size:14px;color:#a1a1aa;">Completing studio authorization...</p>
        </div>
        <script>
          const hash = window.location.hash.substring(1);
          const params = new URLSearchParams(hash);
          const accessToken = params.get('access_token');
          const refreshToken = params.get('refresh_token');
          const expiresIn = params.get('expires_in') || 3600;

          if (accessToken) {
            document.cookie = 'sb-access-token=' + encodeURIComponent(accessToken) + '; path=/; max-age=' + expiresIn + '; SameSite=Lax';
            if (refreshToken) {
              document.cookie = 'sb-refresh-token=' + encodeURIComponent(refreshToken) + '; path=/; max-age=2592000; SameSite=Lax';
            }
            window.location.href = '${next}';
          } else {
            window.location.href = '/dashboard';
          }
        </script>
      </body>
    </html>
  `;

  return new NextResponse(html, {
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}
