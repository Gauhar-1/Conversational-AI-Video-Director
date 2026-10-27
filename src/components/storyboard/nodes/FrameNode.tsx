import { memo, useRef, useState, useEffect } from "react";
import { Handle, Position, NodeProps } from '@xyflow/react';
import { ImageIcon, Loader2, AlertCircle, Edit2, X, Save, ImagePlus, Upload } from "lucide-react";

export const FrameNode = memo(({ data }: NodeProps) => {
  const { scene, imageUrl, isGenerating, error, onGenerate, onSaveEdit, onSelect } = data as any;
  const fileInputRef = useRef<HTMLInputElement>(null);
  const directUploadRef = useRef<HTMLInputElement>(null);

  const [isEditing, setIsEditing] = useState(false);
  const [editedPrompt, setEditedPrompt] = useState(scene?.frame_prompt || "");
  const [referenceImage, setReferenceImage] = useState<string | null>(scene?.frame_reference_image || null);

  useEffect(() => {
    setEditedPrompt(scene?.frame_prompt || "");
    setReferenceImage(scene?.frame_reference_image || null);
  }, [scene?.frame_prompt, scene?.frame_reference_image]);

  const handleSave = () => {
    onSaveEdit(editedPrompt, referenceImage);
    setIsEditing(false);
  };

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

  const handleDirectFrameUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        onSaveEdit(editedPrompt, referenceImage, reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="relative group/node w-72">
      {/* INPUT HANDLE */}
      {scene?.scene_number > 1 && (
        <Handle 
          type="target" 
          position={Position.Left} 
          id="left" 
          className="w-3 h-3 bg-zinc-400 border border-zinc-950" 
        />
      )}

      <div 
        onClick={() => onSelect && onSelect(scene)}
        className="relative bg-zinc-900 border border-zinc-800 rounded-md overflow-hidden shadow-xl z-10 flex flex-col transition-colors hover:border-zinc-700 cursor-pointer"
      >
        {/* --- HEADER --- */}
        <div className="bg-zinc-950 px-3.5 py-2.5 border-b border-zinc-800 flex justify-between items-center nodrag">
          <div className="flex items-center gap-2">
            <div className="bg-zinc-800 p-1.5 rounded text-zinc-300">
              <ImageIcon className="w-3.5 h-3.5" />
            </div>
            <div className="flex flex-col">
              <span className="text-xs uppercase font-semibold text-zinc-200 tracking-wider">
                {scene?.scene_number === 1 ? "Start Keyframe" : "Keyframe"}
              </span>
              <span className="text-[10px] text-zinc-500 font-mono">SCENE {scene?.scene_number}</span>
            </div>
          </div>
          <button 
            onClick={() => setIsEditing(!isEditing)} 
            className="p-1 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded transition-colors bg-zinc-900 border border-zinc-800"
            title="Edit Prompt"
          >
            {isEditing ? <X className="w-3.5 h-3.5" /> : <Edit2 className="w-3.5 h-3.5" />}
          </button>
        </div>

        {/* --- PROMPT & IMG2IMG AREA --- */}
        <div className="p-3 bg-zinc-950 border-b border-zinc-800 nodrag">
          <label className="text-[10px] uppercase font-mono text-zinc-500 block mb-1">Conditioning Prompt</label>
          
          {isEditing ? (
            <div className="flex flex-col gap-2">
              <textarea 
                value={editedPrompt}
                onChange={(e) => setEditedPrompt(e.target.value)}
                className="w-full bg-zinc-900 text-xs text-zinc-200 p-2 rounded-md border border-zinc-700 outline-none resize-none h-28 custom-scrollbar focus:border-zinc-500"
                placeholder="Describe keyframe composition..."
              />
              
              <div className="flex items-center gap-2">
                <input type="file" accept="image/*" className="hidden" ref={fileInputRef} onChange={handleImageUpload} />
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  className="flex-1 flex items-center justify-center gap-1.5 py-1.5 border border-dashed border-zinc-700 hover:border-zinc-500 bg-zinc-900 hover:bg-zinc-800 rounded-md text-[10px] text-zinc-400 hover:text-zinc-200 transition-colors"
                >
                  <ImagePlus className="w-3.5 h-3.5" />
                  <span>{referenceImage ? "Change Reference" : "Add Img2Img Ref"}</span>
                </button>
                {referenceImage && (
                  <div className="w-6 h-6 rounded border border-zinc-700 overflow-hidden shrink-0">
                    <img src={referenceImage} alt="Ref" className="w-full h-full object-cover" />
                  </div>
                )}
              </div>

              <button 
                onClick={handleSave} 
                className="self-end flex items-center gap-1.5 text-xs bg-zinc-100 hover:bg-white text-zinc-950 px-3 py-1.5 rounded-md font-semibold transition-colors"
              >
                <Save className="w-3.5 h-3.5" /> Save Overrides
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              <p className="text-[11px] text-zinc-300 leading-relaxed max-h-28 overflow-y-auto custom-scrollbar pr-1" title={editedPrompt}>
                {editedPrompt || "Inherits composition from director script."}
              </p>
            </div>
          )}
        </div>

        {/* --- VISUAL CANVAS --- */}
        <div className="relative w-full aspect-square bg-zinc-950 flex items-center justify-center overflow-hidden">
          {imageUrl ? (
            <img 
              src={imageUrl} 
              alt={`Frame ${scene?.scene_number}`} 
              className={`w-full h-full object-cover transition-all duration-300 ${isGenerating ? 'opacity-40 blur-[2px]' : 'opacity-100'}`} 
            />
          ) : isGenerating ? null : (
            <div className="flex flex-col items-center text-zinc-600">
              <ImageIcon className="w-8 h-8 opacity-40 mb-2" />
              <p className="text-xs font-medium text-center px-4">
                {scene?.scene_number === 1 ? "Upload or Render Frame." : "Awaiting Temporal Link."}
              </p>
            </div>
          )}

          {/* Loading Overlay */}
          {isGenerating && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/60 backdrop-blur-sm z-10">
              <Loader2 className="w-6 h-6 text-zinc-400 animate-spin" />
              <span className="text-[10px] font-mono font-semibold text-zinc-300 tracking-wider uppercase">Rendering...</span>
            </div>
          )}

          {error && (
            <div className="absolute inset-0 bg-black/80 flex items-center justify-center p-4 text-center z-10">
              <div className="flex flex-col items-center gap-2">
                <AlertCircle className="w-6 h-6 text-red-500" />
                <p className="text-xs text-red-300 bg-red-950/80 px-2 py-1 rounded border border-red-900">{error}</p>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="absolute bottom-2.5 right-2.5 flex items-center gap-1.5 z-20">
            <input type="file" accept="image/*" className="hidden" ref={directUploadRef} onChange={handleDirectFrameUpload} />
            
            <button 
              onClick={() => directUploadRef.current?.click()} 
              disabled={isGenerating || isEditing}
              className="p-1.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white rounded-md border border-zinc-700 transition-colors disabled:opacity-50"
              title="Upload frame directly"
            >
              <Upload className="w-3.5 h-3.5" />
            </button>

            <button 
              onClick={() => onGenerate(editedPrompt, referenceImage)} 
              disabled={isGenerating || isEditing}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-100 hover:bg-white text-zinc-950 rounded-md text-xs font-semibold transition-colors disabled:opacity-50"
            >
              {isGenerating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ImageIcon className="w-3.5 h-3.5" />}
              <span>{imageUrl ? "Regen" : "Render"}</span>
            </button>
          </div>
        </div>
      </div>

      {/* OUTPUT HANDLE */}
      <Handle 
        type="source" 
        position={Position.Right} 
        id="right" 
        className="w-3 h-3 bg-zinc-100 border border-zinc-950 right-[-6px]" 
      />
    </div>
  );
});

FrameNode.displayName = "FrameNode";