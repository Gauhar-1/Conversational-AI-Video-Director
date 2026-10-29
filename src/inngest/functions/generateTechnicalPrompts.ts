/**
 * @file src/inngest/functions/generateTechnicalPrompts.ts
 * @description Specialized Inngest worker functions for Character, Environment, and Scene prompt generation.
 * Enforces rate limiting via strict global concurrency (max 3), granular retries,
 * and updates Project documents with status 'ready_for_render' without overwriting Blueprints.
 */

import OpenAI from "openai";
import { inngest } from "../client";
import dbConnect from "@/lib/db";
import { Project, ICharacterAssetDoc, ILocationAssetDoc, ISceneDoc } from "@/models/Project";
import { repairAndParseJson } from "@/lib/utils/jsonRepair";

/**
 * Creates an OpenAI client pointing to Groq's API with BYOK or environment credentials.
 */
function getGroqClient(apiKey?: string): OpenAI {
  const key =
    (apiKey && apiKey.trim()) ||
    process.env.GROQ_API_KEY ||
    "gsk_dummy_key_for_initialization";

  return new OpenAI({
    baseURL: "https://api.groq.com/openai/v1",
    apiKey: key,
  });
}

// =========================================================================
// 1. CHARACTER WORKER
// =========================================================================
export const generateCharacterTechnicalPrompt = inngest.createFunction(
  {
    id: "generate-character-technical-prompt",
    name: "Generate Character Technical Prompt (Replicate Flux)",
    triggers: [{ event: "replicate.prompt.character" }],
    concurrency: {
      limit: 3, // Rate limiting under Groq TPM limits
    },
    retries: 3,
  },
  async ({ event, step }) => {
    const { projectId, blueprintId, character, theme, apiKey } = event.data;

    // Step 1: Call Groq with strict JSON output contract
    const generated = await step.run("generate-flux-character-prompt", async () => {
      const client = getGroqClient(apiKey);

      const systemPrompt = `You are a master AI Prompt Engineer specializing in Replicate Flux character generation. Your ONLY job is to output a comma-separated Replicate Flux prompt focusing strictly on facial features, skin texture, age details, eyes, hair, and wardrobe textures. Ground the character in high-fidelity photography (ARRI Alexa 65 portrait, 85mm lens, natural subsurface scattering, 8k resolution, raw photo).
You must output ONLY a valid JSON object with the exact schema:
{
  "prompt": "comma-separated technical Flux prompt focusing on facial features, wardrobe, and texture",
  "pulidSeed": 42
}`;

      const userContent = `Theme: ${theme || "Cinematic human storytelling"}
Character Name: ${character.name}
Role: ${character.role || "Lead"}
Character Description: ${character.description}`;

      const completion = await client.chat.completions.create({
        model: "llama-3.3-70b-versatile",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userContent },
        ],
        response_format: { type: "json_object" },
        temperature: 0.3,
      });

      const raw = completion.choices[0]?.message?.content || "{}";
      const parsed = repairAndParseJson<{ prompt: string; pulidSeed?: number }>(raw);

      return {
        prompt:
          parsed.prompt ||
          `Cinematic portrait of ${character.name}, ${character.description}, 85mm lens, natural lighting, highly detailed skin texture, raw photo`,
        pulidSeed: parsed.pulidSeed || 42,
      };
    });

    // Step 2: Push technical prompt into Project.global_assets.characters and set status to ready_for_render
    await step.run("update-project-character-db", async () => {
      await dbConnect();
      const project = await Project.findById(projectId);
      if (!project) {
        throw new Error(`Project not found: ${projectId}`);
      }

      const existingIndex = project.global_assets.characters.findIndex(
        (c: ICharacterAssetDoc) => c.assetId === character.assetId
      );

      if (existingIndex >= 0) {
        project.global_assets.characters[existingIndex].appearancePrompt = generated.prompt;
        project.global_assets.characters[existingIndex].status = "ready_for_render";
        project.global_assets.characters[existingIndex].pulidSeed = generated.pulidSeed;
      } else {
        project.global_assets.characters.push({
          assetId: character.assetId,
          name: character.name,
          role: character.role || "Lead",
          appearancePrompt: generated.prompt,
          imageUrl: "",
          pulidSeed: generated.pulidSeed,
          status: "ready_for_render",
          generationHistory: [],
        });
      }

      await project.save();
    });

    // Step 3: Dispatch completion event for orchestrator step.waitForEvent
    await step.sendEvent("character-prompt-completed", {
      name: "replicate.prompt.character.completed",
      data: {
        projectId,
        blueprintId,
        assetId: character.assetId,
        prompt: generated.prompt,
      },
    });

    return {
      success: true,
      assetId: character.assetId,
      status: "ready_for_render",
      prompt: generated.prompt,
    };
  }
);

