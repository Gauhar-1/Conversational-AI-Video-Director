"use client";

import { use, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, ArrowRight, Settings, Clapperboard, GitBranch, Loader2 } from "lucide-react";
import ChatInterface from "@/components/chat/ChatInterface";
import SettingsModal from "@/components/settings/SettingsModal";

export default function ScriptWorkspacePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Fetch project details for the header title & scene detection
  const { data: project, isLoading } = useQuery({
    queryKey: ["project", id],
    queryFn: async () => {
      const res = await fetch(`/api/projects/${id}`);
      if (!res.ok) {
        if (res.status === 404) router.push("/dashboard");
        throw new Error("Failed to fetch project");
      }
      return res.json();
    },
    enabled: !!id,
  });

  const handleProceedToPipeline = () => {
    router.push(`/project/${id}/pipeline`);
  };

  const sceneCount = project?.scenes?.length || project?.storyboard?.length || 0;

  return (
    <div className="flex flex-col h-screen w-full bg-zinc-950 text-zinc-100 select-none overflow-hidden">
      {/* Top Header Bar: strictly border-b border-zinc-800 */}
      <header className="h-14 border-b border-zinc-800 bg-zinc-950 px-4 md:px-6 flex items-center justify-between shrink-0 z-20">
        {/* Left: Back to Dashboard & Project Title */}
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard"
            className="w-8 h-8 rounded-md border border-zinc-800 bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-100 flex items-center justify-center transition-colors"
            title="Back to Dashboard"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>

          <div className="h-4 w-px bg-zinc-800" />

          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-zinc-500 uppercase tracking-wider">
              Writer&apos;s Room
            </span>
            <span className="text-zinc-600">/</span>
            <span className="text-sm font-semibold text-zinc-200 tracking-tight line-clamp-1 max-w-[200px] md:max-w-xs">
              {isLoading ? "Loading..." : project?.title || "Untitled Sequence"}
            </span>
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-3">
          {sceneCount > 0 && (
            <span className="hidden sm:inline-flex items-center gap-1.5 text-xs font-mono text-zinc-400 bg-zinc-900 border border-zinc-800 px-2.5 py-1 rounded">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              {sceneCount} {sceneCount === 1 ? "Scene" : "Scenes"} Generated
            </span>
          )}

          <button
            onClick={() => setIsSettingsOpen(true)}
            className="w-8 h-8 rounded-md border border-zinc-800 bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-100 flex items-center justify-center transition-colors"
            title="Settings"
          >
            <Settings className="w-4 h-4" />
          </button>

          {/* Primary Action: Lock Script & Proceed to Pipeline */}
          <button
            onClick={handleProceedToPipeline}
            className="h-8 px-3.5 rounded-md bg-zinc-100 text-zinc-950 hover:bg-white text-xs font-semibold flex items-center gap-2 transition-colors shadow-sm"
          >
            <GitBranch className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Lock Script &amp; Proceed to Pipeline</span>
            <span className="sm:hidden">Pipeline</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </header>

      {/* Writer's Room Workspace: Center-aligned chat (max-w-3xl) */}
      <main className="flex-1 flex justify-center overflow-hidden bg-zinc-950">
        <div className="w-full max-w-3xl h-full flex flex-col border-x border-zinc-800/80 bg-zinc-950 shadow-2xl">
          <ChatInterface
            activeProjectId={id}
            onStoryboardReady={() => {
              // Optionally notify user
            }}
          />
        </div>
      </main>

      {/* Settings Modal */}
      <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
    </div>
  );
}
