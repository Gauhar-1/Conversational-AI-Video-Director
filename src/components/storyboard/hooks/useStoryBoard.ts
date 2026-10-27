"use client";

import { useState, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ISceneDoc, IGlobalVault, CameraAngle } from "@/models/Project";

const EMPTY_SCENES: ISceneDoc[] = [];
const DEFAULT_GLOBAL_VAULT: IGlobalVault = {
  characterAnchor: { description: "Lead protagonist", imageUrl: "", replicatePulidSeed: 42 },
  environmentAnchor: { description: "Volumetric neon atmospheric environment", imageUrl: "", lightingProfile: "Cinematic contrast" },
  aspectRatio: "9:16"
};

export function useStoryboard(activeProjectId: string | null) {
  const queryClient = useQueryClient();

  // --- ASSET STATES ---
  const [generatedFrames, setGeneratedFrames] = useState<Record<string, string>>({});
  const [generatedChars, setGeneratedChars] = useState<Record<string, string>>({}); 
  const [generatedBgs, setGeneratedBgs] = useState<Record<string, string>>({});
  const [generatedVideos, setGeneratedVideos] = useState<Record<string, string>>({});
  
  const [generatingAssets, setGeneratingAssets] = useState<Record<string, boolean>>({}); 
  const [assetErrors, setAssetErrors] = useState<Record<string, string>>({});

  // SSE Enrichment States
  const [enrichingScenes, setEnrichingScenes] = useState<Record<string, boolean>>({});
  const [lastTokenResult, setLastTokenResult] = useState<{ tokensUsed: number; tokensSaved: number; type: string } | null>(null);

  // --- DATA FETCHING (PROJECT WITH GLOBAL VAULT & SCENES) ---
  const { data: project, isLoading, isFetching } = useQuery<{
    _id: string;
    title: string;
    storyboard: any[];
    scenes: ISceneDoc[];
    globalVault: IGlobalVault;
  }>({
    queryKey: ["storyboardData", activeProjectId],
    queryFn: async () => {
      if (!activeProjectId) {
        return {
          _id: "",
          title: "New Project",
          storyboard: EMPTY_SCENES,
          scenes: EMPTY_SCENES,
          globalVault: DEFAULT_GLOBAL_VAULT,
        };
      }
      const res = await fetch(`/api/projects/${activeProjectId}`);
      if (!res.ok) throw new Error("Failed to fetch project data");
      return await res.json();
    },
    enabled: !!activeProjectId,
  });

  const storyboard = project?.storyboard || EMPTY_SCENES;
  const scenes = project?.scenes || EMPTY_SCENES;
  const globalVault = project?.globalVault || DEFAULT_GLOBAL_VAULT;

  // --- SERVER-SENT EVENTS (SSE) DELTA ENRICHMENT ---
  const enrichSceneDelta = useCallback(async (
    sceneId: string, 
    rawDelta: string, 
    cameraAngle: CameraAngle
  ) => {
    if (!activeProjectId) return;

    setEnrichingScenes(prev => ({ ...prev, [sceneId]: true }));
    setAssetErrors(prev => ({ ...prev, [sceneId]: "" }));

    // Optimistically update scene cameraAngle & status
    queryClient.setQueryData(["storyboardData", activeProjectId], (old: any) => {
      if (!old || !old.scenes) return old;
      return {
        ...old,
        scenes: old.scenes.map((s: ISceneDoc) => 
          s.sceneId === sceneId 
            ? { ...s, cameraAngle, rawDelta, status: "enriching" as const }
            : s
        )
      };
    });

    try {
      const groqKey = typeof window !== "undefined" ? localStorage.getItem("groq_api_key") : null;
      
      const response = await fetch(`/api/scenes/${sceneId}/enrich`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(groqKey ? { "Authorization": `Bearer ${groqKey}` } : {})
        },
        body: JSON.stringify({
          projectId: activeProjectId,
          rawDelta,
          cameraAngle
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Enrichment failed with status ${response.status}`);
      }

      if (!response.body) throw new Error("No response body for SSE stream");

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed.startsWith("data:")) continue;
          const dataStr = trimmed.replace("data:", "").trim();
          if (dataStr === "[DONE]") break;

          try {
            const data = JSON.parse(dataStr);
            if (data.type === "cached" || data.type === "done") {
              setLastTokenResult({
                tokensUsed: data.tokensUsed || 0,
                tokensSaved: data.tokensSaved || (data.type === "cached" ? 480 : 0),
                type: data.type
              });

              // Apply the enriched prompt to local cache
              queryClient.setQueryData(["storyboardData", activeProjectId], (old: any) => {
                if (!old || !old.scenes) return old;
                return {
                  ...old,
                  scenes: old.scenes.map((s: ISceneDoc) => 
                    s.sceneId === sceneId 
                      ? { 
                          ...s, 
                          cameraAngle: data.cameraAngle || cameraAngle,
                          rawDelta: data.rawDelta || rawDelta,
                          imagePrompt: data.imagePrompt, 
                          motionPrompt: data.motionPrompt,
                          status: "ready" as const 
                        }
                      : s
                  )
                };
              });
            }
          } catch (pErr) {
            console.debug("SSE Chunk parsing", pErr);
          }
        }
      }

    } catch (err: any) {
      console.error("SSE Enrichment Error:", err);
      setAssetErrors(prev => ({ ...prev, [sceneId]: err.message }));
      queryClient.setQueryData(["storyboardData", activeProjectId], (old: any) => {
        if (!old || !old.scenes) return old;
        return {
          ...old,
          scenes: old.scenes.map((s: ISceneDoc) => 
            s.sceneId === sceneId ? { ...s, status: "idle" as const } : s
          )
        };
      });
    } finally {
      setEnrichingScenes(prev => ({ ...prev, [sceneId]: false }));
    }
  }, [activeProjectId, queryClient]);

  // --- UPDATE INDIVIDUAL SCENE PROPERTIES ---
  const updateScene = useCallback(async (sceneId: string, updates: Partial<ISceneDoc>) => {
    if (!activeProjectId) return;

    // Optimistic update
    queryClient.setQueryData(["storyboardData", activeProjectId], (old: any) => {
      if (!old || !old.scenes) return old;
      return {
        ...old,
        scenes: old.scenes.map((s: ISceneDoc) => 
          s.sceneId === sceneId ? { ...s, ...updates } : s
        )
      };
    });

    try {
      const res = await fetch(`/api/scenes/${sceneId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId: activeProjectId, updates })
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to update scene");
      }
    } catch (err: any) {
      console.error("Failed to update scene:", err);
      alert(err.message);
      queryClient.invalidateQueries({ queryKey: ["storyboardData", activeProjectId] });
    }
  }, [activeProjectId, queryClient]);

  // --- UPDATE GLOBAL VAULT ---
  const updateVault = useCallback(async (vaultUpdates: Partial<IGlobalVault>) => {
    if (!activeProjectId) return;

    queryClient.setQueryData(["storyboardData", activeProjectId], (old: any) => {
      if (!old) return old;
      return {
        ...old,
        globalVault: { ...old.globalVault, ...vaultUpdates }
      };
    });

    try {
      await fetch(`/api/projects/${activeProjectId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          globalVault: { ...globalVault, ...vaultUpdates }
        })
      });
    } catch (err) {
      console.error("Failed to update vault", err);
    }
  }, [activeProjectId, globalVault, queryClient]);

  // --- GENERATE FRAME (REPLICATE) ---
  const generateSceneFrame = useCallback(async (sceneId: string, prompt: string) => {
    if (!activeProjectId) return;
    const replicateKey = localStorage.getItem("replicate_api_key");
    if (!replicateKey) {
      setAssetErrors(prev => ({ ...prev, [sceneId]: "Missing Replicate API Key in Settings" }));
      return;
    }

    setGeneratingAssets(prev => ({ ...prev, [sceneId]: true }));
    setAssetErrors(prev => ({ ...prev, [sceneId]: "" }));

    try {
      const matchOrder = sceneId.replace("scene-", "");
      const sceneNum = parseInt(matchOrder) || 1;

      const res = await fetch("/api/generate-frame", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Replicate-Key": replicateKey
        },
        body: JSON.stringify({
          prompt,
          projectId: activeProjectId,
          sceneNumber: sceneNum
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Frame generation failed");

      if (data.imageUrl) {
        await updateScene(sceneId, { firstFrameUrl: data.imageUrl, status: "ready" });
      }
    } catch (err: any) {
      setAssetErrors(prev => ({ ...prev, [sceneId]: err.message }));
    } finally {
      setGeneratingAssets(prev => ({ ...prev, [sceneId]: false }));
    }
  }, [activeProjectId, updateScene]);

  // --- GENERATE CHARACTER (REPLICATE FLUX) ---
  const generateSceneCharacter = useCallback(async (
    sceneNumber: number,
    charId: string = "char-1",
    prompt: string
  ) => {
    if (!activeProjectId) return;
    const replicateKey = localStorage.getItem("replicate_api_key");
    const key = `char-${charId}-${sceneNumber}`;
    if (!replicateKey) {
      setAssetErrors(prev => ({ ...prev, [key]: "Missing Replicate API Key in Settings" }));
      return;
    }

    setGeneratingAssets(prev => ({ ...prev, [key]: true }));
    setAssetErrors(prev => ({ ...prev, [key]: "" }));

    try {
      const res = await fetch("/api/generate-character", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Replicate-Key": replicateKey
        },
        body: JSON.stringify({
          prompt,
          charId,
          projectId: activeProjectId,
          sceneNumber
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Character generation failed");

      if (data.imageUrl) {
        setGeneratedChars(prev => ({ ...prev, [key]: data.imageUrl }));
        queryClient.invalidateQueries({ queryKey: ["storyboardData", activeProjectId] });
      }
    } catch (err: any) {
      setAssetErrors(prev => ({ ...prev, [key]: err.message }));
    } finally {
      setGeneratingAssets(prev => ({ ...prev, [key]: false }));
    }
  }, [activeProjectId, queryClient]);

  // --- GENERATE BACKGROUND (REPLICATE FLUX) ---
  const generateSceneBackground = useCallback(async (
    sceneNumber: number,
    prompt: string,
    referenceImage?: string
  ) => {
    if (!activeProjectId) return;
    const replicateKey = localStorage.getItem("replicate_api_key");
    const key = `bg-${sceneNumber}`;
    if (!replicateKey) {
      setAssetErrors(prev => ({ ...prev, [key]: "Missing Replicate API Key in Settings" }));
      return;
    }

    setGeneratingAssets(prev => ({ ...prev, [key]: true }));
    setAssetErrors(prev => ({ ...prev, [key]: "" }));

    try {
      const res = await fetch("/api/generate-background", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Replicate-Key": replicateKey
        },
        body: JSON.stringify({
          prompt,
          reference_image: referenceImage,
          projectId: activeProjectId,
          sceneNumber
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Background generation failed");

      if (data.imageUrl) {
        setGeneratedBgs(prev => ({ ...prev, [key]: data.imageUrl }));
        queryClient.invalidateQueries({ queryKey: ["storyboardData", activeProjectId] });
      }
    } catch (err: any) {
      setAssetErrors(prev => ({ ...prev, [key]: err.message }));
    } finally {
      setGeneratingAssets(prev => ({ ...prev, [key]: false }));
    }
  }, [activeProjectId, queryClient]);

  // --- GENERATE VIDEO (REPLICATE) ---
  const generateSceneVideo = useCallback(async (
    sceneId: string, 
    prompt: string, 
    model: string, 
    advancedInputs: any
  ) => {
    if (!activeProjectId) return;
    const replicateKey = localStorage.getItem("replicate_api_key");
    if (!replicateKey) {
      setAssetErrors(prev => ({ ...prev, [sceneId]: "Missing Replicate API Key in Settings" }));
      return;
    }

    setGeneratingAssets(prev => ({ ...prev, [sceneId]: true }));
    setAssetErrors(prev => ({ ...prev, [sceneId]: "" }));
    await updateScene(sceneId, { status: "generating" });

    try {
      const matchOrder = sceneId.replace("scene-", "");
      const sceneNum = parseInt(matchOrder) || 1;

      const res = await fetch("/api/generate-video", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Replicate-Key": replicateKey
        },
        body: JSON.stringify({
          rawPrompt: prompt,
          projectId: activeProjectId,
          sceneNumber: sceneNum,
          userPreference: model,
          advancedInputs
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Video queue failed");

      // Polling for video completion
      if (data.taskId) {
        const taskId = data.taskId;
        const pollInterval = setInterval(async () => {
          try {
            const statusRes = await fetch(`/api/generate-video/status/${taskId}`, {
              headers: { "X-Replicate-Key": replicateKey }
            });
            if (!statusRes.ok) return;
            const statusData = await statusRes.json();

            if (statusData.status === "completed" && statusData.finalVideoUrl) {
              clearInterval(pollInterval);
              await updateScene(sceneId, {
                videoUrl: statusData.finalVideoUrl,
                status: "completed"
              });
              setGeneratingAssets(prev => ({ ...prev, [sceneId]: false }));
            } else if (statusData.status === "failed") {
              clearInterval(pollInterval);
              await updateScene(sceneId, { status: "failed" });
              setAssetErrors(prev => ({ ...prev, [sceneId]: statusData.error || "Video generation failed" }));
              setGeneratingAssets(prev => ({ ...prev, [sceneId]: false }));
            }
          } catch (pollErr) {
            console.error("Video poll error", pollErr);
          }
        }, 3000);
      }
    } catch (err: any) {
      setAssetErrors(prev => ({ ...prev, [sceneId]: err.message }));
      await updateScene(sceneId, { status: "failed" });
      setGeneratingAssets(prev => ({ ...prev, [sceneId]: false }));
    }
  }, [activeProjectId, updateScene]);

  // Backward compatibility overrides handler
  const saveOverrides = useCallback(async (
    sceneNumber: number, 
    type: string, 
    idOrPrompt: string, 
    newPrompt?: string, 
    referenceImage?: string | null, 
    generatedUrl?: string | null,
    taskId?: string
  ) => {
    if (!activeProjectId) return;
    try {
      const response = await fetch(`/api/projects/${activeProjectId}/overrides`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sceneNumber, type, idOrPrompt, newPrompt, referenceImage, generatedUrl, taskId }),
      });
      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || "Failed to save edits.");
      }
      queryClient.invalidateQueries({ queryKey: ["storyboardData", activeProjectId] });
    } catch (error: any) {
      console.error("Save Override Error:", error);
    }
  }, [activeProjectId, queryClient]);

  const generateImage = useCallback(async (nodeId: string, apiEndpoint: string, payload: any) => {
    if (!activeProjectId) return;
    const replicateKey = localStorage.getItem("replicate_api_key");
    if (!replicateKey) return setAssetErrors(prev => ({ ...prev, [nodeId]: "Missing Replicate API Key" }));

    setGeneratingAssets(prev => ({ ...prev, [nodeId]: true }));
    setAssetErrors(prev => ({ ...prev, [nodeId]: "" }));

    try {
      const response = await fetch(apiEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Replicate-Key": replicateKey },
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

  const generateVideo = useCallback(async (
    sceneNumber: number, 
    prompt: string, 
    selectedModel: string, 
    advancedInputs: Record<string, any>
  ) => {
    const sceneId = `scene-${sceneNumber}`;
    return generateSceneVideo(sceneId, prompt, selectedModel, advancedInputs);
  }, [generateSceneVideo]);

  return {
    project,
    scenes,
    globalVault,
    storyboard,
    isLoading: isLoading || (isFetching && scenes.length === 0 && storyboard.length === 0),
    enrichingScenes,
    lastTokenResult,
    enrichSceneDelta,
    updateScene,
    updateVault,
    generateSceneFrame,
    generateSceneCharacter,
    generateSceneBackground,
    generateSceneVideo,
    generatedFrames,
    generatedChars, 
    generatedBgs,
    generatedVideos,
    generatingAssets,
    assetErrors,
    generateImage,
    generateVideo,
    saveOverrides
  };
}