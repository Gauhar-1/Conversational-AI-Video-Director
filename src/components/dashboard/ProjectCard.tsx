"use client";

/**
 * @file src/components/dashboard/ProjectCard.tsx
 * @description Studio-Grade Project Card for /dashboard portfolio grid.
 * Displays stage indicators, scene/asset metrics, and quick navigation.
 */

import Link from "next/link";
import { Clapperboard, Calendar, ArrowUpRight, Film, FileText, Users, Play } from "lucide-react";

export interface ProjectCardData {
  _id: string;
  title: string;
  updatedAt: string;
  currentStage?: "writers_room" | "casting_scouting" | "timeline" | "export";
  sceneCount?: number;
  characterCount?: number;
  locationCount?: number;
}

const STAGE_LABELS: Record<string, string> = {
  writers_room: "1. Writer's Room",
  casting_scouting: "2. Casting & Scouting",
  timeline: "3. Timeline Composer",
  export: "4. Master Export",
};

export function ProjectCard({ project }: { project: ProjectCardData }) {
  const formattedDate = project.updatedAt
    ? new Date(project.updatedAt).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : "Recently";

  const stageLabel = project.currentStage
    ? STAGE_LABELS[project.currentStage] || "Active Sequence"
    : "Active Sequence";

  const targetHref = project.currentStage === "casting_scouting"
    ? `/project/${project._id}/casting`
    : project.currentStage === "timeline"
    ? `/project/${project._id}/pipeline`
    : project.currentStage === "export"
    ? `/project/${project._id}/export`
    : `/project/${project._id}/script`;

  return (
    <div className="group relative flex flex-col justify-between p-5 bg-zinc-900 border border-zinc-800 hover:border-zinc-700 rounded-md transition-all duration-200 shadow-md">
      <div>
        {/* Top metadata row */}
        <div className="flex items-center justify-between mb-3 text-zinc-500">
          <div className="flex items-center gap-1.5 text-[11px] font-mono text-zinc-400">
            <span className="w-1.5 h-1.5 rounded-full bg-zinc-400" />
            <span>{stageLabel}</span>
          </div>
          <div className="flex items-center gap-1 text-[11px] text-zinc-500 font-mono">
            <Calendar className="w-3 h-3" />
            <span>{formattedDate}</span>
          </div>
        </div>

        {/* Title */}
        <Link href={targetHref} className="block group-hover:text-white">
          <h3 className="text-base font-semibold text-zinc-100 tracking-tight line-clamp-1 mb-1.5">
            {project.title || "Untitled Sequence"}
          </h3>
        </Link>

        {/* Metrics Bar */}
        <div className="flex items-center gap-3 text-[11px] font-mono text-zinc-500 mt-2">
          <span>{project.sceneCount || 0} Scenes</span>
          <span>•</span>
          <span>{project.characterCount || 0} Cast</span>
          <span>•</span>
          <span>9:16 Vertical</span>
        </div>
      </div>

      {/* Action links */}
      <div className="mt-6 pt-4 border-t border-zinc-800/80 flex items-center justify-between gap-1.5">
        <div className="flex items-center gap-1">
          <Link
            href={`/project/${project._id}/script`}
            className="flex items-center gap-1 text-[11px] text-zinc-400 hover:text-zinc-100 px-2 py-1 rounded bg-zinc-950/60 border border-zinc-800/80 hover:border-zinc-700 transition-colors"
            title="Script"
          >
            <FileText className="w-3 h-3" />
            <span>Script</span>
          </Link>

          <Link
            href={`/project/${project._id}/casting`}
            className="flex items-center gap-1 text-[11px] text-zinc-400 hover:text-zinc-100 px-2 py-1 rounded bg-zinc-950/60 border border-zinc-800/80 hover:border-zinc-700 transition-colors"
            title="Casting & Scouting"
          >
            <Users className="w-3 h-3" />
            <span>Cast</span>
          </Link>
        </div>

        <Link
          href={targetHref}
          className="flex items-center gap-1 text-xs text-zinc-950 font-semibold px-3 py-1.5 rounded bg-zinc-100 hover:bg-white transition-colors shadow-sm"
        >
          <span>Open</span>
          <ArrowUpRight className="w-3.5 h-3.5" />
        </Link>
      </div>
    </div>
  );
}

export function CreateProjectCard({
  onClick,
  isCreating,
}: {
  onClick: () => void;
  isCreating: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={isCreating}
      className="group flex flex-col items-center justify-center min-h-[190px] p-6 rounded-md border border-dashed border-zinc-700 hover:border-zinc-500 bg-zinc-900/30 hover:bg-zinc-900/70 transition-all text-center disabled:opacity-50"
    >
      <div className="w-10 h-10 rounded-md bg-zinc-800 border border-zinc-700 flex items-center justify-center text-zinc-300 group-hover:text-white group-hover:bg-zinc-700 transition-colors mb-3">
        <span className="text-xl font-light leading-none">+</span>
      </div>
      <h3 className="text-sm font-medium text-zinc-200 group-hover:text-white">
        {isCreating ? "Initializing Pipeline..." : "Create New Project"}
      </h3>
      <p className="text-xs text-zinc-500 mt-1 font-mono">
        Stage 1: Writer&apos;s Room
      </p>
    </button>
  );
}
