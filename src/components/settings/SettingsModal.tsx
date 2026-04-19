"use client";

import { useState, useEffect } from "react";
import { X, Key, Cpu, Image as ImageIcon, Video, Save, Check, MessageSquare } from "lucide-react";

type SettingsModalProps = {
  isOpen: boolean;
  onClose: () => void;
};

export default function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  // States for API Key and Models
  const [nvidiaKey, setNvidiaKey] = useState("");
  const [hfKey, setHfKey] = useState("");
  const [sfKey, setSfKey] = useState("");
  const [chatModel, setChatModel] = useState("meta/llama-3.1-70b-instruct");
  const [imageModel, setImageModel] = useState("stabilityai/stable-diffusion-xl");
  const [videoModel, setVideoModel] = useState("stabilityai/stable-video-diffusion");
  
  const [isSaved, setIsSaved] = useState(false);

  // Load saved settings when the modal opens
  useEffect(() => {
    if (isOpen) {
      setNvidiaKey(localStorage.getItem("nvidia_api_key") || "");
      setHfKey(localStorage.getItem("hf_api_key") || "");
      setSfKey(localStorage.getItem("siliconflow_api_key") || "");
      setChatModel(localStorage.getItem("nvidia_chat_model") || "meta/llama-3.1-70b-instruct");
      setImageModel(localStorage.getItem("nvidia_image_model") || "stabilityai/stable-diffusion-xl");
      setVideoModel(localStorage.getItem("nvidia_video_model") || "stabilityai/stable-video-diffusion");
      setIsSaved(false);
    }
  }, [isOpen]);

  const handleSave = () => {
    localStorage.setItem("nvidia_api_key", nvidiaKey.trim());
    localStorage.setItem("hf_api_key", hfKey.trim());
    localStorage.setItem("siliconflow_api_key", sfKey.trim());
    localStorage.setItem("nvidia_chat_model", chatModel);
    localStorage.setItem("nvidia_image_model", imageModel);
    localStorage.setItem("nvidia_video_model", videoModel);
    
    setIsSaved(true);
    setTimeout(() => {
      setIsSaved(false);
      onClose();
    }, 1000); 
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
      {/* Blurred Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300" 
        onClick={onClose}
      />

      {/* Modal Content */}
      <div className="relative w-full max-w-xl bg-zinc-950 border border-zinc-800 rounded-3xl shadow-[0_0_50px_-12px_rgba(0,0,0,1)] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-300">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800/80 bg-zinc-900/50">
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Key className="w-5 h-5 text-indigo-400" />
              API & Model Settings
            </h2>
            <p className="text-xs text-zinc-500 mt-1">Keys are stored locally in your browser (BYOK Mode).</p>
          </div>
          <button onClick={onClose} className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-xl transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body - Grouped by Pipeline Stage */}
        <div className="p-6 space-y-6 overflow-y-auto custom-scrollbar max-h-[70vh]">
          
          {/* Section 1: Chat & Reasoning (NVIDIA) */}
          <div className="bg-zinc-900/30 border border-zinc-800/80 rounded-2xl p-5 space-y-4">
            <h3 className="text-sm font-bold text-zinc-200 flex items-center gap-2 border-b border-zinc-800 pb-3">
              <MessageSquare className="w-4 h-4 text-indigo-400" /> 1. Director Engine (NVIDIA)
            </h3>
            
            <div className="space-y-2">
              <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">NVIDIA API Key</label>
              <input 
                type="password" 
                value={nvidiaKey}
                onChange={(e) => setNvidiaKey(e.target.value)}
                placeholder="nvapi-..."
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all font-mono"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider flex items-center gap-2">
                <Cpu className="w-3.5 h-3.5" /> Reasoning Model
              </label>
              <select 
                value={chatModel}
                onChange={(e) => setChatModel(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500 appearance-none cursor-pointer"
              >
                <option value="meta/llama-3.1-70b-instruct">Llama 3.1 70B Instruct (Recommended)</option>
                <option value="meta/llama-3.1-405b-instruct">Llama 3.1 405B Instruct (High Quality)</option>
                <option value="mistralai/mixtral-8x22b-instruct-v0.1">Mixtral 8x22B Instruct</option>
                <option value="nemotron-4-340b-instruct">Nemotron-4 340B</option>
              </select>
            </div>
          </div>

          {/* Section 2: Image Generation (Hugging Face) */}
          <div className="bg-zinc-900/30 border border-zinc-800/80 rounded-2xl p-5 space-y-4">
            <h3 className="text-sm font-bold text-zinc-200 flex items-center gap-2 border-b border-zinc-800 pb-3">
              <ImageIcon className="w-4 h-4 text-pink-400" /> 2. Storyboard Canvas (Hugging Face)
            </h3>
            
            <div className="space-y-2">
              <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">HF Access Token</label>
              <input 
                type="password" 
                value={hfKey}
                onChange={(e) => setHfKey(e.target.value)}
                placeholder="hf_..."
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-pink-500 focus:ring-1 focus:ring-pink-500 transition-all font-mono"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Image Model</label>
              <select 
                value={imageModel}
                onChange={(e) => setImageModel(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-pink-500 appearance-none cursor-pointer"
              >
                <option value="stabilityai/stable-diffusion-xl">Stable Diffusion XL (Default)</option>
                <option value="stabilityai/sdxl-turbo">SDXL Turbo (Fast)</option>
                <option value="black-forest-labs/flux-1-schnell">FLUX.1 Schnell</option>
              </select>
            </div>
          </div>

          {/* Section 3: Video Generation (SiliconFlow) */}
          <div className="bg-zinc-900/30 border border-zinc-800/80 rounded-2xl p-5 space-y-4">
            <h3 className="text-sm font-bold text-zinc-200 flex items-center gap-2 border-b border-zinc-800 pb-3">
              <Video className="w-4 h-4 text-teal-400" /> 3. Cinematic Animation (SiliconFlow)
            </h3>
            
            <div className="space-y-2">
              <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">SiliconFlow API Key</label>
              <input 
                type="password" 
                value={sfKey}
                onChange={(e) => setSfKey(e.target.value)}
                placeholder="sk-..."
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 transition-all font-mono"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Video Model</label>
              <select 
                value={videoModel}
                onChange={(e) => setVideoModel(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-teal-500 appearance-none cursor-pointer"
              >
                <option value="Wan-AI/Wan2.2-T2V-A14B">Wan-AI/Wan2.2-T2V-A14B</option>
                <option value="Wan-AI/Wan2.1-T2V-14B-720P">Wan-AI/Wan2.1-T2V-14B-720P</option>
                <option value="Wan-AI/Wan2.1-T2V-14B-720P-Turbo">Wan-AI/Wan2.1-T2V-14B-720P-Turbo</option>
              </select>
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-zinc-800/80 bg-zinc-900/50 flex justify-end gap-3">
          <button 
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl text-sm font-medium text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
          >
            Cancel
          </button>
          <button 
            onClick={handleSave}
            disabled={isSaved}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white transition-all ${
              isSaved ? 'bg-green-600 hover:bg-green-500' : 'bg-indigo-600 hover:bg-indigo-500 shadow-[0_0_20px_-5px_rgba(99,102,241,0.4)]'
            }`}
          >
            {isSaved ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
            {isSaved ? "Saved Locally" : "Save Settings"}
          </button>
        </div>

      </div>
    </div>
  );
}