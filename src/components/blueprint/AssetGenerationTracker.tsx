"use client";

/**
 * @file src/components/blueprint/AssetGenerationTracker.tsx
 * @description Studio-Grade UI tracker for the Background Fan-Out Asset Generation stage.
 * Consumes useProjectAssetGeneration and renders live checklists as Inngest workers save technical prompts.
 */

import React from "react";
import { useProjectAssetGeneration } from "@/hooks/useProjectAssetGeneration";
import { Check, Loader2, Sparkles, User, MapPin, Clapperboard, ArrowRight } from "lucide-react";
import Link from "next/link";

interface AssetGenerationTrackerProps {
  projectId: string;
  onAllCompleted?: () => void;
}

export function AssetGenerationTracker({
  projectId,
  onAllCompleted,
}: AssetGenerationTrackerProps) {
  const {
    characters,
    environments,
    scenes,
    completedCount,
    totalCount,
    progressPercentage,
    isAllComplete,
    isLoading,
    error,
  } = useProjectAssetGeneration(projectId);

  // Trigger optional completion callback when all assets are locked
  React.useEffect(() => {
    if (isAllComplete && onAllCompleted) {
      onAllCompleted();
    }
  }, [isAllComplete, onAllCompleted]);

  return (
    <div className="w-full max-w-2xl mx-auto p-6 bg-zinc-950 text-zinc-100">
      {/* Header with Title and Progress */}
      <div className="border border-zinc-800 bg-zinc-900/60 rounded-md p-6 mb-6 shadow-2xl">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-md bg-zinc-800 border border-zinc-700/60 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-zinc-200" />
            </div>
            <div>
              <h2 className="text-base font-semibold tracking-tight text-zinc-100">
                Orchestrating Technical Prompts
              </h2>
              <p className="text-xs text-zinc-400">
                Rate-limited Inngest workers synthesizing Replicate Flux camera directives
              </p>
            </div>
          </div>
          <div className="text-right">
            <span className="text-sm font-mono font-semibold text-zinc-100">
              {progressPercentage}%
            </span>
            <p className="text-xs text-zinc-500 font-mono">
              {completedCount} / {totalCount} Locked
            </p>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="w-full h-1.5 bg-zinc-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-zinc-100 transition-all duration-500 ease-out"
            style={{ width: `${progressPercentage}%` }}
          />
        </div>
      </div>

      {/* Error state if any */}
      {error && (
        <div className="p-4 mb-4 rounded-md border border-red-900/50 bg-red-950/20 text-red-400 text-xs font-mono">
          Failed to monitor asset generation progress: {error.message}
        </div>
      )}

      {/* Checklist Sections */}
      <div className="space-y-6">
        {/* 1. Character Assets */}
        {characters.length > 0 && (
          <div className="border border-zinc-800/80 bg-zinc-900/40 rounded-md p-4">
            <div className="flex items-center gap-2 mb-3 text-xs font-semibold uppercase tracking-wider text-zinc-400">
              <User className="w-3.5 h-3.5 text-zinc-500" />
              <span>Characters ({characters.filter((c) => c.isLocked).length}/{characters.length})</span>
            </div>
            <div className="space-y-2">
              {characters.map((char) => (
                <div
                  key={char.id}
                  className={`flex items-center justify-between p-3 rounded-md border text-sm transition-all duration-300 ${
                    char.isLocked
                      ? "bg-zinc-900/80 border-zinc-700/80 text-zinc-100"
                      : "bg-zinc-950/50 border-zinc-800/60 text-zinc-400"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-5 h-5 rounded flex items-center justify-center shrink-0 ${
                        char.isLocked
                          ? "bg-zinc-100 text-zinc-950"
                          : "bg-zinc-800 text-zinc-500"
                      }`}
                    >
                      {char.isLocked ? (
                        <Check className="w-3 h-3 stroke-[3]" />
                      ) : (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      )}
                    </div>
                    <div>
                      <span className="font-medium text-zinc-200">{char.name}</span>
                      <span className="text-xs text-zinc-500 ml-2">({char.details})</span>
                    </div>
                  </div>
                  <span
                    className={`text-xs font-mono uppercase px-2 py-0.5 rounded border ${
                      char.isLocked
                        ? "border-zinc-700 bg-zinc-800 text-zinc-300"
                        : "border-zinc-800 text-zinc-500 animate-pulse"
                    }`}
                  >
                    {char.isLocked ? "Ready for Render" : "Generating Flux Prompt..."}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 2. Environment Assets */}
        {environments.length > 0 && (
          <div className="border border-zinc-800/80 bg-zinc-900/40 rounded-md p-4">
            <div className="flex items-center gap-2 mb-3 text-xs font-semibold uppercase tracking-wider text-zinc-400">
              <MapPin className="w-3.5 h-3.5 text-zinc-500" />
              <span>Environments ({environments.filter((e) => e.isLocked).length}/{environments.length})</span>
            </div>
            <div className="space-y-2">
              {environments.map((env) => (
                <div
                  key={env.id}
                  className={`flex items-center justify-between p-3 rounded-md border text-sm transition-all duration-300 ${
                    env.isLocked
                      ? "bg-zinc-900/80 border-zinc-700/80 text-zinc-100"
                      : "bg-zinc-950/50 border-zinc-800/60 text-zinc-400"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-5 h-5 rounded flex items-center justify-center shrink-0 ${
                        env.isLocked
                          ? "bg-zinc-100 text-zinc-950"
                          : "bg-zinc-800 text-zinc-500"
                      }`}
                    >
                      {env.isLocked ? (
                        <Check className="w-3 h-3 stroke-[3]" />
                      ) : (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      )}
                    </div>
                    <div>
                      <span className="font-medium text-zinc-200">{env.name}</span>
                      <span className="text-xs text-zinc-500 ml-2">({env.details})</span>
                    </div>
                  </div>
                  <span
                    className={`text-xs font-mono uppercase px-2 py-0.5 rounded border ${
                      env.isLocked
                        ? "border-zinc-700 bg-zinc-800 text-zinc-300"
                        : "border-zinc-800 text-zinc-500 animate-pulse"
                    }`}
                  >
                    {env.isLocked ? "Ready for Render" : "Synthesizing Architecture..."}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 3. Scenes / Storyboard Takes */}
        {scenes.length > 0 && (
          <div className="border border-zinc-800/80 bg-zinc-900/40 rounded-md p-4">
            <div className="flex items-center gap-2 mb-3 text-xs font-semibold uppercase tracking-wider text-zinc-400">
              <Clapperboard className="w-3.5 h-3.5 text-zinc-500" />
              <span>Scenes & Motion Directives ({scenes.filter((s) => s.isLocked).length}/{scenes.length})</span>
            </div>
            <div className="space-y-2">
              {scenes.map((scene) => (
                <div
                  key={scene.id}
                  className={`flex items-center justify-between p-3 rounded-md border text-sm transition-all duration-300 ${
                    scene.isLocked
                      ? "bg-zinc-900/80 border-zinc-700/80 text-zinc-100"
                      : "bg-zinc-950/50 border-zinc-800/60 text-zinc-400"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-5 h-5 rounded flex items-center justify-center shrink-0 ${
                        scene.isLocked
                          ? "bg-zinc-100 text-zinc-950"
                          : "bg-zinc-800 text-zinc-500"
                      }`}
                    >
                      {scene.isLocked ? (
                        <Check className="w-3 h-3 stroke-[3]" />
                      ) : (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      )}
                    </div>
                    <div>
                      <span className="font-medium text-zinc-200">{scene.name}</span>
                      <span className="text-xs text-zinc-500 ml-2 font-mono">
                        [{scene.details}]
                      </span>
                    </div>
                  </div>
                  <span
                    className={`text-xs font-mono uppercase px-2 py-0.5 rounded border ${
                      scene.isLocked
                        ? "border-zinc-700 bg-zinc-800 text-zinc-300"
                        : "border-zinc-800 text-zinc-500 animate-pulse"
                    }`}
                  >
                    {scene.isLocked ? "Ready for Render" : "Computing Camera Angle..."}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Completion CTA Action */}
      {isAllComplete && (
        <div className="mt-6 p-4 rounded-md border border-zinc-700 bg-zinc-900 flex items-center justify-between animate-in fade-in duration-300">
          <div>
            <h4 className="text-sm font-semibold text-zinc-100">
              All Technical Prompts Locked
            </h4>
            <p className="text-xs text-zinc-400">
              Characters, environments, and scene directives are ready for timeline rendering.
            </p>
          </div>
          <Link
            href={`/project/${projectId}/pipeline`}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-zinc-100 text-zinc-950 font-medium text-sm hover:bg-white transition-all shadow-md"
          >
            <span>Enter Pipeline</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      )}
    </div>
  );
}

export default AssetGenerationTracker;
