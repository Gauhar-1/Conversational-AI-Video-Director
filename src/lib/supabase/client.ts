/**
 * @file src/lib/supabase/client.ts
 * @description Supabase Browser Client for client-side authentication, session persistence,
 * and automatic refresh token lifecycle via HTTP cookies.
 */

export interface SupabaseUser {
  id: string;
  email?: string;
  user_metadata?: Record<string, any>;
  role?: string;
}

export interface SupabaseSession {
  access_token: string;
  refresh_token?: string;
  expires_at?: number;
  user: SupabaseUser;
}

export interface AuthResponse {
  data: {
    user: SupabaseUser | null;
    session: SupabaseSession | null;
  };
  error: Error | null;
}

/**
 * Creates a browser-side Supabase client instance.
 * Reads NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.
 */
export function createBrowserClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

  return {
    auth: {
      /**
       * Retrieve current session from browser cookies with automatic refresh if expired.
       */
      async getSession(): Promise<{ data: { session: SupabaseSession | null }; error: Error | null }> {
        const accessToken = getCookie("sb-access-token");
        const refreshToken = getCookie("sb-refresh-token");

        // 1. If we have an access token, check expiration
        if (accessToken) {
          const isExpired = isTokenExpired(accessToken);
          if (!isExpired) {
            const user = parseJwtPayload(accessToken);
            if (user) {
              return {
                data: {
                  session: {
                    access_token: accessToken,
                    refresh_token: refreshToken || undefined,
                    user,
                  },
                },
                error: null,
              };
            }
          }
        }

        // 2. If access token is missing or expired, attempt automatic refresh using refresh_token
        if (refreshToken) {
          const refreshRes = await this.refreshSession(refreshToken);
          if (refreshRes.data.session) {
            return { data: { session: refreshRes.data.session }, error: null };
          }
        }

        // 3. Check for dev session fallback
        const devSession = getCookie("director_dev_session");
        if (devSession) {
          const devUser: SupabaseUser = {
            id: devSession,
            email: "developer@director.ai",
            role: "authenticated",
            user_metadata: { name: "Developer Session" },
          };
          return {
            data: {
              session: {
                access_token: devSession,
                user: devUser,
              },
            },
            error: null,
          };
        }

        return { data: { session: null }, error: null };
      },

      /**
       * Retrieve authenticated user
       */
      async getUser(): Promise<{ data: { user: SupabaseUser | null }; error: Error | null }> {
        const { data, error } = await this.getSession();
        return { data: { user: data.session?.user || null }, error };
      },

      /**
       * Sign in with Email and Password
       */
      async signInWithPassword({
        email,
        password,
      }: {
        email: string;
        password: string;
      }): Promise<AuthResponse> {
        try {
          const res = await fetch("/api/auth/login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, password }),
          });

          const json = await res.json();
          if (!res.ok) {
            return { data: { user: null, session: null }, error: new Error(json.error || "Login failed") };
          }

          if (json.session) {
            setSessionCookies(json.session.access_token, json.session.refresh_token, json.session.expires_in);
          }

          return {
            data: {
              user: json.user,
              session: json.session,
            },
            error: null,
          };
        } catch (err: any) {
          return { data: { user: null, session: null }, error: err };
        }
      },

      /**
       * Sign up with Email and Password
       */
      async signUp({
        email,
        password,
      }: {
        email: string;
        password: string;
      }): Promise<AuthResponse> {
        try {
          const res = await fetch("/api/auth/signup", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, password }),
          });

          const json = await res.json();
          if (!res.ok) {
            return { data: { user: null, session: null }, error: new Error(json.error || "Signup failed") };
          }

          if (json.session) {
            setSessionCookies(json.session.access_token, json.session.refresh_token, json.session.expires_in);
          }

          return {
            data: {
              user: json.user,
              session: json.session,
            },
            error: null,
          };
        } catch (err: any) {
          return { data: { user: null, session: null }, error: err };
        }
      },

      /**
       * Refresh session using refresh token stored in cookies
       */
      async refreshSession(explicitRefreshToken?: string): Promise<{ data: { session: SupabaseSession | null }; error: Error | null }> {
        const tokenToUse = explicitRefreshToken || getCookie("sb-refresh-token");
        if (!tokenToUse) {
          return { data: { session: null }, error: new Error("No refresh token available") };
        }

        try {
          const res = await fetch("/api/auth/refresh", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ refreshToken: tokenToUse }),
          });

          if (!res.ok) {
            // Expired refresh token: clear invalid cookies
            clearSessionCookies();
            return { data: { session: null }, error: new Error("Refresh token expired") };
          }

          const json = await res.json();
          if (json.session) {
            setSessionCookies(json.session.access_token, json.session.refresh_token, json.session.expires_in);
            return { data: { session: json.session }, error: null };
          }

          return { data: { session: null }, error: null };
        } catch (err: any) {
          return { data: { session: null }, error: err };
        }
      },

      /**
       * Sign in using OAuth provider (Google or GitHub)
       */
      async signInWithOAuth({
        provider,
        options,
      }: {
        provider: "google" | "github";
        options?: { redirectTo?: string };
      }): Promise<{ data: { url: string | null }; error: Error | null }> {
        const redirectTo =
          options?.redirectTo || (typeof window !== "undefined" ? `${window.location.origin}/auth/callback` : "/auth/callback");

        if (!supabaseUrl) {
          // Dev Mode Bypass: Set a deterministic session token and redirect to dashboard
          if (typeof document !== "undefined") {
            const devPayload = {
              sub: "00000000-0000-0000-0000-000000000001",
              email: `dev-${provider}@director.ai`,
              role: "authenticated",
              user_metadata: { name: `Dev ${provider.toUpperCase()} User` },
              exp: Math.floor(Date.now() / 1000) + 604800,
            };
            const b64 = btoa(JSON.stringify(devPayload));
            const mockJwt = `eyJhbGciOiJIUzI1NiJ9.${b64}.mocksignature`;
            setSessionCookies(mockJwt, "mock-refresh-token", 604800);
            window.location.href = "/dashboard";
          }
          return { data: { url: "/dashboard" }, error: null };
        }

        const authUrl = `${supabaseUrl}/auth/v1/authorize?provider=${provider}&redirect_to=${encodeURIComponent(
          redirectTo
        )}`;

        if (typeof window !== "undefined") {
          window.location.href = authUrl;
        }

        return { data: { url: authUrl }, error: null };
      },

      /**
       * Sign out user and clear session cookies
       */
      async signOut(): Promise<{ error: Error | null }> {
        try {
          await fetch("/api/auth/logout", { method: "POST" });
        } catch {
          // Best effort
        }
        clearSessionCookies();
        return { error: null };
      },
    },
  };
}

