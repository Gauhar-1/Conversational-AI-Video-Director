"use client";

/**
 * @file src/components/dashboard/DashboardHeader.tsx
 * @description Client-side navigation header for /dashboard with Auth & Settings controls.
 */

import { useState } from "react";
import { Clapperboard, Settings, LogOut, LogIn } from "lucide-react";
import SettingsModal from "@/components/settings/SettingsModal";
import AuthModal from "@/components/auth/AuthModal";
import { createBrowserClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

interface DashboardHeaderProps {
  initialAuth: {
    userId?: string;
    email?: string;
    isAuthenticated: boolean;
  };
}

export function DashboardHeader({ initialAuth }: DashboardHeaderProps) {
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState(initialAuth.isAuthenticated);
  const [userEmail, setUserEmail] = useState(initialAuth.email);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const supabase = createBrowserClient();

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setIsAuthenticated(false);
    setUserEmail(undefined);
    router.refresh();
  };

  const handleAuthSuccess = () => {
    setIsAuthenticated(true);
    router.refresh();
  };

  return (
    <>
      <header className="h-14 border-b border-zinc-800 bg-zinc-950 px-6 flex items-center justify-between shrink-0 sticky top-0 z-20 select-none">
        {/* Left: Brand */}
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-md bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-100">
            <Clapperboard className="w-4 h-4 stroke-[1.75]" />
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-semibold tracking-tight leading-none text-zinc-100">
              Director AI
            </span>
            <span className="text-[10px] text-zinc-500 font-mono tracking-wider uppercase mt-0.5">
              Workspace
            </span>
          </div>
        </div>

        {/* Right: Actions & User State */}
        <div className="flex items-center gap-2">
          {isAuthenticated ? (
            <div className="flex items-center gap-2">
              <span className="hidden sm:inline text-xs text-zinc-400 font-mono max-w-[180px] truncate">
                {userEmail || "Authenticated"}
              </span>
              <button
                onClick={handleSignOut}
                title="Sign Out"
                className="w-9 h-9 rounded-md border border-zinc-800 bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 flex items-center justify-center transition-colors"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => setIsAuthModalOpen(true)}
              className="h-8 px-3 rounded-md border border-zinc-800 bg-zinc-900 hover:bg-zinc-800 text-zinc-200 text-xs font-medium flex items-center gap-1.5 transition-colors"
            >
              <LogIn className="w-3.5 h-3.5 text-zinc-400" />
              <span>Sign In</span>
            </button>
          )}

          {/* Settings Trigger */}
          <button
            onClick={() => setIsSettingsOpen(true)}
            title="Configure API Keys"
            className="w-9 h-9 rounded-md border border-zinc-800 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white flex items-center justify-center transition-colors"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Auth Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onSuccess={handleAuthSuccess}
        title="Sign in to Workspace"
        subtitle="Authenticate to access your cloud production projects."
      />

      {/* Global Settings Modal */}
      <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
    </>
  );
}

export default DashboardHeader;
