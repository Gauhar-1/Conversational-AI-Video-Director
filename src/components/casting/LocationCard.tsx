"use client";

/**
 * @file src/components/casting/LocationCard.tsx
 * @description E-Commerce style Location/Background Scouting Card.
 * Manages atmospheric background plate generation, lighting profile anchors, and approval.
 * Enhanced with large prompt textarea, Groq prompt enrichment, and paste support.
 * Strictly adheres to monochromatic zinc studio design.
 */

import React, { useState } from "react";
import { 
  Mountain, Sparkles, CheckCircle2, 
  Loader2, Edit3, Check, Trash2 
} from "lucide-react";
import type { LocationAsset } from "@/lib/validations/project";

interface LocationCardProps {
  location: LocationAsset;
  onGenerate: (location: LocationAsset, newPrompt?: string, lightingProfile?: string) => Promise<void>;
  onApprove: (assetId: string, approvedImageUrl: string) => Promise<void>;
  onDelete?: (assetId: string) => Promise<void>;
  isGenerating?: boolean;
}

export const LocationCard = React.memo(function LocationCard({
  location,
  onGenerate,
  onApprove,
  onDelete,
  isGenerating = false,
}: LocationCardProps) {
  const [isEditingPrompt, setIsEditingPrompt] = useState(false);
  const [editedPrompt, setEditedPrompt] = useState(location.environmentPrompt);
  const [editedLighting, setEditedLighting] = useState(location.lightingProfile || "Cinematic atmospheric lighting");
  const [selectedImageUrl, setSelectedImageUrl] = useState(location.imageUrl);
  const [isEnriching, setIsEnriching] = useState(false);

  const isApproved = location.status === "approved";
  const displayImage = selectedImageUrl || location.imageUrl;

  const handleEnrichPrompt = async () => {
    if (!editedPrompt.trim() || isEnriching) return;
    setIsEnriching(true);
    try {
      const groqKey = typeof window !== "undefined" ? localStorage.getItem("groq_api_key") : null;
      const res = await fetch("/api/enrich-prompt", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(groqKey ? { "X-Groq-Key": groqKey } : {}),
        },
        body: JSON.stringify({
          prompt: editedPrompt,
          type: "location",
        }),
      });

      if (!res.ok) throw new Error("Failed to enrich prompt");
      const data = await res.json();
      if (data.enrichedPrompt) {
        setEditedPrompt(data.enrichedPrompt);
      }
    } catch (err) {
      console.error("Enrich error:", err);
    } finally {
      setIsEnriching(false);
    }
  };

  const handleGenerate = async () => {
    await onGenerate(location, editedPrompt, editedLighting);
  };

  const handleApprove = async () => {
    if (!displayImage) return;
    await onApprove(location.assetId, displayImage);
  };

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-md overflow-hidden flex flex-col transition-all hover:border-zinc-700">
      {/* 16:9 Landscape Ratio Showcase */}
      <div className="relative aspect-video w-full bg-zinc-950 flex items-center justify-center overflow-hidden border-b border-zinc-800">
        {displayImage ? (
          <img
            src={displayImage}
            alt={location.name}
            className="w-full h-full object-cover transition-transform duration-300 hover:scale-105"
          />
        ) : (
          <div className="flex flex-col items-center justify-center text-zinc-600 gap-2 p-4 text-center">
            <Mountain className="w-12 h-12 stroke-[1.2] text-zinc-700" />
            <span className="text-xs font-mono">No Background Plate Generated</span>
          </div>
        )}

        {/* Loading Overlay */}
        {isGenerating && (
          <div className="absolute inset-0 bg-zinc-950/80 backdrop-blur-sm flex flex-col items-center justify-center gap-2 z-10">
            <Loader2 className="w-6 h-6 animate-spin text-zinc-100" />
            <span className="text-xs font-mono text-zinc-300">Rendering Matte Plate...</span>
          </div>
        )}

        {/* Top Badges */}
        <div className="absolute top-2 left-2 flex items-center gap-1.5 z-10">
          <span className="bg-zinc-950/90 backdrop-blur-md border border-zinc-800 text-[10px] font-mono px-2 py-0.5 rounded text-zinc-300">
            Environment
          </span>
          <span className="bg-zinc-950/90 backdrop-blur-md border border-zinc-800 text-[10px] font-mono px-2 py-0.5 rounded text-zinc-400">
            16:9 Plate
          </span>
        </div>

        {/* Status Badge */}
        <div className="absolute top-2 right-2 z-10">
          {isApproved ? (
            <span className="bg-zinc-100 text-zinc-950 text-[10px] font-semibold font-mono px-2 py-0.5 rounded flex items-center gap-1 shadow-sm">
              <CheckCircle2 className="w-3 h-3 text-zinc-950" />
              Approved
            </span>
          ) : (
            <span className="bg-zinc-950/80 backdrop-blur-md border border-zinc-800 text-[10px] font-mono px-2 py-0.5 rounded text-zinc-400">
              Draft
            </span>
          )}
        </div>
      </div>

      {/* Card Body */}
      <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
        <div>
          {/* Location Name & Delete */}
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-zinc-100 tracking-tight">
              {location.name}
            </h3>
            {onDelete && (
              <button
                onClick={() => onDelete(location.assetId)}
                className="text-zinc-500 hover:text-zinc-300 p-1 rounded transition-colors"
                title="Remove location"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Lighting Profile Tag */}
          <div className="mt-1 text-[11px] font-mono text-zinc-400 truncate">
            {location.lightingProfile || "Cinematic atmospheric lighting"}
          </div>

          {/* Prompt Editor: Large textarea with enrichment and paste support */}
          <div className="mt-2 text-xs">
            {isEditingPrompt ? (
              <div className="space-y-2">
                <textarea
                  value={editedPrompt}
                  onChange={(e) => setEditedPrompt(e.target.value)}
                  className="w-full min-h-[160px] p-4 text-sm leading-relaxed resize-y bg-zinc-900 border border-zinc-700 rounded-md text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-zinc-500 overflow-y-auto custom-scrollbar font-sans"
                  placeholder="Paste or write detailed environment prompt..."
                />
                
                {/* Enrichment Action Directly Below Textarea */}
                <div className="flex items-center justify-between gap-2 pt-1">
                  <button
                    type="button"
                    onClick={handleEnrichPrompt}
                    disabled={isEnriching || !editedPrompt.trim()}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 text-xs font-mono transition-colors disabled:opacity-50"
                  >
                    {isEnriching ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-zinc-300" />
                        <span>Enriching via Groq...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-3.5 h-3.5 text-zinc-300" />
                        <span>Enrich Prompt</span>
                      </>
                    )}
                  </button>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setIsEditingPrompt(false)}
                      className="px-2.5 py-1.5 bg-zinc-800 hover:bg-zinc-700 rounded text-xs text-zinc-300 transition-colors"
                    >
                      Done
                    </button>
                  </div>
                </div>

                <div className="pt-2">
                  <label className="block text-[11px] font-mono text-zinc-400 mb-1">
                    Lighting Profile
                  </label>
                  <input
                    type="text"
                    value={editedLighting}
                    onChange={(e) => setEditedLighting(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-700 rounded px-2.5 py-1.5 text-xs text-zinc-200 outline-none focus:border-zinc-500"
                    placeholder="Lighting profile..."
                  />
                </div>
              </div>
            ) : (
              <div
                onClick={() => setIsEditingPrompt(true)}
                className="group flex items-start gap-1.5 p-2.5 bg-zinc-950/60 border border-zinc-800/80 rounded cursor-pointer hover:border-zinc-700 transition-colors"
              >
                <p className="text-[11px] text-zinc-400 line-clamp-3 leading-relaxed flex-1">
                  {editedPrompt}
                </p>
                <Edit3 className="w-3.5 h-3.5 text-zinc-500 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 mt-0.5" />
              </div>
            )}
          </div>
        </div>

        {/* Variations History Strip */}
        {location.generationHistory && location.generationHistory.length > 1 && (
          <div>
            <span className="text-[10px] font-mono uppercase text-zinc-500 block mb-1">
              Plates ({location.generationHistory.length})
            </span>
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 custom-scrollbar">
              {location.generationHistory.map((hist) => (
                <button
                  key={hist.id}
                  onClick={() => setSelectedImageUrl(hist.url)}
                  className={`w-14 h-9 rounded border overflow-hidden shrink-0 transition-all ${
                    displayImage === hist.url
                      ? "border-zinc-100 ring-1 ring-zinc-100"
                      : "border-zinc-800 opacity-60 hover:opacity-100"
                  }`}
                >
                  <img src={hist.url} alt="Variant" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Action Controls */}
        <div className="pt-2 border-t border-zinc-800/80 flex items-center gap-2">
          <button
            onClick={handleGenerate}
            disabled={isGenerating}
            className="flex-1 h-8 rounded bg-zinc-800 hover:bg-zinc-700/80 border border-zinc-700 text-zinc-200 text-xs font-mono font-medium flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50"
          >
            <Sparkles className="w-3 h-3 text-zinc-400" />
            <span>{displayImage ? "Regenerate" : "Generate"}</span>
          </button>

          {displayImage && (
            <button
              onClick={handleApprove}
              disabled={isApproved}
              className={`h-8 px-3 rounded text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                isApproved
                  ? "bg-zinc-800 text-zinc-400 cursor-default border border-zinc-700"
                  : "bg-zinc-100 text-zinc-950 hover:bg-white shadow-sm"
              }`}
            >
              <Check className="w-3.5 h-3.5" />
              <span>{isApproved ? "Approved" : "Approve"}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
});
