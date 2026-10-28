import React from "react";
import { Layers, ZoomIn, ZoomOut, Maximize2, Play } from "lucide-react";

/**
 * @file src/components/storyboard/CanvasSkeleton.tsx
 * @description Studio-Grade Skeleton component for the React Flow Pipeline Canvas.
 * Eliminates layout shift and prevents low-end mobile/desktop browsers from crashing
 * while the heavy React Flow and WebGL bundles load dynamically.
 */

export function CanvasSkeleton() {
  return (
    <div
      data-testid="canvas-skeleton"
      className="w-full h-full relative overflow-hidden bg-zinc-950 flex flex-col select-none"
    >
      {/* Background Dot Grid Matrix Simulation */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#27272a15_1px,transparent_1px),linear-gradient(to_bottom,#27272a15_1px,transparent_1px)] bg-[size:32px_32px] pointer-events-none" />

      {/* Top Floating Canvas Toolbar Skeleton */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2 p-1.5 rounded-md bg-zinc-900/90 border border-zinc-800 backdrop-blur-md shadow-xl animate-pulse">
        {/* View Mode Toggle Pill Skeleton */}
        <div className="flex items-center gap-1 bg-zinc-950 p-1 rounded border border-zinc-800">
          <div className="h-6 w-24 bg-zinc-800/80 rounded" />
          <div className="h-6 w-24 bg-zinc-800/50 rounded" />
        </div>

        <div className="w-px h-5 bg-zinc-800" />

        {/* Global Playback Button Skeleton */}
        <div className="h-7 w-28 bg-zinc-800/70 rounded" />

        <div className="w-px h-5 bg-zinc-800" />

        {/* FCPXML Export Button Skeleton */}
        <div className="h-7 w-32 bg-zinc-800/70 rounded" />
      </div>

      {/* Bottom-Left Controls Skeleton */}
      <div className="absolute bottom-6 left-6 z-20 flex flex-col gap-1.5 p-1 rounded-md bg-zinc-900/90 border border-zinc-800 shadow-lg animate-pulse">
        <div className="w-8 h-8 rounded bg-zinc-800/60" />
        <div className="w-8 h-8 rounded bg-zinc-800/60" />
        <div className="w-8 h-8 rounded bg-zinc-800/60" />
      </div>

      {/* Central Sequence Timeline Nodes Skeleton */}
      <div className="flex-1 flex items-center justify-start overflow-x-hidden px-16 relative">
        <div className="flex items-center gap-16 ml-12">
          {/* Skeleton Scene Node 1 */}
          <div className="w-72 min-h-[380px] bg-zinc-900 border border-zinc-800 rounded-md p-4 shadow-xl flex flex-col justify-between animate-pulse">
            <div>
              {/* Header */}
              <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 rounded bg-zinc-800" />
                  <div className="h-3 w-20 bg-zinc-800 rounded" />
                </div>
                <div className="h-4 w-14 bg-zinc-800/60 rounded" />
              </div>

              {/* Badges */}
              <div className="flex items-center gap-2 my-3">
                <div className="w-6 h-6 rounded-full bg-zinc-800" />
                <div className="w-6 h-6 rounded-full bg-zinc-800" />
              </div>

              {/* Video/Image Aspect Box */}
              <div className="aspect-[9/16] max-h-48 w-full bg-zinc-950 rounded border border-zinc-800/80 mb-3" />

              {/* Prompt bar */}
              <div className="space-y-1.5">
                <div className="h-2.5 w-full bg-zinc-800/50 rounded" />
                <div className="h-2.5 w-4/5 bg-zinc-800/40 rounded" />
              </div>
            </div>

            <div className="pt-3 border-t border-zinc-800 flex items-center justify-between">
              <div className="h-5 w-20 bg-zinc-800/60 rounded" />
              <div className="h-5 w-16 bg-zinc-800/60 rounded" />
            </div>
          </div>

          {/* Temporal Progression Link Indicator */}
          <div className="w-16 h-0.5 bg-zinc-800 relative flex items-center justify-center">
            <span className="w-2 h-2 rounded-full bg-zinc-700 animate-ping" />
          </div>

          {/* Skeleton Scene Node 2 */}
          <div className="w-72 min-h-[380px] bg-zinc-900 border border-zinc-800 rounded-md p-4 shadow-xl flex flex-col justify-between animate-pulse">
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 rounded bg-zinc-800" />
                  <div className="h-3 w-20 bg-zinc-800 rounded" />
                </div>
                <div className="h-4 w-14 bg-zinc-800/60 rounded" />
              </div>

              <div className="flex items-center gap-2 my-3">
                <div className="w-6 h-6 rounded-full bg-zinc-800" />
                <div className="w-6 h-6 rounded-full bg-zinc-800" />
              </div>

              <div className="aspect-[9/16] max-h-48 w-full bg-zinc-950 rounded border border-zinc-800/80 mb-3" />

              <div className="space-y-1.5">
                <div className="h-2.5 w-full bg-zinc-800/50 rounded" />
                <div className="h-2.5 w-3/4 bg-zinc-800/40 rounded" />
              </div>
            </div>

            <div className="pt-3 border-t border-zinc-800 flex items-center justify-between">
              <div className="h-5 w-20 bg-zinc-800/60 rounded" />
              <div className="h-5 w-16 bg-zinc-800/60 rounded" />
            </div>
          </div>

          {/* Temporal Progression Link Indicator */}
          <div className="w-16 h-0.5 bg-zinc-800 relative flex items-center justify-center">
            <span className="w-2 h-2 rounded-full bg-zinc-700" />
          </div>

          {/* Skeleton Scene Node 3 */}
          <div className="w-72 min-h-[380px] bg-zinc-900 border border-zinc-800/60 rounded-md p-4 shadow-xl flex flex-col justify-between opacity-60 animate-pulse">
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 rounded bg-zinc-800" />
                  <div className="h-3 w-20 bg-zinc-800 rounded" />
                </div>
                <div className="h-4 w-14 bg-zinc-800/60 rounded" />
              </div>
              <div className="flex items-center gap-2 my-3">
                <div className="w-6 h-6 rounded-full bg-zinc-800" />
                <div className="w-6 h-6 rounded-full bg-zinc-800" />
              </div>
              <div className="aspect-[9/16] max-h-48 w-full bg-zinc-950 rounded border border-zinc-800/80 mb-3" />
            </div>
            <div className="pt-3 border-t border-zinc-800 flex items-center justify-between">
              <div className="h-5 w-20 bg-zinc-800/60 rounded" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default CanvasSkeleton;
