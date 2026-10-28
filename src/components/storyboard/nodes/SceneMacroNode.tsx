"use client";

/**
 * @file src/components/storyboard/nodes/SceneMacroNode.tsx
 * @description Studio-Grade SceneMacroNode component for the Auto-Wired Timeline.
 * Strict non-branching horizontal timeline card displaying implicitly wired Character
 * and Location avatar badges, active take video preview, and take variations selector.
 * Fully optimized with React.memo() and monochromatic zinc design tokens.
 */

import { memo, useState, useEffect, useOptimistic, useTransition } from "react";
import { Handle, Position, NodeProps } from "@xyflow/react";
import { CameraAngle, ISceneDoc, IGlobalAssetsDoc, ITakeDoc } from "@/models/Project";
import { 
  Film, Sparkles, Loader2, Play, ChevronDown, CheckCircle2, 
  User, Mountain, Image as ImageIcon, SlidersHorizontal, Layers 
} from "lucide-react";
import { IGlobalVault } from "@/models/Project";

const ANGLE_LABELS: Record<CameraAngle, { short: string; full: string; badge: string }> = {
  CAM_A_CENTER: { short: "CAM A", full: "Wide Center", badge: "bg-zinc-800 text-zinc-200 border-zinc-700" },
  CAM_B_45_CLOSE: { short: "CAM B", full: "45° Close", badge: "bg-zinc-800 text-zinc-200 border-zinc-700" },
  CAM_C_OTS: { short: "CAM C", full: "Over Shoulder", badge: "bg-zinc-800 text-zinc-200 border-zinc-700" },
  CLOSE_UP: { short: "CU", full: "Close Up", badge: "bg-zinc-800 text-zinc-200 border-zinc-700" },
  MEDIUM_SHOT: { short: "MED", full: "Medium Shot", badge: "bg-zinc-800 text-zinc-200 border-zinc-700" },
  WIDE_SHOT: { short: "WIDE", full: "Wide Shot", badge: "bg-zinc-800 text-zinc-200 border-zinc-700" },
  EXTREME_CLOSE_UP: { short: "ECU", full: "Extreme Close Up", badge: "bg-zinc-800 text-zinc-200 border-zinc-700" },
  ESTABLISHING: { short: "EST", full: "Establishing", badge: "bg-zinc-800 text-zinc-200 border-zinc-700" },
};

