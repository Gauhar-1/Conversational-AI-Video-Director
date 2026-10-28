"use client";

/**
 * @file src/components/storyboard/NodeInspector.tsx
 * @description The Video Node Inspector (Right-hand Drawer).
 * Optimized for reduced cognitive load:
 * 1. Read-Only Abstracted Assets: Small 32px avatar pills with "Edit in Casting Tab" escape hatch.
 * 2. Onboarding Pre-Flight Checklist: Guided checklist & First Frame Decision for ungenerated nodes.
 * 3. Iteration & Branching: "Accept & Move to Next Scene" vs "Iterate & Branch" post-generation UX.
 * 4. Multi-Take Variation Engine with zero-token camera framing presets.
 * Monochromatic zinc studio design system.
 */

import React, { useState, useEffect, useMemo, useCallback } from "react";
import Link from "next/link";
import { ISceneDoc, IGlobalVault, CameraAngle } from "@/models/Project";
import { 
  X, Copy, Check, Upload, Video, Loader2, Film, 
  Image as ImageIcon, Zap, RefreshCw, User, Mountain, 
  Play, Sparkles, Layers, ShieldCheck, CheckCircle2,
  ArrowUpRight, ArrowRight, GitBranch, AlertCircle
} from "lucide-react";

type NodeInspectorProps = {
  scene: ISceneDoc | null;
  storyboardItem?: any;
  globalVault?: IGlobalVault;
  globalAssets?: {
    characters: any[];
    locations: any[];
  };
  projectId: string | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdateScene: (sceneId: string, updates: Partial<ISceneDoc>) => void;
  onUpdateVault?: (updates: Partial<IGlobalVault>) => void;
  onEnrichDelta: (sceneId: string, rawDelta: string, cameraAngle: CameraAngle) => void;
  onGenerateVideo: (sceneId: string, prompt: string, model: string, advancedInputs: any) => void;
  onGenerateFrame: (sceneId: string, prompt: string) => void;
  onGenerateCharacter?: (sceneNumber: number, charId: string, prompt: string) => void;
  onGenerateBackground?: (sceneNumber: number, prompt: string, refImage?: string) => void;
  onSelectTake?: (sceneId: string, takeId: string) => void;
  onDeleteTake?: (sceneId: string, takeId: string) => void;
  onIterateTake?: (sceneId: string) => void;
  onNextScene?: () => void;
  isEnriching?: boolean;
  isGeneratingVideo?: boolean;
  isGeneratingFrame?: boolean;
  isGeneratingCharacter?: boolean;
  isGeneratingBackground?: boolean;
  lastTokenResult?: { tokensUsed: number; tokensSaved: number; type: string } | null;
};

