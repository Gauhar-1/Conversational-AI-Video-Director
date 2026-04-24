import { useState, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { IScene } from "@/models/Project";

export function useStoryboard(activeProjectId: string | null) {
  const queryClient = useQueryClient();

  // --- ASSET STATES ---
  const [generatedFrames, setGeneratedFrames] = useState<Record<string, string>>({});
  const [generatedChars, setGeneratedChars] = useState<Record<string, string>>({}); 
  const [generatedBgs, setGeneratedBgs] = useState<Record<string, string>>({});
  const [generatedVideos, setGeneratedVideos] = useState<Record<string, string>>({});
  
  // Track loading status for all nodes
  const [generatingAssets, setGeneratingAssets] = useState<Record<string, boolean>>({}); 
  const [assetErrors, setAssetErrors] = useState<Record<string, string>>({});

  // --- DATA FETCHING ---
  const { data: project, isLoading, isFetching } = useQuery<{ storyboard: any[] }>({
    queryKey: ["storyboardData", activeProjectId],
    queryFn: async () => {
      if (!activeProjectId) return { storyboard: [] };
      const res = await fetch(`/api/projects/${activeProjectId}`);
      if (!res.ok) throw new Error("Failed to fetch project data");
      return await res.json();
    },
    enabled: !!activeProjectId,
  });

  const storyboard = project?.storyboard || [];

  // --- GENERIC IMAGE HANDLER ---
  const generateImage = useCallback(async (nodeId: string, apiEndpoint: string, payload: any) => {
    if (!activeProjectId) return;

    const googleKey = localStorage.getItem("google_api_key");
    const hfKey = localStorage.getItem("hf_api_key");
    if (!hfKey || !googleKey) return setAssetErrors(prev => ({ ...prev, [nodeId]: `Missing ${!hfKey ? "HF" : "Nano Banana"} API Key` }));

    setGeneratingAssets(prev => ({ ...prev, [nodeId]: true }));
    setAssetErrors(prev => ({ ...prev, [nodeId]: "" }));

    try {
      const response = await fetch(apiEndpoint, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "X-Google-API-Key": googleKey || "",
          "X-HF-API-Key": hfKey || ""
         },
        body: JSON.stringify({ ...payload, projectId: activeProjectId }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);

      if (nodeId.startsWith("start-")) setGeneratedFrames(prev => ({ ...prev, [nodeId]: data.imageUrl }));
      else if (nodeId.startsWith("char-")) setGeneratedChars(prev => ({ ...prev, [nodeId]: data.imageUrl }));
      else if (nodeId.startsWith("bg-")) setGeneratedBgs(prev => ({ ...prev, [nodeId]: data.imageUrl }));

    } catch (e: any) {
      setAssetErrors(prev => ({ ...prev, [nodeId]: e.message || "Generation failed" }));
    } finally {
      setGeneratingAssets(prev => ({ ...prev, [nodeId]: false }));
    }
  }, [activeProjectId]);

const generateVideo = useCallback(async (sceneNumber: number, prompt: string, startFrameUrl: string) => {
  const seedanceKey = localStorage.getItem("seedance_api_key");
  const hfKey = localStorage.getItem("hf_api_key");
  const hfVideoModel = localStorage.getItem("hf_video_model") || "stabilityai/stable-video-diffusion-img2vid-xt";
  
  const nodeId = `video-${sceneNumber}`;

  setGeneratingAssets(prev => ({ ...prev, [nodeId]: true }));

  try {
    const res = await fetch('/api/generate-video', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'X-Seedance-API-Key': seedanceKey || "",
        'X-HF-API-Key': hfKey || "",
        'X-Video-Model': hfVideoModel
      },
      body: JSON.stringify({ prompt, projectId: activeProjectId, sceneNumber, startFrameUrl })
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Failed to generate video");

    // ==========================================
    // PATH A: TIER 2 FINISHED IT INSTANTLY
    // ==========================================
    if (data.videoUrl) {
       setGeneratedVideos(prev => ({ ...prev, [sceneNumber]: data.videoUrl }));
       return; // Exit early, no polling needed!
    }

    // ==========================================
    // PATH B: TIER 1 GAVE US A TASK ID (Start Polling)
    // ==========================================
    const taskId = data.taskId;
    if (!taskId) throw new Error("Failed to get Task ID from Seedance");

    let isFinished = false;
    let finalVideoUrl = "";

    while (!isFinished) {
      await new Promise(resolve => setTimeout(resolve, 3000)); // Poll every 3 seconds
      
      const statusRes = await fetch(`/api/generate-video/status/${taskId}`, {
        headers: { 'X-Seedance-API-Key': seedanceKey || "" }
      });
      const statusData = await statusRes.json();

      if (statusData.status === "completed" || statusData.videoUrl) {
        finalVideoUrl = statusData.videoUrl;
        isFinished = true;
      } else if (statusData.status === "failed") {
        throw new Error("Seedance video generation failed internally.");
      }
    }

    setGeneratedVideos(prev => ({ ...prev, [sceneNumber]: finalVideoUrl }));

  } catch (err: any) {
    setAssetErrors(prev => ({ ...prev, [nodeId]: err.message }));
  } finally {
    setGeneratingAssets(prev => ({ ...prev, [nodeId]: false }));
  }
}, [activeProjectId]);


  // --- COMPLETED: SAVE OVERRIDES HANDLER ---
  const saveOverrides = useCallback(async (sceneNumber: number, type: string, idOrPrompt: string, newPrompt?: string, referenceImage?: string | null, generatedUrl?: string | null) => {
    if (!activeProjectId) return;

    try {
      const response = await fetch(`/api/projects/${activeProjectId}/overrides`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sceneNumber,
          type, // 'character', 'background', 'frame', or 'video'
          idOrPrompt, // charId for characters, otherwise a generic placeholder
          newPrompt,
          referenceImage,
          generatedUrl
        }),
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || "Failed to save edits.");
      }

      // Tells React Query to quietly refresh the canvas data from MongoDB
      queryClient.invalidateQueries({ queryKey: ["storyboardData", activeProjectId] });
      
    } catch (error: any) {
      console.error(`Save Override Error (Scene ${sceneNumber}):`, error);
      alert(error.message);
    }
  }, [activeProjectId, queryClient]);

  const addCharacterSlot = useCallback(async (sceneNumber: number) => {
  if (!activeProjectId) return;
  try {
    const newCharId = `char-${Date.now()}`;
    await fetch(`/api/projects/${activeProjectId}/character`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sceneNumber, charId: newCharId, name: "New Character", prompt: "" }),
    });
    queryClient.invalidateQueries({ queryKey: ["storyboardData", activeProjectId] });
  } catch (error: any) {
    console.error("Failed to add character slot", error);
  }
}, [activeProjectId, queryClient]);

  return {
    storyboard,
    isLoading: isLoading || (isFetching && storyboard.length === 0),
    generatedFrames,
    generatedChars, 
    generatedBgs,
    generatedVideos,
    generatingAssets,
    assetErrors,
    generateImage,
    generateVideo,
    saveOverrides,
    addCharacterSlot
  };
}