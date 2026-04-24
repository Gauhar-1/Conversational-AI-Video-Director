import { memo, useState, useRef } from "react";
import { Handle, Position, NodeProps } from '@xyflow/react';
import { Mountain, Loader2, AlertCircle, Image as ImageIcon, Edit2, X, Save, ImagePlus, Upload } from 'lucide-react';

export const BackgroundNode = memo(({ data }: NodeProps) => {
  const { scene, prompt, imageUrl, isGenerating, error, onGenerate, onSaveEdit } = data as any;


  // --- LOCAL STATE FOR EDITING ---
  const [isEditing, setIsEditing] = useState(false);
  const [editedPrompt, setEditedPrompt] = useState(prompt || "");
  const [referenceImage, setReferenceImage] = useState<string | null>(scene?.environment_reference_image || null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const directUploadRef = useRef<HTMLInputElement>(null); // NEW: Ref for direct background upload

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

  // --- DIRECT BACKGROUND UPLOAD HANDLER (Bypass Generation) ---
  const handleDirectBackgroundUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64Image = reader.result as string;
        // Pass the base64 image as the `generatedUrl` to instantly save it as the final background
        if (onSaveEdit) {
          onSaveEdit(scene?.scene_number, 'background', 'bg', editedPrompt, referenceImage, base64Image);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  // --- SAVE OVERRIDES HANDLER ---
  const handleSave = () => {
    if (onSaveEdit) {
      onSaveEdit(scene?.scene_number, 'background', 'bg', editedPrompt, referenceImage);
    }
    setIsEditing(false);
  };

  return (
    <div className="relative group/node w-72">
      
      {/* Outer Glow (Subtle Amber) */}
      {isGenerating && (
        <div className="absolute -inset-1.5 bg-gradient-to-r from-amber-500 to-orange-500 rounded-2xl blur-md opacity-50 animate-pulse z-0" />
      )}

      <div className="relative bg-zinc-950 border border-zinc-800 rounded-2xl p-4 shadow-xl transition-all duration-300 hover:border-amber-500/50 flex flex-col z-10">
        
        {/* Source Handle */}
        <Handle 
          type="source" 
          position={Position.Top} // <-- Change this from Right to Top!
          id="top" 
          className="w-3 h-3 bg-amber-500 border-none top-[-6px]" 
        />

        {/* --- HEADER --- */}
        <div className="flex items-center justify-between mb-3 border-b border-zinc-800/80 pb-2 nodrag">
          <div className="flex items-center gap-2">
            <div className="bg-amber-500/10 p-1.5 rounded-lg">
              <Mountain className="w-4 h-4 text-amber-400" />
            </div>
            <span className="text-sm font-bold text-zinc-200">
              Environment
            </span>
          </div>
          <button 
            onClick={() => setIsEditing(!isEditing)} 
            className="p-1.5 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded transition-colors bg-zinc-900 border border-zinc-700"
            title="Edit Environment"
          >
            {isEditing ? <X className="w-4 h-4" /> : <Edit2 className="w-4 h-4" />}
          </button>
        </div>

        {/* --- PROMPT & IMG2IMG AREA --- */}
        <div className="mb-3 bg-zinc-950 border-b border-zinc-800/80 pb-3 nodrag">
          <label className="text-[10px] uppercase text-zinc-500 font-semibold mb-1.5 block">Environment Prompt</label>
          
          {isEditing ? (
            <div className="flex flex-col gap-2">
              <textarea 
                value={editedPrompt}
                onChange={(e) => setEditedPrompt(e.target.value)}
                className="w-full bg-zinc-900 text-xs text-zinc-200 p-2.5 rounded-lg border border-amber-500/50 outline-none resize-none h-24 custom-scrollbar focus:border-amber-400 focus:ring-1 focus:ring-amber-500/30 transition-all shadow-inner"
                placeholder="Describe lighting, camera angle, and background..."
              />
              
              <div className="flex items-center gap-2">
                <input type="file" accept="image/*" className="hidden" ref={fileInputRef} onChange={handleImageUpload} />
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  className="flex-1 flex items-center justify-center gap-1.5 py-1.5 border border-dashed border-zinc-600 hover:border-amber-500/50 bg-zinc-900 hover:bg-zinc-800 rounded-lg text-[10px] text-zinc-400 hover:text-zinc-200 transition-colors"
                >
                  <ImagePlus className="w-3.5 h-3.5" />
                  {referenceImage ? "Change Reference" : "Add Img2Img Ref"}
                </button>
                {referenceImage && (
                  <div className="w-7 h-7 rounded border border-amber-500/50 overflow-hidden shrink-0">
                    <img src={referenceImage} alt="Ref" className="w-full h-full object-cover" />
                  </div>
                )}
              </div>

              <button onClick={handleSave} className="self-end flex items-center gap-1.5 text-xs bg-amber-600 hover:bg-amber-500 text-white px-3 py-1.5 rounded-md font-bold transition-all shadow-md mt-1">
                <Save className="w-3.5 h-3.5" /> Save Environment
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              <p className="text-[11px] text-zinc-300 leading-relaxed max-h-24 overflow-y-auto custom-scrollbar pr-1" title={editedPrompt}>
                {editedPrompt || "No environment prompt provided."}
              </p>
              {referenceImage && (
                <div className="flex items-center gap-1.5 pt-2 border-t border-zinc-800/50">
                   <ImagePlus className="w-3 h-3 text-amber-400" />
                   <span className="text-[9px] uppercase tracking-wider text-zinc-400 font-semibold">Img2Img Ref Attached</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* --- IMAGE PREVIEW AREA (WITH INTENSE GLOW) --- */}
        <div className={`aspect-video w-full bg-zinc-900 rounded-xl mb-3 overflow-hidden relative flex items-center justify-center transition-all duration-500 ${
          isGenerating ? "border border-amber-500 ring-2 ring-amber-500/50 shadow-[inset_0_0_30px_rgba(245,158,11,0.3)]" : "border border-zinc-800/50"
        }`}>
          
          {imageUrl ? (
            <img 
              src={imageUrl} 
              alt="Background Output" 
              className={`w-full h-full object-cover transition-all duration-700 ${isGenerating ? 'opacity-40 scale-105 blur-[2px]' : 'opacity-100 scale-100'}`} 
            />
          ) : isGenerating ? null : (
            <div className="text-zinc-600 flex flex-col items-center gap-1">
              <ImageIcon className="w-5 h-5 opacity-50" />
              <span className="text-[10px] uppercase tracking-wider text-center px-4">Upload or Render Environment</span>
            </div>
          )}

          {/* Glowing Loading Overlay */}
          {isGenerating && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/40 backdrop-blur-sm z-10">
              <div className="relative">
                <div className="absolute inset-0 bg-amber-500 blur-xl opacity-60 animate-pulse"></div>
                <Loader2 className="w-6 h-6 text-amber-400 animate-spin relative z-10" />
              </div>
              <span className="text-[10px] font-bold text-amber-300 tracking-widest uppercase animate-pulse mt-1">Rendering HDRI...</span>
            </div>
          )}

          {/* Granular Error Overlay */}
          {error && (
            <div className="absolute inset-0 bg-red-950/90 backdrop-blur-sm flex flex-col items-center justify-center p-4 text-center z-10">
              <AlertCircle className="w-5 h-5 text-red-500 mb-1" />
              <span className="text-[10px] font-bold text-red-200 leading-tight">{error}</span>
            </div>
          )}
        </div>

        {/* --- ACTION BUTTONS --- */}
        <div className="flex items-center gap-2 mt-auto">
          {/* Hidden Input for Direct Upload */}
          <input type="file" accept="image/*" className="hidden" ref={directUploadRef} onChange={handleDirectBackgroundUpload} />
          
          <button 
            onClick={() => directUploadRef.current?.click()} 
            disabled={isGenerating || isEditing}
            className="flex items-center justify-center bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white px-3 py-2 rounded-xl text-xs font-bold border border-zinc-700 disabled:opacity-50 transition-all shadow-md"
            title="Upload custom background directly"
          >
            <Upload className="w-4 h-4" />
          </button>

          <button
            onClick={() => onGenerate(editedPrompt, referenceImage)}
            disabled={isGenerating || isEditing}
            className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 ${
              imageUrl 
                ? "bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700 hover:border-amber-500/50" 
                : "bg-amber-600/90 hover:bg-amber-500 text-white shadow-[0_0_15px_rgba(245,158,11,0.4)] border border-amber-400/50"
            }`}
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Rendering...
              </>
            ) : (
              <>
                <Mountain className="w-4 h-4" />
                {imageUrl ? "Regenerate" : "Generate BG"}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
});