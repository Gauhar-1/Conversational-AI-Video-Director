"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { MessageSquare, Plus, Loader2, Edit2 } from "lucide-react";
import { useState, useRef, useEffect } from "react";

type HistorySidebarProps = {
  activeProjectId: string | null;
  onSelectProject: (id: string | null) => void;
  isOpen: boolean;
};

export default function HistorySidebar({ activeProjectId, onSelectProject, isOpen }: HistorySidebarProps) {
  const queryClient = useQueryClient();
  const hasInitialized = useRef(false);

  // Fetch projects
  const { data: projects = [], isLoading } = useQuery({
    queryKey: ["projectHistory"],
    queryFn: async () => {
      const res = await fetch("/api/projects");
      if (!res.ok) return [];
      return res.json();
    }
  });

  useEffect(() => {
  // Only run this logic if we have projects AND no active project is set yet (page load)
  if (projects.length > 0 && !hasInitialized.current) {
      hasInitialized.current = true; // Mark as loaded so it never fires on tab changes again
      
      // If the state somehow already has a project, don't overwrite it
      if (activeProjectId !== null) return;

      const savedId = localStorage.getItem("director_active_project");
    
    // Check if the saved ID actually exists in the fetched projects array
      const projectExists = projects.some((p: any) => p._id === savedId);

      if (savedId && projectExists) {
      // 1. Load the project they were last working on
      onSelectProject(savedId);
    } else {
      // 2. Or, default to the very first (most recent) project in the list
      onSelectProject(projects[0]._id);
    }
  }
}, [projects, activeProjectId, onSelectProject]);

  // Mutation to update the project title
  const updateTitleMutation = useMutation({
    mutationFn: async ({ id, title }: { id: string; title: string }) => {
      // Adjust this endpoint to match your actual update route (e.g., PATCH or PUT)
      const res = await fetch(`/api/projects/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title }),
      });
      if (!res.ok) throw new Error("Failed to update title");
      return res.json();
    },
    onSuccess: () => {
      // Refresh the history list after a successful update
      queryClient.invalidateQueries({ queryKey: ["projectHistory"] });
    },
  });

  const handleUpdateTitle = (id: string, newTitle: string) => {
    updateTitleMutation.mutate({ id, title: newTitle });
  };

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
          <ProjectItem
            key={project._id}
            project={project}
            isActive={activeProjectId === project._id}
            onSelect={() => onSelectProject(project._id)}
            onUpdateTitle={handleUpdateTitle}
          />
        ))}

        {!isLoading && projects.length === 0 && (
          <p className="text-sm text-zinc-600 px-2 italic">No history yet.</p>
        )}
      </div>
    </div>
  );
}

// --- Sub-component for individual items to handle localized editing state ---

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

  // Autofocus when editing starts
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
      // Revert if empty or unchanged
      setTitle(originalTitle);
    }
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") handleSave();
    if (e.key === "Escape") {
      setTitle(project.title || "Untitled Project");
      setIsEditing(false);
    }
  };

  return (
    <div
      className={`group flex items-center justify-between w-full p-3 rounded-lg text-left transition-all cursor-pointer ${
        isActive
          ? "bg-zinc-800 text-indigo-300 border border-zinc-700"
          : "text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200 border border-transparent"
      }`}
      // Trigger selection only if we aren't clicking on the edit state elements
      onClick={() => !isEditing && onSelect()}
    >
      <div className="flex items-center gap-3 overflow-hidden flex-1">
        <MessageSquare className="w-4 h-4 shrink-0" />
        
        {isEditing ? (
          <input
            ref={inputRef}
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={handleSave}
            onKeyDown={handleKeyDown}
            onClick={(e) => e.stopPropagation()} // Prevent selecting the project when clicking inside the input
            className="flex-1 bg-zinc-900 border border-indigo-500 rounded px-2 py-0.5 outline-none text-zinc-200 text-sm focus:ring-1 focus:ring-indigo-500"
          />
        ) : (
          <div className="truncate text-sm font-medium">
            {title}
          </div>
        )}
      </div>

      {!isEditing && (
        <button
          onClick={(e) => {
            e.stopPropagation(); // Prevent selecting the project when clicking the edit button
            setIsEditing(true);
          }}
          className="opacity-0 group-hover:opacity-100 p-1 shrink-0 text-zinc-500 hover:text-indigo-400 transition-opacity ml-2"
          aria-label="Edit project name"
        >
          <Edit2 className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}