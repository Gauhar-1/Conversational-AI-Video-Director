/**
 * @file src/app/dashboard/page.tsx
 * @description Stage 0: Production Projects Workspace Dashboard.
 * Optimized Next.js Server Component with granular Suspense and zero hydration flicker.
 * Direct Mongoose projection ensures micro-payloads under 5KB with zero CLS.
 */

import React, { Suspense } from "react";
import { getAuthUser } from "@/lib/auth/getAuthUser";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { ProjectGridServer } from "@/components/dashboard/ProjectGridServer";
import { ProjectGridSkeleton } from "@/components/dashboard/ProjectGridSkeleton";

export const metadata = {
  title: "Dashboard | Director AI",
  description: "Manage and compose your node-based generative video pipelines.",
};

export default async function DashboardPage() {
  // Extract authenticated user on the server (via Supabase session cookies or headers)
  const auth = await getAuthUser();

  return (
    <div className="min-h-screen w-full bg-zinc-950 text-zinc-100 flex flex-col select-none overflow-y-auto">
      {/* Top Navigation Bar */}
      <DashboardHeader initialAuth={auth} />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-6 md:p-8">
        {/* Workspace Title Header */}
        <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-zinc-100">
              Production Projects
            </h1>
            <p className="text-xs text-zinc-400 mt-1">
              Select an existing sequence or initialize a new node-based generative pipeline.
            </p>
          </div>

          <div className="flex items-center gap-2 text-xs font-mono text-zinc-500 bg-zinc-900/60 border border-zinc-800 px-3 py-1.5 rounded-md self-start md:self-auto">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>State-Decoupled Engine Active</span>
          </div>
        </div>

        {/* Granular Suspense Boundary: Renders 8-card pulsing skeleton on streaming/loading */}
        <Suspense fallback={<ProjectGridSkeleton />}>
          <ProjectGridServer
            userId={auth.userId}
            isAuthenticated={auth.isAuthenticated}
          />
        </Suspense>
      </main>
    </div>
  );
}
