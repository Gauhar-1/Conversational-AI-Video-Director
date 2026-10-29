/**
 * @file src/inngest/functions/orchestrateBlueprint.ts
 * @description Master Inngest Orchestrator for Blueprint-to-Technical Prompt Fan-Out.
 * Enforces per-project concurrency limit of 1, dispatches sub-events to specialized workers,
 * and coordinates completion using step.waitForEvent.
 */

import { inngest } from "../client";
import dbConnect from "@/lib/db";
import { Blueprint } from "@/models/Blueprint";
import { Project } from "@/models/Project";

export const orchestrateBlueprint = inngest.createFunction(
  {
    id: "orchestrate-blueprint",
    name: "Master Blueprint Orchestrator (Plan-and-Execute Fan-Out)",
    triggers: [{ event: "project.blueprint.approved" }],
    concurrency: {
      limit: 1,
      key: "event.data.projectId", // Concurrency 1 per project to prevent API abuse
    },
    retries: 2,
  },
  async ({ event, step }) => {
    const { projectId, blueprintId, apiKey } = event.data;

    // Step 1: Read the MongoDB Blueprint document
    const blueprintData = await step.run("load-blueprint-state", async () => {
      await dbConnect();

      let bp = null;
      if (blueprintId) {
        bp = await Blueprint.findById(blueprintId);
      }
      if (!bp && projectId) {
        bp = await Blueprint.findOne({ projectId }).sort({ updatedAt: -1 });
      }

      if (!bp) {
        throw new Error(
          `Blueprint not found for ID: ${blueprintId} or projectId: ${projectId}`
        );
      }

      // Mark Blueprint as processing
      bp.status = "processing";
      await bp.save();

      // Ensure the Project document exists and initialize placeholder drafts
      const project = await Project.findById(projectId);
      if (project) {
        // Populate draft characters if not present
        for (const char of bp.characters) {
          const exists = project.global_assets.characters.some(
            (c: any) => c.assetId === char.assetId
          );
          if (!exists) {
            project.global_assets.characters.push({
              assetId: char.assetId,
              name: char.name,
              role: char.role || "Lead",
              appearancePrompt: char.description,
              imageUrl: "",
              pulidSeed: 42,
              status: "draft",
              generationHistory: [],
            });
          }
        }

        // Populate draft locations if not present
        for (const env of bp.environments) {
          const exists = project.global_assets.locations.some(
            (l: any) => l.assetId === env.assetId
          );
          if (!exists) {
            project.global_assets.locations.push({
              assetId: env.assetId,
              name: env.name,
              environmentPrompt: env.description,
              lightingProfile: "Cinematic lighting",
              imageUrl: "",
              status: "draft",
              generationHistory: [],
            });
          }
        }

        // Populate draft scenes if not present
        for (const sc of bp.scenes) {
          const exists = project.scenes.some((s: any) => s.sceneId === sc.sceneId);
          if (!exists) {
            project.scenes.push({
              sceneId: sc.sceneId,
              order: sc.order,
              rawDelta: sc.action,
              cameraAngle: "CAM_A_CENTER",
              cameraMovement: "STATIC",
              imagePrompt: "",
              motionPrompt: "",
              status: "draft",
              duration: sc.duration || 5,
              characterIds: sc.characterIds || [],
              locationId: sc.environmentId || "",
              takes: [],
            });
          }
        }

        await project.save();
      }

      return {
        id: bp._id.toString(),
        projectId: bp.projectId,
        title: bp.title,
        theme: bp.theme,
        characters: bp.characters.map((c: any) => ({
          assetId: c.assetId,
          name: c.name,
          role: c.role,
          description: c.description,
        })),
        environments: bp.environments.map((e: any) => ({
          assetId: e.assetId,
          name: e.name,
          description: e.description,
        })),
        scenes: bp.scenes.map((s: any) => ({
          sceneId: s.sceneId,
          order: s.order,
          action: s.action,
          characterIds: s.characterIds,
          environmentId: s.environmentId,
          cameraDirection: s.cameraDirection,
          duration: s.duration,
        })),
      };
    });

    const activeTheme = blueprintData.theme || "Cinematic human storytelling";
    const bpId = blueprintData.id;

    // Step 2: Fan-out dispatch sub-events to specialized workers
    // Instead of calling Groq directly in a loop, dispatch sub-events
    await step.run("fan-out-dispatch", async () => {
      const eventsToDispatch: any[] = [];

      // 1. Dispatch Character workers
      for (const char of blueprintData.characters) {
        eventsToDispatch.push({
          name: "replicate.prompt.character",
          data: {
            projectId,
            blueprintId: bpId,
            character: char,
            theme: activeTheme,
            apiKey,
          },
        });
      }

      // 2. Dispatch Environment workers
      for (const env of blueprintData.environments) {
        eventsToDispatch.push({
          name: "replicate.prompt.environment",
          data: {
            projectId,
            blueprintId: bpId,
            environment: env,
            theme: activeTheme,
            apiKey,
          },
        });
      }

      // 3. Dispatch Scene workers
      for (const sc of blueprintData.scenes) {
        eventsToDispatch.push({
          name: "replicate.prompt.scene",
          data: {
            projectId,
            blueprintId: bpId,
            scene: sc,
            theme: activeTheme,
            apiKey,
          },
        });
      }

      if (eventsToDispatch.length > 0) {
        await inngest.send(eventsToDispatch);
      }

      return { dispatchedCount: eventsToDispatch.length };
    });

    // Step 3: Wait for all sub-workers to complete using step.waitForEvent
    // Granular synchronization: wait for each character, environment, and scene
    for (const char of blueprintData.characters) {
      await step.waitForEvent(`wait-for-character-${char.assetId}`, {
        event: "replicate.prompt.character.completed",
        timeout: "10m",
        if: `async.data.assetId == '${char.assetId}' && async.data.projectId == '${projectId}'`,
      });
    }

    for (const env of blueprintData.environments) {
      await step.waitForEvent(`wait-for-environment-${env.assetId}`, {
        event: "replicate.prompt.environment.completed",
        timeout: "10m",
        if: `async.data.assetId == '${env.assetId}' && async.data.projectId == '${projectId}'`,
      });
    }

    for (const sc of blueprintData.scenes) {
      await step.waitForEvent(`wait-for-scene-${sc.sceneId}`, {
        event: "replicate.prompt.scene.completed",
        timeout: "10m",
        if: `async.data.sceneId == '${sc.sceneId}' && async.data.projectId == '${projectId}'`,
      });
    }

    // Step 4: Finalize Blueprint status to 'completed' without overwriting creative specs
    const summary = await step.run("finalize-orchestration", async () => {
      await dbConnect();

      // Update Blueprint status
      const bp = await Blueprint.findById(bpId);
      if (bp) {
        bp.status = "completed";
        await bp.save();
      }

      // Verify Project assets
      const project = await Project.findById(projectId);
      const readyCharacters =
        project?.global_assets?.characters?.filter(
          (c: any) => c.status === "ready_for_render"
        ).length || 0;
      const readyLocations =
        project?.global_assets?.locations?.filter(
          (l: any) => l.status === "ready_for_render"
        ).length || 0;
      const readyScenes =
        project?.scenes?.filter((s: any) => s.status === "ready_for_render").length || 0;

      return {
        completed: true,
        projectId,
        blueprintId: bpId,
        readyCharacters,
        readyLocations,
        readyScenes,
      };
    });

    return summary;
  }
);
