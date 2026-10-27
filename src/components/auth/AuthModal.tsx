"use client";

import { useState } from "react";
import { Clapperboard, X, ArrowRight, Loader2, Mail, Lock, Terminal } from "lucide-react";
import { createBrowserClient } from "@/lib/supabase/client";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  title?: string;
  subtitle?: string;
}

export default function AuthModal({
  isOpen,
  onClose,
  onSuccess,
  title = "Authentication Required",
  subtitle = "Please sign in or create an account to initialize a new project sequence.",
}: AuthModalProps) {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);

  const supabase = createBrowserClient();
  const isSupabaseConfigured = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessNotice(null);

    if (!email.trim() || !password.trim()) {
      setErrorMsg("Please enter both email and password.");
      return;
    }

    try {
      setIsLoading(true);

      if (mode === "signin") {
        const { error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password: password.trim(),
        });

        if (error) {
          setErrorMsg(error.message);
          return;
        }

        onClose();
        onSuccess?.();
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
          onClose();
          onSuccess?.();
        } else {
          setSuccessNotice("Account created! Check your email to confirm registration or sign in.");
          setMode("signin");
        }
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Authentication failed");
    } finally {
      setIsLoading(false);
    }
  };

  const handleOAuth = async (provider: "google" | "github") => {
    try {
      setErrorMsg(null);
      setIsLoading(true);
      await supabase.auth.signInWithOAuth({ provider });
    } catch (err: any) {
      setErrorMsg(err.message || "OAuth failed");
      setIsLoading(false);
    }
  };

  const handleDevBypass = () => {
    if (typeof document !== "undefined") {
      document.cookie = `director_dev_session=00000000-0000-0000-0000-000000000001; path=/; max-age=604800`;
      onClose();
      onSuccess?.();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm select-none">
      <div 
        className="relative w-full max-w-sm rounded-md border border-zinc-800 bg-zinc-950 p-6 shadow-2xl transition-all"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 text-zinc-500 hover:text-zinc-200 transition-colors"
          title="Close"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Modal Brand Header */}
        <div className="mb-5 text-center">
          <div className="inline-flex items-center justify-center w-10 h-10 rounded-md bg-zinc-900 border border-zinc-800 text-zinc-100 mb-3">
            <Clapperboard className="w-5 h-5 stroke-[1.75]" />
          </div>
          <h2 className="text-base font-semibold text-zinc-100 tracking-tight">
            {title}
          </h2>
          <p className="text-xs text-zinc-400 mt-1">
            {subtitle}
          </p>
        </div>

        {/* Tab Switcher: Sign In vs Sign Up */}
        <div className="grid grid-cols-2 p-0.5 mb-5 rounded-md bg-zinc-900 border border-zinc-800">
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
            Create Account
          </button>
        </div>

        {/* Error / Notice Banners */}
        {errorMsg && (
          <div className="mb-4 p-2.5 rounded-md bg-red-950/40 border border-red-800/80 text-xs text-red-200">
            {errorMsg}
          </div>
        )}

        {successNotice && (
          <div className="mb-4 p-2.5 rounded-md bg-emerald-950/40 border border-emerald-800/80 text-xs text-emerald-200">
            {successNotice}
          </div>
        )}

        {/* Credentials Form */}
        <form onSubmit={handleSubmit} className="space-y-3">
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
                className="w-full h-9 pl-9 pr-3 rounded-md bg-zinc-900 border border-zinc-800 text-xs text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:border-zinc-600 transition-colors"
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
                className="w-full h-9 pl-9 pr-3 rounded-md bg-zinc-900 border border-zinc-800 text-xs text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:border-zinc-600 transition-colors"
              />
            </div>
          </div>

          {/* Primary Submit Button: Inverted High-Contrast */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full h-9 mt-1 rounded-md bg-zinc-100 text-zinc-950 hover:bg-white text-xs font-semibold flex items-center justify-center gap-2 transition-colors disabled:opacity-50 shadow-sm"
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <span>{mode === "signin" ? "Sign In & Create Project" : "Create Account & Proceed"}</span>
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
            <span className="bg-zinc-950 px-2 text-zinc-500">Or continue with</span>
          </div>
        </div>

        {/* Social OAuth Buttons */}
        <div className="grid grid-cols-2 gap-2">
          {/* Google */}
          <button
            type="button"
            onClick={() => handleOAuth("google")}
            disabled={isLoading}
            className="h-9 px-3 rounded-md border border-zinc-800 bg-zinc-900 hover:bg-zinc-800 text-zinc-200 text-xs font-medium flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
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
            <span>Google</span>
          </button>

          {/* GitHub */}
          <button
            type="button"
            onClick={() => handleOAuth("github")}
            disabled={isLoading}
            className="h-9 px-3 rounded-md border border-zinc-800 bg-zinc-900 hover:bg-zinc-800 text-zinc-200 text-xs font-medium flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
          >
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
              <path
                fillRule="evenodd"
                clipRule="evenodd"
                d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
              />
            </svg>
            <span>GitHub</span>
          </button>
        </div>

        {/* Local Developer Quick-Start Bypass */}
        {!isSupabaseConfigured && (
          <div className="mt-4 pt-3 border-t border-zinc-800/80">
            <button
              type="button"
              onClick={handleDevBypass}
              className="w-full py-1.5 px-2 rounded-md bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-[11px] text-zinc-400 hover:text-zinc-200 flex items-center justify-center gap-1.5 transition-colors"
            >
              <Terminal className="w-3 h-3 text-zinc-400" />
              <span>Use Local Sandbox Dev Session</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
