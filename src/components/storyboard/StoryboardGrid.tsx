"use client";

import { useState, useMemo, useRef, useCallback } from "react";
import { 
  ReactFlow, 
  Controls, 
  Background, 
  Node, 
  Edge 
} from "@xyflow/react";
import "@xyflow/react/dist/style.css"; 

import { 
  Play, Download, X, Film, Loader2, 
  User, Mountain, Smartphone, Monitor,
  Network, LayoutList, SlidersHorizontal
} from "lucide-react"; 

import { SceneMacroNode } from "./nodes/SceneMacroNode";
import { FrameNode } from "./nodes/FrameNode";
import { VideoNode } from "./nodes/VideoNode";
import { CharacterNode } from "./nodes/CharacterNode";
import { BackgroundNode } from "./nodes/BackgroundNode";
import NodeInspector from "./NodeInspector";
import { useStoryboard } from "./hooks/useStoryBoard";
import { compileFCPXML, downloadFCPXML } from "@/lib/fcpxml";
import { CameraAngle, ISceneDoc } from "@/models/Project";

// Static node types defined outside component to prevent React Flow re-registration loops
const NODE_TYPES = { 
  sceneMacroNode: SceneMacroNode,
  frameNode: FrameNode, 
  videoNode: VideoNode,
  characterNode: CharacterNode,
  backgroundNode: BackgroundNode
};

type StoryboardCanvasProps = {
  activeProjectId: string | null;
  isExpanded?: boolean;
  onExpand?: (expanded: boolean) => void;
};

