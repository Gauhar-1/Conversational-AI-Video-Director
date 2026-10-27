import { memo, useRef, useState, useEffect } from "react";
import { Handle, Position, NodeProps } from '@xyflow/react';
import { useQuery } from '@tanstack/react-query';
import { 
  Film, Loader2, AlertCircle, Sparkles, Edit2, X, Save, 
  Upload, PlayCircle, ChevronDown, Info, 
  Layers, Zap, AlertTriangle
} from "lucide-react";
import { DIRECTOR_MODELS } from "@/config/modelRegistry";

// Studio-Grade Monochromatic Theme Engine (Zinc)
const getModelTheme = (_modelId: string) => {
  return {
    bg: "bg-zinc-900",
    border: "border-zinc-800",
    text: "text-zinc-100",
    hover: "hover:bg-zinc-800 hover:border-zinc-700",
    badge: "bg-zinc-800 text-zinc-300 border-zinc-700"
  };
};

export const VideoNode = memo(({ data }: NodeProps) => {
  const { 
    scene, prompt, videoUrl, isGenerating: isStartingRequest, 
    error: localError, onGenerate, onSaveEdit, onSelect 
  } = data as any;
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const directUploadRef = useRef<HTMLInputElement>(null);

  const [isEditing, setIsEditing] = useState(false);
  const [editedPrompt, setEditedPrompt] = useState(prompt || "");
  
  const [selectedModel, setSelectedModel] = useState("kling-2.5");
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const { data: taskData } = useQuery({
    queryKey: ['video-status', scene?.video_task_id],
    queryFn: async () => {
      if (!scene?.video_task_id) return null;
      const repKey = typeof window !== "undefined" ? localStorage.getItem("director_replicate_key") : null;
      const res = await fetch(`/api/generate-video/status/${scene.video_task_id}`, {
        headers: repKey ? { "X-Replicate-Key": repKey } : {},
      });
      if (!res.ok) throw new Error("Failed to fetch status");
      return res.json();
    },
    enabled: !!scene?.video_task_id && scene?.status !== 'completed' && scene?.status !== 'failed',
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      if (status === 'completed' || status === 'failed') return false;
      return 3000;
    }
  });

  const isTaskProcessing = taskData?.status === "processing" || taskData?.status === "pending";
  const isProcessing = isStartingRequest || isTaskProcessing;
  const displayVideoUrl = taskData?.finalVideoUrl || videoUrl;
  const displayError = taskData?.error || localError;
  const hasLogs = taskData?.logs && taskData.logs.length > 0;

  useEffect(() => {
    setEditedPrompt(prompt || "");
  }, [prompt]);

  const handleDirectVideoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        onSaveEdit(scene?.scene_number, 'video', `video-${scene?.scene_number}`, editedPrompt, reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = () => {
    onSaveEdit(scene?.scene_number, 'video', `video-${scene?.scene_number}`, editedPrompt);
    setIsEditing(false);
  };

  const executeGeneration = () => {
    onGenerate(editedPrompt, selectedModel);
  };

  const activeTheme = getModelTheme(selectedModel);

  return (
    <div className="relative group/node w-[380px]">
      {/* INPUT HANDLES */}
      <Handle type="target" position={Position.Left} id="left" className="w-3 h-3 bg-zinc-400 border border-zinc-950 left-[-6px]" />
      <Handle type="target" position={Position.Top} id="top" className="w-3 h-3 bg-zinc-400 border border-zinc-950 top-[-6px]" />
      <Handle type="target" position={Position.Bottom} id="bottom" className="w-3 h-3 bg-zinc-400 border border-zinc-950 bottom-[-6px]" />

      <div 
        onClick={() => onSelect && onSelect(scene)}
        className="relative bg-zinc-900 border border-zinc-800 rounded-md shadow-xl z-10 flex flex-col transition-colors hover:border-zinc-700 cursor-pointer"
      >
        {/* HEADER */}
        <div className="bg-zinc-950 px-3.5 py-2.5 border-b border-zinc-800 flex justify-between items-center rounded-t-md nodrag">
          <div className="flex items-center gap-2.5">
            <div className="bg-zinc-800 p-1.5 rounded text-zinc-300">
              <Film className="w-3.5 h-3.5" />
            </div>
            <div className="flex flex-col">
              <span className="text-xs uppercase font-semibold text-zinc-100 tracking-wider">Scene {scene?.scene_number} Clip</span>
            </div>
          </div>
          <button 
            onClick={() => setIsEditing(!isEditing)} 
            className={`p-1 rounded transition-colors border ${isEditing ? 'bg-zinc-100 text-zinc-950 border-zinc-100' : 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:text-white hover:bg-zinc-800'}`}
          >
            {isEditing ? <X className="w-3.5 h-3.5" /> : <Edit2 className="w-3.5 h-3.5" />}
          </button>
        </div>

        {/* --- EDITING MODE --- */}
        {isEditing ? (
          <div className="p-3 bg-zinc-950 border-b border-zinc-800 nodrag space-y-3">
            {/* MODEL SELECTOR */}
            <div className="relative z-50">
              <label className="text-[10px] uppercase font-mono text-zinc-500 block mb-1">Target Video Engine</label>
              
              <button 
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-md px-3 py-2 flex justify-between items-center text-xs text-zinc-100 hover:border-zinc-700 transition-colors"
              >
                <div className="flex flex-col items-start">
                  <span className="font-semibold text-zinc-100">{DIRECTOR_MODELS[selectedModel]?.name || selectedModel}</span>
                  <span className="text-[10px] text-zinc-500 font-mono">{DIRECTOR_MODELS[selectedModel]?.provider || "Replicate"}</span>
                </div>
                <ChevronDown className={`w-3.5 h-3.5 text-zinc-400 transition-transform ${isMenuOpen ? 'rotate-180' : ''}`} />
              </button>

              {/* DROPDOWN */}
              {isMenuOpen && (
                <div className="absolute top-full left-0 mt-1 w-full bg-zinc-950 border border-zinc-800 rounded-md shadow-2xl overflow-hidden z-50 p-1 space-y-1">
                  {Object.keys(DIRECTOR_MODELS).map(modelId => {
                    const model = DIRECTOR_MODELS[modelId];
                    const isSelected = selectedModel === modelId;
                    
                    return (
                      <div 
                        key={modelId}
                        onClick={() => { setSelectedModel(modelId); setIsMenuOpen(false); }}
                        className={`p-2 rounded cursor-pointer transition-colors border ${isSelected ? 'bg-zinc-900 border-zinc-700 text-white' : 'border-transparent hover:bg-zinc-900 text-zinc-300'}`}
                      >
                        <div className="flex justify-between items-center">
                          <span className="text-xs font-semibold">{model.name}</span>
                          <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-300 border border-zinc-700">{model.qualityTier}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* TEXTAREA */}
            <div className="space-y-1">
              <label className="text-[10px] uppercase font-mono text-zinc-500 block">Cinematic Instruction</label>
              <textarea 
                value={editedPrompt} 
                onChange={(e) => setEditedPrompt(e.target.value)}
                className="w-full bg-zinc-900 text-xs text-zinc-200 p-2 rounded-md border border-zinc-700 outline-none resize-none h-20 custom-scrollbar focus:border-zinc-500"
              />
            </div>

            <button 
              onClick={handleSave} 
              className="w-full text-xs bg-zinc-100 hover:bg-white text-zinc-950 py-2 rounded-md font-semibold transition-colors"
            >
              Lock Configuration
            </button>
          </div>
        ) : (
          <div className="p-3 bg-zinc-950 border-b border-zinc-800 nodrag">
             <div className="flex items-center gap-2 mb-1.5">
                <Layers className="w-3 h-3 text-zinc-400" />
                <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider">{DIRECTOR_MODELS[selectedModel]?.name || selectedModel}</span>
             </div>
             <p className="text-[11px] text-zinc-300 leading-relaxed max-h-16 overflow-y-auto custom-scrollbar pr-1">
                {taskData?.enhancedPrompt || editedPrompt || "No prompt provided."}
             </p>
             
             {/* Execution Logs */}
             {hasLogs && (
              <div className="mt-2 bg-zinc-900 border border-zinc-800 rounded p-2 max-h-16 overflow-y-auto custom-scrollbar">
                <span className="text-[9px] text-zinc-500 font-mono uppercase tracking-wider block mb-1">Logs</span>
                {taskData.logs.map((log: any, idx: number) => (
                  <div key={idx} className="text-[9px] text-zinc-400 leading-tight mb-0.5 font-mono">
                    <span className="text-zinc-300">[{log.providerName}]</span> {log.errorReason || "Processing"}
                  </div>
                ))}
              </div>
             )}
          </div>
        )}

        {/* --- VIDEO CANVAS --- */}
        <div 
          className="relative w-full aspect-video bg-zinc-950 flex items-center justify-center overflow-hidden"
          onMouseEnter={() => videoRef.current?.play().catch(()=>{})}
          onMouseLeave={() => videoRef.current?.pause()}
        >
          {displayVideoUrl ? (
            <video 
              ref={videoRef} 
              src={displayVideoUrl} 
              loop 
              muted 
              playsInline 
              className={`w-full h-full object-cover transition-opacity ${isProcessing ? 'opacity-30' : 'opacity-100'}`} 
            />
          ) : isProcessing ? null : (
            <div className="flex flex-col items-center text-zinc-600">
              <PlayCircle className="w-8 h-8 opacity-40 mb-2" />
              <p className="text-xs font-medium text-center">Ready for Render</p>
            </div>
          )}

          {isProcessing && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/60 backdrop-blur-sm z-10">
              <Loader2 className="w-6 h-6 text-zinc-400 animate-spin" />
              <span className="text-[10px] font-mono font-semibold text-zinc-300 tracking-wider uppercase">
                {taskData?.status === 'processing' ? 'Generating Clip...' : 'Queued...'}
              </span>
            </div>
          )}

          {displayError && !isProcessing && (
            <div className="absolute inset-0 bg-black/80 flex items-center justify-center p-4 text-center z-10">
              <div className="flex flex-col items-center gap-2">
                <AlertCircle className="w-6 h-6 text-red-500" />
                <p className="text-xs text-red-300">{displayError}</p>
              </div>
            </div>
          )}

          <div className="absolute bottom-2.5 right-2.5 flex items-center gap-1.5 z-20">
            <input type="file" accept="video/mp4,video/webm" className="hidden" ref={directUploadRef} onChange={handleDirectVideoUpload} />
            <button 
              onClick={() => directUploadRef.current?.click()} 
              disabled={isProcessing || isEditing}
              className="p-1.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white rounded-md border border-zinc-700 transition-colors disabled:opacity-50"
              title="Upload video clip"
            >
              <Upload className="w-3.5 h-3.5" />
            </button>
            <button 
              onClick={executeGeneration} 
              disabled={isProcessing || isEditing}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-100 hover:bg-white text-zinc-950 rounded-md text-xs font-semibold transition-colors disabled:opacity-50 shadow-sm"
            >
              {isProcessing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
              <span>{displayVideoUrl ? "Re-Render" : "Render"}</span>
            </button>
          </div>
        </div>
      </div>

      <Handle type="source" position={Position.Right} id="right" className="w-3 h-3 bg-zinc-100 border border-zinc-950 right-[-6px]" />
    </div>
  );
});

VideoNode.displayName = "VideoNode";