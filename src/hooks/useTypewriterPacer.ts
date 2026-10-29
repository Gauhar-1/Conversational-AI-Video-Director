"use client";

/**
 * @file src/hooks/useTypewriterPacer.ts
 * @description Smooth human-speed typewriter pacing hook for "The Writer's Room".
 * Takes streaming LLM tokens and paces them to the DOM at 15ms-25ms intervals,
 * simulating a deliberate, prestigious Creative Director typing live.
 */

import { useState, useEffect, useRef } from "react";

export interface UseTypewriterPacerOptions {
  /** Pacing speed in ms per character (default: 18ms, within the 15-25ms spec) */
  speedMs?: number;
  /** Whether typewriter animation is enabled (disabled for static loaded history) */
  enabled?: boolean;
  /** Optional callback fired when typing caught up with target */
  onComplete?: () => void;
}

export function useTypewriterPacer(
  targetText: string,
  options: UseTypewriterPacerOptions = {}
): {
  displayedText: string;
  isPacing: boolean;
} {
  const { speedMs = 18, enabled = true, onComplete } = options;

  // Initialize displayed length: 0 if animated from scratch, full length if disabled
  const [displayedLength, setDisplayedLength] = useState<number>(() => {
    return enabled ? 0 : (targetText ? targetText.length : 0);
  });

  const targetRef = useRef(targetText);
  targetRef.current = targetText;

  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  useEffect(() => {
    if (!enabled) {
      setDisplayedLength(targetText.length);
      return;
    }

    // If target was cleared or reset, sync immediately
    if (displayedLength > targetText.length) {
      setDisplayedLength(targetText.length);
      return;
    }

    if (displayedLength >= targetText.length) {
      return;
    }

    const timer = setInterval(() => {
      setDisplayedLength((prev) => {
        const targetLen = targetRef.current.length;
        if (prev >= targetLen) {
          clearInterval(timer);
          onCompleteRef.current?.();
          return targetLen;
        }

        // Adaptive pacing: If stream bursts far ahead, take adaptive 2-3 char steps
        // to maintain smooth cadence without falling permanently behind
        const lag = targetLen - prev;
        const step = lag > 80 ? 4 : lag > 40 ? 2 : 1;
        const next = Math.min(prev + step, targetLen);

        if (next >= targetLen) {
          clearInterval(timer);
          onCompleteRef.current?.();
        }

        return next;
      });
    }, speedMs);

    return () => clearInterval(timer);
  }, [targetText, speedMs, enabled, displayedLength]);

  const displayedText = enabled
    ? targetText.slice(0, displayedLength)
    : targetText;

  const isPacing = enabled && displayedLength < targetText.length;

  return { displayedText, isPacing };
}

export default useTypewriterPacer;
