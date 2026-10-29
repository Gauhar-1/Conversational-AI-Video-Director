"use client";

/**
 * @file src/hooks/useWritersRoom.ts
 * @description Decoupled Custom Hook managing "The Writer's Room" state machine.
 * Consumes Vercel AI SDK's useChat, enforces Action-Locking during streaming,
 * parses [OPTION X] cards in real-time, and intercepts JSON pipeline compilation.
 */

import { useState, useCallback, useMemo, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useChat, Message } from "@ai-sdk/react";
import {
  parseChatResponse,
  ParsedOption,
  ParsedChatResponse,
} from "@/lib/utils/chatParser";
import { compileWritersRoomPipelineAction } from "@/actions/project";

export interface UseWritersRoomProps {
  projectId: string;
  initialChatHistory?: Array<{ role: "user" | "assistant"; content: string }>;
  onPipelineCompiled?: (project: any) => void;
}

export function useWritersRoom({
  projectId,
  initialChatHistory = [],
  onPipelineCompiled,
}: UseWritersRoomProps) {
  const router = useRouter();

  // Compilation state for the JSON Interceptor
  const [isCompiling, setIsCompiling] = useState(false);
  const [compileStatus, setCompileStatus] = useState<string>("");
  const [compilationError, setCompilationError] = useState<string | null>(null);

  // Interaction Lock State: true only when the stream has fully completed
  const [isStreamFinished, setIsStreamFinished] = useState(true);

  // Guard to prevent duplicate compilation execution
  const hasInterceptedRef = useRef(false);

  // Initial welcome message if history is empty
  const formattedInitialMessages: Message[] = useMemo(() => {
    if (initialChatHistory && initialChatHistory.length > 0) {
      return initialChatHistory.map((m, idx) => ({
        id: `init-${idx}`,
        role: m.role,
        content: m.content,
      }));
    }
    return [
      {
        id: "init-welcome",
        role: "assistant",
        content:
          "Welcome to **Director AI**. I am your Creative Director.\n\nEvery iconic brand film is anchored in human truth, not technical features. To begin our journey, tell me:\n\n**What is your Company Name, Product, and the core Business Goal for this campaign?**",
      },
    ];
  }, [initialChatHistory]);

  // Vercel AI SDK useChat
  const {
    messages,
    input,
    handleInputChange,
    handleSubmit: baseHandleSubmit,
    append,
    isLoading,
    error: chatError,
  } = useChat({
    api: "/api/chat",
    body: {
      projectId,
    },
    initialMessages: formattedInitialMessages,
    onResponse: () => {
      // Stream just began: lock options
      setIsStreamFinished(false);
    },
    onFinish: async (message) => {
      // Stream is fully complete: unlock options
      setIsStreamFinished(true);

      // Check for JSON Finale payload upon stream completion
      const parsed = parseChatResponse(message.content);
      if (parsed.hasJsonPayload && parsed.jsonPayload && !hasInterceptedRef.current) {
        hasInterceptedRef.current = true;
        await handlePipelineCompilation(parsed.jsonPayload);
      }
    },
  });

  // Pipeline Compilation Handler
  const handlePipelineCompilation = useCallback(
    async (payload: Record<string, any>) => {
      try {
        setIsCompiling(true);
        setCompileStatus("Locking Vision & Compiling Pipeline...");

        setCompileStatus("Generating Node Geometry & Storyboard State...");
        const compiledProject = await compileWritersRoomPipelineAction(projectId, payload);

        setCompileStatus("Redirecting to Canvas...");
        if (onPipelineCompiled) {
          onPipelineCompiled(compiledProject);
        }

        router.push(`/project/${projectId}/pipeline`);
      } catch (err: any) {
        console.error("Compilation error in Writer's Room:", err);
        setCompilationError(err.message || "Failed to compile pipeline state.");
        setIsCompiling(false);
        hasInterceptedRef.current = false;
      }
    },
    [projectId, router, onPipelineCompiled]
  );

  // Monitor live streaming text for JSON Interception early detection
  useEffect(() => {
    if (messages.length === 0 || hasInterceptedRef.current) return;

    const lastMessage = messages[messages.length - 1];
    if (lastMessage.role === "assistant") {
      const parsed = parseChatResponse(lastMessage.content);
      if (parsed.isJsonComplete && parsed.jsonPayload) {
        hasInterceptedRef.current = true;
        handlePipelineCompilation(parsed.jsonPayload);
      }
    }
  }, [messages, handlePipelineCompilation]);

  // Action Locking computation:
  // Option cards are locked (disabled & dimmed) whenever AI is generating OR stream hasn't finished
  const areOptionsLocked = useMemo(() => {
    return isLoading || !isStreamFinished;
  }, [isLoading, isStreamFinished]);

  // Handle Option Card Click: Immediately locks options and appends user selection
  const handleSelectOption = useCallback(
    async (option: ParsedOption) => {
      if (areOptionsLocked || isCompiling) return;

      setIsStreamFinished(false);

      const content = `[SELECTED OPTION ${option.id}]: ${option.title}${
        option.description ? ` - ${option.description}` : ""
      }`;

      await append({
        role: "user",
        content,
      });
    },
    [areOptionsLocked, isCompiling, append]
  );

  // Custom Form Submit Wrapper
  const handleSubmit = useCallback(
    (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      if (!input.trim() || areOptionsLocked || isCompiling) return;
      setIsStreamFinished(false);
      baseHandleSubmit(e);
    },
    [input, areOptionsLocked, isCompiling, baseHandleSubmit]
  );

  // Parsed representation of messages with decoupled narrative & option cards
  const parsedMessages = useMemo(() => {
    return messages.map((m) => {
      const parsed: ParsedChatResponse = parseChatResponse(m.content);
      return {
        id: m.id,
        role: m.role,
        rawContent: m.content,
        narrativeText: parsed.narrativeText,
        options: parsed.options,
        hasOptions: parsed.hasOptions,
        hasJsonPayload: parsed.hasJsonPayload,
      };
    });
  }, [messages]);

  return {
    messages,
    parsedMessages,
    input,
    handleInputChange,
    handleSubmit,
    handleSelectOption,
    isLoading,
    areOptionsLocked,
    isCompiling,
    compileStatus,
    compilationError,
    chatError,
  };
}

