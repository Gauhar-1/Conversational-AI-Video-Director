"use client";

/**
 * @file src/components/dashboard/CreateProjectModal.tsx
 * @description Studio-Grade Project Creation Modal.
 * Prompts the authenticated user for a project title and aspect ratio,
 * then seamlessly routes them directly to Stage 1: The Writer's Room.
 */

import React, { useState, useEffect, useRef } from "react";
import { X, Clapperboard, ArrowRight, Loader2, Smartphone, Monitor } from "lucide-react";

interface CreateProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (title: string, aspectRatio: "9:16" | "16:9") => void;
  isCreating: boolean;
}

export function CreateProjectModal({
  isOpen,
  onClose,
  onSubmit,
  isCreating,
}: CreateProjectModalProps) {
  const [title, setTitle] = useState("");
  const [aspectRatio, setAspectRatio] = useState<"9:16" | "16:9">("9:16");
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-focus input and reset state on modal open
  useEffect(() => {
    if (isOpen) {
      setTitle("");
      setError(null);
      setAspectRatio("9:16");
      // Delay focus slightly to let entry animation mount
      const timer = setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  // Keyboard shortcut listener: Escape closes modal
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !isCreating) {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, isCreating, onClose]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanTitle = title.trim();

    if (!cleanTitle) {
      setError("Please provide a name for your production sequence.");
      inputRef.current?.focus();
      return;
    }

    setError(null);
    onSubmit(cleanTitle, aspectRatio);
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-zinc-950/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isCreating) {
          onClose();
        }
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="create-project-title"
        className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-md p-6 shadow-2xl relative text-zinc-100 animate-in fade-in zoom-in-95 duration-200"
      >
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          disabled={isCreating}
          className="absolute top-4 right-4 p-1 rounded-md text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          aria-label="Close modal"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-2.5 mb-2">
          <div className="w-8 h-8 rounded-md bg-zinc-800 border border-zinc-700/80 flex items-center justify-center text-zinc-100 shrink-0">
            <Clapperboard className="w-4 h-4" />
          </div>
          <div>
            <h2 id="create-project-title" className="text-base font-semibold tracking-tight text-zinc-100">
              Initialize New Production
            </h2>
          </div>
        </div>

        <p className="text-xs text-zinc-400 leading-relaxed mb-6">
          Name your sequence. Upon creation, you will proceed directly to{" "}
          <strong className="text-zinc-200 font-medium">The Writer&apos;s Room</strong> to shape the narrative.
        </p>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="project-title-input" className="block text-xs font-mono uppercase text-zinc-400 mb-1.5 tracking-wider">
              Project Title
            </label>
            <input
              id="project-title-input"
              ref={inputRef}
              type="text"
              value={title}
              disabled={isCreating}
              onChange={(e) => {
                setTitle(e.target.value);
                if (error) setError(null);
              }}
              placeholder="e.g. The Height Chart, Echoes of Silence..."
              maxLength={80}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-md px-3.5 py-2.5 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-zinc-600 transition-colors disabled:opacity-50"
            />
            {error && <p className="text-xs text-red-400 mt-1.5">{error}</p>}
          </div>

          {/* Aspect Ratio Selection */}
          <div>
            <label className="block text-xs font-mono uppercase text-zinc-400 mb-1.5 tracking-wider">
              Aspect Ratio
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                disabled={isCreating}
                onClick={() => setAspectRatio("9:16")}
                className={`p-2.5 rounded-md border text-left flex items-center gap-2.5 transition-all ${
                  aspectRatio === "9:16"
                    ? "border-zinc-600 bg-zinc-800/80 text-zinc-100 shadow-sm"
                    : "border-zinc-800 bg-zinc-950/60 text-zinc-400 hover:text-zinc-200 hover:border-zinc-700"
                }`}
              >
                <Smartphone className="w-4 h-4 shrink-0 text-zinc-300" />
                <div>
                  <div className="text-xs font-medium">9:16 Vertical</div>
                  <div className="text-[10px] text-zinc-500 font-mono">Mobile / Reels</div>
                </div>
              </button>

              <button
                type="button"
                disabled={isCreating}
                onClick={() => setAspectRatio("16:9")}
                className={`p-2.5 rounded-md border text-left flex items-center gap-2.5 transition-all ${
                  aspectRatio === "16:9"
                    ? "border-zinc-600 bg-zinc-800/80 text-zinc-100 shadow-sm"
                    : "border-zinc-800 bg-zinc-950/60 text-zinc-400 hover:text-zinc-200 hover:border-zinc-700"
                }`}
              >
                <Monitor className="w-4 h-4 shrink-0 text-zinc-300" />
                <div>
                  <div className="text-xs font-medium">16:9 Cinema</div>
                  <div className="text-[10px] text-zinc-500 font-mono">Widescreen</div>
                </div>
              </button>
            </div>
          </div>

          {/* Modal Actions */}
          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-zinc-800/80">
            <button
              type="button"
              onClick={onClose}
              disabled={isCreating}
              className="px-3.5 py-2 text-xs font-medium text-zinc-300 hover:text-zinc-100 hover:bg-zinc-800 rounded-md transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={isCreating || !title.trim()}
              className="px-4 py-2 bg-zinc-100 text-zinc-950 hover:bg-white rounded-md text-xs font-medium flex items-center gap-1.5 transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-sm"
            >
              {isCreating ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Initializing...</span>
                </>
              ) : (
                <>
                  <span>Create & Enter Writer&apos;s Room</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default CreateProjectModal;

