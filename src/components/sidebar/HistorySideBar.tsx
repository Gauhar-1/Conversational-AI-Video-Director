"use client";

import { useQuery } from "@tanstack/react-query";
import { MessageSquare, Plus, Loader2 } from "lucide-react";

type HistorySidebarProps = {
  activeProjectId: string | null;
  onSelectProject: (id: string | null) => void;
  isOpen: boolean;
};

export default function HistorySidebar({ activeProjectId, onSelectProject, isOpen }: HistorySidebarProps) {
  // We will need a GET route to fetch the list of past projects
  const { data: projects = [], isLoading } = useQuery({
    queryKey: ["projectHistory"],
    queryFn: async () => {
      const res = await fetch("/api/projects");
      if (!res.ok) return [];
      return res.json();
    }
  });

  if (!isOpen) return null;

  return (
    <div className="flex flex-col h-full p-4">
      <button 
        onClick={() => onSelectProject(null)}
        className="flex items-center gap-2 w-full p-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-medium transition-all shadow-lg shadow-indigo-900/20 mb-6"
      >
        <Plus className="w-5 h-5" />
        New Project
      </button>

      <div className="flex-1 overflow-y-auto space-y-2 pr-2">
        <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-3 px-2">
          Recent Projects
        </h3>

        {isLoading && (
          <div className="flex justify-center py-4">
            <Loader2 className="w-5 h-5 text-indigo-500 animate-spin" />
          </div>
        )}

        {projects.map((project: any) => (
          <button
            key={project._id}
            onClick={() => onSelectProject(project._id)}
            className={`flex items-center gap-3 w-full p-3 rounded-lg text-left transition-all ${
              activeProjectId === project._id 
                ? "bg-zinc-800 text-indigo-300 border border-zinc-700" 
                : "text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200 border border-transparent"
            }`}
          >
            <MessageSquare className="w-4 h-4 shrink-0" />
            <div className="truncate text-sm font-medium">
              {project.title || "Untitled Project"}
            </div>
          </button>
        ))}

        {!isLoading && projects.length === 0 && (
          <p className="text-sm text-zinc-600 px-2 italic">No history yet.</p>
        )}
      </div>
    </div>
  );
}