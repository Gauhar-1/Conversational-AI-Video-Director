"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createBrowserClient } from "@/lib/supabase/client";
import { Clapperboard, ArrowRight, Terminal, Mail, Lock, Loader2 } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loadingProvider, setLoadingProvider] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [noticeMsg, setNoticeMsg] = useState<string | null>(null);

  const supabase = createBrowserClient();
  const isSupabaseConfigured = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL);

  const handleCredentialsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setNoticeMsg(null);

    if (!email.trim() || !password.trim()) {
      setErrorMsg("Please enter both email and password.");
      return;
    }

    try {
      setLoadingProvider("credentials");
      if (mode === "signin") {
        const { error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password: password.trim(),
        });

        if (error) {
          setErrorMsg(error.message);
          return;
        }

        router.push("/dashboard");
      } else {
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password: password.trim(),
        });

        if (error) {
          setErrorMsg(error.message);
          return;
        }

        if (data.session) {
          router.push("/dashboard");
        } else {
          setNoticeMsg("Account created! Check your email to confirm registration or sign in.");
          setMode("signin");
        }
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Authentication failed");
    } finally {
      setLoadingProvider(null);
    }
  };

  const handleOAuthSignIn = async (provider: "google" | "github") => {
    try {
      setLoadingProvider(provider);
      setErrorMsg(null);
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: typeof window !== "undefined" ? `${window.location.origin}/dashboard` : "/dashboard",
        },
      });

      if (error) {
        setErrorMsg(error.message);
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Authentication failed");
    } finally {
      setLoadingProvider(null);
    }
  };

  const handleDevBypass = () => {
    if (typeof document !== "undefined") {
      document.cookie = `director_dev_session=00000000-0000-0000-0000-000000000001; path=/; max-age=604800`;
      window.location.href = "/dashboard";
    }
  };

  return (
    <div className="min-h-screen w-full bg-zinc-950 flex flex-col items-center justify-center p-4 select-none">
      {/* Subtle geometric grid background */}
      <div 
        className="absolute inset-0 bg-[linear-gradient(to_right,#27272a15_1px,transparent_1px),linear-gradient(to_bottom,#27272a15_1px,transparent_1px)] bg-[size:32px_32px] pointer-events-none" 
      />

      <div className="relative w-full max-w-sm z-10">
        {/* Brand Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-md bg-zinc-900 border border-zinc-800 text-zinc-100 mb-4 shadow-sm">
            <Clapperboard className="w-6 h-6 stroke-[1.75]" />
          </div>
          <h1 className="text-xl font-semibold tracking-tight text-zinc-100">
            Director AI
          </h1>
          <p className="text-xs text-zinc-400 mt-1 font-mono tracking-wide uppercase">
            Generative Video Orchestrator
          </p>
        </div>

        {/* Auth Card */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-md p-6 shadow-2xl backdrop-blur-md">
          <div className="mb-5">
            <h2 className="text-sm font-medium text-zinc-200">
              {mode === "signin" ? "Sign in to workspace" : "Create new studio account"}
            </h2>
            <p className="text-xs text-zinc-500 mt-0.5">
              Enter credentials or authenticate with OAuth.
            </p>
          </div>

          {/* Mode Switcher */}
          <div className="grid grid-cols-2 p-0.5 mb-5 rounded-md bg-zinc-950 border border-zinc-800">
            <button
              type="button"
              onClick={() => {
                setMode("signin");
                setErrorMsg(null);
              }}
              className={`py-1.5 text-xs font-medium rounded transition-colors ${
                mode === "signin"
                  ? "bg-zinc-800 text-zinc-100 shadow-sm"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => {
                setMode("signup");
                setErrorMsg(null);
              }}
              className={`py-1.5 text-xs font-medium rounded transition-colors ${
                mode === "signup"
                  ? "bg-zinc-800 text-zinc-100 shadow-sm"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              Sign Up
            </button>
          </div>

          {errorMsg && (
            <div className="mb-4 p-3 rounded-md bg-red-950/40 border border-red-800/80 text-xs text-red-200">
              {errorMsg}
            </div>
          )}

          {noticeMsg && (
            <div className="mb-4 p-3 rounded-md bg-emerald-950/40 border border-emerald-800/80 text-xs text-emerald-200">
              {noticeMsg}
            </div>
          )}

          {/* Email / Password Form */}
          <form onSubmit={handleCredentialsSubmit} className="space-y-3 mb-4">
            <div>
              <label className="block text-[11px] font-medium text-zinc-400 mb-1">
                Email Address
              </label>
              <div className="relative">
                <Mail className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="director@studio.ai"
                  className="w-full h-9 pl-9 pr-3 rounded-md bg-zinc-950 border border-zinc-800 text-xs text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:border-zinc-600 transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-medium text-zinc-400 mb-1">
                Password
              </label>
              <div className="relative">
                <Lock className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full h-9 pl-9 pr-3 rounded-md bg-zinc-950 border border-zinc-800 text-xs text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:border-zinc-600 transition-colors"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loadingProvider !== null}
              className="w-full h-9 rounded-md bg-zinc-100 text-zinc-950 hover:bg-white text-xs font-semibold flex items-center justify-center gap-2 transition-colors disabled:opacity-50 shadow-sm"
            >
              {loadingProvider === "credentials" ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <span>{mode === "signin" ? "Sign In" : "Create Account"}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="relative my-4">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-zinc-800" />
            </div>
            <div className="relative flex justify-center text-[10px] uppercase font-mono tracking-wider">
              <span className="bg-zinc-900 px-2 text-zinc-500">Or OAuth</span>
            </div>
          </div>

          <div className="space-y-2">
            {/* Google OAuth Button */}
            <button
              onClick={() => handleOAuthSignIn("google")}
              disabled={!!loadingProvider}
              className="w-full h-9 px-4 rounded-md border border-zinc-800 bg-zinc-950 hover:bg-zinc-800 text-zinc-200 text-xs font-medium flex items-center justify-center gap-2.5 transition-colors disabled:opacity-50"
            >
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24">
                <path
                  fill="currentColor"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="currentColor"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="currentColor"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="currentColor"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              <span>{loadingProvider === "google" ? "Redirecting..." : "Continue with Google"}</span>
            </button>

            {/* GitHub OAuth Button */}
            <button
              onClick={() => handleOAuthSignIn("github")}
              disabled={!!loadingProvider}
              className="w-full h-9 px-4 rounded-md border border-zinc-800 bg-zinc-950 hover:bg-zinc-800 text-zinc-200 text-xs font-medium flex items-center justify-center gap-2.5 transition-colors disabled:opacity-50"
            >
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
                <path
                  fillRule="evenodd"
                  clipRule="evenodd"
                  d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
                />
              </svg>
              <span>{loadingProvider === "github" ? "Redirecting..." : "Continue with GitHub"}</span>
            </button>
          </div>

          {/* Dev Quick Start Bypass */}
          {!isSupabaseConfigured && (
            <div className="mt-5 pt-4 border-t border-zinc-800/80">
              <div className="flex items-center gap-1.5 text-[11px] text-zinc-400 mb-2">
                <Terminal className="w-3.5 h-3.5 text-zinc-400" />
                <span>Local Sandbox / Dev Mode Active</span>
              </div>
              <button
                onClick={handleDevBypass}
                className="w-full h-8 px-3 rounded-md bg-zinc-100 text-zinc-950 hover:bg-white text-xs font-semibold flex items-center justify-center gap-2 transition-colors"
              >
                <span>Enter Developer Workspace</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          <div className="mt-5 text-center">
            <span className="text-[10px] text-zinc-500 uppercase tracking-widest font-mono">
              Deterministic CI/CD Generative Video
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