export default function StoryboardCanvas({ 
  activeProjectId, 
  isExpanded = true, 
  onExpand 
}: StoryboardCanvasProps) {
  // View mode: "graph" (Cluster multi-node) vs "timeline" (Macro linear sequence)
  const [viewMode, setViewMode] = useState<"graph" | "timeline">("graph");

  // Preview & Export States
  const [showPreview, setShowPreview] = useState(false);
  const [currentPlayIndex, setCurrentPlayIndex] = useState(0);
  const [isExporting, setIsExporting] = useState(false);
  const [exportNotice, setExportNotice] = useState<string | null>(null);
  const previewVideoRef = useRef<HTMLVideoElement>(null);

  const { 
    scenes, 
    globalVault, 
    storyboard,
    enrichingScenes, 
    lastTokenResult,
    enrichSceneDelta,
    updateScene,
    updateVault,
    generateSceneFrame,
    generateSceneCharacter,
    generateSceneBackground,
    generateSceneVideo,
    generatedFrames,
    generatedChars,
    generatedBgs,
    generatedVideos,
    generatingAssets
  } = useStoryboard(activeProjectId);

  // Normalize scenes: Support projects saved under scenes or storyboard schema
  const effectiveScenes: ISceneDoc[] = useMemo(() => {
    if (scenes && scenes.length > 0) return scenes;
    if (storyboard && storyboard.length > 0) {
      const angles: CameraAngle[] = ["CAM_A_CENTER", "CAM_B_45_CLOSE", "CAM_C_OTS"];
      return storyboard.map((s: any, idx: number) => ({
        sceneId: `scene-${s.scene_number || idx + 1}`,
        order: s.scene_number || idx + 1,
        duration: 10,
        cameraAngle: angles[idx % 3],
        rawDelta: s.action || s.location || `Scene ${idx + 1} action`,
        imagePrompt: s.frame_prompt || `Scene ${idx + 1} composition`,
        motionPrompt: s.video_prompt || `Scene ${idx + 1} motion physics`,
        firstFrameUrl: s.frame_url || "",
        lastFrameUrl: "",
        videoUrl: s.video_url || "",
        status: "ready" as const,
      }));
    }
    return [];
  }, [scenes, storyboard]);

  // Selection & Inspector state
  const [selectedSceneId, setSelectedSceneId] = useState<string | null>(null);
  const [isInspectorOpen, setIsInspectorOpen] = useState(false);

  // Derive selectedScene deterministically without state syncing loops
  const selectedScene = useMemo(() => {
    if (!selectedSceneId && effectiveScenes.length > 0) {
      return effectiveScenes[0];
    }
    if (!selectedSceneId) return null;
    return effectiveScenes.find((s) => s.sceneId === selectedSceneId) || effectiveScenes[0] || null;
  }, [effectiveScenes, selectedSceneId]);

  // Derive matching storyboard item for rich character and environment prompts
  const selectedStoryboardItem = useMemo(() => {
    if (!selectedScene) return null;
    return storyboard.find((sb: any) => sb.scene_number === selectedScene.order) || null;
  }, [storyboard, selectedScene]);

  // Handle selecting a scene node
  const handleSelectScene = useCallback((scene: ISceneDoc) => {
    setSelectedSceneId(scene.sceneId);
    setIsInspectorOpen(true);
  }, []);

  // Handle changing angle on node
  const handleUpdateAngle = useCallback((sceneId: string, angle: CameraAngle) => {
    const sc = effectiveScenes.find((s) => s.sceneId === sceneId);
    if (sc) {
      enrichSceneDelta(sceneId, sc.rawDelta, angle);
    }
  }, [effectiveScenes, enrichSceneDelta]);

  // Gather all valid videos in chronological order
  const compiledVideos = useMemo(() => {
    return effectiveScenes
      .map(s => s.videoUrl)
      .filter((url): url is string => Boolean(url && url.trim() !== ""));
  }, [effectiveScenes]);

  // FCPXML Compiler & Downloader
  const handleExportFCPXML = () => {
    if (effectiveScenes.length === 0) {
      alert("No scenes available to export. Create scenes in Writer's Room first.");
      return;
    }

    try {
      setIsExporting(true);
      setExportNotice("Compiling FCPXML...");
      const projectName = `Director_AI_Sequence_${new Date().toISOString().slice(0, 10)}`;
      const fcpxmlString = compileFCPXML({ scenes: effectiveScenes, projectTitle: projectName });
      downloadFCPXML(fcpxmlString, `${projectName}.fcpxml`);

      setExportNotice("Exported (.fcpxml)");
      setTimeout(() => setExportNotice(null), 3000);
    } catch (err: any) {
      console.error("FCPXML Export Failed:", err);
      alert("Failed to export FCPXML: " + err.message);
    } finally {
      setIsExporting(false);
    }
  };

  const handleDownloadClips = async () => {
    if (compiledVideos.length === 0) return;
    for (let i = 0; i < compiledVideos.length; i++) {
      const a = document.createElement("a");
      a.href = compiledVideos[i];
      a.download = `Scene_${i + 1}_Clip.mp4`;
      a.target = "_blank";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      await new Promise(r => setTimeout(r, 600));
    }
  };

  // ---------------------------------------------------------------------------
  // DERIVE NODES DETERMINISTICALLY WITH useMemo
  // ---------------------------------------------------------------------------
  const nodes: Node[] = useMemo(() => {
    if (!effectiveScenes || effectiveScenes.length === 0) return [];

    // VIEW MODE 1: CLUSTER GRAPH VIEW (FrameNode, CharacterNode, BackgroundNode, VideoNode)
    if (viewMode === "graph") {
      const sceneSpacing = 1100;
      const startX = 60;
      const centerY = 360;

      const clusterNodes: Node[] = [];

      effectiveScenes.forEach((scene, index) => {
        const baseX = startX + index * sceneSpacing;
        const sbItem = storyboard.find((sb: any) => sb.scene_number === scene.order);

        const startNodeId = `start-${scene.order}`;
        const charNodeId = `char-char-1-${scene.order}`;
        const bgNodeId = `bg-${scene.order}`;
        const videoNodeId = `video-${scene.order}`;

        // 1. LEFT: Start Frame Node (Keyframe)
        const frameImg = generatedFrames[startNodeId] || scene.firstFrameUrl || sbItem?.frame_url || "";
        clusterNodes.push({
          id: startNodeId,
          type: "frameNode",
          position: { x: baseX, y: centerY },
          data: {
            scene: { ...scene, scene_number: scene.order, frame_prompt: scene.imagePrompt || sbItem?.frame_prompt },
            imageUrl: frameImg,
            isGenerating: Boolean(generatingAssets[startNodeId] || generatingAssets[scene.sceneId]),
            onGenerate: (localPrompt: string) => generateSceneFrame(scene.sceneId, localPrompt),
            onSaveEdit: (prompt: string, _ref: string | null, uploadUrl?: string) => {
              updateScene(scene.sceneId, { 
                imagePrompt: prompt, 
                firstFrameUrl: uploadUrl || scene.firstFrameUrl 
              });
            },
            onSelect: () => handleSelectScene(scene),
          },
          selected: selectedSceneId === scene.sceneId,
        });

        // 2. TOP: Character Node
        const charData = sbItem?.characters?.[0] || {
          _id: "char-1",
          name: "Main Subject",
          appearance_prompt: globalVault?.characterAnchor?.description || "Lead protagonist with cinematic detailing",
        };
        const charImg = generatedChars[charNodeId] || charData.generated_url || globalVault?.characterAnchor?.imageUrl || "";

        clusterNodes.push({
          id: charNodeId,
          type: "characterNode",
          position: { x: baseX + 340, y: centerY - 320 },
          data: {
            scene: { ...scene, scene_number: scene.order },
            character: charData,
            globalCharacters: [],
            imageUrl: charImg,
            isGenerating: Boolean(generatingAssets[charNodeId]),
            onGenerate: (localPrompt: string) => generateSceneCharacter(scene.order, "char-1", localPrompt),
            onSaveEdit: (_sceneNum: number, _type: string, _id: string, prompt: string, _ref: string | null, uploadUrl?: string) => {
              updateVault({
                characterAnchor: {
                  ...globalVault?.characterAnchor,
                  description: prompt,
                  imageUrl: uploadUrl || globalVault?.characterAnchor?.imageUrl,
                },
              });
            },
            onSelect: () => handleSelectScene(scene),
          },
          selected: selectedSceneId === scene.sceneId,
        });

        // 3. BOTTOM: Background Node
        const bgImg = generatedBgs[bgNodeId] || sbItem?.background_url || globalVault?.environmentAnchor?.imageUrl || "";
        const bgPrompt = sbItem?.environment_prompt || globalVault?.environmentAnchor?.description || "Cinematic environment atmosphere";

        clusterNodes.push({
          id: bgNodeId,
          type: "backgroundNode",
          position: { x: baseX + 340, y: centerY + 280 },
          data: {
            scene: { ...scene, scene_number: scene.order },
            prompt: bgPrompt,
            imageUrl: bgImg,
            isGenerating: Boolean(generatingAssets[bgNodeId]),
            onGenerate: (localPrompt: string, refImage?: string | null) => 
              generateSceneBackground(scene.order, localPrompt, refImage || undefined),
            onSaveEdit: (_sceneNum: number, _type: string, _id: string, prompt: string, _ref: string | null, uploadUrl?: string) => {
              updateVault({
                environmentAnchor: {
                  ...globalVault?.environmentAnchor,
                  description: prompt,
                  imageUrl: uploadUrl || globalVault?.environmentAnchor?.imageUrl,
                },
              });
            },
            onSelect: () => handleSelectScene(scene),
          },
          selected: selectedSceneId === scene.sceneId,
        });

        // 4. CENTER: Video Node
        const videoUrl = generatedVideos[scene.order] || scene.videoUrl || sbItem?.video_url || "";
        clusterNodes.push({
          id: videoNodeId,
          type: "videoNode",
          position: { x: baseX + 340, y: centerY },
          data: {
            scene: { ...scene, scene_number: scene.order, video_prompt: scene.motionPrompt || sbItem?.video_prompt },
            prompt: scene.motionPrompt || sbItem?.video_prompt || scene.rawDelta,
            videoUrl: videoUrl,
            isGenerating: Boolean(generatingAssets[scene.sceneId]),
            onGenerate: (localPrompt: string, selectedModel: string) => {
              generateSceneVideo(scene.sceneId, localPrompt, selectedModel, {
                startFrameUrl: frameImg,
                characterReferenceUrls: charImg ? [charImg] : [],
                backgroundReferenceUrl: bgImg || undefined,
              });
            },
            onSaveEdit: (_sceneNum: number, _type: string, _id: string, prompt: string, uploadUrl?: string) => {
              updateScene(scene.sceneId, {
                motionPrompt: prompt,
                videoUrl: uploadUrl || scene.videoUrl,
              });
            },
            onSelect: () => handleSelectScene(scene),
          },
          selected: selectedSceneId === scene.sceneId,
        });
      });

      return clusterNodes;
    }

    // VIEW MODE 2: TIMELINE MACRO SEQUENCE VIEW (SceneMacroNode)
    const HORIZONTAL_SPACING = 340;
    const START_X = 80;
    const START_Y = 160;

    return effectiveScenes.map((scene, index) => {
      const nodeX = START_X + index * HORIZONTAL_SPACING;
      const nodeY = START_Y;
      const sbItem = storyboard.find((sb: any) => sb.scene_number === scene.order);

      return {
        id: scene.sceneId,
        type: "sceneMacroNode",
        position: { x: nodeX, y: nodeY },
        data: {
          scene,
          storyboardItem: sbItem,
          globalVault,
          onSelect: handleSelectScene,
          onUpdateAngle: handleUpdateAngle,
          onEnrichDelta: enrichSceneDelta,
          isEnriching: Boolean(enrichingScenes[scene.sceneId]),
        },
        selected: selectedSceneId === scene.sceneId,
      };
    });
  }, [
    viewMode,
    effectiveScenes,
    storyboard,
    globalVault,
    selectedSceneId,
    enrichingScenes,
    generatingAssets,
    generatedFrames,
    generatedChars,
    generatedBgs,
    generatedVideos,
    handleSelectScene,
    handleUpdateAngle,
    enrichSceneDelta,
    generateSceneFrame,
    generateSceneCharacter,
    generateSceneBackground,
    generateSceneVideo,
    updateScene,
    updateVault,
  ]);

  // ---------------------------------------------------------------------------
  // DERIVE EDGES DETERMINISTICALLY WITH useMemo
  // ---------------------------------------------------------------------------
  const edges: Edge[] = useMemo(() => {
    if (!effectiveScenes || effectiveScenes.length === 0) return [];

    // VIEW MODE 1: CLUSTER GRAPH EDGES
    if (viewMode === "graph") {
      const clusterEdges: Edge[] = [];

      effectiveScenes.forEach((scene, index) => {
        const startNodeId = `start-${scene.order}`;
        const charNodeId = `char-char-1-${scene.order}`;
        const bgNodeId = `bg-${scene.order}`;
        const videoNodeId = `video-${scene.order}`;

        // 1. Frame -> Video (horizontal input)
        clusterEdges.push({
          id: `e-${startNodeId}-${videoNodeId}`,
          source: startNodeId,
          target: videoNodeId,
          sourceHandle: "right",
          targetHandle: "left",
          type: "smoothstep",
          animated: true,
          style: { stroke: "#a1a1aa", strokeWidth: 2 },
        });

        // 2. Character -> Video (top-down input)
        clusterEdges.push({
          id: `e-${charNodeId}-${videoNodeId}`,
          source: charNodeId,
          target: videoNodeId,
          sourceHandle: "bottom",
          targetHandle: "top",
          type: "smoothstep",
          animated: true,
          style: { stroke: "#71717a", strokeWidth: 2 },
        });

        // 3. Background -> Video (bottom-up input)
        clusterEdges.push({
          id: `e-${bgNodeId}-${videoNodeId}`,
          source: bgNodeId,
          target: videoNodeId,
          sourceHandle: "top",
          targetHandle: "bottom",
          type: "smoothstep",
          animated: true,
          style: { stroke: "#71717a", strokeWidth: 2 },
        });

        // 4. Temporal Progression Link: Video -> Next Scene's Keyframe
        if (index < effectiveScenes.length - 1) {
          const nextScene = effectiveScenes[index + 1];
          const nextStartId = `start-${nextScene.order}`;
          clusterEdges.push({
            id: `e-temporal-${scene.order}-${nextScene.order}`,
            source: videoNodeId,
            target: nextStartId,
            sourceHandle: "right",
            targetHandle: "left",
            type: "smoothstep",
            animated: true,
            style: { stroke: "#e4e4e7", strokeWidth: 2.5 },
          });
        }
      });

      return clusterEdges;
    }

    // VIEW MODE 2: TIMELINE MACRO EDGES
    if (effectiveScenes.length <= 1) return [];

    const result: Edge[] = [];
    for (let index = 1; index < effectiveScenes.length; index++) {
      const prevSceneId = effectiveScenes[index - 1].sceneId;
      const currentSceneId = effectiveScenes[index].sceneId;

      result.push({
        id: `edge-${prevSceneId}-${currentSceneId}`,
        source: prevSceneId,
        target: currentSceneId,
        sourceHandle: "right",
        targetHandle: "left",
        type: "smoothstep",
        animated: true,
        style: {
          stroke: "#71717a",
          strokeWidth: 2,
        },
      });
    }
    return result;
  }, [viewMode, effectiveScenes]);

  const charDesc = globalVault?.characterAnchor?.description || "Lead protagonist with cinematic detailing";
  const envDesc = globalVault?.environmentAnchor?.description || "Volumetric neon atmospheric environment";
  const isNineSixteen = globalVault?.aspectRatio === "9:16";

  return (
    <div className="relative w-full h-full bg-zinc-950 flex overflow-hidden">
      {/* Main Canvas Area */}
      <div className="flex-1 h-full relative overflow-hidden flex flex-col">
        {/* --- TOP HUD BAR --- */}
        <div className="absolute top-4 left-4 right-4 z-10 flex justify-between items-center pointer-events-none">
          {/* Left: Key Instance Pipeline + Mode Switcher + Global Continuity Vault Header */}
          <div className="flex items-center gap-2 pointer-events-auto flex-wrap">
            {/* View Mode Switcher */}
            <div className="bg-zinc-900 border border-zinc-800 p-1 rounded-md shadow-md flex items-center gap-1">
              <button
                onClick={() => setViewMode("graph")}
                className={`px-2.5 py-1 rounded text-xs font-mono font-medium flex items-center gap-1.5 transition-colors ${
                  viewMode === "graph"
                    ? "bg-zinc-100 text-zinc-950 font-semibold"
                    : "text-zinc-400 hover:text-zinc-200"
                }`}
                title="Node Graph Compositor View (Full Asset Breakdown)"
              >
                <Network className="w-3.5 h-3.5" />
                <span>Graph View</span>
              </button>

              <button
                onClick={() => setViewMode("timeline")}
                className={`px-2.5 py-1 rounded text-xs font-mono font-medium flex items-center gap-1.5 transition-colors ${
                  viewMode === "timeline"
                    ? "bg-zinc-100 text-zinc-950 font-semibold"
                    : "text-zinc-400 hover:text-zinc-200"
                }`}
                title="Linear Sequence Timeline View"
              >
                <LayoutList className="w-3.5 h-3.5" />
                <span>Sequence View</span>
              </button>
            </div>

            {/* GLOBAL CONTINUITY VAULT */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-md px-3 py-1 shadow-md flex items-center gap-3">
              {/* Character Anchor */}
              <div 
                className="flex items-center gap-1.5 cursor-help group relative" 
                title={`Character Anchor: ${charDesc} (PuLID Seed: #42)`}
              >
                <div className="w-5 h-5 rounded overflow-hidden bg-zinc-800 border border-zinc-700 flex items-center justify-center shrink-0">
                  {globalVault?.characterAnchor?.imageUrl ? (
                    <img src={globalVault.characterAnchor.imageUrl} alt="Character" className="w-full h-full object-cover" />
                  ) : (
                    <User className="w-3 h-3 text-zinc-400" />
                  )}
                </div>
                <span className="text-[11px] font-mono text-zinc-300 max-w-[120px] truncate hidden md:inline">
                  {charDesc}
                </span>
              </div>

              <div className="w-px h-4 bg-zinc-800" />

              {/* Environment Anchor */}
              <div 
                className="flex items-center gap-1.5 cursor-help group relative"
                title={`Environment Anchor: ${envDesc}`}
              >
                <div className="w-5 h-5 rounded overflow-hidden bg-zinc-800 border border-zinc-700 flex items-center justify-center shrink-0">
                  {globalVault?.environmentAnchor?.imageUrl ? (
                    <img src={globalVault.environmentAnchor.imageUrl} alt="Environment" className="w-full h-full object-cover" />
                  ) : (
                    <Mountain className="w-3 h-3 text-zinc-400" />
                  )}
                </div>
                <span className="text-[11px] font-mono text-zinc-300 max-w-[120px] truncate hidden md:inline">
                  {envDesc}
                </span>
              </div>

              <div className="w-px h-4 bg-zinc-800" />

              {/* Aspect Ratio Toggle (9:16 vertical vs 16:9 cinematic) */}
              <button
                onClick={() => updateVault({ aspectRatio: isNineSixteen ? "16:9" : "9:16" })}
                className="flex items-center gap-1 px-1.5 py-0.5 rounded border border-zinc-800 bg-zinc-950 text-[10px] font-mono text-zinc-300 hover:text-white hover:border-zinc-700 transition-colors"
                title="Toggle Aspect Ratio"
              >
                {isNineSixteen ? <Smartphone className="w-3 h-3 text-emerald-400" /> : <Monitor className="w-3 h-3 text-zinc-400" />}
                <span>{globalVault?.aspectRatio || "9:16"}</span>
              </button>
            </div>

            {/* Zero-Token Delta Engine Indicator */}
            {lastTokenResult && (
              <div className="bg-zinc-900 border border-zinc-800 rounded-md px-2.5 py-1 text-[10px] font-mono text-zinc-300 shadow-md flex items-center gap-1.5 hidden xl:flex">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span>Saved {lastTokenResult.tokensSaved} tokens (Cache Hit)</span>
              </div>
            )}
          </div>

          {/* Right: Actions (Sequence Preview & Final Cut Pro Export) */}
          <div className="flex items-center gap-2 pointer-events-auto">
            {/* Inspector Toggle Button */}
            {selectedScene && !isInspectorOpen && (
              <button
                onClick={() => setIsInspectorOpen(true)}
                className="h-8 px-3 rounded-md bg-zinc-900 hover:bg-zinc-800 text-zinc-200 border border-zinc-800 text-xs font-medium flex items-center gap-1.5 transition-colors shadow-md"
                title="Open Studio Inspector"
              >
                <SlidersHorizontal className="w-3.5 h-3.5 text-zinc-400" />
                <span>Inspector</span>
              </button>
            )}

            {/* Play Timeline Button */}
            {compiledVideos.length > 0 && (
              <button
                onClick={() => {
                  setCurrentPlayIndex(0);
                  setShowPreview(true);
                }}
                className="h-8 px-3 rounded-md bg-zinc-100 text-zinc-950 hover:bg-white text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-lg"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Play Cut ({compiledVideos.length})</span>
              </button>
            )}

            {/* FCPXML Timeline Export */}
            <button
              onClick={handleExportFCPXML}
              disabled={isExporting || effectiveScenes.length === 0}
              className="h-8 px-3 rounded-md bg-zinc-900 hover:bg-zinc-800 text-zinc-200 border border-zinc-800 text-xs font-medium flex items-center gap-1.5 transition-colors disabled:opacity-50 shadow-md"
              title="Export 9:16 Sequence Timeline to Final Cut Pro / Premiere"
            >
              {isExporting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Film className="w-3.5 h-3.5 text-zinc-400" />}
              <span>{exportNotice || "Export FCPXML"}</span>
            </button>

            {/* Download MP4 Clips */}
            {compiledVideos.length > 0 && (
              <button
                onClick={handleDownloadClips}
                className="h-8 px-2.5 rounded-md bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-800 text-xs flex items-center gap-1 transition-colors shadow-md"
                title="Download All Generated Clips"
              >
                <Download className="w-3.5 h-3.5 text-zinc-400" />
              </button>
            )}
          </div>
        </div>

        {/* --- REACT FLOW CANVAS --- */}
        <div className="w-full h-full">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            nodeTypes={NODE_TYPES}
            fitView
            fitViewOptions={{ padding: 0.35, maxZoom: 1.1 }}
            minZoom={0.15}
            maxZoom={2}
            className="bg-zinc-950"
          >
            <Background color="#27272a" gap={24} size={1} />
            <Controls className="!bg-zinc-900 !border !border-zinc-800 !rounded-md !shadow-xl !fill-zinc-300" />
          </ReactFlow>
        </div>

        {/* --- FULLSCREEN SEQUENCE PLAYER MODAL --- */}
        {showPreview && (
          <div className="fixed inset-0 z-50 bg-black/95 backdrop-blur-md flex flex-col items-center justify-center p-6 animate-in fade-in duration-200">
            <button 
              onClick={() => setShowPreview(false)}
              className="absolute top-6 right-6 p-2 rounded-md bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="w-full max-w-sm aspect-[9/16] bg-zinc-900 rounded-md overflow-hidden border border-zinc-800 relative shadow-2xl flex items-center justify-center">
              <video 
                ref={previewVideoRef}
                src={compiledVideos[currentPlayIndex]} 
                className="w-full h-full object-cover"
                autoPlay 
                controls
                onEnded={() => {
                  if (currentPlayIndex < compiledVideos.length - 1) {
                    setCurrentPlayIndex(prev => prev + 1);
                  } else {
                    setShowPreview(false);
                  }
                }}
              />
              
              <div className="absolute top-3 left-3 px-2 py-1 bg-zinc-950/80 rounded border border-zinc-800 text-[10px] font-mono text-zinc-300">
                Scene {currentPlayIndex + 1} of {compiledVideos.length}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* --- SCENE INSPECTOR DRAWER --- */}
      {isInspectorOpen && selectedScene && (
        <NodeInspector
          scene={selectedScene}
          storyboardItem={selectedStoryboardItem}
          globalVault={globalVault}
          isOpen={isInspectorOpen}
          projectId={activeProjectId}
          onClose={() => setIsInspectorOpen(false)}
          onUpdateScene={updateScene}
          onUpdateVault={updateVault}
          onEnrichDelta={enrichSceneDelta}
          onGenerateFrame={generateSceneFrame}
          onGenerateCharacter={generateSceneCharacter}
          onGenerateBackground={generateSceneBackground}
          onGenerateVideo={generateSceneVideo}
          isEnriching={Boolean(enrichingScenes[selectedScene.sceneId])}
          isGeneratingVideo={Boolean(generatingAssets[selectedScene.sceneId])}
          isGeneratingFrame={Boolean(generatingAssets[`start-${selectedScene.order}`] || generatingAssets[selectedScene.sceneId])}
          isGeneratingCharacter={Boolean(generatingAssets[`char-char-1-${selectedScene.order}`])}
          isGeneratingBackground={Boolean(generatingAssets[`bg-${selectedScene.order}`])}
          lastTokenResult={lastTokenResult}
        />
      )}
    </div>
  );
}