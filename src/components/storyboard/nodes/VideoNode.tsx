import { memo, useRef, useState, useEffect } from "react";
import { Handle, Position, NodeProps } from '@xyflow/react';
import { useQuery } from '@tanstack/react-query';
import { 
  Film, Loader2, AlertCircle, Sparkles, Edit2, X, Save, 
  Upload, PlayCircle, ChevronDown, CheckCircle, AlertTriangle, Info, 
  Layers, Zap, Coins
} from "lucide-react";
import { DIRECTOR_MODELS } from "@/config/modelRegistry";

// --- THEME ENGINE ---
// Maps models (or generic fallbacks) to specific Tailwind color palettes
const getModelTheme = (modelId: string) => {
  const themes: Record<string, { bg: string, border: string, text: string, hover: string, badge: string }> = {
    "seedance-2.0": { bg: "bg-cyan-950/30", border: "border-cyan-500/50", text: "text-cyan-400", hover: "hover:bg-cyan-900/30 hover:border-cyan-400", badge: "bg-cyan-500/10 text-cyan-400 border-cyan-500/20" },
    "runway-gen4.5": { bg: "bg-purple-950/30", border: "border-purple-500/50", text: "text-purple-400", hover: "hover:bg-purple-900/30 hover:border-purple-400", badge: "bg-purple-500/10 text-purple-400 border-purple-500/20" },
    "veo-3": { bg: "bg-blue-950/30", border: "border-blue-500/50", text: "text-blue-400", hover: "hover:bg-blue-900/30 hover:border-blue-400", badge: "bg-blue-500/10 text-blue-400 border-blue-500/20" },
    "kling-3-omni": { bg: "bg-amber-950/30", border: "border-amber-500/50", text: "text-amber-400", hover: "hover:bg-amber-900/30 hover:border-amber-400", badge: "bg-amber-500/10 text-amber-400 border-amber-500/20" },
    "hailuo-2.3": { bg: "bg-rose-950/30", border: "border-rose-500/50", text: "text-rose-400", hover: "hover:bg-rose-900/30 hover:border-rose-400", badge: "bg-rose-500/10 text-rose-400 border-rose-500/20" },
    "wan-2.7-fast": { bg: "bg-emerald-950/30", border: "border-emerald-500/50", text: "text-emerald-400", hover: "hover:bg-emerald-900/30 hover:border-emerald-400", badge: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" },
    "p-video": { bg: "bg-pink-950/30", border: "border-pink-500/50", text: "text-pink-400", hover: "hover:bg-pink-900/30 hover:border-pink-400", badge: "bg-pink-500/10 text-pink-400 border-pink-500/20" },
    "veed-fabric": { bg: "bg-indigo-950/30", border: "border-indigo-500/50", text: "text-indigo-400", hover: "hover:bg-indigo-900/30 hover:border-indigo-400", badge: "bg-indigo-500/10 text-indigo-400 border-indigo-500/20" },
    "kling-2.5": { 
    bg: "bg-fuchsia-950/30", 
    border: "border-fuchsia-500/50", 
    text: "text-fuchsia-400", 
    hover: "hover:bg-fuchsia-900/30 hover:border-fuchsia-400", 
    badge: "bg-fuchsia-500/10 text-fuchsia-400 border-fuchsia-500/20" 
  }
  };
  // Default fallback theme
  return themes[modelId] || { bg: "bg-zinc-900/50", border: "border-zinc-500/50", text: "text-zinc-200", hover: "hover:bg-zinc-800 hover:border-zinc-400", badge: "bg-zinc-800 text-zinc-300 border-zinc-700" };
};

export const VideoNode = memo(({ data }: NodeProps) => {
  const { 
    scene, prompt, videoUrl, isGenerating: isStartingRequest, 
    error: localError, onGenerate, onSaveEdit, setActiveEdgeRules 
  } = data as any;
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const directUploadRef = useRef<HTMLInputElement>(null);

  const [isEditing, setIsEditing] = useState(false);
  const [editedPrompt, setEditedPrompt] = useState(prompt || "");
  
  const [selectedModel, setSelectedModel] = useState("seedance-2.0");
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  // --- SYSTEM DESIGN: RESILIENT POLLING ---
  const { data: taskData } = useQuery({
    queryKey: ['video-status', scene?.video_task_id],
    queryFn: async () => {
      if (!scene?.video_task_id) return null;
      const res = await fetch(`/api/generate-video/status/${scene.video_task_id}`);
      if (!res.ok) throw new Error("Failed to fetch status");
      return res.json();
    },
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      return (status === 'pending' || status === 'processing') ? 3000 : false;
    },
    enabled: !!scene?.video_task_id
  });

  const isProcessing = isStartingRequest ||  taskData?.status === 'pending' || taskData?.status === 'queued' || taskData?.status === 'processing';
  const displayVideoUrl = taskData?.finalVideoUrl || videoUrl;
  const displayError = taskData?.status === 'failed' ? "All fallback models failed." : localError;
  const hasLogs = taskData?.logs && taskData.logs.length > 0;

  // --- BROADCAST EDITING STATE TO CANVAS ---
  useEffect(() => {
    if (isEditing && setActiveEdgeRules) {
      setActiveEdgeRules({
        sceneNumber: scene.scene_number,
        requiredNodes: DIRECTOR_MODELS[selectedModel]?.requiredNodes || []
      });
    } else if (!isEditing && setActiveEdgeRules) {
      setActiveEdgeRules(null);
      setIsMenuOpen(false); 
    }
    return () => {
      if (setActiveEdgeRules) setActiveEdgeRules(null);
    };
  }, [isEditing, selectedModel, scene.scene_number, setActiveEdgeRules]);

  // --- HANDLERS ---
  const handleDirectVideoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64Video = reader.result as string;
        if (onSaveEdit) onSaveEdit(scene?.scene_number, 'video', `video-${scene?.scene_number}`, editedPrompt, null, base64Video);
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
    <div className="relative group/node w-[400px]">
      
      {/* INPUT HANDLES */}
      <Handle type="target" position={Position.Left} id="left" className="w-3 h-3 bg-indigo-500 border-2 border-zinc-900 left-[-6px]" />
      <Handle type="target" position={Position.Top} id="top" className="w-3 h-3 bg-pink-500 border-2 border-zinc-900 top-[-6px]" />
      <Handle type="target" position={Position.Bottom} id="bottom" className="w-3 h-3 bg-amber-500 border-2 border-zinc-900 bottom-[-6px]" />

      {/* Processing Glow */}
      {isProcessing && <div className="absolute -inset-1.5 bg-gradient-to-r from-teal-400 to-emerald-500 rounded-2xl blur-md opacity-60 animate-pulse z-0" />}

      <div className="relative bg-zinc-900/95 border border-zinc-700/80 rounded-2xl shadow-2xl z-10 flex flex-col transition-all duration-300">
        
        {/* HEADER */}
        <div className="bg-zinc-950/80 px-4 py-3 border-b border-zinc-800 flex justify-between items-center rounded-t-2xl nodrag">
          <div className="flex items-center gap-3">
            <div className="bg-teal-500/10 p-2 rounded-lg border border-teal-500/20">
              <Film className="w-4 h-4 text-teal-400" />
            </div>
            <div className="flex flex-col gap-0.5">
               <span className="text-xs uppercase font-extrabold text-teal-400 tracking-wider">Scene {scene?.scene_number}</span>
            </div>
          </div>
          <button 
            onClick={() => setIsEditing(!isEditing)} 
            className={`p-1.5 rounded transition-colors border ${isEditing ? 'bg-indigo-600/20 text-indigo-400 border-indigo-500/50 shadow-[0_0_10px_rgba(99,102,241,0.2)]' : 'bg-zinc-900 text-zinc-400 border-zinc-700 hover:text-white hover:bg-zinc-800'}`}
          >
            {isEditing ? <X className="w-4 h-4" /> : <Edit2 className="w-4 h-4" />}
          </button>
        </div>

        {/* --- PROGRESSIVE DISCLOSURE: EDITING MODE --- */}
        {isEditing ? (
          <div className="p-4 bg-zinc-950 border-b border-zinc-800 nodrag">
            
            {/* THEMED MODEL SELECTOR */}
            <div className="mb-4 relative z-[100]">
              <label className="text-[9px] uppercase text-zinc-400 font-bold mb-1.5 block tracking-widest">Target Generation Engine</label>
              
              <button 
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className={`w-full border rounded-xl px-3 py-2.5 flex justify-between items-center transition-all shadow-inner ${activeTheme.bg} ${activeTheme.border} ${activeTheme.hover}`}
              >
                <div className="flex flex-col items-start gap-0.5">
                  <span className={`text-[13px] font-bold ${activeTheme.text}`}>{DIRECTOR_MODELS[selectedModel]?.name}</span>
                  <span className="text-[10px] text-zinc-400 font-medium">{DIRECTOR_MODELS[selectedModel]?.provider}</span>
                </div>
                <ChevronDown className={`w-4 h-4 ${activeTheme.text} transition-transform ${isMenuOpen ? 'rotate-180' : ''}`} />
              </button>

              {/* HIGH-DENSITY DROPDOWN MENU */}
              {isMenuOpen && (
                <div className="absolute top-full left-0 mt-2 w-full bg-[#0a0a0c] border border-zinc-700 rounded-xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] overflow-hidden z-50 flex flex-col max-h-[320px]">
                  <div className="overflow-y-auto custom-scrollbar p-1.5 space-y-1">
                    {Object.keys(DIRECTOR_MODELS).map(modelId => {
                      const model = DIRECTOR_MODELS[modelId];
                      const theme = getModelTheme(modelId);
                      const isSelected = selectedModel === modelId;
                      
                      return (
                        <div 
                          key={modelId}
                          onClick={() => { setSelectedModel(modelId); setIsMenuOpen(false); }}
                          className={`p-3 rounded-lg cursor-pointer transition-all border ${isSelected ? `${theme.bg} ${theme.border}` : 'bg-zinc-900/50 border-transparent hover:bg-zinc-800 hover:border-zinc-700'}`}
                        >
                          <div className="flex justify-between items-start mb-1.5">
                            <div>
                              <div className={`text-[13px] font-bold ${isSelected ? theme.text : 'text-zinc-200'}`}>{model.name}</div>
                              <div className="text-[9px] text-zinc-500 uppercase tracking-widest">{model.provider}</div>
                            </div>
                            <span className={`text-[9px] px-1.5 py-0.5 rounded uppercase font-bold tracking-wider border flex items-center gap-1 ${theme.badge}`}>
                              <Sparkles className="w-3 h-3" /> {model.qualityTier}
                            </span>
                          </div>
                          
                          <div className="space-y-1 mt-2">
                            <div className="text-[10px] text-zinc-300 flex items-start gap-1.5 leading-tight">
                              <Zap className="w-3 h-3 text-emerald-400 shrink-0 mt-0.5" /> 
                              <span>{model.strengths.join(", ")}</span>
                            </div>
                            <div className="text-[10px] text-zinc-500 flex items-start gap-1.5 leading-tight">
                              <AlertTriangle className="w-3 h-3 text-amber-500/70 shrink-0 mt-0.5" /> 
                              <span>{model.weaknesses[0]}</span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* TEXTAREA */}
            <label className="text-[9px] uppercase text-zinc-500 font-bold mb-1.5 block tracking-widest flex justify-between">
              Cinematic Instruction
              <span className={`${activeTheme.text} opacity-80`}>Requires: {DIRECTOR_MODELS[selectedModel]?.requiredNodes.join(", ")}</span>
            </label>
            <textarea 
              value={editedPrompt} onChange={(e) => setEditedPrompt(e.target.value)}
              className="w-full bg-zinc-900 text-xs text-zinc-200 p-2.5 rounded-lg border border-zinc-700 outline-none resize-none h-24 custom-scrollbar focus:border-teal-500 shadow-inner mb-3"
            />
            <button onClick={handleSave} className="w-full text-xs bg-zinc-100 hover:bg-white text-zinc-900 py-2.5 rounded-lg font-bold shadow-md transition-colors">
              Lock Configuration
            </button>
          </div>
        ) : (
          <div className="p-3 bg-zinc-950 border-b border-zinc-800 nodrag">
             <div className="flex items-center gap-2 mb-2">
                <Layers className={`w-3 h-3 ${activeTheme.text}`} />
                <span className={`text-[10px] font-bold uppercase tracking-widest ${activeTheme.text}`}>{DIRECTOR_MODELS[selectedModel]?.name}</span>
             </div>
             <p className="text-[11px] text-zinc-300 leading-relaxed max-h-16 overflow-y-auto custom-scrollbar pr-1">
                {taskData?.enhancedPrompt || editedPrompt || "No prompt provided."}
             </p>
             
             {/* Execution Logs */}
             {hasLogs && (
              <div className="mt-3 bg-zinc-900/80 border border-zinc-800 rounded p-2 max-h-20 overflow-y-auto custom-scrollbar shadow-inner">
                <span className="text-[9px] text-zinc-500 font-bold uppercase tracking-widest flex items-center gap-1 mb-1">
                  <Info className="w-3 h-3" /> System Logs
                </span>
                {taskData.logs.map((log: any, idx: number) => (
                  <div key={idx} className="text-[9px] text-zinc-400 leading-tight mb-1">
                    <span className="text-amber-400">[{log.providerName}]</span> Failed: {log.errorReason}
                  </div>
                ))}
                {taskData.status === 'completed' && (
                  <div className="text-[9px] text-emerald-400 font-mono mt-1">✅ Recovered via fallback model.</div>
                )}
              </div>
             )}
          </div>
        )}

        {/* --- VIDEO CANVAS (Remains untouched) --- */}
        <div 
          className="relative w-full aspect-video bg-black flex items-center justify-center overflow-hidden rounded-b-2xl z-0"
          onMouseEnter={() => videoRef.current?.play().catch(()=>{})}
          onMouseLeave={() => videoRef.current?.pause()}
        >
          {displayVideoUrl ? (
            <video 
              ref={videoRef} src={displayVideoUrl} loop muted playsInline 
              className={`w-full h-full object-cover transition-all duration-700 ${isProcessing ? 'opacity-30 scale-105 blur-[4px]' : 'opacity-100 scale-100'}`} 
            />
          ) : isProcessing ? null : (
            <div className="flex flex-col items-center text-zinc-600">
              <PlayCircle className="w-10 h-10 opacity-40 mb-3" />
              <p className="text-xs font-medium text-center px-6">Ready for Render</p>
            </div>
          )}

          {isProcessing && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/60 backdrop-blur-sm z-10">
              <div className="relative">
                <div className="absolute inset-0 bg-teal-500 blur-xl opacity-60 animate-pulse"></div>
                <Loader2 className="w-8 h-8 text-teal-400 animate-spin relative z-10" />
              </div>
              <span className="text-[10px] font-black text-teal-300 tracking-widest uppercase animate-pulse mt-2">
                {taskData?.status === 'processing' ? 'Cloud Workers Rendering...' : 'Queueing...'}
              </span>
            </div>
          )}

          {displayError && !isProcessing && (
            <div className="absolute inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center p-6 text-center z-10">
              <div className="flex flex-col items-center gap-2">
                <AlertCircle className="w-8 h-8 text-red-500" />
                <p className="text-xs font-medium text-red-200">{displayError}</p>
              </div>
            </div>
          )}

          <div className={`absolute bottom-3 right-3 flex items-center gap-2 transition-opacity z-20 ${displayVideoUrl && !isEditing ? 'opacity-0 group-hover/node:opacity-100' : 'opacity-100'}`}>
            <input type="file" accept="video/mp4,video/webm" className="hidden" ref={directUploadRef} onChange={handleDirectVideoUpload} />
            <button 
              onClick={() => directUploadRef.current?.click()} disabled={isProcessing || isEditing}
              className="flex items-center gap-2 bg-zinc-800/90 hover:bg-zinc-700 text-zinc-200 px-3 py-2 rounded-lg text-xs font-bold shadow-md disabled:opacity-50 transition-all backdrop-blur-md border border-zinc-600/50"
            >
              <Upload className="w-4 h-4" />
            </button>
            <button 
              onClick={executeGeneration} disabled={isProcessing || isEditing}
              className="flex items-center gap-2 bg-teal-600 hover:bg-teal-500 text-white px-4 py-2 rounded-lg text-xs font-bold shadow-[0_0_15px_rgba(20,184,166,0.5)] disabled:opacity-50 transition-all backdrop-blur-md border border-teal-400/50"
            >
              {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              {displayVideoUrl ? "Re-Render" : "Render"}
            </button>
          </div>
        </div>

      </div>

      <Handle type="source" position={Position.Right} id="right" className="w-3 h-3 bg-teal-500 border-none right-[-6px]" />
    </div>
  );
});