export function NodeInspector({
  scene,
  storyboardItem,
  globalVault,
  globalAssets,
  projectId,
  isOpen,
  onClose,
  onUpdateScene,
  onUpdateVault,
  onEnrichDelta,
  onGenerateVideo,
  onGenerateFrame,
  onGenerateCharacter,
  onGenerateBackground,
  onSelectTake,
  onDeleteTake,
  onIterateTake,
  onNextScene,
  isEnriching = false,
  isGeneratingVideo = false,
  isGeneratingFrame = false,
  isGeneratingCharacter = false,
  isGeneratingBackground = false,
  lastTokenResult,
}: NodeInspectorProps) {
  if (!isOpen || !scene) return null;

  // Form states
  const [rawDelta, setRawDelta] = useState(scene.rawDelta || (scene as any).prompt || "");
  const [imagePrompt, setImagePrompt] = useState(scene.imagePrompt || (scene as any).enrichedPrompt || "");
  const [motionPrompt, setMotionPrompt] = useState(scene.motionPrompt || "");
  const [cameraAngle, setCameraAngle] = useState<CameraAngle>(scene.cameraAngle || "CAM_A_CENTER");
  const [selectedVideoModel, setSelectedVideoModel] = useState("kling-2.5");
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const sceneNumber = (scene as any).sceneNumber || scene.order || 1;
  const sceneDuration = scene.duration || (scene as any).durationSec || 10;
  const takeCount = scene.takes?.length || 0;

  // Determine active video status
  const activeTake = scene.takes?.find((t) => t.takeId === scene.activeTakeId) || scene.takes?.[0];
  const activeVideoUrl = activeTake?.videoUrl || scene.videoUrl;
  const activeFrameUrl = activeTake?.frameUrl || (activeTake as any)?.thumbnailUrl || scene.firstFrameUrl;
  const isVideoGenerated = Boolean(activeVideoUrl && activeVideoUrl.trim() !== "");

  // Active view tab in inspector (Defaults to "compose" for ungenerated scenes, "takes" once video exists)
  const [inspectorTab, setInspectorTab] = useState<"takes" | "compose" | "prompts" | "render">(() =>
    isVideoGenerated ? "takes" : "compose"
  );

  useEffect(() => {
    setRawDelta(scene.rawDelta || (scene as any).prompt || "");
    setImagePrompt(scene.imagePrompt || (scene as any).enrichedPrompt || "");
    setMotionPrompt(scene.motionPrompt || "");
    setCameraAngle(scene.cameraAngle || "CAM_A_CENTER");
    const hasVideo = Boolean(
      (scene.takes?.find((t) => t.takeId === scene.activeTakeId) || scene.takes?.[0])?.videoUrl || scene.videoUrl
    );
    if (!hasVideo) {
      setInspectorTab("compose");
    }
  }, [scene]);

  // Resolve assigned character for read-only avatar display (SRP: timeline does not edit character)
  const assignedCharacter = useMemo(() => {
    if (globalAssets?.characters?.length) {
      if (scene.characterIds && scene.characterIds.length > 0) {
        const match = globalAssets.characters.find((c: any) =>
          scene.characterIds?.includes(c.assetId)
        );
        if (match) return match;
      }
      return globalAssets.characters[0];
    }
    if (storyboardItem?.characters?.[0]) {
      return {
        name: storyboardItem.characters[0].name || "Lead Character",
        imageUrl: storyboardItem.characters[0].generated_url || "",
        role: "Lead",
      };
    }
    if (globalVault?.characterAnchor) {
      return {
        name: "Lead Protagonist",
        imageUrl: globalVault.characterAnchor.imageUrl || "",
        role: "Lead",
      };
    }
    return { name: "Protagonist", imageUrl: "", role: "Lead" };
  }, [globalAssets, scene.characterIds, storyboardItem, globalVault]);

  // Resolve assigned location for read-only avatar display (SRP: timeline does not edit location)
  const assignedLocation = useMemo(() => {
    if (globalAssets?.locations?.length) {
      if (scene.locationId) {
        const match = globalAssets.locations.find((l: any) => l.assetId === scene.locationId);
        if (match) return match;
      }
      return globalAssets.locations[0];
    }
    if (storyboardItem?.environment_prompt) {
      return {
        name: storyboardItem.location || "Environment Plate",
        imageUrl: storyboardItem.background_url || "",
        lightingProfile: "Atmospheric",
      };
    }
    if (globalVault?.environmentAnchor) {
      return {
        name: "Atmospheric Plate",
        imageUrl: globalVault.environmentAnchor.imageUrl || "",
        lightingProfile: globalVault.environmentAnchor.lightingProfile || "Atmospheric",
      };
    }
    return { name: "Environment Plate", imageUrl: "", lightingProfile: "Atmospheric" };
  }, [globalAssets, scene.locationId, storyboardItem, globalVault]);

  const copyToClipboard = (text: string, field: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleSaveAll = () => {
    onUpdateScene(scene.sceneId, {
      rawDelta,
      imagePrompt,
      motionPrompt,
      cameraAngle,
    });
  };

  const handleTriggerEnrich = () => {
    onEnrichDelta(scene.sceneId, rawDelta, cameraAngle);
  };

  const handleTriggerVideo = (customPrompt?: string) => {
    const finalPrompt = customPrompt || motionPrompt || imagePrompt || rawDelta;
    onGenerateVideo(scene.sceneId, finalPrompt, selectedVideoModel, {
      startFrameUrl: scene.firstFrameUrl || activeFrameUrl,
      characterReferenceUrls: assignedCharacter?.imageUrl ? [assignedCharacter.imageUrl] : [],
      backgroundReferenceUrl: assignedLocation?.imageUrl || undefined,
    });
  };

  const handleIterateBranch = () => {
    if (onIterateTake) {
      onIterateTake(scene.sceneId);
    } else if (onSelectTake) {
      // Fallback branch: update scene prompt and trigger new take
      onUpdateScene(scene.sceneId, { rawDelta: "" });
      setRawDelta("");
    }
    setInspectorTab("compose");
  };

  return (
    <aside className="w-[440px] flex-shrink-0 h-full bg-zinc-950 border-l border-zinc-800 flex flex-col z-30 shadow-2xl animate-in slide-in-from-right duration-200 text-zinc-100 select-none">
      {/* --- HEADER --- */}
      <div className="p-4 border-b border-zinc-800 bg-zinc-900/70 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-zinc-800 text-zinc-100 rounded-md border border-zinc-700 flex items-center justify-center shrink-0">
            <Film className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-xs font-semibold text-zinc-100 tracking-wide font-mono uppercase">
                Scene {String(sceneNumber).padStart(2, "0")} Studio Inspector
              </h3>
              <span className="text-[9px] font-mono px-1.5 py-0.5 rounded border border-zinc-700 bg-zinc-800 text-zinc-300">
                {(scene.status || "idle").toUpperCase()}
              </span>
            </div>
            <p className="text-[10px] font-mono text-zinc-500 uppercase">
              {scene.sceneId} • {sceneDuration}s • 9:16 Vertical
            </p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="w-7 h-7 flex items-center justify-center text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-md transition-colors"
          title="Close Inspector"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* --- ABSTRACTED READ-ONLY ASSETS (Requirement 2) --- */}
      {/* Displays pre-assigned Character & Background as small 32px avatar pills with escape hatch */}
      <div className="px-4 py-2.5 bg-zinc-900/40 border-b border-zinc-800/80 flex items-center justify-between gap-2">
        <div className="flex items-center gap-3 overflow-hidden">
          {/* Character Avatar Pill (32px) */}
          <div className="flex items-center gap-2 max-w-[150px]" title={assignedCharacter.name}>
            <div className="w-8 h-8 rounded-full bg-zinc-800 border border-zinc-700 overflow-hidden shrink-0 flex items-center justify-center">
              {assignedCharacter.imageUrl ? (
                <img
                  src={assignedCharacter.imageUrl}
                  alt={assignedCharacter.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <User className="w-4 h-4 text-zinc-500" />
              )}
            </div>
            <div className="truncate">
              <span className="block text-[11px] font-medium text-zinc-200 truncate leading-none">
                {assignedCharacter.name || "Lead"}
              </span>
              <span className="text-[9px] font-mono text-zinc-500 leading-none">
                Character
              </span>
            </div>
          </div>

          <div className="w-px h-6 bg-zinc-800 shrink-0" />

          {/* Location Avatar Pill (32px) */}
          <div className="flex items-center gap-2 max-w-[150px]" title={assignedLocation.name}>
            <div className="w-8 h-8 rounded-full bg-zinc-800 border border-zinc-700 overflow-hidden shrink-0 flex items-center justify-center">
              {assignedLocation.imageUrl ? (
                <img
                  src={assignedLocation.imageUrl}
                  alt={assignedLocation.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <Mountain className="w-4 h-4 text-zinc-500" />
              )}
            </div>
            <div className="truncate">
              <span className="block text-[11px] font-medium text-zinc-200 truncate leading-none">
                {assignedLocation.name || "Environment"}
              </span>
              <span className="text-[9px] font-mono text-zinc-500 leading-none">
                Background
              </span>
            </div>
          </div>
        </div>

        {/* Routing Escape Hatch to Casting Tab */}
        {projectId ? (
          <Link
            href={`/project/${projectId}/casting`}
            className="text-[10px] font-mono text-zinc-400 hover:text-zinc-100 underline decoration-zinc-700 underline-offset-2 flex items-center gap-1 shrink-0 transition-colors"
            title="Edit character or environment reference sheets in Stage 2"
          >
            <span>Edit in Casting Tab</span>
            <ArrowUpRight className="w-3 h-3 text-zinc-400" />
          </Link>
        ) : (
          <span className="text-[10px] font-mono text-zinc-600">Locked</span>
        )}
      </div>

      {/* --- SUBNAV TABS --- */}
      <div className="grid grid-cols-4 border-b border-zinc-800 bg-zinc-950 px-3 py-1.5 gap-1 shrink-0">
        <button
          onClick={() => setInspectorTab("takes")}
          className={`py-1.5 text-[10px] font-mono rounded transition-colors flex items-center justify-center gap-1 ${
            inspectorTab === "takes"
              ? "bg-zinc-100 text-zinc-950 font-semibold"
              : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900"
          }`}
        >
          <Layers className="w-3 h-3" />
          <span>Takes ({takeCount})</span>
        </button>
        <button
          onClick={() => setInspectorTab("compose")}
          className={`py-1.5 text-[10px] font-mono rounded transition-colors flex items-center justify-center gap-1 ${
            inspectorTab === "compose"
              ? "bg-zinc-100 text-zinc-950 font-semibold"
              : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900"
          }`}
        >
          <Sparkles className="w-3 h-3" />
          <span>Compose</span>
        </button>
        <button
          onClick={() => setInspectorTab("prompts")}
          className={`py-1.5 text-[10px] font-mono rounded transition-colors flex items-center justify-center gap-1 ${
            inspectorTab === "prompts"
              ? "bg-zinc-100 text-zinc-950 font-semibold"
              : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900"
          }`}
        >
          <Copy className="w-3 h-3" />
          <span>Prompts</span>
        </button>
        <button
          onClick={() => setInspectorTab("render")}
          className={`py-1.5 text-[10px] font-mono rounded transition-colors flex items-center justify-center gap-1 ${
            inspectorTab === "render"
              ? "bg-zinc-100 text-zinc-950 font-semibold"
              : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900"
          }`}
        >
          <Video className="w-3 h-3" />
          <span>Render</span>
        </button>
      </div>

      {/* --- BODY SCROLLABLE --- */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
        {/* Token Efficiency Status Banner */}
        {lastTokenResult && (
          <div className="p-2.5 bg-zinc-900 border border-zinc-800 rounded-md flex items-center justify-between text-xs font-mono">
            <span className="text-zinc-300">Tokens Saved:</span>
            <span className="text-zinc-100 font-bold">+{lastTokenResult.tokensSaved} tokens</span>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB: TAKES VARIATION ENGINE (Requirement 4)                              */}
        {/* ========================================================================= */}
        {inspectorTab === "takes" && (
          <div className="space-y-4">
            {/* POST-GENERATION UX: ITERATION & BRANCHING GUIDANCE (Exclusively in Takes Tab) */}
            {isVideoGenerated && (
              <div className="p-3.5 bg-zinc-900/90 border border-zinc-700/80 rounded-md space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold font-mono text-zinc-200 flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    Active Take Ready
                  </span>
                  <span className="text-[10px] font-mono text-zinc-400">
                    Take {(activeTake as any)?.takeNumber || 1} of {takeCount}
                  </span>
                </div>

                {/* Video Player */}
                <div className="aspect-[9/16] max-h-52 w-full bg-zinc-950 rounded overflow-hidden border border-zinc-800">
                  <video
                    src={activeVideoUrl}
                    controls
                    loop
                    className="w-full h-full object-cover"
                  />
                </div>

                {/* Post-Generation Choice (Requirement 4) */}
                <div className="space-y-2 pt-1">
                  <div className="grid grid-cols-2 gap-2">
                    {/* 1. Accept & Move to Next Scene */}
                    <button
                      type="button"
                      onClick={() => {
                        if (onNextScene) {
                          onNextScene();
                        } else {
                          onClose();
                        }
                      }}
                      className="px-3 py-2.5 rounded bg-zinc-100 hover:bg-white text-zinc-950 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors shadow-sm"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>Accept &amp; Next</span>
                    </button>

                    {/* 2. Iterate & Branch (Default: Branches new take & preserves history) */}
                    <button
                      type="button"
                      onClick={handleIterateBranch}
                      className="px-3 py-2.5 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-100 border border-zinc-600 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
                    >
                      <GitBranch className="w-3.5 h-3.5 text-zinc-300" />
                      <span>Iterate &amp; Branch</span>
                    </button>
                  </div>

                  <p className="text-[10px] font-mono text-zinc-400 leading-relaxed bg-zinc-950/70 p-2 rounded border border-zinc-800">
                    <span className="text-zinc-200 font-semibold">Branching Default:</span> Director AI preserves all take variations automatically. You can switch between active takes or prune versions at any time.
                  </p>
                </div>
              </div>
            )}

            <div className="flex items-center justify-between">
              <label className="text-[10px] font-mono uppercase tracking-wider text-zinc-400">
                Scene Takes ({takeCount})
              </label>
              <button
                type="button"
                onClick={handleIterateBranch}
                className="flex items-center gap-1 text-[11px] font-mono text-zinc-300 hover:text-white"
              >
                <GitBranch className="w-3 h-3" />
                <span>Branch New Take</span>
              </button>
            </div>

            {(!scene.takes || scene.takes.length === 0) ? (
              <div className="p-5 text-center bg-zinc-900/60 border border-dashed border-zinc-800 rounded-md">
                <Video className="w-6 h-6 text-zinc-600 mx-auto mb-2" />
                <p className="text-xs text-zinc-400 font-mono mb-1">No Takes Recorded Yet</p>
                <p className="text-[11px] text-zinc-500">
                  Use the Pre-Flight Checklist above or click below to render Take 1.
                </p>
                <button
                  onClick={() => setInspectorTab("render")}
                  className="mt-3 px-3 py-1.5 rounded bg-zinc-100 text-zinc-950 text-xs font-semibold hover:bg-white"
                >
                  Configure &amp; Render Take 1
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {scene.takes.map((take, idx) => {
                  const isActive = take.takeId === scene.activeTakeId || (!scene.activeTakeId && idx === 0);
                  const takeNumber = (take as any).takeNumber || idx + 1;
                  return (
                    <div
                      key={take.takeId}
                      className={`p-3 bg-zinc-900 rounded-md border transition-all ${
                        isActive
                          ? "border-zinc-400 ring-1 ring-zinc-500"
                          : "border-zinc-800 hover:border-zinc-700"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-mono font-bold text-zinc-100">
                            Take {takeNumber}
                          </span>
                          <span className="text-[10px] font-mono bg-zinc-800 text-zinc-400 px-1.5 py-0.5 rounded border border-zinc-700">
                            {take.model || "kling-2.5"}
                          </span>
                          {isActive && (
                            <span className="text-[9px] font-mono bg-zinc-100 text-zinc-950 font-bold px-1.5 py-0.5 rounded">
                              ACTIVE
                            </span>
                          )}
                        </div>
                        {onDeleteTake && (
                          <button
                            onClick={() => onDeleteTake(scene.sceneId, take.takeId)}
                            className="text-zinc-500 hover:text-zinc-300 p-1"
                            title="Delete this take"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>

                      {/* Take Preview */}
                      {take.videoUrl ? (
                        <div className="aspect-[9/16] max-h-48 w-full bg-zinc-950 rounded overflow-hidden border border-zinc-800 mb-2">
                          <video src={take.videoUrl} controls loop className="w-full h-full object-cover" />
                        </div>
                      ) : take.frameUrl ? (
                        <div className="aspect-[9/16] max-h-48 w-full bg-zinc-950 rounded overflow-hidden border border-zinc-800 mb-2">
                          <img src={take.frameUrl} alt={`Take ${takeNumber}`} className="w-full h-full object-cover" />
                        </div>
                      ) : null}

                      <p className="text-[11px] text-zinc-400 line-clamp-2 mb-2 font-mono">
                        {take.prompt || "Default narrative beat"}
                      </p>

                      <div className="flex items-center justify-between pt-2 border-t border-zinc-800">
                        <span className="text-[10px] font-mono text-zinc-500">
                          {take.duration || sceneDuration}s duration
                        </span>
                        {!isActive && onSelectTake && (
                          <button
                            onClick={() => onSelectTake(scene.sceneId, take.takeId)}
                            className="px-2.5 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-[11px] font-mono font-medium border border-zinc-700"
                          >
                            Set as Active Take
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB: COMPOSE (First Frame Keyframe, Camera Framing, Action Intent)        */}
        {/* ========================================================================= */}
        {inspectorTab === "compose" && (
          <div className="space-y-4">
            {/* GUIDED ONBOARDING: PRE-FLIGHT CHECKLIST (Requirement 3 - Exclusively in Compose Tab) */}
            {!isVideoGenerated && (
              <div className="p-3.5 bg-zinc-900/90 border border-zinc-700/80 rounded-md space-y-3 shadow-lg">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold font-mono uppercase text-zinc-200 flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-zinc-100" />
                    Pre-Flight Production Checklist
                  </span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-zinc-800 border border-zinc-700 text-zinc-300">
                    Ready to Direct
                  </span>
                </div>

                {/* Visual Checkmark Indicators */}
                <div className="space-y-1.5 text-xs font-mono">
                  <div className="flex items-center justify-between p-1.5 rounded bg-zinc-950/70 border border-zinc-800/80">
                    <span className="flex items-center gap-2 text-zinc-300">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                      <span>LLM Script Breakdown Loaded</span>
                    </span>
                    <span className="text-[10px] text-zinc-500">Groq 20B</span>
                  </div>

                  <div className="flex items-center justify-between p-1.5 rounded bg-zinc-950/70 border border-zinc-800/80">
                    <span className="flex items-center gap-2 text-zinc-300">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Character Locked</span>
                    </span>
                    <span className="text-[10px] text-zinc-400 truncate max-w-[120px]">
                      {assignedCharacter?.name || "Protagonist"} (Seed #42)
                    </span>
                  </div>

                  <div className="flex items-center justify-between p-1.5 rounded bg-zinc-950/70 border border-zinc-800/80">
                    <span className="flex items-center gap-2 text-zinc-300">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Environment Locked</span>
                    </span>
                    <span className="text-[10px] text-zinc-400 truncate max-w-[120px]">
                      {assignedLocation?.name || "16:9 Plate"}
                    </span>
                  </div>

                  <div className="flex items-center justify-between p-1.5 rounded bg-zinc-950/70 border border-zinc-800/80">
                    <span className="flex items-center gap-2 text-zinc-300">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Camera Framing Configured</span>
                    </span>
                    <span className="text-[10px] text-zinc-400">
                      {cameraAngle.replace(/CAM_[A-G]_/, "").replace(/_/g, " ")}
                    </span>
                  </div>
                </div>

                {/* The First Frame Decision (Requirement 3) */}
                <div className="pt-2 border-t border-zinc-800 space-y-2">
                  <label className="block text-[11px] font-mono text-zinc-400 font-semibold">
                    The First Frame Decision
                  </label>

                  {/* Action Path 1: Primary "Generate First Frame (Recommended)" */}
                  <button
                    type="button"
                    onClick={() => onGenerateFrame(scene.sceneId, imagePrompt || rawDelta)}
                    disabled={isGeneratingFrame}
                    className="w-full p-2.5 rounded-md bg-zinc-100 text-zinc-950 hover:bg-white text-left transition-colors flex items-start gap-2.5 group disabled:opacity-50 shadow-sm"
                  >
                    <div className="w-6 h-6 rounded bg-zinc-950 text-zinc-100 flex items-center justify-center shrink-0 mt-0.5">
                      {isGeneratingFrame ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <ImageIcon className="w-3.5 h-3.5" />
                      )}
                    </div>
                    <div>
                      <span className="block text-xs font-semibold leading-tight">
                        Generate First Frame (Recommended)
                      </span>
                      <span className="block text-[10px] text-zinc-700 leading-tight mt-0.5 font-mono">
                        Lock visual composition &amp; likeness before starting temporal generation.
                      </span>
                    </div>
                  </button>

                  {/* Action Path 2: Secondary "Let Model Decide (Fast)" */}
                  <button
                    type="button"
                    onClick={() => handleTriggerVideo(motionPrompt || imagePrompt || rawDelta)}
                    disabled={isGeneratingVideo}
                    className="w-full p-2.5 rounded-md bg-zinc-950 border border-zinc-700 hover:border-zinc-500 text-left transition-colors flex items-start gap-2.5 text-zinc-300 hover:text-zinc-100 disabled:opacity-50"
                  >
                    <div className="w-6 h-6 rounded bg-zinc-900 border border-zinc-700 text-zinc-300 flex items-center justify-center shrink-0 mt-0.5">
                      {isGeneratingVideo ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Video className="w-3.5 h-3.5" />
                      )}
                    </div>
                    <div>
                      <span className="block text-xs font-semibold leading-tight">
                        Let Model Decide (Fast)
                      </span>
                      <span className="block text-[10px] text-zinc-500 leading-tight mt-0.5 font-mono">
                        Skip the keyframe step and generate video directly from text delta.
                      </span>
                    </div>
                  </button>
                </div>
              </div>
            )}

            {/* First Frame Keyframe Section */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-md p-3 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-zinc-200 uppercase font-mono tracking-wider flex items-center gap-2">
                  <ImageIcon className="w-3.5 h-3.5 text-zinc-400" />
                  First Frame Keyframe
                </span>
                {activeFrameUrl && (
                  <span className="text-[10px] font-mono text-emerald-400 flex items-center gap-1">
                    <Check className="w-3 h-3" /> Ready
                  </span>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3 items-center">
                <div className="aspect-[9/16] bg-zinc-950 border border-zinc-800 rounded overflow-hidden flex items-center justify-center">
                  {activeFrameUrl ? (
                    <img src={activeFrameUrl} alt="First Frame" className="w-full h-full object-cover" />
                  ) : (
                    <div className="text-center p-2 text-zinc-600">
                      <ImageIcon className="w-6 h-6 mx-auto mb-1 opacity-50" />
                      <span className="text-[10px] font-mono">No Keyframe</span>
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <p className="text-[10px] font-mono text-zinc-400 leading-relaxed">
                    Master starting frame locked to {assignedCharacter?.name} and {assignedLocation?.name}.
                  </p>
                  <button
                    type="button"
                    onClick={() => onGenerateFrame(scene.sceneId, imagePrompt || rawDelta)}
                    disabled={isGeneratingFrame}
                    className="w-full py-2 px-3 rounded-md bg-zinc-100 text-zinc-950 hover:bg-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50"
                  >
                    {isGeneratingFrame ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Rendering...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>Generate Frame</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>

            {/* Camera Angle Selector (0-Token Instant Cache Switch) */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-mono uppercase tracking-wider text-zinc-400 flex items-center justify-between">
                <span>Camera Framing (0-Token Switch)</span>
                <span className="text-zinc-500 text-[9px]">Instant cache hit if delta same</span>
              </label>
              <div className="grid grid-cols-3 gap-1.5">
                {(["CAM_A_CENTER", "CAM_B_45_CLOSE", "CAM_C_OTS"] as CameraAngle[]).map((angle) => (
                  <button
                    key={angle}
                    onClick={() => {
                      setCameraAngle(angle);
                      onEnrichDelta(scene.sceneId, rawDelta, angle);
                    }}
                    className={`py-1.5 px-1 rounded-md text-[10px] font-mono font-medium border transition-colors ${
                      cameraAngle === angle
                        ? "bg-zinc-100 text-zinc-950 border-zinc-100 font-semibold"
                        : "bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800"
                    }`}
                  >
                    {angle === "CAM_A_CENTER" ? "Center" : angle === "CAM_B_45_CLOSE" ? "45° Close" : "Over Shoulder"}
                  </button>
                ))}
              </div>
            </div>

            {/* Raw Delta Intent */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-[10px] font-mono uppercase tracking-wider text-zinc-400">
                  Action Intent Delta
                </label>
                <button
                  onClick={handleTriggerEnrich}
                  disabled={isEnriching}
                  className="text-[10px] font-mono text-zinc-300 hover:text-white flex items-center gap-1 transition-colors"
                >
                  {isEnriching ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
                  <span>Enrich (SSE)</span>
                </button>
              </div>
              <textarea
                value={rawDelta}
                onChange={(e) => setRawDelta(e.target.value)}
                rows={3}
                placeholder="Describe scene action beat..."
                className="w-full bg-zinc-900 border border-zinc-700 rounded-md p-3 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-zinc-500 resize-y font-sans leading-relaxed custom-scrollbar"
              />
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB: PROMPTS (Conditioning Prompts with Large Textareas & Copy)           */}
        {/* ========================================================================= */}
        {inspectorTab === "prompts" && (
          <div className="space-y-4">
            {/* Full imagePrompt */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-[10px] font-mono uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
                  <ImageIcon className="w-3 h-3 text-zinc-400" />
                  <span>Conditioning Image Prompt (9:16)</span>
                </label>
                <button
                  onClick={() => copyToClipboard(imagePrompt, "image")}
                  className="text-[10px] font-mono text-zinc-400 hover:text-white flex items-center gap-1 transition-colors"
                >
                  {copiedField === "image" ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  <span>{copiedField === "image" ? "Copied" : "Copy"}</span>
                </button>
              </div>
              <textarea
                value={imagePrompt}
                onChange={(e) => setImagePrompt(e.target.value)}
                rows={4}
                className="w-full bg-zinc-900 border border-zinc-700 rounded-md p-3 text-[11px] text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-zinc-500 resize-y font-mono leading-relaxed custom-scrollbar"
                placeholder="Full keyframe composition prompt..."
              />
            </div>

            {/* Full motionPrompt */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-[10px] font-mono uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
                  <Video className="w-3 h-3 text-zinc-400" />
                  <span>Motion Prompt (10s Physics Engine)</span>
                </label>
                <button
                  onClick={() => copyToClipboard(motionPrompt, "motion")}
                  className="text-[10px] font-mono text-zinc-400 hover:text-white flex items-center gap-1 transition-colors"
                >
                  {copiedField === "motion" ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  <span>{copiedField === "motion" ? "Copied" : "Copy"}</span>
                </button>
              </div>
              <textarea
                value={motionPrompt}
                onChange={(e) => setMotionPrompt(e.target.value)}
                rows={4}
                className="w-full bg-zinc-900 border border-zinc-700 rounded-md p-3 text-[11px] text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-zinc-500 resize-y font-mono leading-relaxed custom-scrollbar"
                placeholder="Camera dynamics and character motion prompt..."
              />
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB: RENDER (Video Model Configuration & Generation)                      */}
        {/* ========================================================================= */}
        {inspectorTab === "render" && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-[10px] font-mono uppercase tracking-wider text-zinc-400">
                Generative Video Engine
              </label>
              <span className="text-[9px] font-mono text-zinc-500">Replicate Cloud</span>
            </div>

            <select
              value={selectedVideoModel}
              onChange={(e) => setSelectedVideoModel(e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-700 rounded-md px-3 py-2 text-xs text-zinc-200 focus:outline-none focus:border-zinc-500 cursor-pointer font-mono"
            >
              <option value="kling-2.5">Kling 2.5 Turbo Pro (Cinematic High-Perf)</option>
              <option value="wan-2.5">Wan 2.5 I2V (Alibaba Image-to-Video)</option>
              <option value="minimax">MiniMax Video-01 (Hailuo AI Directing)</option>
              <option value="luma-ray">Luma Ray (Action Physics)</option>
            </select>

            {/* Video Preview if generated */}
            {activeVideoUrl && (
              <div className="space-y-1.5 pt-2">
                <label className="text-[10px] font-mono uppercase tracking-wider text-zinc-400">Active Video Take</label>
                <div className="aspect-[9/16] max-h-56 w-full bg-zinc-900 rounded-md overflow-hidden border border-zinc-800 mx-auto">
                  <video src={activeVideoUrl} controls loop className="w-full h-full object-cover" />
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* --- FOOTER ACTIONS --- */}
      <div className="p-3 border-t border-zinc-800 bg-zinc-900/60 space-y-2 shrink-0">
        <button
          onClick={() => handleTriggerVideo()}
          disabled={isGeneratingVideo}
          className="w-full h-9 px-4 rounded-md bg-zinc-100 text-zinc-950 hover:bg-white text-xs font-semibold flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
        >
          {isGeneratingVideo ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Rendering on Replicate...</span>
            </>
          ) : (
            <>
              <Video className="w-4 h-4" />
              <span>Generate Video Take</span>
            </>
          )}
        </button>

        <button
          onClick={handleSaveAll}
          className="w-full h-8 px-3 rounded-md bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-800 text-xs font-medium transition-colors"
        >
          Save All Adjustments
        </button>
      </div>
    </aside>
  );
}

export default NodeInspector;
