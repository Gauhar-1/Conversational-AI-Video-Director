"use client";

import { useState, useEffect } from "react";
import { X, Key, Cpu, Image as ImageIcon, Video, Save, Check, MessageSquare, Workflow, Zap, ShieldAlert, Film } from "lucide-react";

type SettingsModalProps = {
  isOpen: boolean;
  onClose: () => void;
};

export default function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  // --- STATES FOR BYOK (Bring Your Own Key) ---
  const [nvidiaKey, setNvidiaKey] = useState("");
  const [googleKey, setGoogleKey] = useState(""); 
  const [hfKey, setHfKey] = useState("");
  const [seedanceKey, setSeedanceKey] = useState(""); // NEW: Seedance API Key
  
  // --- STATES FOR MODEL ROUTING ---
  const [chatModel, setChatModel] = useState("meta/llama-3.1-70b-instruct");
  const [imageModel, setImageModel] = useState("stabilityai/stable-diffusion-xl-base-1.0");
  const [videoModel, setVideoModel] = useState("stabilityai/stable-video-diffusion-img2vid-xt");
  
  const [isSaved, setIsSaved] = useState(false);

  // Load saved settings when the modal opens
  useEffect(() => {
    if (isOpen) {
      setNvidiaKey(localStorage.getItem("nvidia_api_key") || "");
      setGoogleKey(localStorage.getItem("google_api_key") || "");
      setHfKey(localStorage.getItem("hf_api_key") || "");
      setSeedanceKey(localStorage.getItem("seedance_api_key") || ""); // Load Seedance Key
      
      setChatModel(localStorage.getItem("nvidia_chat_model") || "meta/llama-3.1-70b-instruct");
      setImageModel(localStorage.getItem("hf_image_model") || "stabilityai/stable-diffusion-xl-base-1.0");
      setVideoModel(localStorage.getItem("hf_video_model") || "stabilityai/stable-video-diffusion-img2vid-xt");
      setIsSaved(false);
    }
  }, [isOpen]);

  const handleSave = () => {
    localStorage.setItem("nvidia_api_key", nvidiaKey.trim());
    localStorage.setItem("google_api_key", googleKey.trim());
    localStorage.setItem("hf_api_key", hfKey.trim());
    localStorage.setItem("seedance_api_key", seedanceKey.trim()); // Save Seedance Key
    
    localStorage.setItem("nvidia_chat_model", chatModel);
    localStorage.setItem("hf_image_model", imageModel);
    localStorage.setItem("hf_video_model", videoModel);
    
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
      <div className="relative w-full max-w-2xl bg-[#0a0a0c] border border-zinc-800 rounded-3xl shadow-[0_0_80px_-15px_rgba(99,102,241,0.15)] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-300">
        
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
        <div className="p-6 space-y-6 overflow-y-auto custom-scrollbar max-h-[75vh]">
          
          {/* SECTION 1: NVIDIA (LLM Orchestration) */}
          <div className="bg-zinc-900/40 border border-zinc-800 rounded-2xl p-5 space-y-4 hover:border-indigo-500/30 transition-colors">
            <h3 className="text-sm font-bold text-zinc-200 flex items-center gap-2 border-b border-zinc-800/80 pb-3">
              <MessageSquare className="w-4 h-4 text-indigo-400" /> 
              Director Engine (NVIDIA NIM)
            </h3>
            
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">NVIDIA API Key</label>
              <input 
                type="password" value={nvidiaKey} onChange={(e) => setNvidiaKey(e.target.value)} placeholder="nvapi-..."
                className="w-full bg-[#0a0a0c] border border-zinc-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all font-mono shadow-inner"
              />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-2">
                <Cpu className="w-3 h-3" /> Core Reasoning Model
              </label>
              <select 
                value={chatModel} onChange={(e) => setChatModel(e.target.value)}
                className="w-full bg-[#0a0a0c] border border-zinc-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-indigo-500 appearance-none cursor-pointer shadow-inner"
              >
                <option value="meta/llama-3.1-70b-instruct">Llama 3.1 70B Instruct (Recommended)</option>
                <option value="meta/llama-3.1-405b-instruct">Llama 3.1 405B Instruct (Ultra Quality)</option>
                <option value="nemotron-4-340b-instruct">Nemotron-4 340B</option>
              </select>
            </div>
          </div>

          {/* SECTION 2: GOOGLE (Tier 1 Compositor) */}
          <div className="bg-zinc-900/40 border border-zinc-800 rounded-2xl p-5 space-y-4 hover:border-amber-500/30 transition-colors relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none"><Zap className="w-24 h-24" /></div>
            
            <h3 className="text-sm font-bold text-zinc-200 flex items-center gap-2 border-b border-zinc-800/80 pb-3 relative z-10">
              <ImageIcon className="w-4 h-4 text-amber-400" /> 
              Tier 1 Compositor (Google AI)
            </h3>
            <p className="text-[11px] text-amber-500/80 font-medium pb-1 relative z-10">Powers high-fidelity multi-image composition via Nano Banana 2 (Gemini 3 Flash Image).</p>

            <div className="space-y-2 relative z-10">
              <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Google Gemini API Key</label>
              <input 
                type="password" value={googleKey} onChange={(e) => setGoogleKey(e.target.value)} placeholder="AIzaSy..."
                className="w-full bg-[#0a0a0c] border border-zinc-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-all font-mono shadow-inner"
              />
            </div>
          </div>

          {/* SECTION 3: HUGGING FACE (Tier 2 Fallbacks) */}
          <div className="bg-zinc-900/40 border border-zinc-800 rounded-2xl p-5 space-y-4 hover:border-pink-500/30 transition-colors relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none"><Workflow className="w-32 h-32" /></div>

            <h3 className="text-sm font-bold text-zinc-200 flex items-center gap-2 border-b border-zinc-800/80 pb-3 relative z-10">
              <ShieldAlert className="w-4 h-4 text-pink-400" /> 
              Tier 2 Fallbacks & Video Engines (Hugging Face)
            </h3>
            
            <div className="space-y-2 relative z-10">
              <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">HF Access Token</label>
              <input 
                type="password" value={hfKey} onChange={(e) => setHfKey(e.target.value)} placeholder="hf_..."
                className="w-full bg-[#0a0a0c] border border-zinc-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-pink-500 focus:ring-1 focus:ring-pink-500 transition-all font-mono shadow-inner"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 relative z-10">
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-2">
                  <ImageIcon className="w-3 h-3 text-pink-400" /> Fallback Image Model
                </label>
                <select 
                  value={imageModel} onChange={(e) => setImageModel(e.target.value)}
                  className="w-full bg-[#0a0a0c] border border-zinc-800 rounded-xl px-4 py-3 text-[13px] text-white focus:outline-none focus:border-pink-500 appearance-none cursor-pointer shadow-inner"
                >
                  <option value="stabilityai/stable-diffusion-xl-base-1.0">SDXL Base 1.0 (Most Reliable)</option>
                  <option value="black-forest-labs/FLUX.1-schnell">FLUX.1 Schnell (Fast)</option>
                  <option value="runwayml/stable-diffusion-v1-5">SD 1.5 (Nuclear Backup)</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-2">
                  <Video className="w-3 h-3 text-pink-400" /> Fallback Video Engine
                </label>
                <select 
                  value={videoModel} onChange={(e) => setVideoModel(e.target.value)}
                  className="w-full bg-[#0a0a0c] border border-zinc-800 rounded-xl px-4 py-3 text-[13px] text-white focus:outline-none focus:border-pink-500 appearance-none cursor-pointer shadow-inner"
                >
                  <option value="stabilityai/stable-video-diffusion-img2vid-xt">SVD XT (Stable)</option>
                  <option value="ali-vilab/i2vgen-xl">I2VGen-XL (High Motion)</option>
                </select>
              </div>
            </div>
          </div>

          {/* NEW SECTION 4: SEEDANCE (Primary Video Engine) */}
          <div className="bg-zinc-900/40 border border-zinc-800 rounded-2xl p-5 space-y-4 hover:border-teal-500/30 transition-colors relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none"><Film className="w-32 h-32" /></div>
            
            <h3 className="text-sm font-bold text-zinc-200 flex items-center gap-2 border-b border-zinc-800/80 pb-3 relative z-10">
              <Film className="w-4 h-4 text-teal-400" /> 
              Primary Video Engine (Seedance AI)
            </h3>
            <p className="text-[11px] text-teal-500/80 font-medium pb-1 relative z-10">Powers asynchronous high-fidelity cinematic video and spatial audio synthesis.</p>

            <div className="space-y-2 relative z-10">
              <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Seedance API Key</label>
              <input 
                type="password" value={seedanceKey} onChange={(e) => setSeedanceKey(e.target.value)} placeholder="Enter Seedance / Pollo API Key..."
                className="w-full bg-[#0a0a0c] border border-zinc-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 transition-all font-mono shadow-inner"
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
            {isSaved ? "Keys Secured" : "Save Pipeline State"}
          </button>
        </div>

      </div>
    </div>
  );
}