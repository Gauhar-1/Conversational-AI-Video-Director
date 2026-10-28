"use client";

/**
 * @file src/app/project/[id]/pipeline/page.tsx
 * @description Stage 3: The Auto-Wired Timeline workspace.
 * Renders a strict horizontal, non-branching timeline of SceneMacroNodes on React Flow.
 * Chat interface disappears completely.
 * Enhanced with StageHeader and Takes variation management.
 */

import { use, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  FileText, Settings, Layers, 
  ArrowRight, Sparkles, Loader2, GitCommit, Film 
} from "lucide-react";
import { StageHeader } from "@/components/navigation/StageHeader";
import StoryboardCanvas from "@/components/storyboard/StoryboardGrid";
import SettingsModal from "@/components/settings/SettingsModal";

export default function PipelineWorkspacePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const queryClient = useQueryClient();
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Fetch project details for header & scene detection
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

  // Mutation to commit initial stage directly if user prefers not drafting first
  const commitStageMutation = useMutation({
    mutationFn: async () => {
      const initialScene = {
        sceneId: "scene-1",
        order: 1,
        duration: 10,
        cameraAngle: "CAM_A_CENTER",
        rawDelta: "Cinematic wide master composition introducing the protagonist and setting",
        imagePrompt: "[CAM_A_CENTER]: 9:16 cinematic master shot introducing the protagonist with dramatic volumetric lighting",
        motionPrompt: "Locked static center tracking shot with stable vertical composition",
        status: "ready" as const,
        takes: [],
      };

      const res = await fetch(`/api/projects/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scenes: [initialScene] }),
      });

      if (!res.ok) {
        const errorJson = await res.json().catch(() => ({}));
        throw new Error(errorJson.error || "Failed to commit initial stage");
      }

      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["project", id] });
      queryClient.invalidateQueries({ queryKey: ["storyboardData", id] });
    },
  });

  const scenesCount = project?.scenes?.length || 0;
  const isPipelineEmpty = !isLoading && scenesCount === 0;

  return (
    <div className="flex flex-col h-screen w-screen bg-zinc-950 text-zinc-100 select-none overflow-hidden">
      {/* Studio Stage Stepper Navigation Header */}
      <StageHeader
        projectId={id}
        projectTitle={isLoading ? "Loading..." : project?.title || "Untitled Sequence"}
        activeStage="timeline"
        sceneCount={scenesCount}
        onOpenSettings={() => setIsSettingsOpen(true)}
        nextAction={{
          label: "Export & Master",
          href: `/project/${id}/export`,
        }}
      />

      {/* Main Area: Render Canvas or Uninitialized Stage Gate */}
      <main className="flex-1 w-full h-[calc(100vh-3.5rem)] relative overflow-hidden bg-zinc-950">
        {isLoading ? (
          <div className="w-full h-full flex items-center justify-center text-zinc-500 font-mono text-xs">
            <Loader2 className="w-6 h-6 animate-spin text-zinc-500 mb-2" />
          </div>
        ) : isPipelineEmpty ? (
          /* Empty / Uninitialized Stage Gate Page */
          <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center select-none relative">
            <div className="absolute inset-0 bg-[linear-gradient(to_right,#27272a15_1px,transparent_1px),linear-gradient(to_bottom,#27272a15_1px,transparent_1px)] bg-[size:32px_32px] pointer-events-none" />

            <div className="relative z-10 max-w-md w-full p-8 rounded-md bg-zinc-900 border border-zinc-800 shadow-2xl backdrop-blur-md">
              <div className="w-12 h-12 mx-auto mb-4 rounded-md bg-zinc-950 border border-zinc-800 flex items-center justify-center text-zinc-300 shadow-inner">
                <Layers className="w-6 h-6 stroke-[1.75]" />
              </div>

              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-zinc-950 border border-zinc-800 text-[10px] font-mono uppercase tracking-wider text-zinc-400 mb-3">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500/80" />
                <span>Timeline Uninitialized</span>
              </div>

              <h2 className="text-lg font-semibold text-zinc-100 tracking-tight mb-2">
                Timeline Has No Scenes
              </h2>

              <p className="text-xs text-zinc-400 leading-relaxed mb-6">
                Direct your screenplay in the Writer&apos;s Room or commit a starter sequence stage below.
              </p>

              <div className="space-y-2.5">
                {/* Primary Action: Go to Writer's Room */}
                <Link
                  href={`/project/${id}/script`}
                  className="w-full h-9 rounded-md bg-zinc-100 text-zinc-950 hover:bg-white text-xs font-semibold flex items-center justify-center gap-2 transition-colors shadow-sm"
                >
                  <FileText className="w-3.5 h-3.5 text-zinc-950" />
                  <span>Go to Writer&apos;s Room (Draft Script)</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>

                {/* Secondary Action: Commit Stage */}
                <button
                  type="button"
                  onClick={() => commitStageMutation.mutate()}
                  disabled={commitStageMutation.isPending}
                  className="w-full h-9 rounded-md bg-zinc-950 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 hover:text-zinc-100 text-xs font-medium flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
                >
                  {commitStageMutation.isPending ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-zinc-400" />
                  ) : (
                    <GitCommit className="w-3.5 h-3.5 text-zinc-400" />
                  )}
                  <span>Commit Starter Stage (Scene 1)</span>
                </button>
              </div>

              <div className="mt-6 pt-4 border-t border-zinc-800/80 text-[11px] text-zinc-500 font-mono">
                <span>Deterministic Node-Based Generative Video</span>
              </div>
            </div>
          </div>
        ) : (
          /* Active Node Canvas */
          <StoryboardCanvas activeProjectId={id} isExpanded={true} />
        )}
      </main>

      {/* Settings Modal */}
      <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
    </div>
  );
}