// =========================================================================
// 2. ENVIRONMENT WORKER
// =========================================================================
export const generateEnvironmentTechnicalPrompt = inngest.createFunction(
  {
    id: "generate-environment-technical-prompt",
    name: "Generate Environment Technical Prompt (Replicate Flux)",
    triggers: [{ event: "replicate.prompt.environment" }],
    concurrency: {
      limit: 3, // Rate limiting under Groq TPM limits
    },
    retries: 3,
  },
  async ({ event, step }) => {
    const { projectId, blueprintId, environment, theme, apiKey } = event.data;

    // Step 1: Call Groq with strict JSON output contract
    const generated = await step.run("generate-flux-environment-prompt", async () => {
      const client = getGroqClient(apiKey);

      const systemPrompt = `You are a master AI Cinematographer and Architectural Director specializing in Replicate Flux environment generation. Your ONLY job is to output a volumetric lighting and architectural prompt. No people, no characters. Focus on spatial geometry, lighting temperature, atmospheric haze, color palette, and lens choices (24mm wide angle, anamorphic depth, volumetric sunlight, 8k resolution, photorealistic architectural digest style).
You must output ONLY a valid JSON object with the exact schema:
{
  "prompt": "comma-separated volumetric lighting and architectural prompt",
  "lightingProfile": "concise lighting profile descriptor (e.g., Warm 3200K tungsten with volumetric afternoon rim rays)"
}`;

      const userContent = `Theme: ${theme || "Cinematic human storytelling"}
Environment Name: ${environment.name}
Environment Description: ${environment.description}`;

      const completion = await client.chat.completions.create({
        model: "llama-3.3-70b-versatile",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userContent },
        ],
        response_format: { type: "json_object" },
        temperature: 0.3,
      });

      const raw = completion.choices[0]?.message?.content || "{}";
      const parsed = repairAndParseJson<{ prompt: string; lightingProfile?: string }>(raw);

      return {
        prompt:
          parsed.prompt ||
          `Cinematic architectural interior of ${environment.name}, ${environment.description}, volumetric lighting, 24mm anamorphic lens, high dynamic range, photorealistic`,
        lightingProfile: parsed.lightingProfile || "Atmospheric volumetric lighting",
      };
    });

    // Step 2: Push technical prompt into Project.global_assets.locations and set status to ready_for_render
    await step.run("update-project-environment-db", async () => {
      await dbConnect();
      const project = await Project.findById(projectId);
      if (!project) {
        throw new Error(`Project not found: ${projectId}`);
      }

      const existingIndex = project.global_assets.locations.findIndex(
        (l: ILocationAssetDoc) => l.assetId === environment.assetId
      );

      if (existingIndex >= 0) {
        project.global_assets.locations[existingIndex].environmentPrompt = generated.prompt;
        project.global_assets.locations[existingIndex].lightingProfile = generated.lightingProfile;
        project.global_assets.locations[existingIndex].status = "ready_for_render";
      } else {
        project.global_assets.locations.push({
          assetId: environment.assetId,
          name: environment.name,
          environmentPrompt: generated.prompt,
          lightingProfile: generated.lightingProfile,
          imageUrl: "",
          status: "ready_for_render",
          generationHistory: [],
        });
      }

      await project.save();
    });

    // Step 3: Dispatch completion event for orchestrator step.waitForEvent
    await step.sendEvent("environment-prompt-completed", {
      name: "replicate.prompt.environment.completed",
      data: {
        projectId,
        blueprintId,
        assetId: environment.assetId,
        prompt: generated.prompt,
      },
    });

    return {
      success: true,
      assetId: environment.assetId,
      status: "ready_for_render",
      prompt: generated.prompt,
    };
  }
);

