"use client";

/**
 * @file src/components/navigation/StageHeader.tsx
 * @description Studio-Grade Stage Stepper Navigation Header.
 * Unifies the 4-stage progressive disclosure pipeline:
 * 1. Writer's Room -> 2. Casting & Scouting -> 3. Auto-Wired Timeline -> 4. Playback & Export.
 * Adheres strictly to the monochromatic studio design system (zinc-950, zinc-900, border-zinc-800).
 */

import Link from "next/link";
import { 
  ArrowLeft, ArrowRight, Settings, Clapperboard, 
  Users, Film, Play, Sparkles, CheckCircle2 
} from "lucide-react";

export type PipelineStage = "writers_room" | "casting_scouting" | "timeline" | "export";

interface StageHeaderProps {
  projectId: string;
  projectTitle?: string;
  activeStage: PipelineStage;
  sceneCount?: number;
  characterCount?: number;
  locationCount?: number;
  onOpenSettings?: () => void;
  nextAction?: {
    label: string;
    href?: string;
    onClick?: () => void;
  };
}

const STAGES: { id: PipelineStage; label: string; short: string; icon: any; path: string }[] = [
  { id: "writers_room", label: "1. Writer's Room", short: "Script", icon: Clapperboard, path: "script" },
  { id: "casting_scouting", label: "2. Casting & Scouting", short: "Casting", icon: Users, path: "casting" },
  { id: "timeline", label: "3. Auto-Wired Timeline", short: "Timeline", icon: Film, path: "pipeline" },
  { id: "export", label: "4. Playback & Export", short: "Export", icon: Play, path: "export" },
];

export function StageHeader({
  projectId,
  projectTitle = "Untitled Sequence",
  activeStage,
  sceneCount = 0,
  characterCount = 0,
  locationCount = 0,
  onOpenSettings,
  nextAction,
}: StageHeaderProps) {
  const currentStageIndex = STAGES.findIndex((s) => s.id === activeStage);

  return (
    <header className="h-14 border-b border-zinc-800 bg-zinc-950 px-4 md:px-6 flex items-center justify-between shrink-0 sticky top-0 z-30 select-none">
      {/* Left: Back & Project Title */}
      <div className="flex items-center gap-3 shrink-0">
        <Link
          href="/dashboard"
          className="w-8 h-8 rounded-md border border-zinc-800 bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-100 flex items-center justify-center transition-colors"
          title="Back to Dashboard"
        >
          <ArrowLeft className="w-4 h-4" />
        </Link>

        <div className="h-4 w-px bg-zinc-800" />

        <div className="flex items-center gap-2">
          <span className="text-xs font-mono text-zinc-500 uppercase tracking-wider hidden sm:inline">
            Director AI
          </span>
          <span className="text-zinc-700 hidden sm:inline">/</span>
          <span className="text-sm font-semibold text-zinc-200 tracking-tight line-clamp-1 max-w-[140px] sm:max-w-xs">
            {projectTitle}
          </span>
        </div>
      </div>

      {/* Middle: 4-Stage Progressive Disclosure Stepper */}
      <nav className="hidden lg:flex items-center gap-1 bg-zinc-900/80 border border-zinc-800 rounded-md p-1">
        {STAGES.map((stage, idx) => {
          const Icon = stage.icon;
          const isActive = stage.id === activeStage;
          const isPassed = idx < currentStageIndex;

          return (
            <Link
              key={stage.id}
              href={`/project/${projectId}/${stage.path}`}
              className={`flex items-center gap-2 px-3 py-1.5 rounded text-xs font-mono transition-all ${
                isActive
                  ? "bg-zinc-100 text-zinc-950 font-semibold shadow-sm"
                  : isPassed
                  ? "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60"
                  : "text-zinc-600 hover:text-zinc-400 hover:bg-zinc-800/40"
              }`}
            >
              {isPassed ? (
                <CheckCircle2 className="w-3.5 h-3.5 text-zinc-400" />
              ) : (
                <Icon className="w-3.5 h-3.5" />
              )}
              <span>{stage.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Right: Stage Stats, Settings, & Primary Next Action */}
      <div className="flex items-center gap-2.5 shrink-0">
        {/* Quick Stage Stats */}
        {activeStage === "casting_scouting" && (characterCount > 0 || locationCount > 0) && (
          <span className="hidden md:inline-flex items-center gap-1.5 text-xs font-mono text-zinc-400 bg-zinc-900 border border-zinc-800 px-2.5 py-1 rounded">
            <span className="w-1.5 h-1.5 rounded-full bg-zinc-400" />
            {characterCount} Chars • {locationCount} Locs
          </span>
        )}

        {(activeStage === "timeline" || activeStage === "export") && sceneCount > 0 && (
          <span className="hidden md:inline-flex items-center gap-1.5 text-xs font-mono text-zinc-400 bg-zinc-900 border border-zinc-800 px-2.5 py-1 rounded">
            <span className="w-1.5 h-1.5 rounded-full bg-zinc-400" />
            {sceneCount} {sceneCount === 1 ? "Scene" : "Scenes"}
          </span>
        )}

        {onOpenSettings && (
          <button
            onClick={onOpenSettings}
            className="w-8 h-8 rounded-md border border-zinc-800 bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-100 flex items-center justify-center transition-colors"
            title="Project Settings"
          >
            <Settings className="w-4 h-4" />
          </button>
        )}

        {/* Primary High-Contrast Next Action Button */}
        {nextAction && (
          nextAction.href ? (
            <Link
              href={nextAction.href}
              className="h-8 px-3.5 rounded-md bg-zinc-100 text-zinc-950 hover:bg-white text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-sm"
            >
              <span>{nextAction.label}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          ) : (
            <button
              onClick={nextAction.onClick}
              className="h-8 px-3.5 rounded-md bg-zinc-100 text-zinc-950 hover:bg-white text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-sm"
            >
              <span>{nextAction.label}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )
        )}
      </div>
    </header>
  );
}

