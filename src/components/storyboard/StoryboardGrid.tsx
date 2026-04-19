"use client";

import { useState, memo, useEffect, useRef, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { IScene } from "@/models/Project";
import { Maximize2, Minimize2, Image as ImageIcon, Film, Loader2, Sparkles, CheckCircle2, Play, ChevronDown, ChevronUp, Edit2, Save, AlertCircle, X, PanelRightClose, PanelRightOpen } from "lucide-react";

import { 
  ReactFlow, 
  Controls, 
  Background, 
  Handle, 
  Position, 
  NodeProps, 
  Edge, 
  Node,
  useNodesState,
  useEdgesState
} from '@xyflow/react';
import '@xyflow/react/dist/style.css'; 

// ==========================================
// 1. THE CUSTOM NODE 
// ==========================================
const CustomSceneNode = memo(({ data }: NodeProps) => {
  const { 
    scene, imageUrl, videoUrl, 
    isImgGenerating, isVideoGenerating, 
    imgError, videoError, 
    onGenerateImage, onGenerateVideo, onSaveEdit, onInspect
  } = data as any;
  
  const [isExpanded, setIsExpanded] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  
  const [editAction, setEditAction] = useState(scene.action);
  const [editCamera, setEditCamera] = useState(scene.camera_movement);

  // 1. HOVER TO PLAY LOGIC
  const videoRef = useRef<HTMLVideoElement>(null);
  const handleMouseEnter = () => videoRef.current?.play().catch(() => {});
  const handleMouseLeave = () => {
    if (videoRef.current) {
      videoRef.current.pause();
      // Optional: reset to start -> videoRef.current.currentTime = 0;
    }
  };

  const handleSave = () => {
    onSaveEdit(scene.scene_number, editAction, editCamera);
    setIsEditing(false);
  };

  return (
    <div className="relative group/node">
      
      {/* 2. GLOWING RUNNING BACKGROUNDS */}
      {/* Image Generation Glow (Purple) */}
      {isImgGenerating && (
        <div className="absolute -inset-1.5 bg-gradient-to-r from-purple-600 via-pink-600 to-purple-600 rounded-2xl blur-md opacity-75 animate-pulse z-0" />
      )}
      {/* Video Generation Glow (Green/Teal) */}
      {isVideoGenerating && (
        <div className="absolute -inset-1.5 bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-500 rounded-2xl blur-md opacity-75 animate-pulse z-0" />
      )}

      {/* Main Node Container */}
      <div className="relative w-[400px] bg-zinc-900/95 backdrop-blur-xl border border-zinc-700/80 rounded-2xl overflow-hidden shadow-2xl flex flex-col transition-all duration-300 z-10">
        
        <Handle type="target" position={Position.Left} className="w-3 h-3 bg-indigo-500 border-2 border-zinc-900" />
        
        {/* Top Header */}
        <div className="bg-zinc-950/80 px-4 py-2 border-b border-zinc-800 flex justify-between items-center cursor-grab active:cursor-grabbing">
           <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold text-xs shadow-inner">
                 {scene.scene_number}
              </div>
              <span className="text-xs font-mono text-indigo-300 bg-indigo-900/30 px-2 py-0.5 rounded border border-indigo-500/30">
                 {scene.timestamp}
              </span>
           </div>
           <div className="flex items-center gap-1">
             {/* Open Side Inspector Button (Only if both exist) */}
             {(imageUrl || videoUrl) && (
               <button onClick={() => onInspect(scene)} className="p-1.5 text-zinc-400 hover:text-indigo-400 hover:bg-zinc-800 rounded transition-colors nodrag" title="Inspect Scene">
                 <PanelRightOpen className="w-4 h-4" />
               </button>
             )}
             <button onClick={() => setIsEditing(!isEditing)} className="p-1.5 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded transition-colors nodrag">
               {isEditing ? <Save onClick={handleSave} className="w-4 h-4 text-green-400" /> : <Edit2 className="w-4 h-4" />}
             </button>
             <button onClick={() => setIsExpanded(!isExpanded)} className="p-1.5 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded transition-colors nodrag">
               {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
             </button>
           </div>
        </div>

        {/* Visual Canvas Area */}
        <div 
          className="relative w-full aspect-video bg-black flex items-center justify-center overflow-hidden nodrag"
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
        >
          {videoUrl ? (
             <video ref={videoRef} src={videoUrl} loop muted playsInline className="w-full h-full object-cover transition-opacity duration-300" />
          ) : imageUrl ? (
             <img src={imageUrl} alt={`Scene ${scene.scene_number}`} className="w-full h-full object-cover" />
          ) : (
             <div className="absolute inset-0 flex flex-col items-center justify-center text-zinc-600 gap-2">
                <ImageIcon className="w-8 h-8 opacity-50" />
                <p className="text-xs font-medium">Awaiting Visuals</p>
             </div>
          )}

          {/* 3. ERROR OVERLAYS */}
          {(imgError || videoError) && (
            <div className="absolute inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 text-center z-10">
              <div className="flex flex-col items-center gap-2">
                <AlertCircle className="w-8 h-8 text-red-500" />
                <p className="text-xs text-red-200 font-medium bg-red-950/50 px-3 py-1 rounded-md border border-red-900/50">
                  {imgError || videoError}
                </p>
              </div>
            </div>
          )}

          {/* Action Buttons Overlay */}
          <div className={`absolute bottom-3 right-3 flex gap-2 transition-opacity duration-300 z-20 ${videoUrl ? 'opacity-0 group-hover/node:opacity-100' : 'opacity-100'}`}>
            {!videoUrl && (
              <button 
                onClick={onGenerateImage} disabled={isImgGenerating || isVideoGenerating}
                className="flex items-center gap-1.5 bg-zinc-800/90 hover:bg-zinc-700 text-white px-3 py-1.5 rounded-md text-xs font-bold shadow-lg disabled:opacity-50 transition-all backdrop-blur-md border border-zinc-600"
              >
                {isImgGenerating ? <Loader2 className="w-3 h-3 animate-spin" /> : <ImageIcon className="w-3 h-3" />}
                {imageUrl ? "Redo" : "Generate"}
              </button>
            )}
            
            {imageUrl && (
              <button 
                onClick={onGenerateVideo} disabled={isVideoGenerating}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold shadow-lg disabled:opacity-50 transition-all backdrop-blur-md border ${
                  videoUrl ? 'bg-green-600/90 hover:bg-green-500 border-green-500/50' : 'bg-purple-600/90 hover:bg-purple-500 text-white border-purple-500/50'
                }`}
              >
                {isVideoGenerating ? <Loader2 className="w-3 h-3 animate-spin" /> : videoUrl ? <CheckCircle2 className="w-3 h-3" /> : <Sparkles className="w-3 h-3" />}
                {isVideoGenerating ? "Rendering..." : videoUrl ? "Redo Video" : "Animate"}
              </button>
            )}
          </div>
        </div>

        {/* Node Meta Data (Expandable) */}
        <div className={`flex flex-col bg-zinc-900 transition-all duration-300 nodrag ${isExpanded ? 'p-4 border-t border-zinc-800' : 'h-0 overflow-hidden'}`}>
          <div className="space-y-3">
            <div>
               <h4 className="text-[10px] uppercase tracking-widest text-zinc-500 font-semibold mb-1">Action</h4>
               {isEditing ? (
                 <textarea value={editAction} onChange={e => setEditAction(e.target.value)} className="w-full bg-zinc-950 text-sm text-zinc-300 p-2 rounded border border-indigo-500/50 outline-none resize-none h-20" />
               ) : (
                 <p className="text-sm text-zinc-300 leading-relaxed">{scene.action}</p>
               )}
            </div>
            <div>
               <h4 className="text-[10px] uppercase tracking-widest text-zinc-500 font-semibold mb-1">Camera</h4>
               {isEditing ? (
                 <input type="text" value={editCamera} onChange={e => setEditCamera(e.target.value)} className="w-full bg-zinc-950 text-sm text-purple-300 p-2 rounded border border-indigo-500/50 outline-none" />
               ) : (
                 <p className="text-sm font-medium text-purple-400">{scene.camera_movement}</p>
               )}
            </div>
          </div>
        </div>

        <Handle type="source" position={Position.Right} className="w-3 h-3 bg-indigo-500 border-2 border-zinc-900" />
      </div>
    </div>
  );
});

// ==========================================
// 2. PARENT COMPONENT: The Infinite Canvas
// ==========================================
export default function StoryboardCanvas({ activeProjectId, isExpanded, onExpand }: { activeProjectId: string | null; isExpanded?: boolean; onExpand?: () => void; }) {
  const [generatedImages, setGeneratedImages] = useState<Record<number, string>>({});
  const [generatedVideos, setGeneratedVideos] = useState<Record<number, string>>({});
  
  // Advanced Load/Error States
  const [generatingImgIds, setGeneratingImgIds] = useState<Record<number, boolean>>({}); 
  const [generatingVideoIds, setGeneratingVideoIds] = useState<Record<number, boolean>>({}); 
  const [imgErrors, setImgErrors] = useState<Record<number, string>>({});
  const [videoErrors, setVideoErrors] = useState<Record<number, string>>({});
  
  // 4. SIDE DRAWER STATE
  const [inspectedScene, setInspectedScene] = useState<IScene | null>(null);
  
const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);

  const nodeTypes = useMemo(() => ({ sceneNode: CustomSceneNode }), []);

  const { data: project, isLoading, isFetching } = useQuery<{ storyboard: IScene[] }>({
    queryKey: ["storyboardData", activeProjectId], 
    queryFn: async () => {
      if (!activeProjectId) return { storyboard: [] };
      const res = await fetch(`/api/projects/${activeProjectId}`);
      if (!res.ok) throw new Error("Failed to fetch");
      return await res.json(); 
    },
    enabled: !!activeProjectId, 
  });

  const storyboard = project?.storyboard || [];

  useEffect(() => {
    if (storyboard.length === 0) return;

    const newNodes: Node[] = storyboard.map((scene, index) => ({
      id: scene.scene_number.toString(),
      type: 'sceneNode',
      position: { x: index * 500, y: 150 }, 
      data: {
        scene,
        imageUrl: generatedImages[scene.scene_number] || scene.image_url,
        videoUrl: generatedVideos[scene.scene_number] || scene.video_url,
        isImgGenerating: !!generatingImgIds[scene.scene_number],
        isVideoGenerating: !!generatingVideoIds[scene.scene_number],
        imgError: imgErrors[scene.scene_number],
        videoError: videoErrors[scene.scene_number],
        onGenerateImage: () => generateImageForScene(scene.scene_number, scene.generation_prompt),
        onGenerateVideo: () => generateVideoForScene(scene, generatedImages[scene.scene_number] || scene.image_url || ""),
        onInspect: (s: IScene) => setInspectedScene(s),
        onSaveEdit: (id: number, action: string, camera: string) => {
          console.log(`Saved Scene ${id}:`, action, camera);
        }
      }
    }));

    const newEdges: Edge[] = storyboard.slice(0, -1).map((scene, index) => ({
      id: `edge-${scene.scene_number}-${storyboard[index + 1].scene_number}`,
      source: scene.scene_number.toString(),
      target: storyboard[index + 1].scene_number.toString(),
      animated: true, 
      type: 'smoothstep', 
      style: { stroke: '#6366f1', strokeWidth: 3 }, 
    }));

    setNodes(newNodes);
    setEdges(newEdges);
  }, [storyboard, generatedImages, generatedVideos, generatingImgIds, generatingVideoIds, imgErrors, videoErrors]);

  const generateImageForScene = async (sceneNumber: number, prompt: string) => {
    if (!activeProjectId) return;
    
    // Reset states for this node
    setGeneratingImgIds(prev => ({ ...prev, [sceneNumber]: true }));
    setImgErrors(prev => ({ ...prev, [sceneNumber]: "" }));
    
    const cleanPrompt = prompt.replace(/['"\n\r]/g, '').trim();
    const finalPrompt = `${cleanPrompt}, cinematic lighting, highly detailed masterpiece`;

    try {
      const response = await fetch("/api/generate-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: finalPrompt, projectId: activeProjectId, sceneNumber: sceneNumber }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Generation failed");
      
      setGeneratedImages(prev => ({ ...prev, [sceneNumber]: data.imageUrl }));
    } catch (error: any) {
      setImgErrors(prev => ({ ...prev, [sceneNumber]: error.message }));
    } finally {
      setGeneratingImgIds(prev => ({ ...prev, [sceneNumber]: false }));
    }
  };

  const generateVideoForScene = async (scene: IScene, imageUrl: string) => {
    if (!imageUrl) return alert("Generate an image first!");
    
    // Reset states for this node
    setGeneratingVideoIds(prev => ({ ...prev, [scene.scene_number]: true }));
    setVideoErrors(prev => ({ ...prev, [scene.scene_number]: "" }));

    try {
      const prompt = `Cinematic 4k masterpiece. Location: ${scene.location}. Action: ${scene.action}. Camera: ${scene.camera_movement}.`;

      const submitRes = await fetch("/api/generate-video", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: imageUrl, prompt: prompt })
      });
      
      const submitData = await submitRes.json();
      if (!submitRes.ok) throw new Error(submitData.error || "Submission failed");

      const pollInterval = setInterval(async () => {
        try {
          const pollRes = await fetch("/api/generate-video", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ requestId: submitData.requestId, projectId: activeProjectId, sceneNumber: scene.scene_number })
          });
          
          const pollData = await pollRes.json();
          
          if (pollData.status === "success") {
            clearInterval(pollInterval);
            setGeneratedVideos(prev => ({ ...prev, [scene.scene_number]: pollData.videoUrl }));
            setGeneratingVideoIds(prev => ({ ...prev, [scene.scene_number]: false }));
          } else if (pollData.error) {
            clearInterval(pollInterval);
            setGeneratingVideoIds(prev => ({ ...prev, [scene.scene_number]: false }));
            setVideoErrors(prev => ({ ...prev, [scene.scene_number]: pollData.error }));
          }
        } catch (e) {
          console.error("Polling error:", e);
        }
      }, 5000); 

    } catch (error: any) {
      setGeneratingVideoIds(prev => ({ ...prev, [scene.scene_number]: false }));
      setVideoErrors(prev => ({ ...prev, [scene.scene_number]: error.message }));
    }
  };


  const showLoading = isLoading || (isFetching && !project?.storyboard?.length);

  if (showLoading) {
    return (
      <div className="flex flex-col h-full bg-zinc-950 border border-zinc-800/80 rounded-3xl p-8 items-center justify-center text-center shadow-2xl">
        <div className="relative mb-6">
          <div className="w-16 h-16 rounded-2xl border-2 border-indigo-500/30 animate-spin absolute inset-0" />
          <div className="w-16 h-16 rounded-2xl bg-zinc-900 border border-zinc-700 flex items-center justify-center rotate-3 relative shadow-xl">
            <span className="text-2xl">🎬</span>
          </div>
        </div>
        <h2 className="text-xl font-semibold text-zinc-200 mb-2">Loading Canvas...</h2>
      </div>
    );
  }

  if (storyboard.length === 0) {
    return (
      <div className="flex flex-col h-full bg-zinc-900/30 border border-zinc-800/50 rounded-3xl p-8 items-center justify-center text-center">
        <div className="w-16 h-16 mb-6 rounded-2xl bg-zinc-800 border border-zinc-700 flex items-center justify-center rotate-3 mx-auto shadow-xl">
          <span className="text-2xl">🎬</span>
        </div>
        <h2 className="text-xl font-semibold text-zinc-200 mb-2">Director's Canvas</h2>
        <p className="text-zinc-500 max-w-sm">Awaiting your script to generate timeline nodes.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-zinc-950 border border-zinc-800/80 shadow-2xl rounded-3xl relative overflow-hidden transition-all duration-700">
      
      {/* Top Control Bar */}
      <div className="absolute top-4 left-4 right-4 z-10 flex justify-between items-center pointer-events-none">
         <div className="bg-zinc-900/80 backdrop-blur-md px-4 py-2 rounded-xl border border-zinc-800 pointer-events-auto shadow-lg">
           <h2 className="text-sm font-bold text-zinc-100 flex items-center gap-2">
             🎬 <span>Workflow Canvas</span>
           </h2>
         </div>
         {onExpand && (
           <button onClick={onExpand} className="p-2.5 bg-zinc-900/80 hover:bg-zinc-800 text-zinc-300 rounded-xl border border-zinc-800 pointer-events-auto transition-colors shadow-lg">
             {isExpanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
           </button>
         )}
      </div>
      
      {/* 5. SIDE DRAWER (Inspector Panel) */}
      <div className={`absolute top-0 right-0 h-full w-96 bg-zinc-950/95 backdrop-blur-3xl border-l border-zinc-800 z-40 transition-transform duration-500 ease-[cubic-bezier(0.23,1,0.32,1)] shadow-2xl ${inspectedScene ? 'translate-x-0' : 'translate-x-full'}`}>
        {inspectedScene && (
          <div className="h-full flex flex-col">
            <div className="p-4 border-b border-zinc-800 flex items-center justify-between bg-zinc-900/50">
              <h3 className="font-bold text-white flex items-center gap-2">
                <PanelRightClose className="w-4 h-4 text-indigo-400" />
                Scene {inspectedScene.scene_number} Inspector
              </h3>
              <button onClick={() => setInspectedScene(null)} className="p-1.5 hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-white transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 space-y-6 custom-scrollbar">
              
              {/* Video Preview */}
              <div className="space-y-2">
                <h4 className="text-[10px] uppercase tracking-widest text-zinc-500 font-semibold flex items-center gap-2"><Film className="w-3 h-3" /> Final Video Output</h4>
                <div className="aspect-video bg-black rounded-lg border border-zinc-800 overflow-hidden relative">
                  {(generatedVideos[inspectedScene.scene_number] || inspectedScene.video_url) ? (
                    <video src={generatedVideos[inspectedScene.scene_number] || inspectedScene.video_url} autoPlay loop muted playsInline className="w-full h-full object-cover" />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center text-zinc-700 text-xs font-medium">No Video Generated</div>
                  )}
                </div>
              </div>

              {/* Image Reference */}
              <div className="space-y-2">
                <h4 className="text-[10px] uppercase tracking-widest text-zinc-500 font-semibold flex items-center gap-2"><ImageIcon className="w-3 h-3" /> Initial Image Reference</h4>
                <div className="aspect-video bg-black rounded-lg border border-zinc-800 overflow-hidden relative opacity-80 hover:opacity-100 transition-opacity">
                  {(generatedImages[inspectedScene.scene_number] || inspectedScene.image_url) ? (
                    <img src={generatedImages[inspectedScene.scene_number] || inspectedScene.image_url} alt="Reference" className="w-full h-full object-cover" />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center text-zinc-700 text-xs font-medium">No Image Generated</div>
                  )}
                </div>
              </div>

              {/* Metadata */}
              <div className="p-4 bg-zinc-900/50 rounded-xl border border-zinc-800/50 space-y-4">
                <div>
                  <h4 className="text-[10px] uppercase tracking-widest text-zinc-500 font-semibold mb-1">Action Prompt</h4>
                  <p className="text-sm text-zinc-300 leading-relaxed">{inspectedScene.action}</p>
                </div>
                <div>
                  <h4 className="text-[10px] uppercase tracking-widest text-zinc-500 font-semibold mb-1">Camera Movement</h4>
                  <p className="text-sm text-purple-400 font-medium">{inspectedScene.camera_movement}</p>
                </div>
              </div>

            </div>
          </div>
        )}
      </div>

      {/* React Flow Engine */}
      <div className="w-full h-full bg-[#0a0a0c]">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          nodeTypes={nodeTypes}
          fitView 
          minZoom={0.1}
          maxZoom={1.5}
          proOptions={{ hideAttribution: true }} 
        >
          <Background color="#27272a" gap={24} size={2} />
          <Controls className="bg-zinc-900 border-zinc-800 fill-zinc-400 mb-4" />
        </ReactFlow>
      </div>
    </div>
  );
}