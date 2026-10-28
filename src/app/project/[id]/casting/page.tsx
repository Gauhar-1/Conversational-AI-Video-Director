"use client";

/**
 * @file src/app/project/[id]/casting/page.tsx
 * @description Stage 2 Workspace: The Casting & Scouting Wizard.
 * Dedicated e-commerce style grid for generating and approving static reference images
 * for Characters and Locations using Replicate (FLUX + PuLID).
 */

import { use, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { StageHeader } from "@/components/navigation/StageHeader";
import { CastingWizard } from "@/components/casting/CastingWizard";
import SettingsModal from "@/components/settings/SettingsModal";
import { Loader2 } from "lucide-react";

export default function CastingWorkspacePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Fetch project details including global_assets
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

  const handleProceedToTimeline = () => {
    router.push(`/project/${id}/pipeline`);
  };

  if (isLoading) {
    return (
      <div className="flex flex-col h-screen w-full bg-zinc-950 items-center justify-center text-zinc-500 font-mono text-xs">
        <Loader2 className="w-5 h-5 animate-spin mb-2" />
        <span>Loading Casting &amp; Scouting Vault...</span>
      </div>
    );
  }

  // Fallback to legacy globalVault if global_assets is empty
  const characters = project?.global_assets?.characters || [];
  const locations = project?.global_assets?.locations || [];

  if (characters.length === 0 && project?.globalVault?.characterAnchor?.description) {
    characters.push({
      assetId: "char-lead",
      name: "Lead Protagonist",
      role: "Lead",
      appearancePrompt: project.globalVault.characterAnchor.description,
      imageUrl: project.globalVault.characterAnchor.imageUrl || "",
      pulidSeed: project.globalVault.characterAnchor.replicatePulidSeed || 42,
      status: project.globalVault.characterAnchor.imageUrl ? "approved" : "draft",
      generationHistory: [],
    });
  }

  if (locations.length === 0 && project?.globalVault?.environmentAnchor?.description) {
    locations.push({
      assetId: "loc-env",
      name: "Master Environment",
      environmentPrompt: project.globalVault.environmentAnchor.description,
      lightingProfile: project.globalVault.environmentAnchor.lightingProfile || "Cinematic rim lighting",
      imageUrl: project.globalVault.environmentAnchor.imageUrl || "",
      status: project.globalVault.environmentAnchor.imageUrl ? "approved" : "draft",
      generationHistory: [],
    });
  }

  const initialAssets = {
    characters,
    locations,
  };

  return (
    <div className="flex flex-col h-screen w-full bg-zinc-950 text-zinc-100 select-none overflow-hidden">
      {/* Studio Stage Stepper Navigation Header */}
      <StageHeader
        projectId={id}
        projectTitle={project?.title}
        activeStage="casting_scouting"
        characterCount={characters.length}
        locationCount={locations.length}
        onOpenSettings={() => setIsSettingsOpen(true)}
        nextAction={{
          label: "Enter Timeline",
          href: `/project/${id}/pipeline`,
        }}
      />

      {/* Main Casting Wizard Content */}
      <main className="flex-1 flex overflow-hidden">
        <CastingWizard
          projectId={id}
          initialAssets={initialAssets}
          onProceedToTimeline={handleProceedToTimeline}
        />
      </main>

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
      />
    </div>
  );
}

