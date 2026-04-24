// Inside src/components/storyboard/nodes/VideoNode.tsx
import { memo, useRef, useState } from "react";
import { Handle, Position, NodeProps } from '@xyflow/react';
import { Film, Loader2, AlertCircle, Sparkles, Edit2, X, Save } from "lucide-react";

export const VideoNode = memo(({ data }: NodeProps) => {
  const { scene, prompt, videoUrl, isGenerating, error, onGenerate, onSaveEdit } = data as any;
  const videoRef = useRef<HTMLVideoElement>(null);

  const [isEditing, setIsEditing] = useState(false);
  const [editedPrompt, setEditedPrompt] = useState(prompt);

  const handleSave = () => {
    onSaveEdit(scene.scene_number, 'video', editedPrompt);
    setIsEditing(false);
  };

  return (
    <div className="relative group/node w-[400px]">
      
      {/* --- INPUT HANDLES --- */}
      {/* 1. Left (Temporal Start Frame Link) */}
      <Handle type="target" position={Position.Left} id="left" className="w-3 h-3 bg-indigo-500 border-2 border-zinc-900" />
      
      {/* 2. Top (Character Nodes Link) */}
      <Handle type="target" position={Position.Top} id="top" className="w-3 h-3 bg-pink-500 border-2 border-zinc-900" />
      
      {/* 3. Bottom (Background Environment Link) */}
      <Handle type="target" position={Position.Bottom} id="bottom" className="w-3 h-3 bg-amber-500 border-2 border-zinc-900" />

      {isGenerating && (
        <div className="absolute -inset-1.5 bg-gradient-to-r from-teal-400 to-emerald-500 rounded-2xl blur-md opacity-75 animate-pulse z-0" />
      )}

      <div className="relative bg-zinc-900/95 border border-zinc-700/80 rounded-2xl overflow-hidden shadow-2xl z-10 flex flex-col transition-all duration-300">
        
        {/* Header */}
        <div className="bg-zinc-950/80 px-4 py-3 border-b border-zinc-800 flex justify-between items-center nodrag">
          <div className="flex flex-col gap-1">
             <span className="text-xs uppercase font-extrabold text-teal-400 tracking-wider">Motion Transition {scene.scene_number}</span>
             <span className="text-[10px] text-zinc-400 font-mono bg-zinc-900 inline-block w-fit px-1.5 rounded">{scene.timestamp}</span>
          </div>
          <button 
            onClick={() => setIsEditing(!isEditing)} 
            className="p-1.5 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded transition-colors bg-zinc-900 border border-zinc-700"
          >
            {isEditing ? <X className="w-4 h-4" /> : <Edit2 className="w-4 h-4" />}
          </button>
        </div>

        {/* Prompt Area */}
        <div className="p-3 bg-zinc-950 border-b border-zinc-800 nodrag">
          <label className="text-[10px] uppercase text-zinc-500 font-semibold mb-1.5 block">Dense Physics Prompt</label>
          {isEditing ? (
            <div className="flex flex-col gap-2">
              <textarea 
                value={editedPrompt}
                onChange={(e) => setEditedPrompt(e.target.value)}
                className="w-full bg-zinc-900 text-xs text-zinc-200 p-2.5 rounded-lg border border-teal-500/50 outline-none resize-none h-32 custom-scrollbar focus:border-teal-400 focus:ring-1 focus:ring-teal-500/30 transition-all shadow-inner"
              />
              <button onClick={handleSave} className="self-end flex items-center gap-1.5 text-xs bg-teal-600 hover:bg-teal-500 text-white px-3 py-1.5 rounded-md font-bold transition-all shadow-md">
                <Save className="w-3.5 h-3.5" /> Save Overrides
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              <p className="text-[11px] text-zinc-300 leading-relaxed max-h-24 overflow-y-auto custom-scrollbar pr-1">
                {prompt}
              </p>
              <div className="flex items-center gap-2 pt-2 border-t border-zinc-800/50">
                 <span className="text-[9px] uppercase tracking-wider text-purple-400 font-semibold">Camera:</span>
                 <span className="text-[10px] text-zinc-400 truncate">{scene.camera_movement}</span>
              </div>
            </div>
          )}
        </div>

        {/* Video Canvas */}
        <div 
          className="relative w-full aspect-video bg-black flex items-center justify-center overflow-hidden"
          onMouseEnter={() => videoRef.current?.play().catch(()=>{})}
          onMouseLeave={() => videoRef.current?.pause()}
        >
          {videoUrl ? (
            <video ref={videoRef} src={videoUrl} loop muted playsInline className="w-full h-full object-cover" />
          ) : (
            <div className="flex flex-col items-center text-zinc-600">
              <Film className="w-10 h-10 opacity-40 mb-3" />
              <p className="text-xs font-medium text-center px-6">Awaiting Interpolation.<br/>Generate dependencies first.</p>
            </div>
          )}

          {error && (
            <div className="absolute inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center p-6 text-center z-10">
              <div className="flex flex-col items-center gap-3">
                <AlertCircle className="w-8 h-8 text-red-500" />
                <p className="text-xs font-medium text-red-200 bg-red-950/80 px-3 py-2 rounded-lg border border-red-900/50 shadow-xl">{error}</p>
              </div>
            </div>
          )}

          <div className={`absolute bottom-3 right-3 transition-opacity z-20 ${videoUrl && !isEditing ? 'opacity-0 group-hover/node:opacity-100' : 'opacity-100'}`}>
            <button 
              onClick={onGenerate} disabled={isGenerating || isEditing}
              className="flex items-center gap-2 bg-teal-600 hover:bg-teal-500 text-white px-4 py-2 rounded-lg text-xs font-bold shadow-[0_0_15px_rgba(20,184,166,0.5)] disabled:opacity-50 transition-all backdrop-blur-md border border-teal-400/50"
            >
              {isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              {videoUrl ? "Re-Animate" : "Animate Transition"}
            </button>
          </div>
        </div>

      </div>

      {/* --- OUTPUT HANDLE --- */}
      {/* 4. Right (Temporal Link to next scene) */}
      <Handle type="source" position={Position.Right} id="right" className="w-3 h-3 bg-teal-500 border-2 border-zinc-900" />
      <Handle type="target" position={Position.Top} id="top" className="w-3 h-3 bg-pink-500 border-2 border-zinc-900" />
<Handle type="target" position={Position.Bottom} id="bottom" className="w-3 h-3 bg-amber-500 border-2 border-zinc-900" />
    </div>
  );
});