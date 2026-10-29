"use client";

/**
 * @file src/components/chat/OptionCard.tsx
 * @description Studio-Grade Interactive Option Card for "The Writer's Room".
 * Renders multiple-choice pitches as distinct clickable buttons with action-locking during streaming.
 */

import React, { memo } from "react";
import { ParsedOption } from "@/lib/utils/chatParser";
import { Sparkles, ArrowRight, RotateCcw } from "lucide-react";

interface OptionCardProps {
  option: ParsedOption;
  isLocked: boolean;
  onSelect: (option: ParsedOption) => void;
}

export const OptionCard = memo(function OptionCard({
  option,
  isLocked,
  onSelect,
}: OptionCardProps) {
  const isRecalibrate = option.id === "D" || option.title.toLowerCase().includes("recalibrate");

  return (
    <button
      type="button"
      disabled={isLocked}
      onClick={() => onSelect(option)}
      className={`w-full text-left p-4 rounded-md border transition-all flex items-start gap-3.5 group ${
        isLocked
          ? "opacity-50 cursor-not-allowed border-zinc-800/60 bg-zinc-900/30 text-zinc-500"
          : isRecalibrate
          ? "border-zinc-800/80 bg-zinc-900/30 hover:bg-zinc-900/70 hover:border-zinc-700 text-zinc-300 hover:text-zinc-100 cursor-pointer shadow-sm"
          : "border-zinc-800 bg-zinc-900/50 hover:bg-zinc-800 hover:border-zinc-700 text-zinc-200 hover:text-zinc-100 cursor-pointer shadow-sm hover:shadow-md"
      }`}
    >
      {/* Option Key Badge */}
      <div
        className={`w-7 h-7 rounded-md shrink-0 flex items-center justify-center font-mono text-xs font-semibold border transition-colors ${
          isLocked
            ? "bg-zinc-900/40 border-zinc-800 text-zinc-500"
            : isRecalibrate
            ? "bg-zinc-900 border-zinc-700 text-zinc-400 group-hover:border-zinc-600 group-hover:text-zinc-200"
            : "bg-zinc-800 border-zinc-700 text-zinc-300 group-hover:bg-zinc-100 group-hover:border-zinc-100 group-hover:text-zinc-950"
        }`}
      >
        {isRecalibrate ? <RotateCcw className="w-3.5 h-3.5" /> : option.id}
      </div>

      {/* Title & Narrative Description */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <h4
            className={`font-medium tracking-tight text-sm leading-snug transition-colors ${
              isLocked
                ? "text-zinc-400"
                : isRecalibrate
                ? "text-zinc-300 group-hover:text-zinc-100"
                : "text-zinc-100 group-hover:text-white"
            }`}
          >
            {option.title}
          </h4>

          {/* Subtle Action Indicator */}
          {!isLocked && (
            <div className="opacity-0 group-hover:opacity-100 transition-opacity text-zinc-400 group-hover:text-zinc-200 shrink-0">
              {isRecalibrate ? (
                <span className="text-[11px] font-mono tracking-wider uppercase text-zinc-400">Rethink</span>
              ) : (
                <ArrowRight className="w-4 h-4 translate-x-0 group-hover:translate-x-0.5 transition-transform" />
              )}
            </div>
          )}
        </div>

        {option.description && (
          <p
            className={`text-sm mt-1 leading-relaxed ${
              isLocked ? "text-zinc-500" : "text-zinc-400 group-hover:text-zinc-300"
            }`}
          >
            {option.description}
          </p>
        )}
      </div>
    </button>
  );
});

export default OptionCard;

