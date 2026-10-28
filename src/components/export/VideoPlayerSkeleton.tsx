import React from "react";
import { Film } from "lucide-react";

/**
 * @file src/components/export/VideoPlayerSkeleton.tsx
 * @description Skeleton loader for the sequential video player in Stage 4 (Export).
 * Eliminates layout shift while the video decoding context initializes.
 */

export function VideoPlayerSkeleton() {
  return (
    <div
      data-testid="video-player-skeleton"
      className="flex-1 flex flex-col justify-between p-6 overflow-hidden border-b lg:border-b-0 lg:border-r border-zinc-800 bg-zinc-950 animate-pulse select-none"
    >
      {/* 9:16 Video Player Cinema Frame Skeleton */}
      <div className="flex-1 flex items-center justify-center relative min-h-0 py-2">
        <div className="relative aspect-[9/16] h-full max-h-[620px] w-full max-w-[350px] bg-zinc-900 rounded-md border border-zinc-800 shadow-2xl flex flex-col items-center justify-center p-4">
          <Film className="w-10 h-10 text-zinc-700 mb-2 stroke-[1.2]" />
          <div className="h-3 w-32 bg-zinc-800 rounded mb-1" />
          <div className="h-2 w-20 bg-zinc-800/60 rounded" />
        </div>
      </div>

      {/* Scrubber & Controls Bar Skeleton */}
      <div className="mt-4 p-3 bg-zinc-900 border border-zinc-800 rounded-md flex flex-col gap-3">
        {/* Timeline strip buttons */}
        <div className="flex items-center gap-1.5 overflow-hidden">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-9 w-24 bg-zinc-950 border border-zinc-800 rounded shrink-0" />
          ))}
        </div>

        {/* Buttons row */}
        <div className="flex items-center justify-between pt-1">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded bg-zinc-950 border border-zinc-800" />
            <div className="w-9 h-9 rounded bg-zinc-800" />
            <div className="w-8 h-8 rounded bg-zinc-950 border border-zinc-800" />
          </div>
          <div className="h-4 w-28 bg-zinc-800 rounded" />
          <div className="w-8 h-8 rounded bg-zinc-950 border border-zinc-800" />
        </div>
      </div>
    </div>
  );
}

export default VideoPlayerSkeleton;

