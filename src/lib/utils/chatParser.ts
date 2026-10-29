/**
 * @file src/lib/utils/chatParser.ts
 * @description High-performance regex parser utility for "The Writer's Room".
 * Strictly decouples narrative prose from structured [OPTION X] multiple-choice cards
 * and intercepts the final compiled JSON storyboard pipeline.
 */

import { repairAndParseJson } from "./jsonRepair";

export interface ParsedOption {
  /** Identifier character or token (e.g., "A", "B", "C", "D") */
  id: string;
  /** Full raw tag match (e.g., "[OPTION A]") */
  rawTag: string;
  /** Clean option title stripped of markdown bold, asterisks, and delimiters */
  title: string;
  /** Narrative pitch description explaining the human emotional angle */
  description: string;
  /** Complete raw block text for this option */
  rawContent: string;
}

export interface ParsedChatResponse {
  /** The clean narrative storytelling prose with [OPTION] cards and ```json blocks stripped */
  narrativeText: string;
  /** Structured array of parsed option cards */
  options: ParsedOption[];
  /** Convenience flag indicating whether option cards are present */
  hasOptions: boolean;
  /** Extracted raw string from ```json ``` block if present */
  jsonString: string | null;
  /** Safely repaired and parsed JSON object if present and valid */
  jsonPayload: Record<string, any> | null;
  /** Convenience flag indicating whether a JSON block was intercepted */
  hasJsonPayload: boolean;
  /** Flag indicating whether the intercepted JSON payload is closed and syntactically valid */
  isJsonComplete: boolean;
}

// Regex to identify [OPTION X] tags (case-insensitive, matching A, B, C, D or any alphanumeric identifier)
const OPTION_TAG_REGEX = /\[OPTION\s+([A-Za-z0-9]+)\]/gi;

// Regex to capture markdown json code blocks (closed or streaming open)
const JSON_BLOCK_REGEX = /```json\s*([\s\S]*?)(?:```|$)/i;

/**
 * Strips markdown asterisks, backticks, quotes, and punctuation borders from title strings.
 */
