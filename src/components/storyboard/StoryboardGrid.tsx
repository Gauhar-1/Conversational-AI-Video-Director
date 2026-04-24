"use client";

import { useState, useMemo, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { IScene } from "@/models/Project";
import { ReactFlow, Controls, Background, useNodesState, useEdgesState, Node, Edge, MarkerType } from '@xyflow/react';
import '@xyflow/react/dist/style.css'; 

import { Maximize2, Minimize2 } from "lucide-react"; 

import { FrameNode } from "./nodes/FrameNode";
import { VideoNode } from "./nodes/VideoNode";
import { CharacterNode } from "./nodes/CharacterNode";
import { BackgroundNode } from "./nodes/BackgroundNode";
import { useStoryboard } from "./hooks/useStoryBoard";

export default function StoryboardCanvas({ activeProjectId, isExpanded, onExpand }: { activeProjectId: string | null, isExpanded: boolean, onExpand: (expanded: boolean) => void }) {


  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);

  const nodeTypes = useMemo(() => ({ 
    frameNode: FrameNode, 
    videoNode: VideoNode,
    characterNode: CharacterNode,
    backgroundNode: BackgroundNode
  }), []);

 // 2. Destructure everything from the hook
  const {
    storyboard,
    isLoading,
    generatedFrames,
    generatedVideos,
    generatedBgs,
    assetErrors,
    generatedChars,
    generateVideo,
    saveOverrides,
    generateImage
  } = useStoryboard(activeProjectId);

  const globalCharacters = useMemo(() => {
  const map = new Map();
  storyboard.forEach(scene => {
    scene.characters?.forEach((c: any) => {
      if (c.generated_url && !map.has(c.name)) {
        map.set(c.name, c); // Store unique characters that have an image
      }
    });
  });
  return Array.from(map.values());
}, [storyboard]);

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

      // Shared Edge Marker
      const marker = (color: string) => ({ type: MarkerType.ArrowClosed, color });

      // 1. LEFT: Start Frame Node
      const startNodeId = `start-${scene.scene_number}`;
      newNodes.push({
        id: startNodeId,
        type: 'frameNode',
        position: { x: baseX -100, y: yCenter },
        data: { scene, imageUrl: generatedFrames[startNodeId] }
      });
      // Route Right handle to Left handle
      newEdges.push({ id: `e-${startNodeId}-v`, source: startNodeId, sourceHandle: 'right', target: videoNodeId, targetHandle: 'left', type: 'smoothstep', animated: true, style: { stroke: '#6366f1', strokeWidth: 2 }, markerEnd: marker('#6366f1') });

      const nodeWidth = 288; // ~72 Tailwind w-72
const gap = 100;
const totalCharWidth = (characters.length * nodeWidth) + ((characters.length - 1) * gap);
const startX = baseX + videoOffsetX - (totalCharWidth / 2) + (nodeWidth / 2);

characters.forEach((char: any, charIndex: number) => {
  const charNodeId = `char-${char._id}-${scene.scene_number}`;
  
  newNodes.push({
    id: charNodeId,
    type: 'characterNode',
    position: { x: startX + (charIndex * (nodeWidth + gap)) -400, y: yCenter - 650 },
    data: { 
      scene, 
      character: char, 
      globalCharacters, // Pass global pool to the node
      imageUrl: generatedChars[charNodeId] || char.generated_url, // Prefer local state, fallback to DB
      isGenerating: !!generatedChars[charNodeId],
      error: assetErrors[charNodeId],
      onGenerate: (localPrompt: string, localRef: string | null) => generateImage(
        charNodeId, '/api/generate-character', 
        { prompt: localPrompt, reference_image: localRef, charId: char._id, sceneNumber: scene.scene_number }
      ),
      onSaveEdit: saveOverrides
    }
  });

  // Connect DOWNWARD to the Video Node's TOP handle
  newEdges.push({ 
    id: `e-${charNodeId}-v`, 
    source: charNodeId, 
    sourceHandle: 'bottom', // Modified
    target: videoNodeId, 
    targetHandle: 'top',    // Modified
    type: 'smoothstep', 
    animated: true, 
    style: { stroke: '#ec4899', strokeWidth: 2 }, 
    markerEnd: marker('#ec4899') 
  });
});

      // 3. BOTTOM: Background Node
      const bgNodeId = `bg-${scene.scene_number}`;
      newNodes.push({
        id: bgNodeId,
        type: 'backgroundNode',
        position: { x: baseX + videoOffsetX / 2, y: yCenter + 250 },
        data: { scene, imageUrl: generatedBgs[bgNodeId] }
      });
      // Route Right handle to Bottom handle
      newEdges.push({ id: `e-${bgNodeId}-v`, source: bgNodeId, sourceHandle: 'right', target: videoNodeId, targetHandle: 'bottom', type: 'smoothstep', animated: true, style: { stroke: '#fbbf24', strokeWidth: 2 }, markerEnd: marker('#fbbf24') });

      // 4. CENTER: Video Node
      newNodes.push({
        id: videoNodeId,
        type: 'videoNode',
        position: { x: baseX + videoOffsetX, y: yCenter },
        data: { scene, videoUrl: generatedVideos[scene.scene_number] }
      });

      // 5. TEMPORAL LINK
      if (index < storyboard.length - 1) {
        const nextScene = storyboard[index + 1];
        newEdges.push({
          id: `e-temporal-${scene.scene_number}`,
          source: videoNodeId,
          sourceHandle: 'right',
          target: `start-${nextScene.scene_number}`,
          targetHandle: 'left',
          type: 'smoothstep',
          animated: true,
          style: { stroke: '#14b8a6', strokeWidth: 4 }, 
          markerEnd: marker('#14b8a6')
        });
      }
    });

    setNodes(newNodes);
    setEdges(newEdges);
  }, [storyboard, generatedFrames, generatedChars, generatedBgs, generatedVideos]);

  const containerClasses = isExpanded 
    ? "fixed inset-4 z-[100] bg-[#0a0a0c] rounded-3xl shadow-2xl overflow-hidden border border-zinc-800 transition-all duration-700 ease-[cubic-bezier(0.23,1,0.32,1)]" 
    : "relative w-full h-full bg-[#0a0a0c] rounded-3xl overflow-hidden border border-zinc-800 transition-all duration-700 ease-[cubic-bezier(0.23,1,0.32,1)] min-h-[600px]";
  return (
    <div className={containerClasses}>
      
      {/* HUD Overlay / Maximize Controls */}
      <div className="absolute top-4 left-4 right-4 z-10 flex justify-between items-center pointer-events-none">
         <div className="bg-zinc-900/90 backdrop-blur-md px-4 py-2 rounded-xl border border-zinc-800 pointer-events-auto shadow-lg flex items-center gap-2">
           <h2 className="text-sm font-bold text-zinc-100 flex items-center gap-2">
             🎬 Key Instance Pipeline
           </h2>
         </div>
         
         <button 
           onClick={() => onExpand(!isExpanded)} 
           className="p-2.5 bg-zinc-900/90 hover:bg-zinc-800 text-zinc-300 hover:text-white rounded-xl border border-zinc-800 pointer-events-auto shadow-lg transition-all duration-300 active:scale-95"
         >
           {isExpanded ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
         </button>
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
        {/* Restored Zoom Controls */}
        <Controls 
          className="bg-zinc-900 border-zinc-800 fill-zinc-400 mb-4 ml-4" 
          showInteractive={false} 
        />
      </ReactFlow>

    </div>
  );
}