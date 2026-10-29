"use client";

/**
 * @file src/components/chat/OptionCard.tsx
 * @description Studio-Grade Interactive Option Card for "The Writer's Room".
 * Redesigned with high-contrast Zinc aesthetics, stark letter badges,
 * elevated typography hierarchy, and smooth hover elevation.
 */

import React, { memo } from "react";
import { ParsedOption } from "@/lib/utils/chatParser";
import { ArrowRight, RotateCcw } from "lucide-react";

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
  const isRecalibrate =
    option.id === "D" ||
    option.title.toLowerCase().includes("recalibrate") ||
    option.title.toLowerCase().includes("none of these");

  return (
    <button
      type="button"
      disabled={isLocked}
      onClick={() => onSelect(option)}
      className={`w-full text-left rounded-lg p-5 flex items-start transition-all duration-200 group ${
        isLocked
          ? "opacity-50 cursor-not-allowed bg-zinc-900/30 border border-zinc-800/80 text-zinc-500"
          : "bg-zinc-900/40 border border-zinc-700/50 cursor-pointer hover:bg-zinc-800/80 hover:border-zinc-500 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-black/20"
      }`}
    >
      {/* The Letter Badge (A/B/C/D) or Reload Icon for Recalibrate */}
      <div
        className={`flex items-center justify-center w-8 h-8 rounded font-bold text-sm mr-4 shrink-0 transition-colors shadow-sm ${
          isLocked
            ? "bg-zinc-800 text-zinc-500"
            : "bg-zinc-100 text-zinc-950 group-hover:bg-white"
        }`}
      >
        {isRecalibrate ? (
          <RotateCcw className="w-4 h-4 text-zinc-950" />
        ) : (
          option.id
        )}
      </div>

      {/* Typography Hierarchy: Title & Body */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <h4 className="text-zinc-100 font-semibold text-base tracking-tight group-hover:text-white transition-colors">
            {option.title}
          </h4>

          {/* Action Callout Indicator */}
          {!isLocked && (
            <div className="opacity-0 group-hover:opacity-100 transition-opacity text-zinc-400 group-hover:text-zinc-200 shrink-0">
              {isRecalibrate ? (
                <span className="text-[11px] font-mono tracking-wider uppercase text-zinc-400">
                  Rethink
                </span>
              ) : (
                <ArrowRight className="w-4 h-4 translate-x-0 group-hover:translate-x-0.5 transition-transform text-zinc-300" />
              )}
            </div>
          )}
        </div>

        {option.description && (
          <p className="text-zinc-400 text-sm mt-2 leading-relaxed group-hover:text-zinc-300 transition-colors">
            {option.description}
          </p>
        )}
      </div>
    </button>
  );
});

export default OptionCard;
