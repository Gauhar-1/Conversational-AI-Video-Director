/**
 * @file src/components/dashboard/ProjectGridServer.tsx
 * @description Next.js Server Component that directly fetches micro-project payloads.
 * Excludes heavy nested scenes and base64 strings to keep payloads strictly under 5KB.
 */

import React from "react";
import { projectRepository } from "@/lib/db/repositories/projectRepository";
import { DashboardProjectGrid } from "./DashboardProjectGrid";
import type { ProjectCardData } from "./ProjectCard";

interface ProjectGridServerProps {
  userId: string;
  isAuthenticated: boolean;
}

export async function ProjectGridServer({
  userId,
  isAuthenticated,
}: ProjectGridServerProps) {
  if (!isAuthenticated || !userId) {
    return <DashboardProjectGrid initialProjects={[]} isAuthenticated={false} />;
  }

  // Direct server-side Mongoose query with projection
  const projects = await projectRepository.getUserProjects(userId);

  // Map to clean ProjectCardData
  const cardData: ProjectCardData[] = projects.map((p) => ({
    _id: p._id,
    title: p.title,
    updatedAt: typeof p.updatedAt === "string" ? p.updatedAt : new Date(p.updatedAt).toISOString(),
    currentStage: p.currentStage as any,
    sceneCount: p.sceneCount,
    characterCount: p.characterCount,
    locationCount: p.locationCount,
  }));

  return <DashboardProjectGrid initialProjects={cardData} isAuthenticated={true} />;
}

export default ProjectGridServer;
