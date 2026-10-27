import { memo, useState, useRef } from "react";
import { Handle, Position, NodeProps } from '@xyflow/react';
import { Mountain, Loader2, AlertCircle, Edit2, X, Save, ImagePlus, Upload } from 'lucide-react';

export const BackgroundNode = memo(({ data }: NodeProps) => {
  const { scene, prompt, imageUrl, isGenerating, error, onGenerate, onSaveEdit, onSelect } = data as any;

  const [isEditing, setIsEditing] = useState(false);
  const [editedPrompt, setEditedPrompt] = useState(prompt || "");
  const [referenceImage, setReferenceImage] = useState<string | null>(scene?.environment_reference_image || null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const directUploadRef = useRef<HTMLInputElement>(null);

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

  const handleDirectBackgroundUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64Image = reader.result as string;
        if (onSaveEdit) {
          onSaveEdit(scene?.scene_number, 'background', 'bg', editedPrompt, referenceImage, base64Image);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = () => {
    if (onSaveEdit) {
      onSaveEdit(scene?.scene_number, 'background', 'bg', editedPrompt, referenceImage);
    }
    setIsEditing(false);
  };

  return (
    <div className="relative group/node w-72">
      <div 
        onClick={() => onSelect && onSelect(scene)}
        className="relative bg-zinc-950 border border-zinc-800 rounded-md p-3.5 shadow-xl transition-colors hover:border-zinc-700 flex flex-col z-10 cursor-pointer"
      >
        <Handle 
          type="source" 
          position={Position.Top} 
          id="top" 
          className="w-3 h-3 bg-zinc-400 border border-zinc-950 top-[-6px]" 
        />

        {/* HEADER */}
        <div className="flex items-center justify-between mb-2.5 border-b border-zinc-800 pb-2 nodrag">
          <div className="flex items-center gap-2">
            <div className="bg-zinc-800 p-1.5 rounded text-zinc-300">
              <Mountain className="w-3.5 h-3.5" />
            </div>
            <span className="text-xs font-semibold text-zinc-200">
              Environment
            </span>
          </div>
          <button 
            onClick={() => setIsEditing(!isEditing)} 
            className="p-1 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded transition-colors bg-zinc-900 border border-zinc-800"
            title="Edit Environment"
          >
            {isEditing ? <X className="w-3.5 h-3.5" /> : <Edit2 className="w-3.5 h-3.5" />}
          </button>
        </div>

        {/* PROMPT AREA */}
        <div className="mb-2.5 bg-zinc-950 border-b border-zinc-800 pb-2.5 nodrag">
          <label className="text-[10px] uppercase font-mono text-zinc-500 block mb-1">Environment Prompt</label>
          
          {isEditing ? (
            <div className="flex flex-col gap-2">
              <textarea 
                value={editedPrompt}
                onChange={(e) => setEditedPrompt(e.target.value)}
                className="w-full bg-zinc-900 text-xs text-zinc-200 p-2 rounded-md border border-zinc-700 outline-none resize-none h-20 custom-scrollbar focus:border-zinc-500"
                placeholder="Describe lighting and atmosphere..."
              />
              
              <div className="flex items-center gap-2">
                <input type="file" accept="image/*" className="hidden" ref={fileInputRef} onChange={handleImageUpload} />
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  className="flex-1 flex items-center justify-center gap-1.5 py-1.5 border border-dashed border-zinc-700 hover:border-zinc-500 bg-zinc-900 hover:bg-zinc-800 rounded-md text-[10px] text-zinc-400 hover:text-zinc-200 transition-colors"
                >
                  <ImagePlus className="w-3.5 h-3.5" />
                  <span>{referenceImage ? "Change Ref" : "Add Img2Img"}</span>
                </button>
                {referenceImage && (
                  <div className="w-6 h-6 rounded border border-zinc-700 overflow-hidden shrink-0">
                    <img src={referenceImage} alt="Ref" className="w-full h-full object-cover" />
                  </div>
                )}
              </div>

              <button onClick={handleSave} className="self-end flex items-center gap-1.5 text-xs bg-zinc-100 hover:bg-white text-zinc-950 px-3 py-1.5 rounded-md font-semibold transition-colors mt-1">
                <Save className="w-3.5 h-3.5" /> Save Environment
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-1.5">
              <p className="text-[11px] text-zinc-300 leading-relaxed max-h-20 overflow-y-auto custom-scrollbar pr-1" title={editedPrompt}>
                {editedPrompt || "No prompt provided."}
              </p>
            </div>
          )}
        </div>

        {/* IMAGE PREVIEW */}
        <div className="aspect-video w-full bg-zinc-900 rounded-md mb-2.5 overflow-hidden border border-zinc-800 relative flex items-center justify-center">
          {imageUrl ? (
            <img src={imageUrl} alt="Environment" className="w-full h-full object-cover" />
          ) : isGenerating ? (
            <div className="flex flex-col items-center gap-1.5 text-zinc-400">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span className="text-[10px] font-mono uppercase tracking-wider">Rendering...</span>
            </div>
          ) : (
            <div className="text-zinc-600 flex flex-col items-center gap-1">
              <Mountain className="w-6 h-6 opacity-40" />
              <span className="text-[10px]">Awaiting Generation</span>
            </div>
          )}

          {error && (
            <div className="absolute inset-0 bg-red-950/80 p-3 flex flex-col items-center justify-center text-center">
              <AlertCircle className="w-5 h-5 text-red-500 mb-1" />
              <span className="text-[11px] font-semibold text-red-200">{error}</span>
            </div>
          )}
        </div>

        {/* ACTION BUTTONS */}
        <div className="flex items-center gap-2">
          <input 
            type="file" 
            accept="image/*" 
            className="hidden" 
            ref={directUploadRef} 
            onChange={handleDirectBackgroundUpload} 
          />
          <button 
            onClick={() => directUploadRef.current?.click()}
            disabled={isGenerating || isEditing}
            className="p-2 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white rounded-md border border-zinc-800 transition-colors disabled:opacity-50"
            title="Upload custom background directly"
          >
            <Upload className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={() => onGenerate(editedPrompt, referenceImage)}
            disabled={isGenerating || isEditing}
            className="flex-1 py-2 bg-zinc-100 hover:bg-white text-zinc-950 rounded-md text-xs font-semibold transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5"
          >
            {isGenerating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Mountain className="w-3.5 h-3.5" />}
            <span>{imageUrl ? "Regenerate" : "Generate"}</span>
          </button>
        </div>
      </div>
    </div>
  );
});

BackgroundNode.displayName = "BackgroundNode";