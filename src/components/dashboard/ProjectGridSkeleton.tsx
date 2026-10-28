import React from "react";

/**
 * @file src/components/dashboard/ProjectGridSkeleton.tsx
 * @description Studio-Grade Skeleton component matching exact ProjectCard dimensions.
 * Eliminates Cumulative Layout Shift (CLS) and hydration flicker on the /dashboard route.
 */

export function ProjectGridSkeleton() {
  return (
    <div
      data-testid="project-grid-skeleton"
      className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-4 gap-4"
    >
      {/* 8 pulsing placeholder cards perfectly matching ProjectCard aspect & spacing */}
      {Array.from({ length: 8 }).map((_, i) => (
        <div
          key={i}
          className="min-h-[190px] p-5 bg-zinc-900 border border-zinc-800/80 rounded-md flex flex-col justify-between shadow-md"
        >
          <div>
            {/* Top metadata row (stage badge + date) */}
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-zinc-700 animate-pulse" />
                <div className="h-3 w-24 bg-zinc-800/80 rounded animate-pulse" />
              </div>
              <div className="h-3 w-16 bg-zinc-800/60 rounded animate-pulse" />
            </div>

            {/* Title placeholder */}
            <div className="h-5 w-3/4 bg-zinc-800/80 rounded mb-2.5 animate-pulse" />

            {/* Metrics bar placeholder */}
            <div className="flex items-center gap-2 mt-2">
              <div className="h-3 w-14 bg-zinc-800/50 rounded animate-pulse" />
              <span className="text-zinc-700 text-xs">•</span>
              <div className="h-3 w-12 bg-zinc-800/50 rounded animate-pulse" />
              <span className="text-zinc-700 text-xs">•</span>
              <div className="h-3 w-16 bg-zinc-800/50 rounded animate-pulse" />
            </div>
          </div>

          {/* Bottom actions row */}
          <div className="mt-6 pt-4 border-t border-zinc-800/80 flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <div className="h-6 w-14 bg-zinc-800/60 rounded border border-zinc-800 animate-pulse" />
              <div className="h-6 w-14 bg-zinc-800/60 rounded border border-zinc-800 animate-pulse" />
            </div>
            <div className="h-7 w-16 bg-zinc-800/90 rounded border border-zinc-700 animate-pulse" />
          </div>
        </div>
      ))}
    </div>
  );
}

export default ProjectGridSkeleton;