function cleanTitle(rawTitle: string): string {
  return rawTitle
    .replace(/^[*_"`'\s:-]+|[*_"`'\s:-]+$/g, "")
    .trim();
}

/**
 * Extracts all [OPTION X] blocks from a chat message.
 *
 * @param content Raw markdown message content from the LLM
 * @returns Array of structured ParsedOption items
 */
export function extractOptions(content: string): ParsedOption[] {
  if (!content || typeof content !== "string") {
    return [];
  }

  // Pre-strip ```json blocks so JSON properties are never confused with options
  const contentWithoutJson = content.replace(JSON_BLOCK_REGEX, "").trim();

  const tagMatches: { id: string; rawTag: string; index: number }[] = [];
  let match: RegExpExecArray | null;

  OPTION_TAG_REGEX.lastIndex = 0;
  while ((match = OPTION_TAG_REGEX.exec(contentWithoutJson)) !== null) {
    tagMatches.push({
      id: match[1].toUpperCase(),
      rawTag: match[0],
      index: match.index,
    });
  }

  if (tagMatches.length === 0) {
    return [];
  }

  const options: ParsedOption[] = [];

  for (let i = 0; i < tagMatches.length; i++) {
    const current = tagMatches[i];
    const startIndex = current.index;
    const nextIndex =
      i + 1 < tagMatches.length ? tagMatches[i + 1].index : contentWithoutJson.length;

    let rawBlock = contentWithoutJson.substring(startIndex, nextIndex).trim();

    // For the last option, isolate any trailing conversational question or outro
    if (i === tagMatches.length - 1) {
      const trailingSplit = rawBlock.match(/^([\s\S]*?)\n\n(?![*\s]*\[OPTION)([\s\S]+)$/);
      if (trailingSplit && trailingSplit[1] && trailingSplit[2]) {
        const candidateTrailing = trailingSplit[2].trim();
        if (
          candidateTrailing.endsWith("?") ||
          candidateTrailing.toLowerCase().includes("which") ||
          candidateTrailing.toLowerCase().includes("choose") ||
          candidateTrailing.toLowerCase().includes("select") ||
          candidateTrailing.toLowerCase().includes("tell me") ||
          candidateTrailing.toLowerCase().includes("let me know")
        ) {
          rawBlock = trailingSplit[1].trim();
        }
      }
    }

    // Strip the [OPTION X] tag prefix from the block
    let blockBody = rawBlock.substring(current.rawTag.length).trim();

    // Strip leading colons or dashes immediately after tag (e.g., "[OPTION A]:" or "[OPTION A] -")
    blockBody = blockBody.replace(/^[:\s\-–—]+/, "").trim();

    let title = "";
    let description = "";

    // Strategy 1: Check for bold title format: **Title**: Description or **Title** - Description
    const boldMatch = blockBody.match(/^\*\*([^*]+)\*\*(?:[:\s\-–—]+([\s\S]*))?$/);
    if (boldMatch) {
      title = cleanTitle(boldMatch[1]);
      description = (boldMatch[2] || "").trim();
    } else {
      // Strategy 2: Look for title delimiter (: or - or – or — or newline)
      const delimiterMatch = blockBody.match(/^(.*?)(?::|\s+[-–—]\s+|\n)([\s\S]*)$/);
      if (delimiterMatch) {
        title = cleanTitle(delimiterMatch[1]);
        description = (delimiterMatch[2] || "").trim();
      } else {
        // Fallback: Entire block is title if short, or split by sentence
        title = cleanTitle(blockBody);
        description = "";
      }
    }

    // Default fallback for Option D if description was omitted by LLM
    if (!description && current.id === "D" && title.toLowerCase().includes("recalibrate")) {
      description = "None of these concepts resonate. Recalibrate and explore an alternative emotional angle.";
    }

    options.push({
      id: current.id,
      rawTag: current.rawTag,
      title: title || `Option ${current.id}`,
      description,
      rawContent: rawBlock,
    });
  }

  return options;
}

/**
 * Extracts and safely validates JSON finale payloads from ```json ``` code blocks.
 *
 * @param content Raw markdown message content
 */
export function extractJsonPayload<T = Record<string, any>>(
  content: string
): {
  raw: string | null;
  parsed: T | null;
  isComplete: boolean;
} {
  if (!content || typeof content !== "string") {
    return { raw: null, parsed: null, isComplete: false };
  }

  const match = content.match(JSON_BLOCK_REGEX);
  if (!match || !match[1]) {
    return { raw: null, parsed: null, isComplete: false };
  }

  const raw = match[1].trim();
  const isClosed = content.includes("```json") && content.indexOf("```", content.indexOf("```json") + 7) !== -1;

  try {
    const parsed = repairAndParseJson(raw) as T;
    return {
      raw,
      parsed,
      isComplete: isClosed && typeof parsed === "object" && parsed !== null,
    };
  } catch {
    return {
      raw,
      parsed: null,
      isComplete: false,
    };
  }
}

/**
 * Separates narrative text from [OPTION X] blocks and ```json ``` fences.
 *
 * @param content Raw markdown message content
 * @returns Clean narrative prose
 */
export function stripOptionsAndJson(content: string): string {
  if (!content || typeof content !== "string") {
    return "";
  }

  // 1. Remove ```json ... ``` block
  const text = content.replace(JSON_BLOCK_REGEX, "").trim();

  // 2. Identify where options start using non-global regex to preserve index
  const firstTagMatch = text.match(/\[OPTION\s+([A-Za-z0-9]+)\]/i);
  if (!firstTagMatch || firstTagMatch.index === undefined) {
    return text;
  }

  const firstOptionIdx = firstTagMatch.index;

  // Everything before the first option tag is primary narrative
  const beforeOptions = text.substring(0, firstOptionIdx).trim();

  // Find where the last option ends by scanning all option tags
  const tagIndices: number[] = [];
  const globalRegex = /\[OPTION\s+([A-Za-z0-9]+)\]/gi;
  let m: RegExpExecArray | null;
  while ((m = globalRegex.exec(text)) !== null) {
    tagIndices.push(m.index);
  }

  // Find if there is trailing narrative after the options block
  let afterOptions = "";
  if (tagIndices.length > 0) {
    const lastTagIdx = tagIndices[tagIndices.length - 1];
    const lastOptionChunk = text.substring(lastTagIdx);
    const splitMatch = lastOptionChunk.match(/\n\n(?![*\s]*\[OPTION)([\s\S]+)$/);
    if (splitMatch && splitMatch[1] && !splitMatch[1].startsWith("[")) {
      const candidateTrailing = splitMatch[1].trim();
      if (
        candidateTrailing.endsWith("?") ||
        candidateTrailing.toLowerCase().includes("which") ||
        candidateTrailing.toLowerCase().includes("choose") ||
        candidateTrailing.toLowerCase().includes("select") ||
        candidateTrailing.toLowerCase().includes("tell me") ||
        candidateTrailing.toLowerCase().includes("let me know")
      ) {
        afterOptions = candidateTrailing;
      }
    }
  }

  if (beforeOptions && afterOptions) {
    return `${beforeOptions}\n\n${afterOptions}`.trim();
  }

  return beforeOptions || afterOptions || "";
}

/**
 * Primary parser decomposing streaming or finalized LLM output into
 * presentation-ready narrative prose, option cards, and pipeline JSON.
 *
 * @param content Raw markdown message string from Groq
 * @returns Fully structured ParsedChatResponse
 */
export function parseChatResponse(content: string): ParsedChatResponse {
  if (!content || typeof content !== "string") {
    return {
      narrativeText: "",
      options: [],
      hasOptions: false,
      jsonString: null,
      jsonPayload: null,
      hasJsonPayload: false,
      isJsonComplete: false,
    };
  }

  const options = extractOptions(content);
  const narrativeText = stripOptionsAndJson(content);
  const jsonResult = extractJsonPayload(content);

  return {
    narrativeText,
    options,
    hasOptions: options.length > 0,
    jsonString: jsonResult.raw,
    jsonPayload: jsonResult.parsed,
    hasJsonPayload: jsonResult.raw !== null,
    isJsonComplete: jsonResult.isComplete,
  };
}
