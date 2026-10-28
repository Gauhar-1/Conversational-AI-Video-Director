"use client";

/**
 * @file src/lib/hooks/useDebounce.ts
 * @description Studio-Grade Debounce hooks for high-performance intent-driven auto-saving.
 * Prevents firing excessive database queries on rapid user keystrokes in Script & Casting wizards.
 */

import { useState, useEffect, useRef, useCallback } from "react";

/**
 * useDebounce: Returns a debounced value that only updates after delayMs of silence.
 * @param value The reactive input value
 * @param delayMs Delay in milliseconds (defaults to 1000ms per mandate)
 */
export function useDebounce<T>(value: T, delayMs: number = 1000): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delayMs);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delayMs]);

  return debouncedValue;
}

/**
 * useDebouncedCallback: Returns a memoized callback debounced by delayMs.
 * Cancels pending executions on each trigger and flushes only after user pauses.
 * @param callback The mutation or auto-save function
 * @param delayMs Delay in milliseconds (defaults to 1000ms)
 */
export function useDebouncedCallback<T extends (...args: any[]) => any>(
  callback: T,
  delayMs: number = 1000
): (...args: Parameters<T>) => void {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const callbackRef = useRef(callback);

  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return useCallback(
    (...args: Parameters<T>) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      timeoutRef.current = setTimeout(() => {
        callbackRef.current(...args);
      }, delayMs);
    },
    [delayMs]
  );
}

export default useDebounce;

