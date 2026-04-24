import { memo, useState, useRef } from "react";
import { Handle, Position, NodeProps } from '@xyflow/react';
import { User, Loader2, AlertCircle, Sparkles, Edit2, X, Save, ImagePlus } from 'lucide-react';

export const CharacterNode = memo(({ data }: NodeProps) => {
 const { scene, character, globalCharacters, imageUrl, isGenerating, error, onGenerate, onSaveEdit } = data as any;


  // --- LOCAL STATE FOR EDITING ---
  const [isEditing, setIsEditing] = useState(false);
  const [editedPrompt, setEditedPrompt] = useState(character?.appearance_prompt || "");
  const [referenceImage, setReferenceImage] = useState<string | null>(character?.reference_image || null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // --- FILE UPLOAD HANDLER (Base64 Conversion) ---
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

  const handleReuseCharacter = (selectedCharId: string) => {
    const sourceChar = globalCharacters.find((c: any) => c._id === selectedCharId);
    if (sourceChar && onSaveEdit) {
      // Instantly copy prompt, reference, AND the completed Image URL
      onSaveEdit(
        scene?.scene_number, 
        'character', 
        character._id, 
        sourceChar.appearance_prompt, 
        sourceChar.reference_image,
        sourceChar.generated_url // Pass the URL to save tokens!
      );
      setEditedPrompt(sourceChar.appearance_prompt);
      setReferenceImage(sourceChar.reference_image);
      setIsEditing(false);
    }
  };

  // --- SAVE OVERRIDES HANDLER ---
  const handleSave = () => {
    // Passes scene number, node type, character ID, new prompt, and the base64 reference image to the Canvas hook
    if (onSaveEdit) {
      onSaveEdit(scene?.scene_number, 'character', character._id, editedPrompt, referenceImage);
    }
    setIsEditing(false);
  };

  return (
    <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-4 w-72 shadow-xl group hover:border-pink-500/50 transition-colors relative flex flex-col">
      
      {/* Source Handle: Connects to the Top of the Video Node */}
      <Handle 
        type="source" 
        position={Position.Bottom} 
        id="bottom" 
        className="w-3 h-3 bg-pink-500 border-none bottom-[-6px]" 
      />

      {/* --- HEADER --- */}
      <div className="flex items-center justify-between mb-3 border-b border-zinc-800/80 pb-2 nodrag">
        <div className="flex items-center gap-2">
          <div className="bg-pink-500/10 p-1.5 rounded-lg">
            <User className="w-4 h-4 text-pink-400" />
          </div>
          <span className="text-sm font-bold text-zinc-200 truncate w-32">
            {character?.name || "Character"}
          </span>
        </div>
        <button 
          onClick={() => setIsEditing(!isEditing)} 
          className="p-1.5 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded transition-colors bg-zinc-900 border border-zinc-700"
          title="Edit Identity"
        >
          {isEditing ? <X className="w-4 h-4" /> : <Edit2 className="w-4 h-4" />}
        </button>
      </div>

      {/* --- PROMPT & IMG2IMG AREA --- */}
      <div className="mb-3 bg-zinc-950 border-b border-zinc-800/80 pb-3 nodrag">
        <label className="text-[10px] uppercase text-zinc-500 font-semibold mb-1.5 block">Appearance Prompt</label>
        
        {isEditing ? (
          <div className="flex flex-col gap-2">
            {globalCharacters?.length > 0 && (
              <select 
                onChange={(e) => handleReuseCharacter(e.target.value)}
                defaultValue=""
                className="w-full bg-zinc-900 text-xs text-zinc-300 p-2 rounded-lg border border-pink-500/30 outline-none mb-1"
              >
                <option value="" disabled>♻️ Reuse Existing Identity...</option>
                {globalCharacters.map((c: any) => (
                  <option key={c._id} value={c._id}>{c.name} (Scene {scene.scene_number - 1})</option>
                ))}
              </select>
            )}
            <textarea 
              value={editedPrompt}
              onChange={(e) => setEditedPrompt(e.target.value)}
              className="w-full bg-zinc-900 text-xs text-zinc-200 p-2.5 rounded-lg border border-pink-500/50 outline-none resize-none h-24 custom-scrollbar focus:border-pink-400 focus:ring-1 focus:ring-pink-500/30 transition-all shadow-inner"
              placeholder="Describe character appearance..."
            />
            
            {/* Reference Image Upload */}
            <div className="flex items-center gap-2">
              <input 
                type="file" 
                accept="image/*" 
                className="hidden" 
                ref={fileInputRef} 
                onChange={handleImageUpload} 
              />
              <button 
                onClick={() => fileInputRef.current?.click()}
                className="flex-1 flex items-center justify-center gap-1.5 py-1.5 border border-dashed border-zinc-600 hover:border-pink-500/50 bg-zinc-900 hover:bg-zinc-800 rounded-lg text-[10px] text-zinc-400 hover:text-zinc-200 transition-colors"
              >
                <ImagePlus className="w-3.5 h-3.5" />
                {referenceImage ? "Change Reference" : "Add Img2Img Ref"}
              </button>
              {referenceImage && (
                <div className="w-7 h-7 rounded border border-pink-500/50 overflow-hidden shrink-0">
                  <img src={referenceImage} alt="Ref" className="w-full h-full object-cover" />
                </div>
              )}
            </div>

            <button onClick={handleSave} className="self-end flex items-center gap-1.5 text-xs bg-pink-600 hover:bg-pink-500 text-white px-3 py-1.5 rounded-md font-bold transition-all shadow-md mt-1">
              <Save className="w-3.5 h-3.5" /> Save Identity
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            <p className="text-[11px] text-zinc-300 leading-relaxed max-h-24 overflow-y-auto custom-scrollbar pr-1" title={editedPrompt}>
              {editedPrompt || "No prompt provided."}
            </p>
            {referenceImage && (
              <div className="flex items-center gap-1.5 pt-2 border-t border-zinc-800/50">
                 <ImagePlus className="w-3 h-3 text-pink-400" />
                 <span className="text-[9px] uppercase tracking-wider text-zinc-400 font-semibold">Img2Img Ref Attached</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* --- IMAGE PREVIEW AREA --- */}
      <div className="aspect-square w-full bg-zinc-900 rounded-xl mb-3 overflow-hidden border border-zinc-800/50 relative flex items-center justify-center">
        {imageUrl ? (
          <img src={imageUrl} alt="Character Output" className="w-full h-full object-cover" />
        ) : isGenerating ? (
          <div className="flex flex-col items-center gap-2 text-pink-500">
            <Loader2 className="w-6 h-6 animate-spin" />
            <span className="text-xs font-semibold animate-pulse">Rendering...</span>
          </div>
        ) : (
          <div className="text-zinc-600 flex flex-col items-center gap-1">
            <Sparkles className="w-5 h-5 opacity-50" />
            <span className="text-xs">Awaiting Generation</span>
          </div>
        )}

        {/* Granular Error Overlay */}
        {error && (
          <div className="absolute inset-0 bg-red-950/80 backdrop-blur-sm flex flex-col items-center justify-center p-4 text-center">
            <AlertCircle className="w-6 h-6 text-red-500 mb-2" />
            <span className="text-xs font-bold text-red-200">{error}</span>
          </div>
        )}
      </div>

      {/* --- ACTION BUTTON --- */}
      {/* Passes the FRESH local state directly into the generate hook */}
      <button
        onClick={() => onGenerate(editedPrompt, referenceImage)}
        disabled={isGenerating || isEditing}
        className="w-full py-2 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white border border-zinc-800 hover:border-pink-500/50 rounded-xl text-xs font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
      >
        {isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <User className="w-4 h-4" />}
        {imageUrl ? "Regenerate Identity" : "Generate Identity"}
      </button>
    </div>
  );
});