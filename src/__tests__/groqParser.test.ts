/**
 * @file src/__tests__/groqParser.test.ts
 * @description Unit tests for Groq JSON parser & script parsing service (GroqService).
 * Validates extraction of Scenes, Characters, and Locations from screenplay text.
 */

import { GroqService } from "@/lib/services/ai/GroqService";

describe("GroqService Screenplay Breakdown Parser", () => {
  it("parses valid LLM response into structured scenes, characters, and locations", async () => {
    const mockJson = JSON.stringify({
      title: "Neo Tokyo Odyssey",
      logline: "A lone courier navigates neon alleyways to deliver a quantum core.",
      characters: [
        {
          name: "Ren",
          role: "Lead Protagonist",
          appearancePrompt: "Young cyber-courier with chrome visor, wet black hair, leather jacket",
        },
      ],
      locations: [
        {
          name: "Shinjuku Backstreet",
          environmentPrompt: "Rain-slicked alleyway glowing with volumetric neon holograms",
          lightingProfile: "Moody neon rim lighting",
        },
      ],
      scenes: [
        {
          order: 1,
          title: "The Delivery",
          rawDelta: "Ren dashes through the rainy alleyway",
          locationName: "Shinjuku Backstreet",
          characterNames: ["Ren"],
          cameraAngle: "CAM_B_45_CLOSE",
          cameraMovement: "TRACKING",
          duration: 10,
          imagePrompt: "Close tracking shot of Ren in the rain",
          motionPrompt: "Dynamic forward dolly following sprinting character",
        },
      ],
    });

    const service = new GroqService();
    // Mock the internal getClient
    (service as any).getClient = jest.fn().mockReturnValue({
      chat: {
        completions: {
          create: jest.fn().mockResolvedValue({
            choices: [{ message: { content: mockJson } }],
          }),
        },
      },
    });

    const result = await service.parseScript({ script: "EXT. SHINJUKU ALLEY - NIGHT..." });

    expect(result.title).toBe("Neo Tokyo Odyssey");
    expect(result.characters.length).toBe(1);
    expect(result.characters[0].name).toBe("Ren");
    expect(result.locations.length).toBe(1);
    expect(result.locations[0].name).toBe("Shinjuku Backstreet");
    expect(result.scenes.length).toBe(1);
    expect(result.scenes[0].cameraAngle).toBe("CAM_B_45_CLOSE");
  });

  it("handles markdown code fences and reasoning model <think> tags gracefully", async () => {
    const dirtyOutput = `
<think>
Parsing the screenplay into scenes...
</think>
\`\`\`json
{
  "title": "Clean Script",
  "characters": [],
  "locations": [],
  "scenes": []
}
\`\`\`
    `;

    const service = new GroqService();
    (service as any).getClient = jest.fn().mockReturnValue({
      chat: {
        completions: {
          create: jest.fn().mockResolvedValue({
            choices: [{ message: { content: dirtyOutput } }],
          }),
        },
      },
    });

    const result = await service.parseScript({ script: "INT. LAB - DAY" });
    expect(result.title).toBe("Clean Script");
    expect(result.characters).toEqual([]);
    expect(result.scenes).toEqual([]);
  });
});

