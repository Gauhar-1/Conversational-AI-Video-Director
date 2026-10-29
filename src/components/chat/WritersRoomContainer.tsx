"use client";

/**
 * @file src/components/chat/WritersRoomContainer.tsx
 * @description Top-level client container for Stage 1: The Writer's Room.
 * Connects the project's historical chat context to the reactive WritersRoom presenter.
 */

import React from "react";
import { useQuery } from "@tanstack/react-query";
import { WritersRoom } from "./WritersRoom";
import { Loader2 } from "lucide-react";

interface WritersRoomContainerProps {
  projectId: string;
  initialChatHistory?: Array<{ role: "user" | "assistant"; content: string }>;
  onPipelineCompiled?: (project: any) => void;
}

export function WritersRoomContainer({
  projectId,
  initialChatHistory,
  onPipelineCompiled,
}: WritersRoomContainerProps) {
  // Fetch latest project context if initialChatHistory not passed directly
  const { data: project, isLoading } = useQuery({
    queryKey: ["project-chat", projectId],
    queryFn: async () => {
      const res = await fetch(`/api/projects/${projectId}`);
      if (!res.ok) throw new Error("Failed to load project chat history");
      return res.json();
    },
    enabled: !initialChatHistory && !!projectId,
  });

  if (isLoading && !initialChatHistory) {
    return (
      <div className="flex-1 w-full h-full flex flex-col items-center justify-center p-6 bg-zinc-950 text-zinc-400">
        <Loader2 className="w-5 h-5 animate-spin text-zinc-500 mb-2" />
        <span className="text-xs font-mono">Loading Writer&apos;s Room session...</span>
      </div>
    );
  }

  const effectiveHistory = initialChatHistory || project?.chatHistory || [];

  return (
    <WritersRoom
      projectId={projectId}
      initialChatHistory={effectiveHistory}
    />
  );
}

export default WritersRoomContainer;

