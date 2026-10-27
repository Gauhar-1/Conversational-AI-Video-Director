"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Clapperboard, Settings, LogOut, Loader2, User, LogIn } from "lucide-react";
import { ProjectCard, CreateProjectCard, ProjectCardData } from "@/components/dashboard/ProjectCard";
import SettingsModal from "@/components/settings/SettingsModal";
import AuthModal from "@/components/auth/AuthModal";
import { createBrowserClient } from "@/lib/supabase/client";

export default function DashboardPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const supabase = createBrowserClient();

  // Query authentication status
  const { data: authData, refetch: refetchAuth } = useQuery({
    queryKey: ["authSession"],
    queryFn: async () => {
      const res = await fetch("/api/auth/session");
      if (!res.ok) return { authenticated: false, user: null };
      return res.json();
    },
  });

  const isAuthenticated = authData?.authenticated ?? false;
  const currentUser = authData?.user;

  // Fetch projects belonging to authenticated user
  const { data: projects = [], isLoading } = useQuery<ProjectCardData[]>({
    queryKey: ["userProjects"],
    queryFn: async () => {
      const res = await fetch("/api/projects");
      if (!res.ok) {
        if (res.status === 401) {
          return [];
        }
        throw new Error("Failed to load projects");
      }
      return res.json();
    },
    enabled: isAuthenticated,
  });

  // Create project mutation
  const createMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: `Project ${new Date().toLocaleDateString("en-US", { month: "short", day: "numeric" })} Sequence`,
        }),
      });
      if (!res.ok) {
        const errorJson = await res.json().catch(() => ({}));
        if (res.status === 401) {
          setIsAuthModalOpen(true);
          throw new Error("Authentication required");
        }
        throw new Error(errorJson.error || "Failed to create project");
      }
      return res.json();
    },
    onSuccess: (newProject) => {
      queryClient.invalidateQueries({ queryKey: ["userProjects"] });
      // Direct user into the isolated Writer's Room script interface
      router.push(`/project/${newProject._id}/script`);
    },
  });

  // Intercept click: gate behind Auth Modal if not authenticated
  const handleCreateProjectClick = () => {
    if (isAuthenticated) {
      createMutation.mutate();
    } else {
      setIsAuthModalOpen(true);
    }
  };

  const handleAuthSuccess = async () => {
    await refetchAuth();
    await queryClient.invalidateQueries({ queryKey: ["userProjects"] });
    // Automatically trigger creation now that user is logged in
    createMutation.mutate();
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    await refetchAuth();
    queryClient.setQueryData(["userProjects"], []);
  };

  return (
    <div className="h-screen w-full bg-zinc-950 text-zinc-100 flex flex-col select-none overflow-y-auto">
      {/* Top Navigation Bar: strictly border-b border-zinc-800 */}
      <header className="h-14 border-b border-zinc-800 bg-zinc-950 px-6 flex items-center justify-between shrink-0 sticky top-0 z-20">
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
                {currentUser?.email || "Authenticated"}
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

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-6 md:p-8">
        {/* Workspace Title Header */}
        <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-zinc-100">
              Production Projects
            </h1>
            <p className="text-xs text-zinc-400 mt-1">
              Select an existing sequence or initialize a new node-based generative pipeline.
            </p>
          </div>

          <div className="flex items-center gap-2 text-xs font-mono text-zinc-500 bg-zinc-900/60 border border-zinc-800 px-3 py-1.5 rounded-md self-start md:self-auto">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>State-Decoupled Engine Active</span>
          </div>
        </div>

        {/* Project Grid */}
        {isLoading && isAuthenticated ? (
          <div className="flex items-center justify-center min-h-[300px]">
            <Loader2 className="w-6 h-6 animate-spin text-zinc-500" />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-4 gap-4">
            {/* 1st Card: Create New Project (Gated by Auth Modal) */}
            <CreateProjectCard
              onClick={handleCreateProjectClick}
              isCreating={createMutation.isPending}
            />

            {/* Remaining Cards: User Projects from MongoDB */}
            {projects.map((project) => (
              <ProjectCard key={project._id} project={project} />
            ))}
          </div>
        )}
      </main>

      {/* Auth Gate Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onSuccess={handleAuthSuccess}
        title="Sign in to Initialize Project"
        subtitle="Authenticate to create your secure, isolated video production workspace."
      />

      {/* Global Settings Modal */}
      <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
    </div>
  );
}
