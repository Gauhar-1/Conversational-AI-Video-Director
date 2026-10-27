/**
 * @file src/lib/utils/idempotency.ts
 * @description Deterministic Idempotency Key Generator for AI Generation Pipelines.
 * Prevents duplicate model executions and double-billing on client retries or network drops.
 */

import crypto from "crypto";

export interface IdempotencyParams {
  userId: string;
  projectId: string;
  sceneId?: string;
  prompt: string;
  modelOrPreference?: string;
  advancedInputs?: Record<string, any>;
}

/**
 * Computes a deterministic SHA-256 hash representing a unique generation intent.
 *
 * @param params Context parameters including userId, sceneId, prompt, and options
 * @returns 64-character hexadecimal SHA-256 hash
 */
export function generateIdempotencyKey(params: IdempotencyParams): string {
  const normalizedPrompt = params.prompt.trim().toLowerCase();
  const sortedAdvancedInputs = params.advancedInputs
    ? JSON.stringify(params.advancedInputs, Object.keys(params.advancedInputs).sort())
    : "";

  const payload = [
    params.userId,
    params.projectId,
    params.sceneId || "default",
    params.modelOrPreference || "default",
    normalizedPrompt,
    sortedAdvancedInputs,
  ].join("::");

  return crypto.createHash("sha256").update(payload).digest("hex");
}