export function getCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(new RegExp(`(^|;\\s*)(${name})=([^;]*)`));
  return match ? decodeURIComponent(match[3]) : null;
}

export function setSessionCookies(accessToken: string, refreshToken?: string, expiresIn: number = 3600): void {
  if (typeof document === "undefined") return;
  // Access token cookie (expires in e.g. 1 hour)
  document.cookie = `sb-access-token=${encodeURIComponent(accessToken)}; path=/; max-age=${expiresIn}; SameSite=Lax`;
  
  // Refresh token cookie (persists for 30 days so user can auto-login)
  if (refreshToken) {
    document.cookie = `sb-refresh-token=${encodeURIComponent(refreshToken)}; path=/; max-age=${30 * 24 * 3600}; SameSite=Lax`;
  }
}

export function clearSessionCookies(): void {
  if (typeof document === "undefined") return;
  document.cookie = "sb-access-token=; path=/; max-age=0; SameSite=Lax";
  document.cookie = "sb-refresh-token=; path=/; max-age=0; SameSite=Lax";
  document.cookie = "director_dev_session=; path=/; max-age=0; SameSite=Lax";
}

function parseJwtPayload(token: string): SupabaseUser | null {
  try {
    const parts = token.split(".");
    if (parts.length === 3) {
      const payload = JSON.parse(atob(parts[1]));
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
      const payload = JSON.parse(atob(parts[1]));
      if (payload.exp) {
        // Buffer of 30 seconds
        return Date.now() / 1000 >= payload.exp - 30;
      }
    }
  } catch {
    return true;
  }
  return false;
}