// =========================================================================
// 3. SCENE WORKER
// =========================================================================
export const generateSceneTechnicalPrompt = inngest.createFunction(
  {
    id: "generate-scene-technical-prompt",
    name: "Generate Scene Technical Prompt (Camera Angle & Motion)",
    triggers: [{ event: "replicate.prompt.scene" }],
    concurrency: {
      limit: 3, // Rate limiting under Groq TPM limits
    },
    retries: 3,
  },
  async ({ event, step }) => {
    const { projectId, blueprintId, scene, theme, apiKey } = event.data;

    // Step 1: Call Groq with strict JSON output contract
    const generated = await step.run("generate-scene-prompt", async () => {
      const client = getGroqClient(apiKey);

      const systemPrompt = `You are a technical VFX Director and AI Camera Operator. You translate narrative action into deterministic camera and motion prompts for AI video models (Kling / Wan / Replicate).
Your ONLY job is to output the exact [CAM_ANGLE] framing, image composition prompt, and motion intensity parameters.
Valid camera angles: CAM_A_CENTER, CAM_B_45_CLOSE, CAM_C_OTS, CLOSE_UP, MEDIUM_SHOT, WIDE_SHOT, EXTREME_CLOSE_UP, ESTABLISHING.
Valid camera movements: STATIC, PUSH_IN, PULL_OUT, PAN_LEFT, PAN_RIGHT, TILT_UP, TILT_DOWN, TRACKING, ORBIT.
You must output ONLY a valid JSON object with the exact schema:
{
  "cameraAngle": "one of the valid camera angles",
  "cameraMovement": "one of the valid camera movements",
  "imagePrompt": "[CAM_ANGLE]: Master visual composition specifying subject placement, lighting, and framing in 9:16 vertical orientation",
  "motionPrompt": "[CAM_ANGLE]: Exact temporal movement across 5 seconds with physics and motion intensity parameters (e.g. speed: 0.6, camera translation, subtle micro-expressions)"
}`;

      const userContent = `Theme: ${theme || "Cinematic human storytelling"}
Scene Order: ${scene.order}
Action: ${scene.action}
Locked Character IDs: ${(scene.characterIds || []).join(", ") || "None"}
Locked Environment ID: ${scene.environmentId || "None"}
Camera Direction: ${scene.cameraDirection || "Cinematic framing"}`;

      const completion = await client.chat.completions.create({
        model: "llama-3.3-70b-versatile",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userContent },
        ],
        response_format: { type: "json_object" },
        temperature: 0.3,
      });

      const raw = completion.choices[0]?.message?.content || "{}";
      const parsed = repairAndParseJson<{
        cameraAngle?: any;
        cameraMovement?: any;
        imagePrompt?: string;
        motionPrompt?: string;
      }>(raw);

      const validAngles = [
        "CAM_A_CENTER",
        "CAM_B_45_CLOSE",
        "CAM_C_OTS",
        "CLOSE_UP",
        "MEDIUM_SHOT",
        "WIDE_SHOT",
        "EXTREME_CLOSE_UP",
        "ESTABLISHING",
      ];
      const validMovements = [
        "STATIC",
        "PUSH_IN",
        "PULL_OUT",
        "PAN_LEFT",
        "PAN_RIGHT",
        "TILT_UP",
        "TILT_DOWN",
        "TRACKING",
        "ORBIT",
      ];

      const cameraAngle = validAngles.includes(parsed.cameraAngle)
        ? parsed.cameraAngle
        : "CAM_A_CENTER";
      const cameraMovement = validMovements.includes(parsed.cameraMovement)
        ? parsed.cameraMovement
        : "STATIC";

      return {
        cameraAngle,
        cameraMovement,
        imagePrompt:
          parsed.imagePrompt ||
          `[${cameraAngle}]: ${scene.action}. Cinematic lighting, 9:16 vertical framing, photorealistic ARRI capture.`,
        motionPrompt:
          parsed.motionPrompt ||
          `[${cameraAngle}]: 5-second gentle camera ${cameraMovement.toLowerCase()}, subtle emotional micro-expressions and organic fluid dynamics.`,
      };
    });

    // Step 2: Push technical prompt into Project.scenes and set status to ready_for_render
    await step.run("update-project-scene-db", async () => {
      await dbConnect();
      const project = await Project.findById(projectId);
      if (!project) {
        throw new Error(`Project not found: ${projectId}`);
      }

      const existingIndex = project.scenes.findIndex(
        (s: ISceneDoc) => s.sceneId === scene.sceneId
      );

      if (existingIndex >= 0) {
        project.scenes[existingIndex].cameraAngle = generated.cameraAngle;
        project.scenes[existingIndex].cameraMovement = generated.cameraMovement;
        project.scenes[existingIndex].imagePrompt = generated.imagePrompt;
        project.scenes[existingIndex].motionPrompt = generated.motionPrompt;
        project.scenes[existingIndex].status = "ready_for_render";
      } else {
        project.scenes.push({
          sceneId: scene.sceneId,
          order: scene.order,
          rawDelta: scene.action,
          cameraAngle: generated.cameraAngle,
          cameraMovement: generated.cameraMovement,
          imagePrompt: generated.imagePrompt,
          motionPrompt: generated.motionPrompt,
          status: "ready_for_render",
          duration: scene.duration || 5,
          characterIds: scene.characterIds || [],
          locationId: scene.environmentId || "",
          takes: [],
        });
      }

      await project.save();
    });

    // Step 3: Dispatch completion event for orchestrator step.waitForEvent
    await step.sendEvent("scene-prompt-completed", {
      name: "replicate.prompt.scene.completed",
      data: {
        projectId,
        blueprintId,
        sceneId: scene.sceneId,
        imagePrompt: generated.imagePrompt,
        motionPrompt: generated.motionPrompt,
      },
    });

    return {
      success: true,
      sceneId: scene.sceneId,
      status: "ready_for_render",
      imagePrompt: generated.imagePrompt,
      motionPrompt: generated.motionPrompt,
    };
  }
);
