"use client";

/**
 * @file src/components/chat/WritersRoom.tsx
 * @description The Writer's Room Presentation Component for Director AI.
 * Implements editorial typography, flush-left streaming narrative prose,
 * progressive interactive option cards with action locks, and cinematic JSON pipeline compilation.
 */

import React, { useRef, useEffect } from "react";
import { useWritersRoom } from "@/hooks/useWritersRoom";
import { ChatMessage } from "./ChatMessage";
import { Send, Loader2, Sparkles, Film, ArrowRight, AlertCircle } from "lucide-react";

interface WritersRoomProps {
  projectId: string;
  initialChatHistory?: Array<{ role: "user" | "assistant"; content: string }>;
}

export function WritersRoom({ projectId, initialChatHistory = [] }: WritersRoomProps) {
  const {
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
  } = useWritersRoom({
    projectId,
    initialChatHistory,
  });

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom as streaming tokens arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [parsedMessages, isLoading]);

  // -----------------------------------------------------------------
  // 1. CINEMATIC COMPILING STATE (JSON Interceptor)
  // -----------------------------------------------------------------
  if (isCompiling) {
    return (
      <div className="flex-1 w-full h-full flex flex-col items-center justify-center p-6 bg-zinc-950 text-center select-none animate-in fade-in duration-500">
        <div className="max-w-md w-full bg-zinc-900/60 border border-zinc-800 rounded-md p-8 shadow-2xl flex flex-col items-center">
          {/* Animated Film Reel Pulse */}
          <div className="relative w-16 h-16 rounded-full bg-zinc-900 border border-zinc-700/80 flex items-center justify-center mb-6">
            <Film className="w-8 h-8 text-zinc-100 animate-pulse" />
            <div className="absolute inset-0 rounded-full border border-zinc-500/30 animate-ping" />
          </div>

          <h2 className="text-xl font-semibold tracking-tight text-zinc-100 mb-2">
            Locking Vision & Compiling Pipeline...
          </h2>

          <p className="text-xs text-zinc-400 mb-6 font-mono leading-relaxed">
            {compileStatus || "Transforming narrative choices into node geometry and scene parameters..."}
          </p>

          {/* Progress bar placeholder */}
          <div className="w-full bg-zinc-950 rounded-full h-1.5 overflow-hidden border border-zinc-800">
            <div className="bg-zinc-100 h-full w-2/3 animate-pulse transition-all duration-500" />
          </div>

          <div className="mt-4 flex items-center gap-2 text-[11px] font-mono text-zinc-500 uppercase tracking-widest">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
            <span>Node Synthesizer Active</span>
          </div>
        </div>
      </div>
    );
  }

  // Find the index of the latest assistant message to only allow selection on the active pitch
  const latestAssistantIndex = parsedMessages.findLastIndex((m) => m.role === "assistant");

  // -----------------------------------------------------------------
  // 2. THE WRITER'S ROOM CHAT INTERFACE
  // -----------------------------------------------------------------
  return (
    <div className="flex-1 flex flex-col h-full w-full bg-zinc-950 overflow-hidden">
      {/* Scrollable Message History Area */}
      <div className="flex-1 overflow-y-auto px-6 py-6 md:px-10">
        <div className="max-w-2xl mx-auto space-y-2">
          {parsedMessages.map((message, idx) => (
            <ChatMessage
              key={message.id || idx}
              message={message}
              isLatestAssistantMessage={idx === latestAssistantIndex}
              areOptionsLocked={areOptionsLocked}
              onSelectOption={handleSelectOption}
            />
          ))}

          {/* Streaming Indicator */}
          {isLoading && latestAssistantIndex === -1 && (
            <div className="flex items-center gap-2 text-xs font-mono text-zinc-500 my-4 animate-pulse">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              <span>Creative Director composing...</span>
            </div>
          )}

          {/* Compilation Error Notice if any */}
          {compilationError && (
            <div className="p-3 bg-red-950/40 border border-red-800/80 rounded-md text-xs text-red-200 flex items-center gap-2 my-4">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
              <span>{compilationError}</span>
            </div>
          )}

          {/* General Chat Error Notice */}
          {chatError && (
            <div className="p-3 bg-red-950/40 border border-red-800/80 rounded-md text-xs text-red-200 flex items-center gap-2 my-4">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
              <span>{chatError.message || "An error occurred during generation. Please retry."}</span>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Sticky Bottom Input Bar */}
      <div className="border-t border-zinc-800/80 bg-zinc-950/90 backdrop-blur-md p-4 px-6 md:px-10 shrink-0">
        <form onSubmit={handleSubmit} className="max-w-2xl mx-auto flex items-end gap-3">
          <div className="flex-1 relative bg-zinc-900 border border-zinc-800 rounded-md focus-within:border-zinc-700 transition-colors shadow-inner">
            <textarea
              data-testid="chat-input"
              value={input}
              onChange={handleInputChange}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSubmit(e as any);
                }
              }}
              rows={1}
              disabled={isLoading}
              placeholder={
                areOptionsLocked
                  ? "Director is pitching concepts..."
                  : "Reply to Creative Director or type custom instructions... (Enter to send)"
              }
              className="w-full bg-transparent p-3 text-sm text-zinc-100 placeholder-zinc-500 resize-none focus:outline-none min-h-[44px] max-h-32"
            />
          </div>

          <button
            type="submit"
            data-testid="chat-submit"
            disabled={!input.trim() || isLoading}
            className="h-[44px] px-4 rounded-md font-medium text-xs tracking-wider uppercase transition-all flex items-center gap-1.5 shrink-0 disabled:opacity-40 disabled:cursor-not-allowed bg-zinc-100 text-zinc-950 hover:bg-white active:scale-95 shadow-sm"
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <span>Send</span>
                <Send className="w-3.5 h-3.5" />
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}

export default WritersRoom;

