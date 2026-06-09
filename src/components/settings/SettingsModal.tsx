"use client";

import { useState, useEffect } from "react";
import { X, Key, Save, Check, Layers } from "lucide-react";

type SettingsModalProps = {
  isOpen: boolean;
  onClose: () => void;
};

export default function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  // --- STATES FOR BYOK (Bring Your Own Key) ---
  const [replicateKey, setReplicateKey] = useState("");
  const [isSaved, setIsSaved] = useState(false);

  // Load saved settings when the modal opens
  useEffect(() => {
    if (isOpen) {
      setReplicateKey(localStorage.getItem("replicate_api_key") || "");
      setIsSaved(false);
    }
  }, [isOpen]);

  const handleSave = () => {
    localStorage.setItem("replicate_api_key", replicateKey.trim());
    
    setIsSaved(true);
    setTimeout(() => {
      setIsSaved(false);
      onClose();
    }, 1000); 
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 sm:p-6">
      {/* Blurred Backdrop */}
      <div 
        className="absolute inset-0 bg-black/80 backdrop-blur-md animate-in fade-in duration-300" 
        onClick={onClose}
      />

      {/* Modal Content */}
      <div className="relative w-full max-w-lg bg-[#0a0a0c] border border-zinc-800 rounded-3xl shadow-[0_0_80px_-15px_rgba(99,102,241,0.15)] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-300">
        
        {/* --- HEADER --- */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-zinc-800/80 bg-zinc-900/40">
          <div>
            <h2 className="text-xl font-extrabold text-white flex items-center gap-2 tracking-wide">
              <Key className="w-5 h-5 text-indigo-400" />
              Environment Variables
            </h2>
            <p className="text-[11px] text-zinc-500 mt-1 uppercase tracking-wider font-semibold">Zero-Liability BYOK Architecture</p>
          </div>
          <button onClick={onClose} className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-xl transition-colors border border-transparent hover:border-zinc-700">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* --- BODY --- */}
        <div className="p-6 space-y-6 overflow-y-auto custom-scrollbar">
          
          {/* SECTION 1: REPLICATE (Unified Engine) */}
          <div className="bg-zinc-900/40 border border-zinc-800 rounded-2xl p-5 space-y-4 hover:border-indigo-500/30 transition-colors relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none"><Layers className="w-32 h-32" /></div>
            
            <h3 className="text-sm font-bold text-zinc-200 flex items-center gap-2 border-b border-zinc-800/80 pb-3 relative z-10">
              <Layers className="w-4 h-4 text-indigo-400" /> 
              Unified Studio Engine (Replicate)
            </h3>
            <p className="text-[11px] text-indigo-400/80 font-medium pb-1 relative z-10">
              Powers the Agentic Rewriter (Llama 3), Image Composition, and all Video Generation models.
            </p>

            <div className="space-y-2 relative z-10">
              <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Replicate API Token</label>
              <input 
                type="password" 
                value={replicateKey} 
                onChange={(e) => setReplicateKey(e.target.value)} 
                placeholder="r8_..."
                className="w-full bg-[#0a0a0c] border border-zinc-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all font-mono shadow-inner"
              />
            </div>
          </div>

        </div>

        {/* --- FOOTER --- */}
        <div className="px-6 py-4 border-t border-zinc-800/80 bg-zinc-900/40 flex justify-end gap-3">
          <button 
            onClick={onClose}
            className="px-6 py-2.5 rounded-xl text-sm font-bold text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors border border-transparent hover:border-zinc-700"
          >
            Cancel
          </button>
          <button 
            onClick={handleSave}
            disabled={isSaved}
            className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold text-white transition-all ${
              isSaved ? 'bg-emerald-600 hover:bg-emerald-500' : 'bg-indigo-600 hover:bg-indigo-500 shadow-[0_0_20px_-5px_rgba(99,102,241,0.5)]'
            }`}
          >
            {isSaved ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
            {isSaved ? "Token Secured" : "Save Pipeline State"}
          </button>
        </div>

      </div>
    </div>
  );
}