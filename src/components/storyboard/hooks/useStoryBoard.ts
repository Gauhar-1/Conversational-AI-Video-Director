import { useState, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";

export function useStoryboard(activeProjectId: string | null) {
  const queryClient = useQueryClient();

  // --- ASSET STATES ---
  const [generatedFrames, setGeneratedFrames] = useState<Record<string, string>>({});
  const [generatedChars, setGeneratedChars] = useState<Record<string, string>>({}); 
  const [generatedBgs, setGeneratedBgs] = useState<Record<string, string>>({});
  const [generatedVideos, setGeneratedVideos] = useState<Record<string, string>>({});
  
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

  // --- COMPLETED: SAVE OVERRIDES HANDLER ---
  const saveOverrides = useCallback(async (
    sceneNumber: number, 
    type: string, 
    idOrPrompt: string, 
    newPrompt?: string, 
    referenceImage?: string | null, 
    generatedUrl?: string | null,
    taskId?: string // NEW: Added taskId to the signature
  ) => {
    if (!activeProjectId) return;

    try {
      const response = await fetch(`/api/projects/${activeProjectId}/overrides`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sceneNumber, type, idOrPrompt, newPrompt, referenceImage, generatedUrl, taskId
        }),
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || "Failed to save edits.");
      }

      // Quietly refresh the canvas data from MongoDB
      queryClient.invalidateQueries({ queryKey: ["storyboardData", activeProjectId] });
      
    } catch (error: any) {
      console.error(`Save Override Error:`, error);
      alert(error.message);
    }
  }, [activeProjectId, queryClient]);


  // --- GENERIC IMAGE HANDLER ---
  const generateImage = useCallback(async (nodeId: string, apiEndpoint: string, payload: any) => {
    if (!activeProjectId) return;
    const replicateKey = localStorage.getItem("replicate_api_key");
    if (!replicateKey) return setAssetErrors(prev => ({ ...prev, [nodeId]: "Missing Replicate API Key" }));

    setGeneratingAssets(prev => ({ ...prev, [nodeId]: true }));
    setAssetErrors(prev => ({ ...prev, [nodeId]: "" }));

    try {
      const response = await fetch(apiEndpoint, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "X-Replicate-Key": replicateKey
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

  
  // --- REFACTORED: FIRE-AND-FORGET VIDEO GENERATOR ---
  const generateVideo = useCallback(async (
    sceneNumber: number, 
    prompt: string, 
    selectedModel: string, 
    advancedInputs: Record<string, any> // NEW: Accepts the full payload from Canvas
  ) => {
    const replicateKey = localStorage.getItem("replicate_api_key");
    const nodeId = `video-${sceneNumber}`;

    if (!replicateKey) {
      setAssetErrors(prev => ({ ...prev, [nodeId]: "Please configure your Replicate API Key in settings." }));
      return;
    }

    setGeneratingAssets(prev => ({ ...prev, [nodeId]: true }));
    setAssetErrors(prev => ({ ...prev, [nodeId]: "" }));

    try {
      const res = await fetch('/api/generate-video', { 
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'X-Replicate-Key': replicateKey
        },
        body: JSON.stringify({ 
          rawPrompt: prompt, 
          projectId: activeProjectId, 
          sceneNumber,
          userPreference: selectedModel, 
          advancedInputs // Pass the exact object provided by the Canvas
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to queue video generation");

      if (data.taskId) {
         await saveOverrides(
          sceneNumber, 
          'video', // FIX 1: Must be exactly 'video', not 'video_task'
          nodeId,  // FIX 2: Must be the node ID (e.g., 'video-1'), not 'task'
          prompt,  // Pass the prompt so it doesn't get erased
          null, 
          null, 
          data.taskId // Pass the new task ID
        );
      }

    } catch (err: any) {
      setAssetErrors(prev => ({ ...prev, [nodeId]: err.message }));
    } finally {
      setGeneratingAssets(prev => ({ ...prev, [nodeId]: false }));
    }
  }, [activeProjectId, saveOverrides]);


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