"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { IScene } from "@/models/Project";
import { ReactFlow, Controls, Background, useNodesState, useEdgesState, Node, Edge, MarkerType } from '@xyflow/react';
import '@xyflow/react/dist/style.css'; 

import { Maximize2, Minimize2, Play, Download, X, Film, Loader2 } from "lucide-react"; 

import { FrameNode } from "./nodes/FrameNode";
import { VideoNode } from "./nodes/VideoNode";
import { CharacterNode } from "./nodes/CharacterNode";
import { BackgroundNode } from "./nodes/BackgroundNode";
import { useStoryboard } from "./hooks/useStoryBoard";

export default function StoryboardCanvas({ activeProjectId, isExpanded, onExpand }: { activeProjectId: string | null, isExpanded: boolean, onExpand: (expanded: boolean) => void }) {

  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);

  // --- NEW STATES FOR PREVIEW & EXPORT ---
  const [showPreview, setShowPreview] = useState(false);
  const [currentPlayIndex, setCurrentPlayIndex] = useState(0);
  const [isExporting, setIsExporting] = useState(false);
  const previewVideoRef = useRef<HTMLVideoElement>(null);

  const nodeTypes = useMemo(() => ({ 
    frameNode: FrameNode, 
    videoNode: VideoNode,
    characterNode: CharacterNode,
    backgroundNode: BackgroundNode
  }), []);

  const {
    storyboard,
    isLoading,
    generatedFrames,
    generatedVideos,
    generatedBgs,
    assetErrors,
    generatedChars,
    generateVideo,
    generatingAssets,
    saveOverrides,
    generateImage
  } = useStoryboard(activeProjectId);

  const globalCharacters = useMemo(() => {
    const map = new Map();
    storyboard.forEach(scene => {
      scene.characters?.forEach((c: any) => {
        if (c.generated_url && !map.has(c.name)) {
          map.set(c.name, c);
        }
      });
    });
    return Array.from(map.values());
  }, [storyboard]);

  // --- PREVIEW & EXPORT LOGIC ---
  
  // 1. Gather all valid videos in chronological order
  const compiledVideos = useMemo(() => {
    return storyboard
      .map(scene => generatedVideos[scene.scene_number] || scene.video_url)
      .filter(url => url !== null && url !== undefined); // Only keep completed scenes
  }, [storyboard, generatedVideos]);

  // 2. Sequential Downloader
  const handleExport = async () => {
    if (compiledVideos.length === 0) return alert("No videos generated yet!");
    setIsExporting(true);

    try {
      for (let i = 0; i < compiledVideos.length; i++) {
        const url = compiledVideos[i];
        const response = await fetch(url);
        const blob = await response.blob();
        const blobUrl = URL.createObjectURL(blob);
        
        const a = document.createElement("a");
        a.href = blobUrl;
        a.download = `Project_${activeProjectId}_Scene_${i + 1}.mp4`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(blobUrl);
        
        // Slight delay to prevent browser from blocking multiple downloads
        await new Promise(res => setTimeout(res, 800)); 
      }
    } catch (error) {
      console.error("Export failed:", error);
      alert("Failed to download some clips.");
    } finally {
      setIsExporting(false);
    }
  };


  // --- NODE & EDGE CONSTRUCTION ---
  useEffect(() => {
    if (storyboard.length === 0) return;

    const newNodes: Node[] = [];
    const newEdges: Edge[] = [];

    const sceneWidth = 1200; 
    const videoOffsetX = 600; 
    const yCenter = 400; 

    storyboard.forEach((scene, index) => {
      const baseX = index * sceneWidth; 
      const characters = scene.characters?.length ? scene.characters : [{ _id: 'char-1', name: 'Main Subject', appearance_prompt: 'Character ref' }];
      const videoNodeId = `video-${scene.scene_number}`;

      const marker = (color: string) => ({ type: MarkerType.ArrowClosed, color });

      // 1. LEFT: Start Frame Node
      const startNodeId = `start-${scene.scene_number}`;
      newNodes.push({
        id: startNodeId,
        type: 'frameNode',
        position: { x: baseX - 100, y: yCenter },
        data: { 
          scene, 
          prompt: scene.frame_prompt,
          imageUrl: generatedFrames[startNodeId] || scene.frame_url,
          isGenerating: !!generatingAssets[startNodeId],
          error: assetErrors[startNodeId],
          onGenerate: (localPrompt: string, localRef: string | null) => generateImage(
            startNodeId, '/api/generate-frame', { prompt: localPrompt, reference_image: localRef, sceneNumber: scene.scene_number }
          ),
          onSaveEdit: saveOverrides
        }
      });
      newEdges.push({ id: `e-${startNodeId}-v`, source: startNodeId, sourceHandle: 'right', target: videoNodeId, targetHandle: 'left', type: 'smoothstep', animated: true, style: { stroke: '#6366f1', strokeWidth: 2 }, markerEnd: marker('#6366f1') });

      const nodeWidth = 288; 
      const gap = 100;
      const totalCharWidth = (characters.length * nodeWidth) + ((characters.length - 1) * gap);
      const startX = baseX + videoOffsetX - (totalCharWidth / 2) + (nodeWidth / 2);

      characters.forEach((char: any, charIndex: number) => {
        const charNodeId = `char-${char._id}-${scene.scene_number}`;
        
        newNodes.push({
          id: charNodeId,
          type: 'characterNode',
          position: { x: startX + (charIndex * (nodeWidth + gap)) - 400, y: yCenter - 650 },
          data: { 
            scene, character: char, globalCharacters, 
            imageUrl: generatedChars[charNodeId] || char.generated_url,
            isGenerating: !!generatingAssets[charNodeId],
            error: assetErrors[charNodeId],
            onGenerate: (localPrompt: string, localRef: string | null) => generateImage(
              charNodeId, '/api/generate-character', { prompt: localPrompt, reference_image: localRef, charId: char._id, sceneNumber: scene.scene_number }
            ),
            onSaveEdit: saveOverrides
          }
        });

        newEdges.push({ id: `e-${charNodeId}-v`, source: charNodeId, sourceHandle: 'bottom', target: videoNodeId, targetHandle: 'top', type: 'smoothstep', animated: true, style: { stroke: '#ec4899', strokeWidth: 2 }, markerEnd: marker('#ec4899') });
      });

      // 3. BOTTOM: Background Node
      const bgNodeId = `bg-${scene.scene_number}`;
      newNodes.push({
        id: bgNodeId,
        type: 'backgroundNode',
        position: { x: baseX + videoOffsetX / 2, y: yCenter + 250 },
        data: { 
          scene, prompt: scene.environment_prompt,
          imageUrl: generatedBgs[bgNodeId] || scene.background_url,
          isGenerating: !!generatingAssets[bgNodeId],
          error: assetErrors[bgNodeId],
          onGenerate: (localPrompt: string, localRef: string | null) => generateImage(
            bgNodeId, '/api/generate-background', { prompt: localPrompt, reference_image: localRef, sceneNumber: scene.scene_number }
          ),
          onSaveEdit: saveOverrides
        }
      });
      newEdges.push({ id: `e-${bgNodeId}-v`, source: bgNodeId, sourceHandle: 'top', target: videoNodeId, targetHandle: 'bottom', type: 'smoothstep', animated: true, style: { stroke: '#fbbf24', strokeWidth: 2 }, markerEnd: marker('#fbbf24') });

      // 4. CENTER: Video Node
      newNodes.push({
        id: videoNodeId,
        type: 'videoNode',
        position: { x: baseX + videoOffsetX , y: yCenter  },
        data: { 
          scene, prompt: scene.video_prompt,
          videoUrl: generatedVideos[scene.scene_number] || scene.video_url,
          isGenerating: !!generatingAssets[videoNodeId],
          error: assetErrors[videoNodeId],
          onGenerate: (localPrompt: string) => generateVideo(
            scene.scene_number, localPrompt, generatedFrames[startNodeId] || scene.frame_url
          ),
          onSaveEdit: saveOverrides
        }
      });

      // 5. TEMPORAL LINK
      if (index < storyboard.length - 1) {
        const nextScene = storyboard[index + 1];
        newEdges.push({
          id: `e-temporal-${scene.scene_number}`, source: videoNodeId, sourceHandle: 'right', target: `start-${nextScene.scene_number}`, targetHandle: 'left', type: 'smoothstep', animated: true, style: { stroke: '#14b8a6', strokeWidth: 4 }, markerEnd: marker('#14b8a6')
        });
      }
    });

    setNodes(newNodes);
    setEdges(newEdges);
  }, [storyboard, generatedFrames, generatedChars, generatedBgs, generatedVideos, generatingAssets, assetErrors]);


  const containerClasses = isExpanded 
    ? "fixed inset-4 z-[100] bg-[#0a0a0c] rounded-3xl shadow-2xl overflow-hidden border border-zinc-800 transition-all duration-700 ease-[cubic-bezier(0.23,1,0.32,1)]" 
    : "relative w-full h-full bg-[#0a0a0c] rounded-3xl overflow-hidden border border-zinc-800 transition-all duration-700 ease-[cubic-bezier(0.23,1,0.32,1)] min-h-[600px]";
  
  return (
    <div className={containerClasses}>
      
      {/* HUD Overlay / Controls */}
      <div className="absolute top-4 left-4 right-4 z-10 flex justify-between items-center pointer-events-none">
         <div className="bg-zinc-900/90 backdrop-blur-md px-4 py-2 rounded-xl border border-zinc-800 pointer-events-auto shadow-lg flex items-center gap-2">
           <h2 className="text-sm font-bold text-zinc-100 flex items-center gap-2">
             🎬 Key Instance Pipeline
           </h2>
         </div>
         
         <div className="flex items-center gap-3 pointer-events-auto">
            {/* NEW: Play Sequence Button */}
            <button 
              onClick={() => { setCurrentPlayIndex(0); setShowPreview(true); }}
              disabled={compiledVideos.length === 0}
              className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600/90 hover:bg-indigo-500 text-white rounded-xl border border-indigo-500/50 shadow-[0_0_15px_rgba(99,102,241,0.4)] transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Play className="w-4 h-4 fill-current" />
              <span className="text-xs font-bold">Director's Cut</span>
            </button>

            {/* NEW: Download All Button */}
            <button 
              onClick={handleExport}
              disabled={compiledVideos.length === 0 || isExporting}
              className="flex items-center gap-2 px-4 py-2.5 bg-teal-600/90 hover:bg-teal-500 text-white rounded-xl border border-teal-500/50 shadow-[0_0_15px_rgba(20,184,166,0.4)] transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isExporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
              <span className="text-xs font-bold">{isExporting ? "Zipping..." : "Export Content"}</span>
            </button>

            {/* Expand/Collapse Button */}
            <button 
              onClick={() => onExpand(!isExpanded)} 
              className="p-2.5 bg-zinc-900/90 hover:bg-zinc-800 text-zinc-300 hover:text-white rounded-xl border border-zinc-800 shadow-lg transition-all duration-300 active:scale-95 ml-2"
            >
              {isExpanded ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
            </button>
         </div>
      </div>

      {/* React Flow Engine */}
      <ReactFlow 
        nodes={nodes} 
        edges={edges} 
        onNodesChange={onNodesChange} 
        onEdgesChange={onEdgesChange} 
        nodeTypes={nodeTypes} 
        fitView
        minZoom={0.1}
        maxZoom={1.5}
      >
        <Background color="#27272a" gap={24} size={2} />
        <Controls className="bg-zinc-900 border-zinc-800 fill-zinc-400 mb-4 ml-4" showInteractive={false} />
      </ReactFlow>

      {/* --- CINEMATIC PREVIEW MODAL --- */}
      {showPreview && (
        <div className="fixed inset-0 z-[200] bg-black/95 backdrop-blur-xl flex flex-col items-center justify-center p-8 animate-in fade-in duration-300">
          
          <div className="absolute top-6 right-6 flex items-center gap-4">
            <span className="text-zinc-500 font-mono text-sm tracking-widest">
              SCENE {currentPlayIndex + 1} OF {compiledVideos.length}
            </span>
            <button 
              onClick={() => setShowPreview(false)}
              className="p-3 bg-zinc-900/50 hover:bg-zinc-800 text-white rounded-full border border-zinc-700 transition-all hover:rotate-90"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          <div className="relative w-full max-w-6xl aspect-video bg-zinc-950 rounded-2xl overflow-hidden shadow-[0_0_100px_rgba(99,102,241,0.15)] ring-1 ring-zinc-800">
            {compiledVideos.length > 0 ? (
              <video 
                ref={previewVideoRef}
                src={compiledVideos[currentPlayIndex]} 
                autoPlay 
                controls={false}
                className="w-full h-full object-contain"
                // The magic trick: When a video ends, instantly play the next one!
                onEnded={() => {
                  if (currentPlayIndex < compiledVideos.length - 1) {
                    setCurrentPlayIndex(prev => prev + 1);
                  } else {
                    // Loop back to start when finished
                    setCurrentPlayIndex(0);
                  }
                }}
              />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center text-zinc-500 gap-4">
                <Film className="w-16 h-16 opacity-20" />
                <p>No rendered scenes available.</p>
              </div>
            )}
          </div>
          
          {/* Progress Indicator */}
          <div className="flex gap-2 mt-8">
            {compiledVideos.map((_, idx) => (
              <div 
                key={idx} 
                className={`h-1.5 rounded-full transition-all duration-500 ${idx === currentPlayIndex ? 'w-8 bg-indigo-500 shadow-[0_0_10px_rgba(99,102,241,0.8)]' : 'w-2 bg-zinc-800'}`}
              />
            ))}
          </div>

        </div>
      )}

    </div>
  );
}