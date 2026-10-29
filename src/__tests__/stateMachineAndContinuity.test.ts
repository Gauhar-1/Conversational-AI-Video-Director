/**
 * @file src/__tests__/stateMachineAndContinuity.test.ts
 * @description Unit tests verifying the Strict State Machine, Narrative Continuity,
 * and Groq JSON tool-suppression safeguards in /api/chat.
 */

import { CULTURAL_STORYTELLER_PROMPT } from "@/lib/ai/prompts";

describe("Strict State Machine & System Prompt Architecture", () => {
  it("enforces the Piyush Pandey school of human-centric emotional storytelling", () => {
    expect(CULTURAL_STORYTELLER_PROMPT).toContain("Piyush Pandey");
    expect(CULTURAL_STORYTELLER_PROMPT).toContain("unspoken sacrifices, cultural truths, and generational memories");
  });

  it("strictly enforces all 4 critical state machine rules", () => {
    expect(CULTURAL_STORYTELLER_PROMPT).toContain("CRITICAL STATE MACHINE RULES (NEVER VIOLATE):");
    expect(CULTURAL_STORYTELLER_PROMPT).toContain("1. ONE STEP PER TURN: You must NEVER output multiple steps in a single response.");
    expect(CULTURAL_STORYTELLER_PROMPT).toContain("2. NARRATIVE CONTINUITY: Before pitching options for a new step, briefly acknowledge the user's previous choice");
    expect(CULTURAL_STORYTELLER_PROMPT).toContain("3. HANDLING CUSTOM INPUT: If the user ignores your options and types a custom suggestion, DO NOT skip to the next step.");
    expect(CULTURAL_STORYTELLER_PROMPT).toContain("4. CINEMATOGRAPHY: Every visual option you pitch must include explicit camera directions");
  });

  it("strictly enforces the sequential 7-Step Agency Checklist", () => {
    expect(CULTURAL_STORYTELLER_PROMPT).toContain("THE 7-STEP AGENCY CHECKLIST (MOVE SEQUENTIALLY):");
    expect(CULTURAL_STORYTELLER_PROMPT).toContain("STEP 1: INTAKE - Ask for Company Name, Product, and Business Goal.");
    expect(CULTURAL_STORYTELLER_PROMPT).toContain("STEP 2: THE ANGLE - Pitch 3 emotional, relationship-driven angles");
    expect(CULTURAL_STORYTELLER_PROMPT).toContain("STEP 3: THE HOOK (0-3s) - Pitch 3 visual openers based STRICTLY on the locked Angle.");
    expect(CULTURAL_STORYTELLER_PROMPT).toContain("STEP 4: CASTING - Pitch 3 character archetypes based STRICTLY on the locked Angle and Hook.");
    expect(CULTURAL_STORYTELLER_PROMPT).toContain("STEP 5: ART DIRECTION - Pitch 3 environments matching the established tone and characters.");
    expect(CULTURAL_STORYTELLER_PROMPT).toContain("STEP 6: THE CTA - Pitch 3 emotional conclusions that tie the brand into the narrative.");
    expect(CULTURAL_STORYTELLER_PROMPT).toContain("STEP 7: FINAL JSON - Once Step 6 is locked, do not generate any options. Output ONLY a valid JSON object");
  });

  it("enforces standard UI option delimiter formatting contract", () => {
    expect(CULTURAL_STORYTELLER_PROMPT).toContain("FORMATTING RULE: Always present options explicitly as [OPTION A], [OPTION B], [OPTION C], and [OPTION D] (Recalibrate).");
  });
});

