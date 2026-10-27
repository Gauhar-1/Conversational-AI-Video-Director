"use client";

import { useState, useEffect } from "react";
import { ISceneDoc, IGlobalVault, CameraAngle } from "@/models/Project";
import { 
  X, Copy, Check, Upload, Video, Loader2, Film, 
  Image as ImageIcon, Zap, RefreshCw, User, Mountain, 
  Play, Sparkles, Layers, ShieldCheck
} from "lucide-react";

type NodeInspectorProps = {
  scene: ISceneDoc | null;
  storyboardItem?: any;
  globalVault?: IGlobalVault;
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
  isEnriching?: boolean;
  isGeneratingVideo?: boolean;
  isGeneratingFrame?: boolean;
  isGeneratingCharacter?: boolean;
  isGeneratingBackground?: boolean;
  lastTokenResult?: { tokensUsed: number; tokensSaved: number; type: string } | null;
};

export default function NodeInspector({
  scene,
  storyboardItem,
  globalVault,
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
  isEnriching = false,
  isGeneratingVideo = false,
  isGeneratingFrame = false,
  isGeneratingCharacter = false,
  isGeneratingBackground = false,
  lastTokenResult,
}: NodeInspectorProps) {
  if (!isOpen || !scene) return null;

  // Form states
  const [rawDelta, setRawDelta] = useState(scene.rawDelta || "");
  const [imagePrompt, setImagePrompt] = useState(scene.imagePrompt || "");
  const [motionPrompt, setMotionPrompt] = useState(scene.motionPrompt || "");
  const [cameraAngle, setCameraAngle] = useState<CameraAngle>(scene.cameraAngle || "CAM_A_CENTER");
  const [selectedVideoModel, setSelectedVideoModel] = useState("kling-2.5");
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // Character & Background asset states
  const initialCharPrompt = 
    storyboardItem?.characters?.[0]?.appearance_prompt || 
    globalVault?.characterAnchor?.description || 
    "Cinematic lead protagonist, detailed face and wardrobe";

  const initialCharUrl = 
    storyboardItem?.characters?.[0]?.generated_url || 
    globalVault?.characterAnchor?.imageUrl || 
    "";

  const initialBgPrompt = 
    storyboardItem?.environment_prompt || 
    globalVault?.environmentAnchor?.description || 
    "Cinematic environment with volumetric lighting and depth";

  const initialBgUrl = 
    storyboardItem?.background_url || 
    globalVault?.environmentAnchor?.imageUrl || 
    "";

  const [charPrompt, setCharPrompt] = useState(initialCharPrompt);
  const [charUrl, setCharUrl] = useState(initialCharUrl);
  const [bgPrompt, setBgPrompt] = useState(initialBgPrompt);
  const [bgUrl, setBgUrl] = useState(initialBgUrl);

  // Active view tab in inspector
  const [inspectorTab, setInspectorTab] = useState<"assets" | "prompts" | "video">("assets");

  useEffect(() => {
    setRawDelta(scene.rawDelta || "");
    setImagePrompt(scene.imagePrompt || "");
    setMotionPrompt(scene.motionPrompt || "");
    setCameraAngle(scene.cameraAngle || "CAM_A_CENTER");
  }, [scene]);

  useEffect(() => {
    const cPrompt = storyboardItem?.characters?.[0]?.appearance_prompt || globalVault?.characterAnchor?.description;
    if (cPrompt) setCharPrompt(cPrompt);
    const cUrl = storyboardItem?.characters?.[0]?.generated_url || globalVault?.characterAnchor?.imageUrl;
    if (cUrl) setCharUrl(cUrl);

    const bPrompt = storyboardItem?.environment_prompt || globalVault?.environmentAnchor?.description;
    if (bPrompt) setBgPrompt(bPrompt);
    const bUrl = storyboardItem?.background_url || globalVault?.environmentAnchor?.imageUrl;
    if (bUrl) setBgUrl(bUrl);
  }, [storyboardItem, globalVault]);

  const copyToClipboard = (text: string, field: string) => {
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

    if (onUpdateVault) {
      onUpdateVault({
        characterAnchor: {
          ...globalVault?.characterAnchor,
          description: charPrompt,
          imageUrl: charUrl,
        },
        environmentAnchor: {
          ...globalVault?.environmentAnchor,
          description: bgPrompt,
          imageUrl: bgUrl,
        },
      });
    }
  };

  const handleTriggerEnrich = () => {
    onEnrichDelta(scene.sceneId, rawDelta, cameraAngle);
  };

  const handleTriggerVideo = () => {
    onGenerateVideo(scene.sceneId, motionPrompt || imagePrompt, selectedVideoModel, {
      startFrameUrl: scene.firstFrameUrl,
      endFrameUrl: scene.lastFrameUrl,
      characterReferenceUrls: charUrl ? [charUrl] : [],
      backgroundReferenceUrl: bgUrl || undefined,
    });
  };

  const handleFrameUpload = (e: React.ChangeEvent<HTMLInputElement>, isLastFrame: boolean = false) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = reader.result as string;
      onUpdateScene(scene.sceneId, {
        [isLastFrame ? "lastFrameUrl" : "firstFrameUrl"]: base64,
      });
    };
    reader.readAsDataURL(file);
  };

  const handleCharUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = reader.result as string;
      setCharUrl(base64);
      if (onUpdateVault) {
        onUpdateVault({
          characterAnchor: {
            ...globalVault?.characterAnchor,
            imageUrl: base64,
          },
        });
      }
    };
    reader.readAsDataURL(file);
  };

  const handleBgUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = reader.result as string;
      setBgUrl(base64);
      if (onUpdateVault) {
        onUpdateVault({
          environmentAnchor: {
            ...globalVault?.environmentAnchor,
            imageUrl: base64,
          },
        });
      }
    };
    reader.readAsDataURL(file);
  };

  return (
    <aside className="w-[420px] flex-shrink-0 h-full bg-zinc-950 border-l border-zinc-800 flex flex-col z-30 shadow-2xl animate-in slide-in-from-right duration-200">
      {/* --- HEADER --- */}
      <div className="p-4 border-b border-zinc-800 bg-zinc-900/60 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-zinc-800 text-zinc-100 rounded-md border border-zinc-700 flex items-center justify-center">
            <Film className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-xs font-semibold text-zinc-100 tracking-wide font-mono uppercase">
                Scene {String(scene.order).padStart(2, "0")} Studio Inspector
              </h3>
              <span className="text-[9px] font-mono px-1.5 py-0.5 rounded border border-zinc-700 bg-zinc-800 text-zinc-300">
                {scene.status.toUpperCase()}
              </span>
            </div>
            <p className="text-[10px] font-mono text-zinc-500 uppercase">
              {scene.sceneId} • {scene.duration || 10}s • 9:16 Vertical
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

      {/* --- SUBNAV TABS --- */}
      <div className="grid grid-cols-3 border-b border-zinc-800 bg-zinc-950 px-3 py-1.5 gap-1.5">
        <button
          onClick={() => setInspectorTab("assets")}
          className={`py-1.5 text-[11px] font-mono rounded transition-colors flex items-center justify-center gap-1.5 ${
            inspectorTab === "assets"
              ? "bg-zinc-100 text-zinc-950 font-semibold"
              : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900"
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>Assets (3)</span>
        </button>
        <button
          onClick={() => setInspectorTab("prompts")}
          className={`py-1.5 text-[11px] font-mono rounded transition-colors flex items-center justify-center gap-1.5 ${
            inspectorTab === "prompts"
              ? "bg-zinc-100 text-zinc-950 font-semibold"
              : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900"
          }`}
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>Prompts</span>
        </button>
        <button
          onClick={() => setInspectorTab("video")}
          className={`py-1.5 text-[11px] font-mono rounded transition-colors flex items-center justify-center gap-1.5 ${
            inspectorTab === "video"
              ? "bg-zinc-100 text-zinc-950 font-semibold"
              : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900"
          }`}
        >
          <Video className="w-3.5 h-3.5" />
          <span>Render Video</span>
        </button>
      </div>

      {/* --- BODY SCROLLABLE --- */}
      <div className="flex-1 overflow-y-auto p-4 space-y-5 custom-scrollbar">
        {/* Token Efficiency Status Banner */}
        {lastTokenResult && (
          <div className="p-2.5 bg-zinc-900 border border-zinc-800 rounded-md flex items-center justify-between text-xs">
            <div className="flex items-center gap-1.5 text-zinc-300 font-mono text-[11px]">
              <Zap className="w-3.5 h-3.5 text-emerald-400" />
              <span>{lastTokenResult.type === "cached" ? "Cache Interceptor (0-Token)" : "LLM Enriched"}</span>
            </div>
            <span className="text-[10px] font-mono bg-zinc-800 text-zinc-300 px-2 py-0.5 rounded border border-zinc-700">
              {lastTokenResult.type === "cached" ? "Saved ~480 Tokens" : "~140 Tokens"}
            </span>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB: ASSETS (First Frame, Character Sheet, Background Environment) */}
        {/* ========================================================================= */}
        {(inspectorTab === "assets" || inspectorTab === "prompts") && (
          <div className="space-y-4">
            {/* --- 1. FIRST FRAME KEYFRAME --- */}
            <div className="bg-zinc-900/80 border border-zinc-800 rounded-md p-3 space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded bg-zinc-800 flex items-center justify-center text-zinc-300">
                    <ImageIcon className="w-3.5 h-3.5" />
                  </div>
                  <span className="text-xs font-semibold text-zinc-200 uppercase font-mono tracking-wider">
                    First Frame Keyframe
                  </span>
                </div>
                {scene.firstFrameUrl && (
                  <span className="text-[10px] font-mono text-emerald-400 flex items-center gap-1">
                    <Check className="w-3 h-3" /> Ready
                  </span>
                )}
              </div>

              {/* Preview Slot & Upload */}
              <div className="grid grid-cols-2 gap-3 items-center">
                <label className="block aspect-[9/16] bg-zinc-950 border border-dashed border-zinc-800 hover:border-zinc-600 rounded-md overflow-hidden cursor-pointer relative group transition-colors">
                  <input type="file" accept="image/*" className="hidden" onChange={(e) => handleFrameUpload(e, false)} />
                  {scene.firstFrameUrl ? (
                    <img src={scene.firstFrameUrl} alt="First Frame" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center p-2 text-center text-zinc-600 group-hover:text-zinc-400 transition-colors">
                      <Upload className="w-5 h-5 mb-1.5 opacity-60" />
                      <span className="text-[10px] font-mono">Drop Keyframe</span>
                    </div>
                  )}
                </label>

                <div className="flex flex-col justify-between h-full py-1 space-y-2">
                  <p className="text-[10px] font-mono text-zinc-400 leading-relaxed">
                    Master starting keyframe conditioned on character and lighting profiles.
                  </p>

                  <button
                    onClick={() => onGenerateFrame(scene.sceneId, imagePrompt || scene.rawDelta)}
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
                        <span>Generate (FLUX)</span>
                      </>
                    )}
                  </button>

                  <label className="w-full py-1.5 px-2 rounded-md bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-[10px] font-mono text-center cursor-pointer transition-colors border border-zinc-700 flex items-center justify-center gap-1">
                    <Upload className="w-3 h-3" />
                    <span>Upload Custom</span>
                    <input type="file" accept="image/*" className="hidden" onChange={(e) => handleFrameUpload(e, false)} />
                  </label>
                </div>
              </div>
            </div>

            {/* --- 2. CHARACTER ASSET ANCHOR --- */}
            <div className="bg-zinc-900/80 border border-zinc-800 rounded-md p-3 space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded bg-zinc-800 flex items-center justify-center text-zinc-300">
                    <User className="w-3.5 h-3.5" />
                  </div>
                  <span className="text-xs font-semibold text-zinc-200 uppercase font-mono tracking-wider">
                    Character Asset (PuLID #42)
                  </span>
                </div>
                {charUrl && (
                  <span className="text-[10px] font-mono text-emerald-400 flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3" /> Anchored
                  </span>
                )}
              </div>

              {/* Preview & Controls */}
              <div className="grid grid-cols-2 gap-3 items-center">
                <label className="block aspect-[1/1] bg-zinc-950 border border-dashed border-zinc-800 hover:border-zinc-600 rounded-md overflow-hidden cursor-pointer relative group transition-colors">
                  <input type="file" accept="image/*" className="hidden" onChange={handleCharUpload} />
                  {charUrl ? (
                    <img src={charUrl} alt="Character Asset" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center p-2 text-center text-zinc-600 group-hover:text-zinc-400 transition-colors">
                      <User className="w-5 h-5 mb-1.5 opacity-60" />
                      <span className="text-[10px] font-mono">Upload Face Ref</span>
                    </div>
                  )}
                </label>

                <div className="flex flex-col justify-between h-full py-1 space-y-2">
                  <span className="text-[10px] font-mono text-zinc-400">
                    Facial geometry consistency locked via PuLID seed #42.
                  </span>

                  <button
                    onClick={() => {
                      if (onGenerateCharacter) {
                        onGenerateCharacter(scene.order, "char-1", charPrompt);
                      }
                    }}
                    disabled={isGeneratingCharacter}
                    className="w-full py-2 px-3 rounded-md bg-zinc-100 text-zinc-950 hover:bg-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50"
                  >
                    {isGeneratingCharacter ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Generating...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>Generate Sheet</span>
                      </>
                    )}
                  </button>

                  <label className="w-full py-1.5 px-2 rounded-md bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-[10px] font-mono text-center cursor-pointer transition-colors border border-zinc-700 flex items-center justify-center gap-1">
                    <Upload className="w-3 h-3" />
                    <span>Upload Ref</span>
                    <input type="file" accept="image/*" className="hidden" onChange={handleCharUpload} />
                  </label>
                </div>
              </div>

              {/* Character Appearance Prompt */}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] font-mono uppercase text-zinc-400">Appearance Prompt</label>
                  <button
                    onClick={() => copyToClipboard(charPrompt, "charPrompt")}
                    className="text-[9px] font-mono text-zinc-400 hover:text-white flex items-center gap-1"
                  >
                    {copiedField === "charPrompt" ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedField === "charPrompt" ? "Copied" : "Copy"}</span>
                  </button>
                </div>
                <textarea
                  value={charPrompt}
                  onChange={(e) => setCharPrompt(e.target.value)}
                  rows={2}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-md p-2 text-[11px] text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-zinc-700 resize-none font-mono leading-relaxed custom-scrollbar"
                  placeholder="Describe character physical traits, age, wardrobe..."
                />
              </div>
            </div>

            {/* --- 3. BACKGROUND / ENVIRONMENT ASSET --- */}
            <div className="bg-zinc-900/80 border border-zinc-800 rounded-md p-3 space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded bg-zinc-800 flex items-center justify-center text-zinc-300">
                    <Mountain className="w-3.5 h-3.5" />
                  </div>
                  <span className="text-xs font-semibold text-zinc-200 uppercase font-mono tracking-wider">
                    Background Environment
                  </span>
                </div>
                {bgUrl && (
                  <span className="text-[10px] font-mono text-emerald-400 flex items-center gap-1">
                    <Check className="w-3 h-3" /> Set
                  </span>
                )}
              </div>

              {/* Preview & Controls */}
              <div className="grid grid-cols-2 gap-3 items-center">
                <label className="block aspect-[16/9] bg-zinc-950 border border-dashed border-zinc-800 hover:border-zinc-600 rounded-md overflow-hidden cursor-pointer relative group transition-colors">
                  <input type="file" accept="image/*" className="hidden" onChange={handleBgUpload} />
                  {bgUrl ? (
                    <img src={bgUrl} alt="Background Asset" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center p-2 text-center text-zinc-600 group-hover:text-zinc-400 transition-colors">
                      <Mountain className="w-5 h-5 mb-1.5 opacity-60" />
                      <span className="text-[10px] font-mono">Upload Background</span>
                    </div>
                  )}
                </label>

                <div className="flex flex-col justify-between h-full py-1 space-y-2">
                  <span className="text-[10px] font-mono text-zinc-400">
                    {globalVault?.environmentAnchor?.lightingProfile || "Atmospheric rim lighting"}
                  </span>

                  <button
                    onClick={() => {
                      if (onGenerateBackground) {
                        onGenerateBackground(scene.order, bgPrompt);
                      }
                    }}
                    disabled={isGeneratingBackground}
                    className="w-full py-2 px-3 rounded-md bg-zinc-100 text-zinc-950 hover:bg-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50"
                  >
                    {isGeneratingBackground ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Generating...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>Generate BG</span>
                      </>
                    )}
                  </button>

                  <label className="w-full py-1.5 px-2 rounded-md bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-[10px] font-mono text-center cursor-pointer transition-colors border border-zinc-700 flex items-center justify-center gap-1">
                    <Upload className="w-3 h-3" />
                    <span>Upload Ref</span>
                    <input type="file" accept="image/*" className="hidden" onChange={handleBgUpload} />
                  </label>
                </div>
              </div>

              {/* Background Prompt */}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] font-mono uppercase text-zinc-400">Environment Prompt</label>
                  <button
                    onClick={() => copyToClipboard(bgPrompt, "bgPrompt")}
                    className="text-[9px] font-mono text-zinc-400 hover:text-white flex items-center gap-1"
                  >
                    {copiedField === "bgPrompt" ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedField === "bgPrompt" ? "Copied" : "Copy"}</span>
                  </button>
                </div>
                <textarea
                  value={bgPrompt}
                  onChange={(e) => setBgPrompt(e.target.value)}
                  rows={2}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-md p-2 text-[11px] text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-zinc-700 resize-none font-mono leading-relaxed custom-scrollbar"
                  placeholder="Describe location, lighting, atmosphere, time of day..."
                />
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB: PROMPTS & ZERO-TOKEN FRAMING */}
        {/* ========================================================================= */}
        {(inspectorTab === "prompts" || inspectorTab === "assets") && (
          <div className="space-y-4 pt-2 border-t border-zinc-800/80">
            {/* Camera Angle Selector */}
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
                rows={2}
                placeholder="Director intent for this scene..."
                className="w-full bg-zinc-900 border border-zinc-800 rounded-md p-2.5 text-xs text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-zinc-700 resize-none font-sans leading-relaxed custom-scrollbar"
              />
            </div>

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
                rows={3}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-md p-2.5 text-[11px] text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-zinc-700 resize-none font-mono leading-relaxed custom-scrollbar"
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
                rows={3}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-md p-2.5 text-[11px] text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-zinc-700 resize-none font-mono leading-relaxed custom-scrollbar"
              />
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB: VIDEO RENDER ENGINE */}
        {/* ========================================================================= */}
        {(inspectorTab === "video" || inspectorTab === "assets") && (
          <div className="space-y-3 pt-2 border-t border-zinc-800/80">
            <div className="flex items-center justify-between">
              <label className="text-[10px] font-mono uppercase tracking-wider text-zinc-400">
                Replicate Video Generation Engine
              </label>
              <span className="text-[9px] font-mono text-zinc-500">BYOK Key Configured</span>
            </div>

            <select
              value={selectedVideoModel}
              onChange={(e) => setSelectedVideoModel(e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-800 rounded-md px-2.5 py-1.5 text-xs text-zinc-200 focus:outline-none focus:border-zinc-700 cursor-pointer font-mono"
            >
              <option value="kling-2.5">Kling 2.5 Turbo Pro (Cinematic High-Perf)</option>
              <option value="wan-2.5">Wan 2.5 I2V (Alibaba Image-to-Video)</option>
              <option value="minimax">MiniMax Video-01 (Hailuo AI Directing)</option>
              <option value="luma-ray">Luma Ray (Action Physics)</option>
            </select>

            {/* Video Preview if generated */}
            {scene.videoUrl && (
              <div className="space-y-1.5">
                <label className="text-[10px] font-mono uppercase tracking-wider text-zinc-400">Generated Video</label>
                <div className="aspect-[9/16] max-h-56 w-full bg-zinc-900 rounded-md overflow-hidden border border-zinc-800 mx-auto">
                  <video src={scene.videoUrl} controls loop className="w-full h-full object-cover" />
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* --- FOOTER ACTIONS --- */}
      <div className="p-3 border-t border-zinc-800 bg-zinc-900/60 space-y-2">
        <button
          onClick={handleTriggerVideo}
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
              <span>Generate Video Clip</span>
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
