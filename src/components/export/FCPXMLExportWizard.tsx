"use client";

/**
 * @file src/components/export/FCPXMLExportWizard.tsx
 * @description Guided modal wizard for exporting Final Cut Pro XML (FCPXML v1.9)
 * and offline synced video takes directly to the user's filesystem using the
 * File System Access API (window.showDirectoryPicker).
 * Monochromatic zinc studio design system.
 */

import React, { useState } from "react";
import { 
  X, Folder, Download, CheckCircle2, 
  Loader2, AlertCircle, Film, Sparkles, FileText, ArrowRight 
} from "lucide-react";
import { compileFCPXML, downloadFCPXML } from "@/lib/fcpxml";
import type { ISceneDoc } from "@/models/Project";

interface FCPXMLExportWizardProps {
  isOpen: boolean;
  onClose: () => void;
  projectName: string;
  scenes: ISceneDoc[];
  fps?: number;
}

export function FCPXMLExportWizard({
  isOpen,
  onClose,
  projectName,
  scenes,
  fps = 24,
}: FCPXMLExportWizardProps) {
  // Step 1: Instructions & Folder Picker
  // Step 2: Downloading & Writing Clips + FCPXML
  // Step 3: Success State
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [downloadProgress, setDownloadProgress] = useState({
    current: 0,
    total: 0,
    percentage: 0,
    currentFileName: "",
  });
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [savedFiles, setSavedFiles] = useState<string[]>([]);

  if (!isOpen) return null;

  // Gather active takes for each scene
  const exportClips = scenes
    .map((scene, idx) => {
      const activeTake =
        scene.takes?.find((t) => t.takeId === scene.activeTakeId) ||
        scene.takes?.[0];
      const videoUrl = activeTake?.videoUrl || scene.videoUrl || "";
      const takeNumber = (activeTake as any)?.takeNumber || 1;
      const order = scene.order || (scene as any).sceneNumber || idx + 1;
      return {
        sceneId: scene.sceneId,
        order,
        takeNumber,
        videoUrl,
        cameraAngle: scene.cameraAngle,
        duration: scene.duration || (scene as any).durationSec || 10,
        fileName: `Scene_${String(order).padStart(2, "0")}_Take_${takeNumber}.mp4`,
      };
    })
    .filter((clip) => Boolean(clip.videoUrl && clip.videoUrl.trim() !== ""));

  const handleStartExport = async () => {
    setErrorMsg(null);
    setStep(2);

    const safeTitle = (projectName || "Director_AI_Sequence").replace(/\s+/g, "_");
    const xmlFileName = `${safeTitle}_timeline.fcpxml`;
    const filesWritten: string[] = [];

    // Check if File System Access API is supported
    const hasDirectoryPicker = typeof window !== "undefined" && "showDirectoryPicker" in window;

    if (hasDirectoryPicker) {
      try {
        const dirHandle = await (window as any).showDirectoryPicker({
          mode: "readwrite",
        });

        const totalItems = exportClips.length + 1; // clips + xml
        setDownloadProgress({
          current: 0,
          total: totalItems,
          percentage: 0,
          currentFileName: "Preparing folder sync...",
        });

        // 1. Download and write each active video take
        for (let i = 0; i < exportClips.length; i++) {
          const clip = exportClips[i];
          setDownloadProgress({
            current: i + 1,
            total: totalItems,
            percentage: Math.round(((i + 1) / totalItems) * 100),
            currentFileName: clip.fileName,
          });

          try {
            const res = await fetch(clip.videoUrl);
            const blob = await res.blob();
            const fileHandle = await dirHandle.getFileHandle(clip.fileName, { create: true });
            const writable = await fileHandle.createWritable();
            await writable.write(blob);
            await writable.close();
            filesWritten.push(clip.fileName);
          } catch (clipErr) {
            console.warn(`Failed to write local clip ${clip.fileName}:`, clipErr);
            filesWritten.push(`${clip.fileName} (Remote linked)`);
          }
        }

        // 2. Compile FCPXML pointing to local offline files
        setDownloadProgress((prev) => ({
          ...prev,
          current: totalItems,
          percentage: 100,
          currentFileName: xmlFileName,
        }));

        const xmlString = compileFCPXML({
          projectTitle: projectName,
          scenes,
          fps,
        });

        const xmlFileHandle = await dirHandle.getFileHandle(xmlFileName, { create: true });
        const xmlWritable = await xmlFileHandle.createWritable();
        await xmlWritable.write(xmlString);
        await xmlWritable.close();
        filesWritten.push(xmlFileName);

        setSavedFiles(filesWritten);
        setStep(3);
      } catch (pickerErr: any) {
        if (pickerErr.name === "AbortError") {
          // User canceled folder selection
          setStep(1);
          return;
        }
        console.error("Directory picker error, falling back to browser download:", pickerErr);
        handleFallbackBrowserDownload(safeTitle, xmlFileName);
      }
    } else {
      // Fallback for browsers lacking window.showDirectoryPicker
      handleFallbackBrowserDownload(safeTitle, xmlFileName);
    }
  };

  const handleFallbackBrowserDownload = (safeTitle: string, xmlFileName: string) => {
    try {
      const xmlString = compileFCPXML({
        projectTitle: projectName,
        scenes,
        fps,
      });

      downloadFCPXML(xmlString, xmlFileName);
      setSavedFiles([xmlFileName, `${exportClips.length} remote scene takes linked`]);
      setStep(3);
    } catch (err: any) {
      setErrorMsg(err.message || "Export compilation failed.");
      setStep(1);
    }
  };

  return (
    <div className="fixed inset-0 bg-zinc-950/85 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-150 select-none">
      <div className="w-full max-w-lg bg-zinc-900 border border-zinc-800 rounded-md p-6 shadow-2xl flex flex-col text-zinc-100">
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-4 border-b border-zinc-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-md bg-zinc-800 border border-zinc-700 flex items-center justify-center text-zinc-200">
              <Film className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-zinc-100">
                FCPXML Export Wizard
              </h3>
              <p className="text-[11px] font-mono text-zinc-400">
                Final Cut Pro v1.9 &amp; DaVinci Resolve Sync Engine
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-white p-1 rounded transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Content based on active step */}
        <div className="py-6 flex-1">
          {/* ========================================================================= */}
          {/* STEP 1: INSTRUCTIONS & FOLDER PICKER                                      */}
          {/* ========================================================================= */}
          {step === 1 && (
            <div className="space-y-4">
              <div className="p-4 rounded-md bg-zinc-950 border border-zinc-800 space-y-2.5">
                <div className="flex items-start gap-2.5">
                  <Folder className="w-5 h-5 text-zinc-300 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-xs font-semibold text-zinc-200">
                      Step 1: Choose Local Destination Folder
                    </h4>
                    <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
                      Select a local destination folder. Director AI will download all active clips directly to this folder to ensure offline linking.
                    </p>
                  </div>
                </div>

                <div className="pt-2 border-t border-zinc-800/80 space-y-1.5 text-[11px] font-mono text-zinc-400">
                  <div className="flex items-center justify-between">
                    <span>Active Clips to Sync:</span>
                    <span className="text-zinc-200 font-semibold">{exportClips.length} scenes</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Timeline Standard:</span>
                    <span className="text-zinc-200">FCPXML v1.9 (24 FPS, 9:16)</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Close-up Framing:</span>
                    <span className="text-zinc-200">1.3x Scale Transform Preserved</span>
                  </div>
                </div>
              </div>

              {errorMsg && (
                <div className="p-3 bg-red-950/40 border border-red-800/60 rounded text-xs text-red-300 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded text-xs text-zinc-400 hover:text-zinc-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleStartExport}
                  className="px-4 py-2.5 rounded bg-zinc-100 text-zinc-950 hover:bg-white text-xs font-semibold flex items-center gap-2 transition-colors shadow-sm"
                >
                  <Folder className="w-3.5 h-3.5" />
                  <span>Select Folder &amp; Sync Clips</span>
                </button>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* STEP 2: DOWNLOADING PROGRESS BAR                                          */}
          {/* ========================================================================= */}
          {step === 2 && (
            <div className="space-y-5 text-center py-4">
              <div className="w-12 h-12 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center mx-auto text-zinc-100">
                <Loader2 className="w-6 h-6 animate-spin text-zinc-100" />
              </div>

              <div className="space-y-1">
                <h4 className="text-sm font-semibold text-zinc-100">
                  Downloading &amp; Writing Local Timeline Assets
                </h4>
                <p className="text-xs text-zinc-400 font-mono">
                  {downloadProgress.currentFileName || "Initializing file sync..."}
                </p>
              </div>

              {/* Progress Bar */}
              <div className="space-y-1.5 px-4">
                <div className="w-full bg-zinc-950 border border-zinc-800 rounded-full h-2.5 overflow-hidden">
                  <div
                    className="bg-zinc-100 h-full rounded-full transition-all duration-200"
                    style={{ width: `${downloadProgress.percentage}%` }}
                  />
                </div>
                <div className="flex justify-between text-[11px] font-mono text-zinc-500">
                  <span>
                    Clip {downloadProgress.current} of {downloadProgress.total}
                  </span>
                  <span>{downloadProgress.percentage}%</span>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* STEP 3: SUCCESS STATE                                                     */}
          {/* ========================================================================= */}
          {step === 3 && (
            <div className="space-y-5 text-center py-2">
              <div className="w-14 h-14 rounded-full bg-zinc-950 border border-zinc-700 flex items-center justify-center mx-auto text-emerald-400 shadow-lg">
                <CheckCircle2 className="w-8 h-8" />
              </div>

              <div className="space-y-1.5">
                <h4 className="text-base font-semibold text-zinc-100">
                  Export Complete
                </h4>
                <p className="text-xs text-zinc-400 max-w-sm mx-auto leading-relaxed">
                  Drag the <span className="font-mono text-zinc-200 font-semibold">timeline.fcpxml</span> file into DaVinci Resolve or Final Cut Pro.
                </p>
              </div>

              {/* Saved Files Summary */}
              <div className="p-3 bg-zinc-950 rounded-md border border-zinc-800 text-left max-h-36 overflow-y-auto custom-scrollbar space-y-1">
                <span className="text-[10px] font-mono uppercase text-zinc-500 block mb-1">
                  Synced Offline Files ({savedFiles.length})
                </span>
                {savedFiles.map((f, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-1.5 text-xs font-mono text-zinc-300"
                  >
                    <FileText className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
                    <span className="truncate">{f}</span>
                  </div>
                ))}
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="w-full py-2.5 rounded bg-zinc-100 text-zinc-950 hover:bg-white text-xs font-semibold transition-colors shadow-sm"
                >
                  Done
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
