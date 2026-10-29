"use client";

import { useState, useEffect } from "react";
import { X, Key, Save, Check, Layers, Cpu } from "lucide-react";

type SettingsModalProps = {
  isOpen: boolean;
  onClose: () => void;
};

export default function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const [groqKey, setGroqKey] = useState("");
  const [replicateKey, setReplicateKey] = useState("");
  const [chatModel, setChatModel] = useState("openai/gpt-oss-20b");
  const [isSaved, setIsSaved] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setGroqKey(localStorage.getItem("director_groq_key") || "");
      setReplicateKey(localStorage.getItem("director_replicate_key") || "");
      setChatModel(localStorage.getItem("director_chat_model") || "openai/gpt-oss-20b");
    }
  }, [isOpen]);

  const handleSave = () => {
    if (typeof window !== "undefined") {
      localStorage.setItem("director_groq_key", groqKey.trim());
      localStorage.setItem("director_replicate_key", replicateKey.trim());
      localStorage.setItem("director_chat_model", chatModel);
      setIsSaved(true);
      setTimeout(() => {
        setIsSaved(false);
        onClose();
      }, 900);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/80 backdrop-blur-sm" 
        onClick={onClose}
      />

      {/* Modal Content */}
      <div className="relative w-full max-w-lg bg-zinc-950 border border-zinc-800 rounded-md shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800 bg-zinc-900/40">
          <div>
            <h2 className="text-base font-semibold text-zinc-100 flex items-center gap-2">
              <Key className="w-4 h-4 text-zinc-400" />
              <span>BYOK API Configuration</span>
            </h2>
            <p className="text-[11px] text-zinc-500 font-mono mt-0.5">
              Client-side persistent environment keys (Zero-Liability Vault)
            </p>
          </div>
          <button 
            onClick={onClose} 
            className="w-8 h-8 flex items-center justify-center text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-md transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5 overflow-y-auto max-h-[75vh] custom-scrollbar">
          {/* SECTION 1: GROQ */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-md p-4 space-y-3">
            <h3 className="text-xs font-semibold text-zinc-200 flex items-center gap-2 font-mono uppercase tracking-wider">
              <Cpu className="w-4 h-4 text-zinc-400" /> 
              <span>Director Brain (Groq 20B)</span>
            </h3>
            <p className="text-xs text-zinc-400 leading-relaxed">
              OpenAI reasoning model (<code className="text-zinc-200 font-mono text-[11px]">openai/gpt-oss-20b</code>) for sub-second screenplay directing and JSON storyboard synthesis.
            </p>

            <div className="space-y-1.5">
              <label className="text-[10px] font-mono uppercase tracking-wider text-zinc-500">Groq API Key</label>
              <input 
                type="password" 
                value={groqKey} 
                onChange={(e) => setGroqKey(e.target.value)} 
                placeholder="gsk_..."
                className="w-full bg-zinc-950 border border-zinc-800 rounded-md px-3 py-2 text-xs text-zinc-100 focus:outline-none focus:border-zinc-700 font-mono"
              />
            </div>

            <div className="space-y-1.5 pt-1">
              <label className="text-[10px] font-mono uppercase tracking-wider text-zinc-500">Director Brain Model</label>
              <select
                value={chatModel}
                onChange={(e) => setChatModel(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-md px-3 py-2 text-xs text-zinc-100 focus:outline-none focus:border-zinc-700 font-mono"
              >
                <option value="openai/gpt-oss-20b">openai/gpt-oss-20b (OpenAI MoE Reasoning 20B)</option>
                <option value="llama-3.3-70b-versatile">llama-3.3-70b-versatile (Meta Llama 3.3 70B - High Reliability)</option>
                <option value="llama-3.1-8b-instant">llama-3.1-8b-instant (Meta Llama 3.1 8B - Instant)</option>
              </select>
            </div>
          </div>

          {/* SECTION 2: REPLICATE */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-md p-4 space-y-3">
            <h3 className="text-xs font-semibold text-zinc-200 flex items-center gap-2 font-mono uppercase tracking-wider">
              <Layers className="w-4 h-4 text-zinc-400" /> 
              <span>Generative Video &amp; FLUX (Replicate)</span>
            </h3>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Powers FLUX Schnell keyframes and high-fidelity video rendering models (Kling 2.5 Turbo Pro, Wan 2.5, MiniMax).
            </p>

            <div className="space-y-1.5">
              <label className="text-[10px] font-mono uppercase tracking-wider text-zinc-500">Replicate API Token</label>
              <input 
                type="password" 
                value={replicateKey} 
                onChange={(e) => setReplicateKey(e.target.value)} 
                placeholder="r8_..."
                className="w-full bg-zinc-950 border border-zinc-800 rounded-md px-3 py-2 text-xs text-zinc-100 focus:outline-none focus:border-zinc-700 font-mono"
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-zinc-800 bg-zinc-900/40 flex justify-end gap-2.5">
          <button 
            onClick={onClose}
            className="px-4 py-2 rounded-md text-xs font-medium text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
          >
            Cancel
          </button>
          <button 
            onClick={handleSave}
            disabled={isSaved}
            className="flex items-center gap-1.5 px-4 py-2 rounded-md bg-zinc-100 text-zinc-950 hover:bg-white text-xs font-semibold transition-colors disabled:opacity-50"
          >
            {isSaved ? <Check className="w-3.5 h-3.5" /> : <Save className="w-3.5 h-3.5" />}
            <span>{isSaved ? "Saved" : "Save Credentials"}</span>
          </button>
        </div>
      </div>
    </div>
  );
}