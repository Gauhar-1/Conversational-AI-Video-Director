"use client";

import { useState, memo, Fragment, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { IScene } from "@/models/Project";
import { Maximize2, Minimize2, Image as ImageIcon, Film, Loader2, Sparkles, CheckCircle2, Play } from "lucide-react";

// --- CHILD COMPONENT: The Individual Scene Node ---
const SceneNode = memo(function SceneNode({ 
  scene, 
  onGenerateImage, 
  imageUrl, 
  videoUrl, 
  onGenerateVideo,
  isVideoGenerating // NEW: Lets the node know if it's currently rendering
}: { 
  scene: IScene; 
  onGenerateImage: () => void; 
  imageUrl?: string; 
  videoUrl?: string; 
  onGenerateVideo: () => void;
  isVideoGenerating: boolean;
}) {
  const [isGeneratingImg, setIsGeneratingImg] = useState(false);

  const handleGenerateImg = () => {
    setIsGeneratingImg(true);
    setTimeout(() => {
      onGenerateImage();
      setIsGeneratingImg(false);
    }, 1500);
  };

  return (
    <div className="flex-shrink-0 w-[450px] bg-zinc-900/80 backdrop-blur-xl border border-zinc-800 rounded-2xl overflow-hidden shadow-2xl flex flex-col group transition-all duration-500 hover:border-indigo-500/50 hover:shadow-[0_0_40px_-10px_rgba(99,102,241,0.2)]">
      
      {/* Visual Canvas Area */}
      <div className="relative w-full aspect-video bg-zinc-950 border-b border-zinc-800 flex items-center justify-center overflow-hidden">
        {videoUrl ? (
           // IF VIDEO EXISTS, PLAY IT ON LOOP
           <video src={videoUrl} autoPlay loop muted playsInline className="w-full h-full object-cover" />
        ) : imageUrl ? (
           // ELSE IF IMAGE EXISTS, SHOW IT
           <img src={imageUrl} alt={`Scene ${scene.scene_number}`} className="w-full h-full object-cover" />
        ) : (
           // ELSE SHOW PLACEHOLDER
           <div className="absolute inset-0 flex flex-col items-center justify-center text-zinc-600 gap-3">
              <ImageIcon className="w-10 h-10 opacity-50" />
              <p className="text-sm font-medium">Awaiting Visuals</p>
           </div>
        )}

        {/* Action Buttons Overlay */}
        <div className={`absolute bottom-4 right-4 flex gap-2 transition-opacity duration-300 ${videoUrl ? 'opacity-0 group-hover:opacity-100' : 'opacity-100'}`}>
          {!videoUrl && (
            <button 
              onClick={handleGenerateImg}
              disabled={isGeneratingImg || isVideoGenerating}
              className="flex items-center gap-2 bg-zinc-800 hover:bg-zinc-700 text-white px-3 py-2 rounded-lg text-xs font-bold shadow-lg disabled:opacity-50 transition-all"
            >
              {isGeneratingImg ? <Loader2 className="w-3 h-3 animate-spin" /> : <ImageIcon className="w-3 h-3" />}
              {imageUrl ? "Redo Image" : "Generate Image"}
            </button>
          )}
          
          {/* Only show Animate button if image exists */}
          {imageUrl && (
            <button 
              onClick={onGenerateVideo}
              disabled={isVideoGenerating}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold shadow-lg disabled:opacity-50 transition-all ${
                videoUrl ? 'bg-green-600 hover:bg-green-500' : 'bg-purple-600 hover:bg-purple-500 text-white'
              }`}
            >
              {isVideoGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : videoUrl ? <CheckCircle2 className="w-4 h-4" /> : <Sparkles className="w-4 h-4" />}
              {isVideoGenerating ? "Rendering (3m)..." : videoUrl ? "Redo Video" : "Animate Shot (5s)"}
            </button>
          )}
        </div>
      </div>

      {/* Node Meta Data */}
      <div className="p-6 flex flex-col gap-4">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-3">
             <div className="w-8 h-8 rounded-full bg-zinc-800 text-zinc-300 border border-zinc-700 flex items-center justify-center font-bold text-sm">
                {scene.scene_number}
             </div>
             <span className="text-xs font-mono text-indigo-400 bg-indigo-950/50 px-2 py-1 rounded border border-indigo-900/50">
                {scene.timestamp}
             </span>
          </div>
        </div>
        
        <div className="space-y-3">
          <div>
             <h4 className="text-[10px] uppercase tracking-widest text-zinc-500 font-semibold mb-1">Action</h4>
             <p className="text-sm text-zinc-400 leading-relaxed line-clamp-2">{scene.action}</p>
          </div>
          <div>
             <h4 className="text-[10px] uppercase tracking-widest text-zinc-500 font-semibold mb-1">Camera</h4>
             <p className="text-sm font-medium text-purple-300/80 line-clamp-1">{scene.camera_movement}</p>
          </div>
        </div>
      </div>
    </div>
  );
});

// --- PARENT COMPONENT: The Canvas ---
export default function StoryboardCanvas({ activeProjectId }: { activeProjectId: string | null }) {
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [generatedImages, setGeneratedImages] = useState<Record<number, string>>({});
  const [generatedVideos, setGeneratedVideos] = useState<Record<number, string>>({});
  const [generatingVideoIds, setGeneratingVideoIds] = useState<Record<number, boolean>>({}); // Tracks which scenes are rendering
  
  // Player Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [playlist, setPlaylist] = useState<string[]>([]);
  const [currentPlayIndex, setCurrentPlayIndex] = useState(0);

  const { data: project, isLoading } = useQuery<{ storyboard: IScene[] }>({
    queryKey: ["projectData", activeProjectId], 
    queryFn: async () => {
      if (!activeProjectId) return { storyboard: [] };
      const res = await fetch(`/api/projects/${activeProjectId}`);
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
    enabled: !!activeProjectId, 
    initialData: { storyboard: [] },
  });

  const storyboard = project?.storyboard || [];

  // Check if EVERY scene has a video (either freshly generated or from DB)
  const hasAllVideos = storyboard.length > 0 && storyboard.every(scene => 
    generatedVideos[scene.scene_number] || scene.video_url
  );

  // 1. Generate Image Route
  const generateImageForScene = async (sceneNumber: number, prompt: string) => {
    if (!activeProjectId) return;
    const cleanPrompt = prompt.replace(/['"\n\r]/g, '').trim();
    const finalPrompt = `${cleanPrompt}, cinematic lighting, highly detailed masterpiece`;

    try {
      const response = await fetch("/api/generate-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: finalPrompt, projectId: activeProjectId, sceneNumber: sceneNumber }),
      });
      if (!response.ok) throw new Error("API request failed");
      const data = await response.json();
      setGeneratedImages(prev => ({ ...prev, [sceneNumber]: data.imageUrl }));
    } catch (error) {
      console.error("Image Gen Error:", error);
      alert(`Error: Could not generate image for scene ${sceneNumber}.`);
    }
  };

  // 2. Generate Single Video Route
  const generateVideoForScene = async (scene: IScene, imageUrl: string) => {
    if (!imageUrl) return alert("Generate an image first!");
    
    setGeneratingVideoIds(prev => ({ ...prev, [scene.scene_number]: true }));

    try {
      // Create a hyper-specific prompt for just this 5s clip
      const prompt = `Cinematic 4k masterpiece. Location: ${scene.location}. Action: ${scene.action}. Camera: ${scene.camera_movement}.`;

      const submitRes = await fetch("/api/generate-video", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: imageUrl, prompt: prompt })
      });
      
      const submitData = await submitRes.json();
      if (!submitRes.ok) throw new Error(submitData.error || "Submission failed");

      // Polling Loop for this specific scene
      const pollInterval = setInterval(async () => {
        try {
          const pollRes = await fetch("/api/generate-video", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ 
              requestId: submitData.requestId,
              projectId: activeProjectId,
              sceneNumber: scene.scene_number 
            })
          });
          
          const pollData = await pollRes.json();
          
          if (pollData.status === "success") {
            clearInterval(pollInterval);
            setGeneratedVideos(prev => ({ ...prev, [scene.scene_number]: pollData.videoUrl }));
            setGeneratingVideoIds(prev => ({ ...prev, [scene.scene_number]: false }));
          } else if (pollData.error) {
            clearInterval(pollInterval);
            setGeneratingVideoIds(prev => ({ ...prev, [scene.scene_number]: false }));
            alert(`Video failed for Scene ${scene.scene_number}: ${pollData.error}`);
          }
        } catch (e) {
          console.error("Polling error:", e);
        }
      }, 5000); 

    } catch (error) {
      console.error(error);
      setGeneratingVideoIds(prev => ({ ...prev, [scene.scene_number]: false }));
      alert("Failed to start video generation.");
    }
  };

  // 3. Open the Sequential Player
  const openFinalCutModal = () => {
    // Gather all 6 video URLs in order
    const sequenceUrls = storyboard.map(scene => 
      generatedVideos[scene.scene_number] || scene.video_url
    ).filter(Boolean) as string[];

    setPlaylist(sequenceUrls);
    setCurrentPlayIndex(0);
    setIsModalOpen(true);
  };

  if (isLoading) {
    return (
      <div className="flex flex-col h-full bg-zinc-950 border border-zinc-800/80 rounded-3xl p-8 items-center justify-center text-center shadow-2xl">
        <div className="relative mb-6">
           <div className="w-16 h-16 rounded-2xl border-2 border-indigo-500/30 animate-spin absolute inset-0" />
           <div className="w-16 h-16 rounded-2xl bg-zinc-900 border border-zinc-700 flex items-center justify-center rotate-3 relative shadow-xl">
             <span className="text-2xl">🎬</span>
           </div>
        </div>
        <h2 className="text-xl font-semibold text-zinc-200 mb-2">Loading Canvas...</h2>
      </div>
    );
  }

  if (storyboard.length === 0) {
    return (
      <div className="flex flex-col h-full bg-zinc-900/30 border border-zinc-800/50 rounded-3xl p-8 items-center justify-center text-center">
        <div className="w-16 h-16 mb-6 rounded-2xl bg-zinc-800 border border-zinc-700 flex items-center justify-center rotate-3 mx-auto shadow-xl">
           <span className="text-2xl">🎬</span>
        </div>
        <h2 className="text-xl font-semibold text-zinc-200 mb-2">Director's Canvas</h2>
        <p className="text-zinc-500 max-w-sm">Awaiting your script to generate timeline nodes.</p>
      </div>
    );
  }

  return (
    <div className={`flex flex-col bg-zinc-950 border border-zinc-800/80 shadow-2xl transition-all duration-500 ${
      isFullScreen ? "fixed inset-0 z-50 rounded-none h-screen w-screen" : "h-full rounded-3xl relative overflow-hidden"
    }`}>
      
      {/* Top Control Bar */}
      <div className="p-4 border-b border-zinc-800/80 bg-zinc-900/80 backdrop-blur-md sticky top-0 z-10 flex justify-between items-center">
         <h2 className="text-lg font-bold text-zinc-100 flex items-center gap-3">
            🎬 <span className="tracking-tight">Sequence Timeline</span>
         </h2>
         
         <div className="flex items-center gap-4">
           {/* Sequential Final Player Button */}
           <button 
             onClick={openFinalCutModal}
             disabled={!hasAllVideos}
             className={`flex items-center gap-2 px-5 py-2 rounded-full text-sm font-bold transition-all shadow-lg ${
               hasAllVideos ? 'bg-green-600 hover:bg-green-500 text-white' : 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
             }`}
           >
             <Play className="w-4 h-4" /> 
             {hasAllVideos ? "Watch Final Sequence" : "Generate all 6 clips to watch"}
           </button>

           <button onClick={() => setIsFullScreen(!isFullScreen)} className="p-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg transition-colors">
             {isFullScreen ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
           </button>
         </div>
      </div>
      
      {/* 🎞️ SEQUENTIAL VIDEO PLAYER MODAL */}
      {isModalOpen && playlist.length > 0 && (
        <div className="absolute inset-0 z-40 bg-black/95 backdrop-blur-2xl flex items-center justify-center p-8 animate-in fade-in zoom-in duration-500">
           <div className="w-full max-w-5xl bg-zinc-900 border border-zinc-800 rounded-3xl overflow-hidden shadow-[0_0_100px_-20px_rgba(99,102,241,0.5)] flex flex-col">
              <div className="p-5 border-b border-zinc-800 flex justify-between items-center bg-zinc-900/50">
                 <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-green-600 flex items-center justify-center animate-pulse">
                      <Film className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h3 className="font-bold text-white text-lg">Director's Final Cut</h3>
                      <p className="text-xs text-zinc-500 font-mono">Playing Clip {currentPlayIndex + 1} of {playlist.length}</p>
                    </div>
                 </div>
                 <button onClick={() => setIsModalOpen(false)} className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl text-sm">
                   Close Player
                 </button>
              </div>
              
              <div className="aspect-video bg-black relative">
                 {/* The magic happens here: 
                    When the video finishes (onEnded), we increment the play index.
                    React updates the src, and autoPlay immediately starts the next clip!
                 */}
                 <video 
                   key={playlist[currentPlayIndex]} // Forces React to fully reload the video tag when src changes
                   src={playlist[currentPlayIndex]} 
                   autoPlay 
                   playsInline
                   controls={false} // Hide controls to prevent skipping, making it feel like one movie
                   onEnded={() => {
                     if (currentPlayIndex < playlist.length - 1) {
                       setCurrentPlayIndex(prev => prev + 1);
                     } else {
                       // Loop back to start when finished
                       setCurrentPlayIndex(0); 
                     }
                   }}
                   className="w-full h-full shadow-inner"
                 />
                 
                 {/* Progress Bar Illusion */}
                 <div className="absolute bottom-0 left-0 h-1 bg-zinc-800 w-full">
                    <div 
                      className="h-full bg-green-500 transition-all duration-300" 
                      style={{ width: `${((currentPlayIndex + 1) / playlist.length) * 100}%` }}
                    />
                 </div>
              </div>
           </div>
        </div>
      )}

      {/* The Horizontal Node Timeline */}
      <div className="flex-1 overflow-x-auto overflow-y-hidden bg-zinc-950 p-12 scroll-smooth">
        <style dangerouslySetInnerHTML={{__html: `
          ::-webkit-scrollbar { height: 8px; }
          ::-webkit-scrollbar-thumb { background: #27272a; border-radius: 4px; }
          ::-webkit-scrollbar-track { background: transparent; }
        `}} />

        <div className="flex items-center h-full w-max mx-auto px-12 relative">
          <div className="absolute top-1/2 left-0 right-0 h-1 bg-zinc-800/50 -translate-y-1/2 z-0 rounded-full" />
          
          {storyboard.map((scene, i) => {
            const nodeImageUrl = generatedImages[scene.scene_number] || scene.image_url;
            const nodeVideoUrl = generatedVideos[scene.scene_number] || scene.video_url;

            return (
              <Fragment key={scene.scene_number}>
                <div className="relative z-10">
                  <SceneNode 
                    scene={scene} 
                    imageUrl={nodeImageUrl}
                    videoUrl={nodeVideoUrl}
                    isVideoGenerating={!!generatingVideoIds[scene.scene_number]}
                    onGenerateImage={() => generateImageForScene(scene.scene_number, scene.generation_prompt)} 
                    onGenerateVideo={() => generateVideoForScene(scene, nodeImageUrl as string)}
                  />
                </div>
                
                {i < storyboard.length - 1 && (
                  <div className="w-16 flex-shrink-0 flex items-center justify-center z-10">
                    <div className="w-3 h-3 rounded-full bg-zinc-700 border-2 border-zinc-950" />
                  </div>
                )}
              </Fragment>
            );
          })}
        </div>
      </div>
    </div>
  );
}