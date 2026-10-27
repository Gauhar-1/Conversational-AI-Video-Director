"use client";

import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Edit2, Film, Check, Loader2, ChevronLeft } from "lucide-react";

type HistorySidebarProps = {
  activeProjectId: string | null;
  onSelectProject: (id: string | null) => void;
  isOpen: boolean;
  isCollapsedRail?: boolean;
  onToggleRail?: () => void;
};

export default function HistorySidebar({
  activeProjectId,
  onSelectProject,
  isOpen,
  isCollapsedRail = false,
  onToggleRail
}: HistorySidebarProps) {
  const queryClient = useQueryClient();

  const { data: projects = [], isLoading } = useQuery({
    queryKey: ["userProjects"],
    queryFn: async () => {
      const res = await fetch("/api/projects");
      if (!res.ok) throw new Error("Failed to fetch projects");
      return res.json();
    },
  });

  const updateTitleMutation = useMutation({
    mutationFn: async ({ id, title }: { id: string; title: string }) => {
      const res = await fetch(`/api/projects/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title }),
      });
      if (!res.ok) throw new Error("Failed to update project title");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["userProjects"] });
    },
  });

  const handleUpdateTitle = (id: string, newTitle: string) => {
    updateTitleMutation.mutate({ id, title: newTitle });
  };

  if (!isOpen) return null;

  // --- COLLAPSED 56px ICON RAIL VIEW ---
  if (isCollapsedRail) {
    return (
      <div className="flex flex-col items-center justify-between h-full py-3 px-1.5 w-14 bg-zinc-950 border-r border-zinc-800">
        <div className="flex flex-col items-center gap-2.5 w-full">
          <button 
            onClick={() => onSelectProject(null)}
            className="w-9 h-9 flex items-center justify-center bg-zinc-100 hover:bg-white text-zinc-950 rounded-md transition-colors shadow-sm group relative"
            title="New Project"
          >
            <Plus className="w-4 h-4" />
            <span className="absolute left-12 bg-zinc-900 border border-zinc-800 text-zinc-100 text-xs px-2.5 py-1 rounded-md opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-50 shadow-xl">
              New Project
            </span>
          </button>

          <div className="w-6 h-px bg-zinc-800 my-0.5" />

          <div className="flex flex-col gap-1.5 w-full items-center overflow-y-auto max-h-[calc(100vh-140px)] custom-scrollbar">
            {isLoading ? (
              <Loader2 className="w-4 h-4 text-zinc-500 animate-spin mt-2" />
            ) : (
              projects.map((p: any) => {
                const isActive = activeProjectId === p._id;
                const initials = (p.title || "PR").substring(0, 2).toUpperCase();

                return (
                  <button
                    key={p._id}
                    onClick={() => onSelectProject(p._id)}
                    className={`w-9 h-9 flex items-center justify-center rounded-md text-xs font-mono font-bold transition-colors relative group ${
                      isActive 
                        ? "bg-zinc-800 text-zinc-100 border border-zinc-700" 
                        : "bg-zinc-900/60 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 border border-zinc-800/80"
                    }`}
                  >
                    <span>{initials}</span>
                    <span className="absolute left-12 bg-zinc-900 border border-zinc-800 text-zinc-100 text-xs px-2.5 py-1.5 rounded-md opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-50 shadow-xl max-w-xs truncate">
                      {p.title || "Untitled Sequence"}
                    </span>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {onToggleRail && (
          <button 
            onClick={onToggleRail}
            className="w-9 h-9 flex items-center justify-center text-zinc-400 hover:text-white hover:bg-zinc-900 rounded-md transition-colors border border-transparent hover:border-zinc-800"
            title="Expand Sidebar"
          >
            <ChevronLeft className="w-4 h-4 rotate-180" />
          </button>
        )}
      </div>
    );
  }

  // --- FULL 280px EXPANDED SIDEBAR VIEW ---
  return (
    <div className="flex flex-col h-full p-4 bg-zinc-950 border-r border-zinc-800">
      <div className="flex items-center justify-between mb-4">
        <button 
          onClick={() => onSelectProject(null)}
          className="flex-1 flex items-center justify-center gap-2 p-2.5 bg-zinc-100 hover:bg-white text-zinc-950 rounded-md font-semibold text-xs transition-colors shadow-sm"
        >
          <Plus className="w-4 h-4" />
          <span>New Project</span>
        </button>

        {onToggleRail && (
          <button
            onClick={onToggleRail}
            className="p-2 ml-2 text-zinc-400 hover:text-white hover:bg-zinc-900 rounded-md transition-colors border border-zinc-800"
            title="Collapse to Rail"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto space-y-1.5 pr-1 custom-scrollbar">
        <h3 className="text-xs font-mono uppercase tracking-wider text-zinc-500 mb-2 px-1 flex items-center justify-between">
          <span>Recent Projects</span>
          <span className="text-[10px] text-zinc-600">{projects.length}</span>
        </h3>

        {isLoading && (
          <div className="flex justify-center py-4">
            <Loader2 className="w-4 h-4 text-zinc-500 animate-spin" />
          </div>
        )}

        {projects.map((project: any) => (
          <ProjectItem
            key={project._id}
            project={project}
            isActive={activeProjectId === project._id}
            onSelect={() => onSelectProject(project._id)}
            onUpdateTitle={handleUpdateTitle}
          />
        ))}

        {!isLoading && projects.length === 0 && (
          <p className="text-xs text-zinc-600 px-2 italic">No history yet.</p>
        )}
      </div>
    </div>
  );
}

// Sub-component for individual project item
type ProjectItemProps = {
  project: any;
  isActive: boolean;
  onSelect: () => void;
  onUpdateTitle: (id: string, newTitle: string) => void;
};

function ProjectItem({ project, isActive, onSelect, onUpdateTitle }: ProjectItemProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [title, setTitle] = useState(project.title || "Untitled Project");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleSave = () => {
    const trimmedTitle = title.trim();
    const originalTitle = project.title || "Untitled Project";

    if (trimmedTitle && trimmedTitle !== originalTitle) {
      onUpdateTitle(project._id, trimmedTitle);
    } else {
      setTitle(originalTitle);
    }
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleSave();
    else if (e.key === "Escape") {
      setTitle(project.title || "Untitled Project");
      setIsEditing(false);
    }
  };

  return (
    <div
      onClick={() => !isEditing && onSelect()}
      className={`group flex items-center justify-between p-2.5 rounded-md cursor-pointer transition-colors border ${
        isActive
          ? "bg-zinc-900 border-zinc-700 text-zinc-100 shadow-sm"
          : "hover:bg-zinc-900/60 border-transparent text-zinc-400 hover:text-zinc-200"
      }`}
    >
      <div className="flex items-center gap-2.5 overflow-hidden flex-1">
        <Film className={`w-3.5 h-3.5 shrink-0 ${isActive ? "text-zinc-200" : "text-zinc-500"}`} />
        
        {isEditing ? (
          <input
            ref={inputRef}
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={handleSave}
            onKeyDown={handleKeyDown}
            className="bg-zinc-950 text-white text-xs px-2 py-0.5 rounded border border-zinc-700 outline-none w-full"
            onClick={(e) => e.stopPropagation()}
          />
        ) : (
          <span className="text-xs font-medium truncate select-none">
            {project.title || "Untitled Project"}
          </span>
        )}
      </div>

      <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity ml-2">
        {isEditing ? (
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleSave();
            }}
            className="p-1 hover:text-white text-zinc-400 rounded transition-colors"
          >
            <Check className="w-3 h-3" />
          </button>
        ) : (
          <button
            onClick={(e) => {
              e.stopPropagation();
              setIsEditing(true);
            }}
            className="p-1 hover:text-white text-zinc-500 rounded transition-colors"
          >
            <Edit2 className="w-3 h-3" />
          </button>
        )}
      </div>
    </div>
  );
}