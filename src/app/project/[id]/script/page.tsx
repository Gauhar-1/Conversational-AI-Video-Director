"use client";

/**
 * @file src/app/project/[id]/script/page.tsx
 * @description Stage 1: The Writer's Room workspace.
 * 100% focused, distraction-free chat interface where Groq parses screenplay dialogue
 * and action into structured Scenes, Characters, and Locations.
 */

import { use, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { StageHeader } from "@/components/navigation/StageHeader";
import WritersRoomContainer from "@/components/chat/WritersRoomContainer";
import SettingsModal from "@/components/settings/SettingsModal";

export default function ScriptWorkspacePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Fetch project details for the header title & scene detection
  const { data: project, isLoading } = useQuery({
    queryKey: ["project", id],
    queryFn: async () => {
      const res = await fetch(`/api/projects/${id}`);
      if (!res.ok) {
        if (res.status === 404) router.push("/dashboard");
        throw new Error("Failed to fetch project");
      }
      return res.json();
    },
    enabled: !!id,
  });

  const handleProceedToCasting = () => {
    router.push(`/project/${id}/casting`);
  };

  const sceneCount = project?.scenes?.length || project?.storyboard?.length || 0;
  const characterCount = project?.global_assets?.characters?.length || 0;
  const locationCount = project?.global_assets?.locations?.length || 0;

  return (
    <div className="flex flex-col h-screen w-full bg-zinc-950 text-zinc-100 select-none overflow-hidden">
      {/* Studio Stage Stepper Navigation Header */}
      <StageHeader
        projectId={id}
        projectTitle={isLoading ? "Loading..." : project?.title || "Untitled Sequence"}
        activeStage="writers_room"
        sceneCount={sceneCount}
        characterCount={characterCount}
        locationCount={locationCount}
        onOpenSettings={() => setIsSettingsOpen(true)}
        nextAction={{
          label: "Lock Script & Cast",
          href: `/project/${id}/casting`,
        }}
      />

      {/* Writer's Room Workspace: Center-aligned chat (max-w-3xl) */}
      <main className="flex-1 flex justify-center overflow-hidden bg-zinc-950">
        <div className="w-full max-w-3xl h-full flex flex-col border-x border-zinc-800/80 bg-zinc-950 shadow-2xl">
          <WritersRoomContainer projectId={id} />
        </div>
      </main>

      {/* Settings Modal */}
      <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
    </div>
  );
}
