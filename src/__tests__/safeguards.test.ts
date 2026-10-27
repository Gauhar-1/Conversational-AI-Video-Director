/**
 * @file src/__tests__/safeguards.test.ts
 * @description Unit tests for scaling safeguards: JSON Repair, Idempotency, and Rate Limiting.
 */

import { repairAndParseJson } from "../lib/utils/jsonRepair";
import { generateIdempotencyKey } from "../lib/utils/idempotency";
import { checkRateLimit } from "../lib/utils/rateLimiter";

describe("Scaling Safeguards & Utilities", () => {
  describe("repairAndParseJson", () => {
    it("parses valid JSON directly", () => {
      const input = '{"imagePrompt": "A wide angle shot", "motionPrompt": "Camera pans left"}';
      const result = repairAndParseJson(input);
      expect(result.imagePrompt).toBe("A wide angle shot");
      expect(result.motionPrompt).toBe("Camera pans left");
    });

    it("strips markdown code fences", () => {
      const input = '```json\n{"imagePrompt": "Dramatic close-up", "motionPrompt": "Static"}\n```';
      const result = repairAndParseJson(input);
      expect(result.imagePrompt).toBe("Dramatic close-up");
    });

    it("fixes unquoted keys and trailing commas", () => {
      const input = '{ imagePrompt: "Cyberpunk street", motionPrompt: "Dolly tracking", }';
      const result = repairAndParseJson(input);
      expect(result.imagePrompt).toBe("Cyberpunk street");
      expect(result.motionPrompt).toBe("Dolly tracking");
    });

    it("balances unterminated/truncated brackets and braces", () => {
      const input = '[{"scene_number": 1, "action": "Hero arrives';
      const result = repairAndParseJson(input);
      expect(Array.isArray(result)).toBe(true);
      expect(result[0].scene_number).toBe(1);
    });
  });

  describe("generateIdempotencyKey", () => {
    it("generates deterministic hash for identical inputs", () => {
      const params1 = {
        userId: "user-123",
        projectId: "proj-abc",
        sceneId: "scene-1",
        prompt: "Neon city rain",
        modelOrPreference: "kling",
      };
      const params2 = {
        userId: "user-123",
        projectId: "proj-abc",
        sceneId: "scene-1",
        prompt: "  Neon city rain  ",
        modelOrPreference: "kling",
      };

      const key1 = generateIdempotencyKey(params1);
      const key2 = generateIdempotencyKey(params2);

      expect(key1).toBe(key2);
      expect(key1).toHaveLength(64);
    });

    it("generates distinct hashes for different prompts", () => {
      const key1 = generateIdempotencyKey({
        userId: "user-123",
        projectId: "proj-abc",
        prompt: "Daytime beach",
      });
      const key2 = generateIdempotencyKey({
        userId: "user-123",
        projectId: "proj-abc",
        prompt: "Nighttime cyberpunk city",
      });

      expect(key1).not.toBe(key2);
    });
  });

  describe("checkRateLimit (In-Memory Fallback)", () => {
    it("permits requests within quota and blocks when exhausted", async () => {
      const testId = `test-user-${Date.now()}`;

      // Request 1: allowed
      const res1 = await checkRateLimit(testId, 2, 60);
      expect(res1.success).toBe(true);
      expect(res1.remaining).toBe(1);

      // Request 2: allowed
      const res2 = await checkRateLimit(testId, 2, 60);
      expect(res2.success).toBe(true);
      expect(res2.remaining).toBe(0);

      // Request 3: blocked
      const res3 = await checkRateLimit(testId, 2, 60);
      expect(res3.success).toBe(false);
      expect(res3.remaining).toBe(0);
    });
  });
});
