/**
 * @file src/__tests__/chatParser.test.ts
 * @description Comprehensive unit tests for /lib/utils/chatParser.ts
 * Verifies robust extraction of narrative prose, [OPTION X] cards, and JSON pipeline finale.
 */

import {
  parseChatResponse,
  extractOptions,
  extractJsonPayload,
  stripOptionsAndJson,
} from "@/lib/utils/chatParser";

describe("chatParser: The Writer's Room Parser Utility", () => {
  describe("1. Step 1 (Intake - Pure Narrative without Options)", () => {
    it("parses pure narrative text and reports zero options", () => {
      const intakeMessage =
        "Welcome to Director AI. Tell me about your brand: What is your Company Name, Product, and the core Business Goal for this campaign?";

      const parsed = parseChatResponse(intakeMessage);

      expect(parsed.hasOptions).toBe(false);
      expect(parsed.options).toHaveLength(0);
      expect(parsed.hasJsonPayload).toBe(false);
      expect(parsed.narrativeText).toBe(intakeMessage);
    });
  });

  describe("2. Progressive Multiple Choice Options Parsing", () => {
    it("extracts 4 distinct [OPTION A/B/C/D] cards with title and description", () => {
      const pitchMessage = `Every great brand story begins with an unspoken human sacrifice. Here are three directions rooted in family resilience:

[OPTION A] The Height Chart: A father marks his daughter's height every summer on the kitchen doorframe. Years later, her own daughter stands at the same door to add a new mark.
[OPTION B] The Cold Lunch: A mother leaves the warm roti for her child and quietly eats cold leftovers, never once drawing attention to her sacrifice.
[OPTION C] The Rusting Bicycle: A retired postman refuses to give up his 35-year-old bicycle because of the love letters and wedding invitations it carried across three generations.
[OPTION D] None of these, recalibrate: Let's explore another emotional truth.

Which emotional direction speaks to your heart?`;

      const parsed = parseChatResponse(pitchMessage);

      expect(parsed.hasOptions).toBe(true);
      expect(parsed.options).toHaveLength(4);

      // Verify Option A
      expect(parsed.options[0].id).toBe("A");
      expect(parsed.options[0].title).toBe("The Height Chart");
      expect(parsed.options[0].description).toContain("A father marks his daughter's height");

      // Verify Option B
      expect(parsed.options[1].id).toBe("B");
      expect(parsed.options[1].title).toBe("The Cold Lunch");
      expect(parsed.options[1].description).toContain("A mother leaves the warm roti");

      // Verify Option C
      expect(parsed.options[2].id).toBe("C");
      expect(parsed.options[2].title).toBe("The Rusting Bicycle");
      expect(parsed.options[2].description).toContain("retired postman refuses");

      // Verify Option D
      expect(parsed.options[3].id).toBe("D");
      expect(parsed.options[3].title).toBe("None of these, recalibrate");
      expect(parsed.options[3].description).toContain("explore another emotional truth");

      // Narrative text should contain the intro and outro, but NOT the option cards
      expect(parsed.narrativeText).toContain("Every great brand story begins");
      expect(parsed.narrativeText).toContain("Which emotional direction speaks to your heart?");
      expect(parsed.narrativeText).not.toContain("[OPTION A]");
      expect(parsed.narrativeText).not.toContain("[OPTION B]");
    });

    it("handles bold titles with hyphens and colons correctly", () => {
      const message = `Here are the angles:

[OPTION A] **The Silent Teacher** - An old mechanic trains his apprentice with hand gestures instead of harsh words.
[OPTION B]: **The Broken Compass**: A sailor gives his heirloom compass to his grandson moving to a foreign city.
[OPTION C] - Hand-Me-Down Dreams: An elder sister works extra shifts to buy ballet shoes for her younger sibling.
[OPTION D] None of these, recalibrate`;

      const options = extractOptions(message);

      expect(options).toHaveLength(4);
      expect(options[0].title).toBe("The Silent Teacher");
      expect(options[0].description).toContain("An old mechanic trains his apprentice");

      expect(options[1].title).toBe("The Broken Compass");
      expect(options[1].description).toContain("A sailor gives his heirloom compass");

      expect(options[2].title).toBe("Hand-Me-Down Dreams");
      expect(options[2].description).toContain("An elder sister works extra shifts");

      expect(options[3].title).toBe("None of these, recalibrate");
      expect(options[3].description).toContain("Recalibrate");
    });

    it("handles multi-line descriptions inside option blocks", () => {
      const multiLine = `Pitching our emotional hooks:

[OPTION A] The Silver Anklet:
A grandmother unclasps her worn silver anklet to pawn it for her granddaughter's exam fees.
She never mentions it, but walks barefoot with pride.

[OPTION B] The Midnight Train:
A young father rides the sleeper coach back home carrying a boxed toy train.
His hands are covered in grease, but his eyes glow with joy.

[OPTION D] None of these, recalibrate`;

      const options = extractOptions(multiLine);

      expect(options).toHaveLength(3);
      expect(options[0].title).toBe("The Silver Anklet");
      expect(options[0].description).toContain("grandmother unclasps");
      expect(options[0].description).toContain("walks barefoot with pride");

      expect(options[1].title).toBe("The Midnight Train");
      expect(options[1].description).toContain("sleeper coach");
      expect(options[1].description).toContain("His hands are covered in grease");
    });
  });

  describe("3. JSON Finale Interception", () => {
    it("extracts and validates full JSON storyboard pipeline from ```json code blocks", () => {
      const jsonFinaleMessage = `The vision is locked! Compiling the pipeline now:

\`\`\`json
{
  "title": "The Height Chart",
  "logline": "A father marks his daughter's growth on the doorframe until the marks stop.",
  "aspectRatio": "9:16",
  "characters": [
    {
      "assetId": "char-1",
      "name": "Dev",
      "role": "Father",
      "appearancePrompt": "Weathered 50-year-old man, gentle eyes, calloused hands, faded cotton kurta."
    }
  ],
  "environments": [
    {
      "assetId": "env-1",
      "name": "Sunlit Verandah",
      "environmentPrompt": "Rustic wooden doorframe with handwritten pencil height notches, warm afternoon sunlight."
    }
  ],
  "scenes": [
    {
      "sceneId": "scene-1",
      "order": 1,
      "duration": 5,
      "cameraAngle": "CAM_A_CENTER",
      "cameraMovement": "PUSH_IN",
      "rawDelta": "Dev presses a pencil lead against the wood, smiling at his young daughter.",
      "imagePrompt": "[CAM_A_CENTER]: Dev kneeling next to a wooden doorframe in warm sunlight, marking pencil notch.",
      "motionPrompt": "[CAM_A_CENTER]: Slow 5-second cinematic push-in on the trembling pencil notch."
    }
  ]
}
\`\`\`
`;

      const parsed = parseChatResponse(jsonFinaleMessage);

      expect(parsed.hasJsonPayload).toBe(true);
      expect(parsed.isJsonComplete).toBe(true);
      expect(parsed.jsonPayload).toBeDefined();
      expect(parsed.jsonPayload?.title).toBe("The Height Chart");
      expect(parsed.jsonPayload?.characters).toHaveLength(1);
      expect(parsed.jsonPayload?.environments).toHaveLength(1);
      expect(parsed.jsonPayload?.scenes).toHaveLength(1);

      // Verify that raw JSON is cleanly excluded from narrativeText
      expect(parsed.narrativeText).not.toContain("```json");
      expect(parsed.narrativeText).not.toContain("scene-1");
      expect(parsed.narrativeText).toContain("The vision is locked!");
    });

    it("handles streaming or unclosed json code fences gracefully", () => {
      const streamingJson = `Compiling pipeline...
\`\`\`json
{
  "title": "In Progress Pipeline",
  "characters": [`;

      const result = extractJsonPayload(streamingJson);

      expect(result.raw).toContain('"title": "In Progress Pipeline"');
      expect(result.isComplete).toBe(false);
    });
  });

  describe("4. Edge Cases & Resilience", () => {
    it("handles empty or non-string input safely without throwing", () => {
      expect(parseChatResponse("")).toEqual({
        narrativeText: "",
        options: [],
        hasOptions: false,
        jsonString: null,
        jsonPayload: null,
        hasJsonPayload: false,
        isJsonComplete: false,
      });

      expect(parseChatResponse(null as any)).toEqual({
        narrativeText: "",
        options: [],
        hasOptions: false,
        jsonString: null,
        jsonPayload: null,
        hasJsonPayload: false,
        isJsonComplete: false,
      });
    });

    it("does not confuse json keys or bracketed words with [OPTION X] tags", () => {
      const textWithBrackets = `Here is our direction [CAM_A_CENTER]: The camera pans across the room.
[OPTION A] The Old Watch: A father passes his watch.
[OPTION D] None of these, recalibrate`;

      const options = extractOptions(textWithBrackets);
      expect(options).toHaveLength(2);
      expect(options.map((o) => o.id)).toEqual(["A", "D"]);
    });

    it("strips Groq <think> reasoning tags cleanly from narrative and options", () => {
      const reasoningMessage = `<think>
The user wants an emotional story for a handcrafted wooden furniture brand.
Let's anchor this in generational memory and craftsmanship.
</think>
Every piece of wood remembers the hands that shaped it. Here are three human angles:

[OPTION A] The Dining Table: Marks from 30 Thanksgiving dinners show the quiet resilience of family.
[OPTION D] None of these, recalibrate`;

      const parsed = parseChatResponse(reasoningMessage);
      expect(parsed.narrativeText).not.toContain("<think>");
      expect(parsed.narrativeText).not.toContain("The user wants an emotional story");
      expect(parsed.narrativeText).toContain("Every piece of wood remembers");
      expect(parsed.hasOptions).toBe(true);
      expect(parsed.options).toHaveLength(2);
      expect(parsed.options[0].title).toBe("The Dining Table");
    });

    it("strips streaming unclosed <think> tags while reasoning is in-progress", () => {
      const streamingReasoning = `<think>Analyzing company context and determining the core human angle...`;
      const parsed = parseChatResponse(streamingReasoning);
      expect(parsed.narrativeText).toBe("");
      expect(parsed.hasOptions).toBe(false);
    });
  });
});