export const SceneMacroNode = memo(({ data, selected }: NodeProps) => {
  const {
    scene,
    storyboardItem,
    globalVault,
    globalAssets,
    onSelect,
    onUpdateAngle,
    onEnrichDelta,
    onSelectTake,
    isEnriching = false,
  } = data as {
    scene: ISceneDoc;
    storyboardItem?: any;
    globalVault?: IGlobalVault;
    globalAssets?: IGlobalAssetsDoc;
    onSelect?: (scene: ISceneDoc) => void;
    onUpdateAngle?: (sceneId: string, angle: CameraAngle) => void;
    onEnrichDelta?: (sceneId: string, rawDelta: string, angle: CameraAngle) => void;
    onSelectTake?: (sceneId: string, takeId: string) => void;
    isEnriching?: boolean;
  };

  // Find implicitly wired characters & locations from global_assets or legacy globalVault
  const wiredCharacters = (globalAssets?.characters || []).filter(
    (c) => !scene.characterIds || scene.characterIds.length === 0 || scene.characterIds.includes(c.assetId)
  );

  const wiredLocation = (globalAssets?.locations || []).find(
    (l) => scene.locationId === l.assetId
  ) || globalAssets?.locations?.[0];

  const primaryChar = wiredCharacters[0];
  const charUrl = primaryChar?.imageUrl || storyboardItem?.characters?.[0]?.generated_url || globalVault?.characterAnchor?.imageUrl;
  const bgUrl = wiredLocation?.imageUrl || storyboardItem?.background_url || globalVault?.environmentAnchor?.imageUrl;

  const [deltaInput, setDeltaInput] = useState(scene.rawDelta || "");
  const [currentAngle, setCurrentAngle] = useState<CameraAngle>(scene.cameraAngle || "CAM_A_CENTER");
  const [isPlaying, setIsPlaying] = useState(false);

  const takes = scene.takes || [];
  const activeTake = takes.find((t) => t.takeId === scene.activeTakeId) || takes[0];
  const activeVideoUrl = scene.videoUrl || activeTake?.videoUrl || "";

  useEffect(() => {
    setDeltaInput(scene.rawDelta || "");
  }, [scene.rawDelta]);

  useEffect(() => {
    setCurrentAngle(scene.cameraAngle || "CAM_A_CENTER");
  }, [scene.cameraAngle]);

  const [isPending, startTransition] = useTransition();
  const [optimisticAngle, setOptimisticAngle] = useOptimistic(
    currentAngle,
    (_curr, next: CameraAngle) => next
  );

  const handleAngleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    e.stopPropagation();
    const newAngle = e.target.value as CameraAngle;
    setCurrentAngle(newAngle);
    startTransition(() => {
      setOptimisticAngle(newAngle);
      if (onUpdateAngle) {
        onUpdateAngle(scene.sceneId, newAngle);
      }
    });
  };

  const handleEnrichClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onEnrichDelta) {
      onEnrichDelta(scene.sceneId, deltaInput, optimisticAngle);
    }
  };

  const angleConfig = ANGLE_LABELS[optimisticAngle] || ANGLE_LABELS.CAM_A_CENTER;
  const isGenerating = scene.status === "generating";
  const isEnrichingState = isEnriching || scene.status === "enriching";

  return (
    <div
      onClick={() => onSelect && onSelect(scene)}
      className={`w-72 bg-zinc-900 border rounded-md shadow-xl overflow-hidden transition-colors duration-150 cursor-pointer ${
        selected
          ? "border-zinc-300 ring-1 ring-zinc-400"
          : "border-zinc-800 hover:border-zinc-700"
      }`}
    >
      {/* Node Temporal Flow Handles: Strict horizontal timeline */}
      <Handle
        type="target"
        position={Position.Left}
        id="left"
        className="w-3 h-3 bg-zinc-400 border border-zinc-950 -left-[6px] rounded-sm"
      />
      <Handle
        type="source"
        position={Position.Right}
        id="right"
        className="w-3 h-3 bg-zinc-100 border border-zinc-950 -right-[6px] rounded-sm"
      />

      {/* --- HEADER --- */}
      <div className="p-3 bg-zinc-950 border-b border-zinc-800 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-mono font-semibold bg-zinc-900 text-zinc-100 px-2 py-0.5 rounded border border-zinc-800">
            SCENE {String(scene.order).padStart(2, "0")}
          </span>
          <span className="text-[10px] font-mono text-zinc-500">{scene.duration || 10}s</span>
        </div>

        {/* Camera Angle Selector Dropdown */}
        <div className="relative" onClick={(e) => e.stopPropagation()}>
          <select
            value={optimisticAngle}
            onChange={handleAngleChange}
            className={`text-[11px] font-mono font-medium pl-2 pr-6 py-0.5 rounded border appearance-none outline-none cursor-pointer transition-colors ${angleConfig.badge}`}
          >
            <option value="CAM_A_CENTER" className="bg-zinc-900 text-zinc-200">
              CAM A (Center)
            </option>
            <option value="CAM_B_45_CLOSE" className="bg-zinc-900 text-zinc-200">
              CAM B (45° Close)
            </option>
            <option value="CAM_C_OTS" className="bg-zinc-900 text-zinc-200">
              CAM C (OTS)
            </option>
            <option value="CLOSE_UP" className="bg-zinc-900 text-zinc-200">
              Close Up
            </option>
            <option value="MEDIUM_SHOT" className="bg-zinc-900 text-zinc-200">
              Medium Shot
            </option>
            <option value="WIDE_SHOT" className="bg-zinc-900 text-zinc-200">
              Wide Shot
            </option>
          </select>
          <ChevronDown className="w-3 h-3 absolute right-1.5 top-1.5 pointer-events-none opacity-60 text-zinc-400" />
        </div>
      </div>

      {/* --- 9:16 MEDIA PREVIEW SLOT --- */}
      <div className="p-3 bg-zinc-950">
        <div className="w-full aspect-[9/16] bg-zinc-900 rounded-md overflow-hidden border border-zinc-800 relative flex items-center justify-center group/media">
          {/* Active Video Player */}
          {activeVideoUrl ? (
            <div className="w-full h-full relative">
              <video
                src={activeVideoUrl}
                className="w-full h-full object-cover"
                loop
                muted
                playsInline
                autoPlay={isPlaying}
                onMouseEnter={(e) => {
                  setIsPlaying(true);
                  e.currentTarget.play().catch(() => {});
                }}
                onMouseLeave={(e) => {
                  setIsPlaying(false);
                  e.currentTarget.pause();
                }}
              />
              {!isPlaying && (
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center pointer-events-none">
                  <div className="w-8 h-8 rounded-full bg-zinc-950/80 border border-zinc-700 flex items-center justify-center text-zinc-200">
                    <Play className="w-4 h-4 ml-0.5" />
                  </div>
                </div>
              )}
            </div>
          ) : scene.firstFrameUrl ? (
            /* First Frame Keyframe Preview */
            <div className="w-full h-full relative">
              <img
                src={scene.firstFrameUrl}
                alt={`Scene ${scene.order}`}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex items-end p-2">
                <span className="text-[10px] font-mono text-zinc-300">Keyframe Ready</span>
              </div>
            </div>
          ) : isGenerating ? (
            /* Generating State */
            <div className="w-full h-full flex flex-col items-center justify-center gap-2 p-4 bg-zinc-950 text-center">
              <Loader2 className="w-6 h-6 text-zinc-400 animate-spin" />
              <span className="text-[11px] font-mono text-zinc-300">Rendering Clip...</span>
            </div>
          ) : (
            /* Empty State */
            <div className="w-full h-full flex flex-col items-center justify-center gap-2 p-4 text-center text-zinc-600">
              <Film className="w-7 h-7 opacity-40 text-zinc-500" />
              <span className="text-[11px] font-mono text-zinc-400">9:16 Vertical Slot</span>
              <span className="text-[10px] text-zinc-600">Pending Execution</span>
            </div>
          )}

          {/* Camera watermark */}
          <div className="absolute bottom-2 left-2 px-1.5 py-0.5 rounded bg-zinc-950/80 text-[9px] font-mono text-zinc-300 border border-zinc-800">
            {angleConfig.short}
          </div>

          {/* Takes Badge: Shows Active Take count */}
          {takes.length > 0 && (
            <div className="absolute bottom-2 right-2 px-1.5 py-0.5 rounded bg-zinc-950/90 text-[9px] font-mono text-zinc-200 border border-zinc-700 flex items-center gap-1 shadow-sm">
              <Layers className="w-2.5 h-2.5 text-zinc-400" />
              <span>Take {activeTake ? activeTake.takeNumber : 1}/{takes.length}</span>
            </div>
          )}
        </div>
      </div>

      {/* --- IMPLICITLY WIRED ASSET AVATAR BADGES --- */}
      <div className="px-3 py-2 bg-zinc-950 border-t border-zinc-800/80 flex items-center justify-between gap-1.5 nodrag">
        {/* Left: Wired Character Badges */}
        <div className="flex items-center gap-1">
          {charUrl ? (
            <div
              className="w-6 h-6 rounded-full border border-zinc-700 overflow-hidden bg-zinc-800 shrink-0"
              title={primaryChar?.name || "Anchored Protagonist"}
            >
              <img src={charUrl} alt="Character" className="w-full h-full object-cover" />
            </div>
          ) : (
            <div className="w-6 h-6 rounded-full border border-dashed border-zinc-700 flex items-center justify-center text-zinc-600">
              <User className="w-3 h-3" />
            </div>
          )}

          {/* Background Plate Badge */}
          {bgUrl ? (
            <div
              className="w-8 h-5 rounded border border-zinc-700 overflow-hidden bg-zinc-800 shrink-0"
              title={wiredLocation?.name || "Anchored Location"}
            >
              <img src={bgUrl} alt="Location" className="w-full h-full object-cover" />
            </div>
          ) : (
            <div className="w-8 h-5 rounded border border-dashed border-zinc-700 flex items-center justify-center text-zinc-600">
              <Mountain className="w-3 h-3" />
            </div>
          )}
        </div>

        {/* Right: Takes variation switcher (if multiple takes exist) */}
        {takes.length > 1 ? (
          <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
            <span className="text-[9px] font-mono text-zinc-500 uppercase">Takes:</span>
            {takes.slice(0, 3).map((t) => (
              <button
                key={t.takeId}
                onClick={() => onSelectTake && onSelectTake(scene.sceneId, t.takeId)}
                className={`w-4 h-4 rounded text-[9px] font-mono flex items-center justify-center transition-colors ${
                  t.takeId === activeTake?.takeId
                    ? "bg-zinc-100 text-zinc-950 font-bold"
                    : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"
                }`}
                title={`Select Take ${t.takeNumber}`}
              >
                {t.takeNumber}
              </button>
            ))}
          </div>
        ) : (
          <span className="text-[10px] font-mono text-zinc-500">
            {primaryChar?.name ? primaryChar.name.split(" ")[0] : "Scene Beat"}
          </span>
        )}
      </div>

      {/* --- INLINE EDIT ACTION DELTA & INSPECTOR TRIGGER --- */}
      <div className="p-3 bg-zinc-950 border-t border-zinc-800 space-y-2">
        <div className="flex items-center justify-between text-[10px] text-zinc-400 font-mono uppercase tracking-wider">
          <span>Action Delta</span>
          <button
            onClick={(e) => {
              e.stopPropagation();
              if (onSelect) onSelect(scene);
            }}
            className="text-[9px] font-mono text-zinc-400 hover:text-white flex items-center gap-1 transition-colors"
          >
            <SlidersHorizontal className="w-3 h-3" />
            <span>Inspector</span>
          </button>
        </div>

        <div className="relative">
          <textarea
            value={deltaInput}
            onChange={(e) => setDeltaInput(e.target.value)}
            onClick={(e) => e.stopPropagation()}
            placeholder="Director intent (e.g. Hero steps forward...)"
            rows={2}
            className="w-full bg-zinc-900 border border-zinc-800 rounded-md px-2.5 py-1.5 text-xs text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-zinc-700 resize-none font-sans leading-relaxed custom-scrollbar"
          />
        </div>

        {/* Action Buttons: Enrich Delta & Inspect */}
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={handleEnrichClick}
            disabled={isEnrichingState}
            className="h-8 flex items-center justify-center gap-1.5 rounded-md bg-zinc-100 text-zinc-950 hover:bg-white text-xs font-semibold transition-colors disabled:opacity-50"
          >
            {isEnrichingState ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Enriching...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-3.5 h-3.5" />
                <span>Enrich Delta</span>
              </>
            )}
          </button>

          <button
            onClick={(e) => {
              e.stopPropagation();
              if (onSelect) onSelect(scene);
            }}
            className="h-8 flex items-center justify-center gap-1.5 rounded-md bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-200 text-xs font-medium transition-colors"
          >
            <SlidersHorizontal className="w-3.5 h-3.5 text-zinc-400" />
            <span>Open Assets</span>
          </button>
        </div>
      </div>
    </div>
  );
});

SceneMacroNode.displayName = "SceneMacroNode";
