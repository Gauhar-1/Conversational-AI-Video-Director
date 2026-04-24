// Inside src/components/storyboard/nodes/FrameNode.tsx
import { memo, useState, useRef } from "react";
import { Handle, Position, NodeProps } from '@xyflow/react';
import { ImageIcon, Loader2, AlertCircle, Edit2, Save, X, ImagePlus, Upload } from "lucide-react";

export const FrameNode = memo(({ data }: NodeProps) => {
  const { scene, prompt, imageUrl, isGenerating, error, onGenerate, onSaveEdit } = data as any;
  
  // --- LOCAL STATE FOR EDITING ---
  const [isEditing, setIsEditing] = useState(false);
  const [editedPrompt, setEditedPrompt] = useState(prompt || "");
  const [referenceImage, setReferenceImage] = useState<string | null>(scene?.frame_reference_image || null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const directUploadRef = useRef<HTMLInputElement>(null); // NEW: Ref for direct frame upload

  // --- FILE UPLOAD HANDLER (Img2Img Reference) ---
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setReferenceImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // --- DIRECT FRAME UPLOAD HANDLER (Bypass Generation) ---
  const handleDirectFrameUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64Image = reader.result as string;
        // Pass the base64 image as the `generatedUrl` to instantly save it as the final frame
        if (onSaveEdit) {
          onSaveEdit(scene?.scene_number, 'frame', 'frame', editedPrompt, referenceImage, base64Image);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  // --- SAVE OVERRIDES HANDLER ---
  const handleSave = () => {
    if (onSaveEdit) {
      onSaveEdit(scene?.scene_number, 'frame', 'frame', editedPrompt, referenceImage);
    }
    setIsEditing(false);
  };

  return (
    <div className="relative group/node w-[350px]">
      
      {/* INPUT HANDLE (Temporal Link) */}
      {scene?.scene_number > 1 && (
        <Handle 
          type="target" 
          position={Position.Left} 
          id="left" 
          className="w-3 h-3 bg-teal-500 border-2 border-zinc-900" 
        />
      )}

      {/* Outer Glow (Subtle) */}
      {isGenerating && (
        <div className="absolute -inset-1.5 bg-gradient-to-r from-indigo-500 to-blue-500 rounded-2xl blur-md opacity-50 animate-pulse z-0" />
      )}

      <div className="relative bg-zinc-900/95 border border-zinc-700/80 rounded-2xl overflow-hidden shadow-2xl z-10 flex flex-col transition-all duration-300 hover:border-indigo-500/50">
        
        {/* --- HEADER --- */}
        <div className="bg-zinc-950/80 px-4 py-3 border-b border-zinc-800 flex justify-between items-center nodrag">
          <div className="flex items-center gap-2">
            <div className="bg-indigo-500/10 p-1.5 rounded-lg">
              <ImageIcon className="w-4 h-4 text-indigo-400" />
            </div>
            <div className="flex flex-col">
               <span className="text-xs uppercase font-extrabold text-zinc-200 tracking-wider">
                 {scene?.scene_number === 1 ? "Initial Start Frame" : "Temporal Frame"}
               </span>
               <span className="text-[10px] text-zinc-500 font-mono">SCENE {scene?.scene_number}</span>
            </div>
          </div>
          <button 
            onClick={() => setIsEditing(!isEditing)} 
            className="p-1.5 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded transition-colors bg-zinc-900 border border-zinc-700"
            title="Edit Prompt"
          >
            {isEditing ? <X className="w-4 h-4" /> : <Edit2 className="w-4 h-4" />}
          </button>
        </div>

        {/* --- PROMPT & IMG2IMG AREA --- */}
        <div className="p-3 bg-zinc-950 border-b border-zinc-800 nodrag">
           <label className="text-[10px] uppercase text-zinc-500 font-semibold mb-1.5 block">Conditioning Prompt</label>
           
           {isEditing ? (
              <div className="flex flex-col gap-2">
                <textarea 
                  value={editedPrompt}
                  onChange={(e) => setEditedPrompt(e.target.value)}
                  className="w-full bg-zinc-900 text-xs text-zinc-200 p-2.5 rounded-lg border border-indigo-500/50 outline-none resize-none h-32 custom-scrollbar focus:border-indigo-400 focus:ring-1 focus:ring-indigo-500/30 transition-all shadow-inner"
                  placeholder="Describe composition to merge characters and background..."
                />
                
                <div className="flex items-center gap-2">
                  <input type="file" accept="image/*" className="hidden" ref={fileInputRef} onChange={handleImageUpload} />
                  <button 
                    onClick={() => fileInputRef.current?.click()}
                    className="flex-1 flex items-center justify-center gap-1.5 py-1.5 border border-dashed border-zinc-600 hover:border-indigo-500/50 bg-zinc-900 hover:bg-zinc-800 rounded-lg text-[10px] text-zinc-400 hover:text-zinc-200 transition-colors"
                  >
                    <ImagePlus className="w-3.5 h-3.5" />
                    {referenceImage ? "Change Reference" : "Add Img2Img Ref"}
                  </button>
                  {referenceImage && (
                    <div className="w-7 h-7 rounded border border-indigo-500/50 overflow-hidden shrink-0">
                      <img src={referenceImage} alt="Ref" className="w-full h-full object-cover" />
                    </div>
                  )}
                </div>

                <button onClick={handleSave} className="self-end flex items-center gap-1.5 text-xs bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-1.5 rounded-md font-bold transition-all shadow-md mt-1">
                  <Save className="w-3.5 h-3.5" /> Save Overrides
                </button>
              </div>
           ) : (
              <div className="flex flex-col gap-2">
                <p className="text-[11px] text-zinc-300 leading-relaxed max-h-32 overflow-y-auto custom-scrollbar pr-1" title={editedPrompt}>
                  {editedPrompt || "Inherits state from previous video generation."}
                </p>
                {referenceImage && (
                  <div className="flex items-center gap-1.5 pt-2 border-t border-zinc-800/50">
                     <ImagePlus className="w-3 h-3 text-indigo-400" />
                     <span className="text-[9px] uppercase tracking-wider text-zinc-400 font-semibold">Img2Img Ref Attached</span>
                  </div>
                )}
              </div>
           )}
        </div>

        {/* --- VISUAL CANVAS (WITH INTENSE GLOW) --- */}
        <div className={`relative w-full aspect-square bg-black flex items-center justify-center overflow-hidden transition-all duration-500 ${
          isGenerating ? "ring-2 ring-indigo-500 ring-offset-2 ring-offset-zinc-950 shadow-[inset_0_0_50px_rgba(99,102,241,0.4)]" : ""
        }`}>
          
          {imageUrl ? (
            <img 
              src={imageUrl} 
              alt={`Frame ${scene?.scene_number}`} 
              className={`w-full h-full object-cover transition-all duration-700 ${isGenerating ? 'opacity-40 scale-105 blur-[2px]' : 'opacity-100 scale-100'}`} 
            />
          ) : isGenerating ? null : (
            <div className="flex flex-col items-center text-zinc-600">
              <ImageIcon className="w-10 h-10 opacity-40 mb-3" />
              <p className="text-xs font-medium text-center px-6">
                {scene?.scene_number === 1 ? "Upload or Render Frame." : "Awaiting Temporal Link."}
              </p>
            </div>
          )}

          {/* Glowing Loading Overlay */}
          {isGenerating && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/40 backdrop-blur-sm z-10">
              <div className="relative">
                <div className="absolute inset-0 bg-indigo-500 blur-xl opacity-60 animate-pulse"></div>
                <Loader2 className="w-8 h-8 text-indigo-400 animate-spin relative z-10" />
              </div>
              <span className="text-xs font-bold text-indigo-300 tracking-widest uppercase animate-pulse">Rendering...</span>
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

          {/* --- ACTION BUTTONS --- */}
          <div className={`absolute bottom-3 right-3 flex items-center gap-2 transition-opacity duration-300 z-20 ${imageUrl && !isEditing ? 'opacity-0 group-hover/node:opacity-100' : 'opacity-100'}`}>
            
            {/* Hidden Input for Direct Upload */}
            <input type="file" accept="image/*" className="hidden" ref={directUploadRef} onChange={handleDirectFrameUpload} />
            
            <button 
              onClick={() => directUploadRef.current?.click()} 
              disabled={isGenerating || isEditing}
              className="flex items-center gap-2 bg-zinc-800/80 hover:bg-zinc-700 text-zinc-200 px-3 py-2 rounded-lg text-xs font-bold backdrop-blur-md border border-zinc-600/50 disabled:opacity-50 transition-all shadow-lg"
              title="Upload custom frame directly"
            >
              <Upload className="w-4 h-4" />
            </button>

            <button 
              onClick={() => onGenerate(editedPrompt, referenceImage)} 
              disabled={isGenerating || isEditing}
              className="flex items-center gap-2 bg-indigo-600/90 hover:bg-indigo-500 text-white px-4 py-2 rounded-lg text-xs font-bold shadow-[0_0_20px_rgba(99,102,241,0.6)] disabled:opacity-50 transition-all backdrop-blur-md border border-indigo-400/50"
            >
              {isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <ImageIcon className="w-4 h-4" />}
              {imageUrl ? "Regenerate" : "Render"}
            </button>
          </div>
        </div>
      </div>

      {/* OUTPUT HANDLE */}
      <Handle 
        type="source" 
        position={Position.Right} 
        id="right" 
        className="w-3 h-3 bg-indigo-500 border-none right-[-6px]" 
      />
    </div>
  );
});