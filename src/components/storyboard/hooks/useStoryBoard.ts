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

  // --- VIDEO COMPILATION HANDLER ---
  const generateVideo = useCallback(async (sceneNumber: number, dependencies: { startImage?: string, bgImage?: string, charImages: string[], videoPrompt: string }) => {
    if (!activeProjectId) return;
    const videoNodeId = `video-${sceneNumber}`;

    if (!dependencies.startImage || !dependencies.bgImage || dependencies.charImages.length === 0) {
      return alert("Missing dependencies! Ensure Start Frame, Background, and at least 1 Character are generated.");
    }

    const hfKey = localStorage.getItem("hf_api_key");
    if (!hfKey) return setAssetErrors(prev => ({ ...prev, [videoNodeId]: "Missing HF Key" }));

    setGeneratingAssets(prev => ({ ...prev, [videoNodeId]: true }));
    setAssetErrors(prev => ({ ...prev, [videoNodeId]: "" }));

    try {
      const submitRes = await fetch("/api/generate-video", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${hfKey}` },
        body: JSON.stringify({ 
          start_image: dependencies.startImage, 
          background_image: dependencies.bgImage,
          character_images: dependencies.charImages, 
          prompt: dependencies.videoPrompt, // Use the dynamically edited prompt!
          videoModel: localStorage.getItem("hf_video_model"),
          projectId: activeProjectId,
          sceneNumber
        })
      });

      const submitData = await submitRes.json();
      if (!submitRes.ok) throw new Error(submitData.error);

      const pollInterval = setInterval(async () => {
        try {
          const pollRes = await fetch("/api/generate-video", {
            method: "POST",
            headers: { "Content-Type": "application/json", "Authorization": `Bearer ${hfKey}` },
            body: JSON.stringify({ requestId: submitData.requestId, projectId: activeProjectId, sceneNumber })
          });
          const pollData = await pollRes.json();

          if (pollData.status === "success") {
            clearInterval(pollInterval);
            setGeneratedVideos(prev => ({ ...prev, [videoNodeId]: pollData.videoUrl }));
            setGeneratingAssets(prev => ({ ...prev, [videoNodeId]: false }));
          } else if (pollData.error) {
            clearInterval(pollInterval);
            throw new Error(pollData.error);
          }
        } catch (e: any) {
          clearInterval(pollInterval);
          setGeneratingAssets(prev => ({ ...prev, [videoNodeId]: false }));
          setAssetErrors(prev => ({ ...prev, [videoNodeId]: e.message }));
        }
      }, 5000);

    } catch (e: any) {
      setGeneratingAssets(prev => ({ ...prev, [videoNodeId]: false }));
      setAssetErrors(prev => ({ ...prev, [videoNodeId]: e.message }));
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