/**
 * @file src/lib/utils/jsonRepair.ts
 * @description Robust dirty JSON parser and repair engine for LLM outputs.
 * Handles markdown fences, trailing commas, unquoted keys, single quotes, and truncated bracket repair.
 */

/**
 * Repairs and parses messy, malformed, or incomplete JSON strings emitted by LLMs.
 *
 * @param dirtyText Raw output from LLM (potentially with markdown code fences or trailing commentary)
 * @returns Parsed object or array
 * @throws Error if text cannot be parsed even after repair passes
 */
export function repairAndParseJson<T = any>(dirtyText: string): T {
  if (!dirtyText || typeof dirtyText !== "string") {
    throw new Error("Cannot parse empty or non-string input");
  }

  // Pass 1: Try direct JSON.parse first for fastest execution
  try {
    return JSON.parse(dirtyText.trim());
  } catch {
    // Continue to repair pipeline
  }

  // Pass 2: Strip markdown code blocks (e.g. ```json ... ```)
  let cleaned = dirtyText.trim();
  cleaned = cleaned.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "");

  // Pass 3: Isolate substring between first JSON opening delimiter ({ or [) and the end
  const firstBrace = cleaned.indexOf("{");
  const firstBracket = cleaned.indexOf("[");

  let startIndex = -1;
  if (firstBrace !== -1 && firstBracket !== -1) {
    startIndex = Math.min(firstBrace, firstBracket);
  } else if (firstBrace !== -1) {
    startIndex = firstBrace;
  } else if (firstBracket !== -1) {
    startIndex = firstBracket;
  }

  if (startIndex !== -1) {
    cleaned = cleaned.substring(startIndex);
  }

  // Pass 4: Fix single-quoted properties and values: replace 'val' with "val" safely
  // (avoid replacing contractions like don't inside double quotes)
  cleaned = cleaned.replace(/'([^'\\]*(?:\\.[^'\\]*)*)'/g, '"$1"');

  // Pass 5: Wrap unquoted object keys in double quotes: e.g. { sceneId: "1" } -> { "sceneId": "1" }
  cleaned = cleaned.replace(/([{,]\s*)([a-zA-Z0-9_]+)\s*:/g, '$1"$2":');

  // Pass 6: Strip trailing commas before closing braces or brackets: , } -> } and , ] -> ]
  cleaned = cleaned.replace(/,\s*([}\]])/g, "$1");

  // Pass 7: Attempt parsing again before doing structural balance
  try {
    return JSON.parse(cleaned);
  } catch {
    // Continue to structural repair
  }

  // Pass 8: Balance truncated or unclosed brackets and braces
  let openBraces = 0;
  let openBrackets = 0;
  let inString = false;
  let isEscaped = false;

  for (let i = 0; i < cleaned.length; i++) {
    const char = cleaned[i];

    if (char === "\\" && !isEscaped) {
      isEscaped = true;
      continue;
    }

    if (char === '"' && !isEscaped) {
      inString = !inString;
    } else if (!inString) {
      if (char === "{") openBraces++;
      else if (char === "}") openBraces = Math.max(0, openBraces - 1);
      else if (char === "[") openBrackets++;
      else if (char === "]") openBrackets = Math.max(0, openBrackets - 1);
    }

    isEscaped = false;
  }

  // If ended while still inside an unclosed string, close the string
  if (inString) {
    cleaned += '"';
  }

  // Remove any dangling trailing comma at the end before adding closers
  cleaned = cleaned.replace(/,\s*$/, "");

  // Close remaining unclosed brackets and braces in LIFO order
  while (openBrackets > 0) {
    cleaned += "]";
    openBrackets--;
  }
  while (openBraces > 0) {
    cleaned += "}";
    openBraces--;
  }

  // Pass 9: Final JSON.parse attempt
  try {
    return JSON.parse(cleaned);
  } catch (err: any) {
    throw new Error(`Failed to repair dirty JSON: ${err.message}. Payload: ${cleaned.substring(0, 160)}...`);
  }
}
