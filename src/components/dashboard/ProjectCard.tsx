"use client";

import Link from "next/link";
import { Clapperboard, Calendar, ArrowUpRight, Film, FileText } from "lucide-react";

export interface ProjectCardData {
  _id: string;
  title: string;
  updatedAt: string;
  scenesCount?: number;
}

export function ProjectCard({ project }: { project: ProjectCardData }) {
  const formattedDate = project.updatedAt
    ? new Date(project.updatedAt).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : "Recently";

  return (
    <div className="group relative flex flex-col justify-between p-5 bg-zinc-900 border border-zinc-800 hover:border-zinc-700 rounded-md transition-all duration-200">
      <div>
        {/* Top metadata row */}
        <div className="flex items-center justify-between mb-3 text-zinc-500">
          <div className="flex items-center gap-1.5 text-xs font-mono">
            <Film className="w-3.5 h-3.5 text-zinc-400" />
            <span>9:16 Vertical</span>
          </div>
          <div className="flex items-center gap-1 text-[11px]">
            <Calendar className="w-3 h-3" />
            <span>{formattedDate}</span>
          </div>
        </div>

        {/* Title */}
        <Link href={`/project/${project._id}/script`} className="block group-hover:text-white">
          <h3 className="text-base font-semibold text-zinc-100 tracking-tight line-clamp-1 mb-2">
            {project.title || "Untitled Sequence"}
          </h3>
        </Link>
        <p className="text-xs text-zinc-400 line-clamp-2">
          Node-based generative pipeline with state-decoupled continuity vault.
        </p>
      </div>

      {/* Action links */}
      <div className="mt-6 pt-4 border-t border-zinc-800/80 flex items-center justify-between gap-2">
        <Link
          href={`/project/${project._id}/script`}
          className="flex items-center gap-1.5 text-xs text-zinc-300 hover:text-white font-medium px-2.5 py-1.5 rounded bg-zinc-950/60 border border-zinc-800 hover:border-zinc-700 transition-colors"
        >
          <FileText className="w-3.5 h-3.5 text-zinc-400" />
          <span>Script</span>
        </Link>

        <Link
          href={`/project/${project._id}/pipeline`}
          className="flex items-center gap-1 text-xs text-zinc-950 font-semibold px-3 py-1.5 rounded bg-zinc-100 hover:bg-white transition-colors"
        >
          <span>Pipeline</span>
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
      <p className="text-xs text-zinc-500 mt-1">
        Start with the Writer&apos;s Room chat interface
      </p>
    </button>
  );
}
