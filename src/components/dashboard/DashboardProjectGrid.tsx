"use client";

/**
 * @file src/components/dashboard/DashboardProjectGrid.tsx
 * @description Client-side project grid implementing React 19's useOptimistic hook.
 * Guarantees zero latency illusion when creating or deleting projects, with instant visual feedback.
 */

import React, { useState, useTransition, useOptimistic } from "react";
import { useRouter } from "next/navigation";
import { ProjectCard, CreateProjectCard, ProjectCardData } from "@/components/dashboard/ProjectCard";
import AuthModal from "@/components/auth/AuthModal";
import { createProjectAction } from "@/actions/project";
import { AlertCircle, X } from "lucide-react";

interface DashboardProjectGridProps {
  initialProjects: ProjectCardData[];
  isAuthenticated: boolean;
}

type OptimisticAction =
  | { type: "add"; project: ProjectCardData }
  | { type: "delete"; projectId: string };

export function DashboardProjectGrid({
  initialProjects,
  isAuthenticated,
}: DashboardProjectGridProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Optimistic UI state: updates visual grid synchronously before server action completes
  const [optimisticProjects, setOptimisticProjects] = useOptimistic(
    initialProjects,
    (state: ProjectCardData[], action: OptimisticAction) => {
      switch (action.type) {
        case "add":
          return [action.project, ...state];
        case "delete":
          return state.filter((p) => p._id !== action.projectId);
        default:
          return state;
      }
    }
  );

  const handleCreateProjectClick = () => {
    if (!isAuthenticated) {
      setIsAuthModalOpen(true);
      return;
    }

    const tempId = `temp-${Date.now()}`;
    const newProjectTitle = `Project ${new Date().toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    })} Sequence`;

    const optimisticProject: ProjectCardData = {
      _id: tempId,
      title: newProjectTitle,
      updatedAt: new Date().toISOString(),
      currentStage: "writers_room",
      sceneCount: 0,
      characterCount: 0,
      locationCount: 0,
    };

    setErrorMessage(null);

    startTransition(async () => {
      // 1. Instantly apply visual change locally
      setOptimisticProjects({ type: "add", project: optimisticProject });

      try {
        // 2. Fire Server Action in the background
        const created = await createProjectAction({
          title: newProjectTitle,
          aspectRatio: "9:16",
        });

        if (created?._id) {
          router.push(`/project/${created._id}/script`);
        }
      } catch (err: any) {
        console.error("Failed to create project:", err);
        // 3. Rollback occurs automatically and display subtle error toast
        setErrorMessage(err.message || "Failed to initialize project. Please try again.");
      }
    });
  };

  return (
    <>
      {/* Subtle Error Toast on Optimistic Rollback */}
      {errorMessage && (
        <div className="mb-4 p-3 bg-red-950/60 border border-red-800/80 rounded-md flex items-center justify-between text-xs text-red-200 animate-in fade-in slide-in-from-top-1">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
            <span>{errorMessage}</span>
          </div>
          <button
            onClick={() => setErrorMessage(null)}
            className="p-1 hover:text-white text-red-300"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-4 gap-4">
        {/* 1st Card: Create New Project */}
        <CreateProjectCard
          onClick={handleCreateProjectClick}
          isCreating={isPending}
        />

        {/* Remaining Cards: Optimistic + Server-Rendered Project Cards */}
        {optimisticProjects.map((project) => (
          <ProjectCard key={project._id} project={project} />
        ))}
      </div>

      {/* Auth Modal for Gated Creation */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onSuccess={() => {
          setIsAuthModalOpen(false);
          router.refresh();
        }}
        title="Sign in to Initialize Project"
        subtitle="Authenticate to create your secure, isolated video production workspace."
      />
    </>
  );
}

export default DashboardProjectGrid;
