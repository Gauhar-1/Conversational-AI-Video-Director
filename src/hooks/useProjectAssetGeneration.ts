"use client";

/**
 * @file src/hooks/useProjectAssetGeneration.ts
 * @description SWR polling hook watching the Project document during background Inngest fan-out.
 * Reactively updates asset lock progress and triggers UI checklists as technical prompts are saved.
 */

import useSWR from "swr";
import { useMemo } from "react";

export interface AssetItemState {
  id: string;
  name: string;
  type: "character" | "environment" | "scene";
  status: string;
  isLocked: boolean;
  promptPreview?: string;
  details?: string;
}

export interface UseProjectAssetGenerationOptions {
  refreshInterval?: number;
  enabled?: boolean;
}

const fetcher = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Failed to fetch project: ${res.statusText}`);
  }
  return res.json();
};

export function useProjectAssetGeneration(
  projectId: string | null | undefined,
  options: UseProjectAssetGenerationOptions = {}
) {
  const { refreshInterval = 1500, enabled = true } = options;

  const shouldFetch = !!projectId && enabled;

  const { data: project, error, isLoading, mutate } = useSWR(
    shouldFetch ? `/api/projects/${projectId}` : null,
    fetcher,
    {
      refreshInterval: (latestData) => {
        // Stop polling automatically when all items are locked and complete
        if (!latestData) return refreshInterval;
        const chars = latestData.global_assets?.characters || [];
        const envs = latestData.global_assets?.locations || [];
        const scenes = latestData.scenes || [];
        const total = chars.length + envs.length + scenes.length;

        if (total === 0) return refreshInterval;

        const allCharsDone = chars.every(
          (c: any) => c.status === "ready_for_render" || c.status === "approved"
        );
        const allEnvsDone = envs.every(
          (e: any) => e.status === "ready_for_render" || e.status === "approved"
        );
        const allScenesDone = scenes.every(
          (s: any) =>
            s.status === "ready_for_render" ||
            s.status === "ready" ||
            s.status === "completed"
        );

        if (allCharsDone && allEnvsDone && allScenesDone) {
          return 0; // stop polling
        }
        return refreshInterval;
      },
      revalidateOnFocus: true,
      dedupingInterval: 1000,
    }
  );

  const parsedItems = useMemo(() => {
    if (!project) {
      return {
        characters: [] as AssetItemState[],
        environments: [] as AssetItemState[],
        scenes: [] as AssetItemState[],
        allItems: [] as AssetItemState[],
        completedCount: 0,
        totalCount: 0,
        progressPercentage: 0,
        isAllComplete: false,
      };
    }

    const characters: AssetItemState[] = (project.global_assets?.characters || []).map(
      (c: any) => ({
        id: c.assetId,
        name: c.name,
        type: "character" as const,
        status: c.status || "draft",
        isLocked: c.status === "ready_for_render" || c.status === "approved",
        promptPreview: c.appearancePrompt,
        details: c.role || "Lead Character",
      })
    );

    const environments: AssetItemState[] = (project.global_assets?.locations || []).map(
      (e: any) => ({
        id: e.assetId,
        name: e.name,
        type: "environment" as const,
        status: e.status || "draft",
        isLocked: e.status === "ready_for_render" || e.status === "approved",
        promptPreview: e.environmentPrompt,
        details: e.lightingProfile || "Atmospheric Lighting",
      })
    );

    const scenes: AssetItemState[] = (project.scenes || []).map((s: any) => ({
      id: s.sceneId,
      name: s.title || `Scene ${s.order}`,
      type: "scene" as const,
      status: s.status || "draft",
      isLocked:
        s.status === "ready_for_render" ||
        s.status === "ready" ||
        s.status === "completed",
      promptPreview: s.imagePrompt,
      details: `${s.cameraAngle || "CAM_A_CENTER"} • ${s.cameraMovement || "STATIC"}`,
    }));

    const allItems = [...characters, ...environments, ...scenes];
    const totalCount = allItems.length;
    const completedCount = allItems.filter((item) => item.isLocked).length;
    const progressPercentage =
      totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
    const isAllComplete = totalCount > 0 && completedCount === totalCount;

    return {
      characters,
      environments,
      scenes,
      allItems,
      completedCount,
      totalCount,
      progressPercentage,
      isAllComplete,
    };
  }, [project]);

  return {
    project,
    ...parsedItems,
    isLoading,
    error,
    mutate,
  };
}
