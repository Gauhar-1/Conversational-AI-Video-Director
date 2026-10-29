"use client";

/**
 * @file src/components/chat/DirectorThinking.tsx
 * @description Premium pulsating loading state for "The Writer's Room".
 * Masks network and inference latency with studio-grade typography and pulsating status indicators.
 */

import React from "react";
import { Sparkles } from "lucide-react";

interface DirectorThinkingProps {
  statusText?: string;
  className?: string;
}

export function DirectorThinking({
  statusText = "Director is conceptualizing the narrative...",
  className = "",
}: DirectorThinkingProps) {
  return (
    <div
      data-testid="director-thinking"
      className={`bg-zinc-900 border border-zinc-800 rounded-md p-4 flex items-center gap-3 shadow-md my-4 animate-in fade-in duration-300 ${className}`}
    >
      {/* Pulsing Aura Indicator */}
      <div className="relative flex items-center justify-center w-5 h-5 shrink-0">
        <span className="absolute w-full h-full rounded-full bg-zinc-400/20 animate-ping" />
        <span className="relative w-2 h-2 rounded-full bg-zinc-200 shadow-sm" />
      </div>

      {/* Narrative Conceptualization Status */}
      <div className="flex-1 flex items-center justify-between">
        <span className="text-sm text-zinc-300 font-medium tracking-tight animate-pulse select-none">
          {statusText}
        </span>
        <Sparkles className="w-4 h-4 text-zinc-500 animate-pulse shrink-0 ml-2" />
      </div>
    </div>
  );
}

export default DirectorThinking;

