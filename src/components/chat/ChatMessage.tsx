"use client";

/**
 * @file src/components/chat/ChatMessage.tsx
 * @description Studio-Grade Message Presentation Component for "The Writer's Room".
 * Monochromatic Zinc design: AI messages sit flush left without bubbly backgrounds;
 * User messages render as subtle right-aligned zinc-900 blocks.
 */

import React, { memo } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { OptionCard } from "./OptionCard";
import { ParsedOption } from "@/lib/utils/chatParser";
import { Sparkles, User, CheckCircle2 } from "lucide-react";

export interface ParsedMessageItem {
  id: string;
  role: "user" | "assistant" | "system" | "data";
  rawContent: string;
  narrativeText: string;
  options: ParsedOption[];
  hasOptions: boolean;
  hasJsonPayload: boolean;
}

interface ChatMessageProps {
  message: ParsedMessageItem;
  isLatestAssistantMessage: boolean;
  areOptionsLocked: boolean;
  onSelectOption: (option: ParsedOption) => void;
}

export const ChatMessage = memo(function ChatMessage({
  message,
  isLatestAssistantMessage,
  areOptionsLocked,
  onSelectOption,
}: ChatMessageProps) {
  const isUser = message.role === "user";

  // -------------------------------------------------------------
  // USER MESSAGE PRESENTATION: Subtle, clean, right-aligned card
  // -------------------------------------------------------------
  if (isUser) {
    const isOptionSelection = message.rawContent.startsWith("[SELECTED OPTION");

    return (
      <div className="flex justify-end w-full my-4 animate-in fade-in slide-in-from-bottom-1 duration-200">
        <div className="max-w-[85%] md:max-w-[75%] bg-zinc-900/90 text-zinc-100 border border-zinc-800 rounded-md p-4 shadow-sm">
          {isOptionSelection ? (
            <div className="flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <div className="text-sm font-medium text-zinc-200 leading-relaxed">
                {message.rawContent.replace(/^\[SELECTED OPTION\s+[A-Za-z0-9]+\]:\s*/, "")}
              </div>
            </div>
          ) : (
            <p className="text-sm leading-relaxed text-zinc-200 whitespace-pre-wrap">
              {message.rawContent}
            </p>
          )}
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // ASSISTANT (AI) PRESENTATION: Flush left, no bubble, editorial typography
  // -------------------------------------------------------------
  return (
    <div className="w-full my-6 text-left animate-in fade-in duration-300">
      {/* Narrative Storytelling Prose */}
      {message.narrativeText && (
        <div className="prose prose-invert max-w-none text-sm md:text-[15px] leading-relaxed text-zinc-300">
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
              h1: ({ node, ...props }) => (
                <h1 className="text-xl font-semibold tracking-tight text-zinc-100 mt-6 mb-3 border-b border-zinc-800 pb-2" {...props} />
              ),
              h2: ({ node, ...props }) => (
                <h2 className="text-lg font-semibold tracking-tight text-zinc-100 mt-5 mb-2.5 border-b border-zinc-800/80 pb-1.5" {...props} />
              ),
              h3: ({ node, ...props }) => (
                <h3 className="text-base font-medium tracking-tight text-zinc-200 mt-4 mb-2" {...props} />
              ),
              p: ({ node, ...props }) => (
                <p className="mb-4 last:mb-0 leading-relaxed text-zinc-300 font-normal" {...props} />
              ),
              ul: ({ node, ...props }) => (
                <ul className="list-disc pl-5 mb-4 space-y-1.5 text-zinc-300" {...props} />
              ),
              ol: ({ node, ...props }) => (
                <ol className="list-decimal pl-5 mb-4 space-y-1.5 text-zinc-300" {...props} />
              ),
              li: ({ node, ...props }) => <li className="pl-1" {...props} />,
              strong: ({ node, ...props }) => (
                <strong className="font-semibold text-zinc-100" {...props} />
              ),
              blockquote: ({ node, ...props }) => (
                <blockquote
                  className="border-l-2 border-zinc-600 pl-4 py-1 italic text-zinc-400 bg-zinc-900/40 rounded-r-md my-4"
                  {...props}
                />
              ),
            }}
          >
            {message.narrativeText}
          </ReactMarkdown>
        </div>
      )}

      {/* Interactive Option Cards Stack */}
      {message.hasOptions && (
        <div className="mt-5 space-y-2.5 max-w-2xl">
          <div className="flex items-center justify-between text-xs font-mono uppercase tracking-wider text-zinc-500 mb-2 px-1">
            <span>Creative Directions</span>
            {isLatestAssistantMessage && areOptionsLocked && (
              <span className="flex items-center gap-1.5 text-zinc-400">
                <span className="w-1.5 h-1.5 rounded-full bg-zinc-400 animate-pulse" />
                Director Pitching...
              </span>
            )}
          </div>

          {message.options.map((option) => (
            <OptionCard
              key={`${message.id}-${option.id}`}
              option={option}
              // Only the latest assistant message allows selection, and only when unlocked
              isLocked={!isLatestAssistantMessage || areOptionsLocked}
              onSelect={onSelectOption}
            />
          ))}
        </div>
      )}
    </div>
  );
});

export default ChatMessage;
