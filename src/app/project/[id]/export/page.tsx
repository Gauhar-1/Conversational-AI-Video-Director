"use client";

/**
 * @file src/app/project/[id]/export/page.tsx
 * @description Stage 4: The Playback & Export Engine.
 * Features a docked sequential video player for active scene takes,
 * local asset downloader, and Apple Final Cut Pro XML (FCPXML v1.9) timeline compiler.
 * Monochromatic zinc studio design system.
 */

import { use, useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { 
  Play, Pause, SkipBack, SkipForward, Download, 
  Film, FileText, CheckCircle2, ArrowLeft, Volume2, 
  VolumeX, Maximize2, Loader2, RefreshCw, Layers 
} from "lucide-react";
import { StageHeader } from "@/components/navigation/StageHeader";
import SettingsModal from "@/components/settings/SettingsModal";
import { compileFCPXML, downloadFCPXML } from "@/lib/fcpxml";
import { FCPXMLExportWizard } from "@/components/export/FCPXMLExportWizard";
import type { ISceneDoc } from "@/models/Project";

export default function ExportWorkspacePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Playback state
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isExportWizardOpen, setIsExportWizardOpen] = useState(false);
  const [exportNotice, setExportNotice] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);

  // Fetch project details
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

  const scenes: ISceneDoc[] = project?.scenes || [];
  const playableScenes = scenes.map((s, idx) => {
    const activeTake = (s.takes || []).find((t) => t.takeId === s.activeTakeId) || s.takes?.[0];
    const videoUrl = activeTake?.videoUrl || s.videoUrl || "";
    return {
      sceneId: s.sceneId,
      order: s.order || idx + 1,
      title: s.title || `Scene ${s.order || idx + 1}`,
      duration: s.duration || 10,
      cameraAngle: s.cameraAngle,
      videoUrl,
      firstFrameUrl: s.firstFrameUrl || "",
      takeNumber: activeTake?.takeNumber || 1,
      model: activeTake?.model || "kling-2.5",
      rawDelta: s.rawDelta,
    };
  });

  const currentScene = playableScenes[currentIndex] || null;
  const scenesWithVideo = playableScenes.filter((s) => Boolean(s.videoUrl));

  // Auto-advance sequential player
  const handleVideoEnded = () => {
    if (currentIndex < playableScenes.length - 1) {
      setCurrentIndex((prev) => prev + 1);
    } else {
      setIsPlaying(false);
      setCurrentIndex(0);
    }
  };

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
      setIsPlaying(false);
    } else {
      videoRef.current.play().catch(() => {});
      setIsPlaying(true);
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1);
    }
  };

  const handleNext = () => {
    if (currentIndex < playableScenes.length - 1) {
      setCurrentIndex((prev) => prev + 1);
    }
  };

  const handleExportFCPXML = () => {
    if (!project) return;
    setIsExporting(true);
    setExportNotice("Compiling Final Cut Pro XML with dynamic camera punch-ins...");

    try {
      const xml = compileFCPXML({
        projectTitle: project.title || "Director_AI_Sequence",
        scenes: project.scenes || [],
        fps: 24,
      });
      downloadFCPXML(
        xml,
        `${(project.title || "Director_AI_Sequence").replace(/\s+/g, "_")}.fcpxml`
      );
      setExportNotice("FCPXML v1.9 exported successfully!");
    } catch (err: any) {
      setExportNotice(`Export error: ${err.message}`);
    } finally {
      setTimeout(() => {
        setIsExporting(false);
        setExportNotice(null);
      }, 3500);
    }
  };

  const handleExportManifest = () => {
    if (!project) return;
    const manifest = {
      projectTitle: project.title,
      aspectRatio: project.aspectRatio || "9:16",
      exportedAt: new Date().toISOString(),
      scenes: playableScenes.map((s) => ({
        sceneId: s.sceneId,
        order: s.order,
        duration: s.duration,
        cameraAngle: s.cameraAngle,
        activeVideoUrl: s.videoUrl,
        keyframeUrl: s.firstFrameUrl,
        takeNumber: s.takeNumber,
        model: s.model,
        action: s.rawDelta,
      })),
    };

    const blob = new Blob([JSON.stringify(manifest, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${(project.title || "sequence").replace(/\s+/g, "_")}_manifest.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (isLoading) {
    return (
      <div className="flex flex-col h-screen w-full bg-zinc-950 items-center justify-center text-zinc-500 font-mono text-xs">
        <Loader2 className="w-5 h-5 animate-spin mb-2" />
        <span>Loading Playback &amp; Export Engine...</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen w-full bg-zinc-950 text-zinc-100 select-none overflow-hidden">
      {/* Studio Stage Stepper Navigation Header */}
      <StageHeader
        projectId={id}
        projectTitle={project?.title}
        activeStage="export"
        sceneCount={scenes.length}
        onOpenSettings={() => setIsSettingsOpen(true)}
      />

      {/* Main Playback & Export Engine Studio */}
      <main className="flex-1 flex flex-col lg:flex-row overflow-hidden bg-zinc-950">
        {/* Left / Center: Docked Sequential Video Player */}
        <div className="flex-1 flex flex-col justify-between p-6 overflow-hidden border-b lg:border-b-0 lg:border-r border-zinc-800">
          {/* Main Stage Display (9:16 Cinema Player) */}
          <div className="flex-1 flex items-center justify-center relative min-h-0 py-2">
            <div className="relative aspect-[9/16] h-full max-h-[620px] bg-zinc-900 rounded-md overflow-hidden border border-zinc-800 shadow-2xl flex items-center justify-center group">
              {currentScene?.videoUrl ? (
                <video
                  ref={videoRef}
                  key={currentScene.videoUrl}
                  src={currentScene.videoUrl}
                  className="w-full h-full object-cover"
                  autoPlay={isPlaying}
                  muted={isMuted}
                  playsInline
                  onEnded={handleVideoEnded}
                />
              ) : currentScene?.firstFrameUrl ? (
                <div className="w-full h-full relative">
                  <img
                    src={currentScene.firstFrameUrl}
                    alt={currentScene.title}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center p-4 text-center">
                    <Film className="w-8 h-8 text-zinc-400 mb-2" />
                    <span className="text-xs font-mono text-zinc-200">Keyframe Staged</span>
                    <span className="text-[10px] text-zinc-400">Video clip pending execution</span>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center text-zinc-600 p-6 text-center">
                  <Film className="w-12 h-12 stroke-[1.2] text-zinc-700 mb-2" />
                  <span className="text-xs font-mono text-zinc-400">Scene {currentIndex + 1} Empty</span>
                </div>
              )}

              {/* Watermarks */}
              <div className="absolute top-3 left-3 px-2 py-0.5 rounded bg-zinc-950/80 border border-zinc-800 text-[10px] font-mono text-zinc-300">
                SCENE {String(currentIndex + 1).padStart(2, "0")} / {playableScenes.length}
              </div>

              {currentScene?.takeNumber && (
                <div className="absolute top-3 right-3 px-2 py-0.5 rounded bg-zinc-950/80 border border-zinc-800 text-[10px] font-mono text-zinc-300">
                  Take {currentScene.takeNumber} • {currentScene.model}
                </div>
              )}
            </div>
          </div>

          {/* Sequential Playback Controls Bar */}
          <div className="mt-4 p-3 bg-zinc-900 border border-zinc-800 rounded-md flex flex-col gap-3">
            {/* Scrubber Timeline Strip */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 custom-scrollbar">
              {playableScenes.map((scene, idx) => {
                const isSelected = idx === currentIndex;
                const hasVideo = Boolean(scene.videoUrl);

                return (
                  <button
                    key={scene.sceneId}
                    onClick={() => {
                      setCurrentIndex(idx);
                      setIsPlaying(true);
                    }}
                    className={`h-9 px-3 rounded text-[11px] font-mono flex items-center gap-1.5 shrink-0 border transition-all ${
                      isSelected
                        ? "bg-zinc-100 text-zinc-950 font-bold border-white shadow-sm"
                        : hasVideo
                        ? "bg-zinc-950 text-zinc-300 border-zinc-700 hover:border-zinc-500"
                        : "bg-zinc-950/50 text-zinc-600 border-zinc-800"
                    }`}
                  >
                    <span>{idx + 1}</span>
                    <span className="truncate max-w-[80px]">
                      {scene.title || `Scene ${idx + 1}`}
                    </span>
                    {hasVideo && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />}
                  </button>
                );
              })}
            </div>

            {/* Playback Buttons */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <button
                  onClick={handlePrev}
                  disabled={currentIndex === 0}
                  className="w-8 h-8 rounded bg-zinc-950 border border-zinc-800 hover:bg-zinc-800 text-zinc-300 disabled:opacity-40 flex items-center justify-center transition-colors"
                  title="Previous Scene"
                >
                  <SkipBack className="w-4 h-4" />
                </button>

                <button
                  onClick={togglePlay}
                  className="w-9 h-9 rounded bg-zinc-100 hover:bg-white text-zinc-950 flex items-center justify-center font-semibold shadow-sm transition-colors"
                  title={isPlaying ? "Pause" : "Play Sequential Timeline"}
                >
                  {isPlaying ? (
                    <Pause className="w-4 h-4" />
                  ) : (
                    <Play className="w-4 h-4 ml-0.5" />
                  )}
                </button>

                <button
                  onClick={handleNext}
                  disabled={currentIndex >= playableScenes.length - 1}
                  className="w-8 h-8 rounded bg-zinc-950 border border-zinc-800 hover:bg-zinc-800 text-zinc-300 disabled:opacity-40 flex items-center justify-center transition-colors"
                  title="Next Scene"
                >
                  <SkipForward className="w-4 h-4" />
                </button>

                <span className="text-xs font-mono text-zinc-400 ml-2">
                  {currentScene ? `${currentScene.duration}s • ${currentScene.cameraAngle}` : "0s"}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsMuted(!isMuted)}
                  className="w-8 h-8 rounded bg-zinc-950 border border-zinc-800 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 flex items-center justify-center transition-colors"
                  title={isMuted ? "Unmute" : "Mute"}
                >
                  {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Export & Master Panel */}
        <div className="w-full lg:w-96 p-6 flex flex-col justify-between space-y-6 overflow-y-auto custom-scrollbar">
          <div className="space-y-6">
            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-zinc-900 border border-zinc-800 text-[10px] font-mono uppercase tracking-wider text-zinc-400 mb-2">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                <span>NLE Master Engine</span>
              </div>
              <h2 className="text-base font-semibold text-zinc-100 tracking-tight">
                Export &amp; Local File Sync
              </h2>
              <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
                Compile active takes into professional non-linear editor timelines with automated punch-in framing scale transforms.
              </p>
            </div>

            {/* Sequence Metrics */}
            <div className="p-4 bg-zinc-900 border border-zinc-800 rounded-md space-y-2.5">
              <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-500 block">
                Sequence Specifications
              </span>
              <div className="flex justify-between text-xs font-mono">
                <span className="text-zinc-400">Total Scenes:</span>
                <span className="text-zinc-200">{playableScenes.length}</span>
              </div>
              <div className="flex justify-between text-xs font-mono">
                <span className="text-zinc-400">Rendered Video Takes:</span>
                <span className="text-zinc-200">
                  {scenesWithVideo.length} / {playableScenes.length}
                </span>
              </div>
              <div className="flex justify-between text-xs font-mono">
                <span className="text-zinc-400">Total Run Time:</span>
                <span className="text-zinc-200">
                  {playableScenes.reduce((acc, s) => acc + s.duration, 0)} seconds
                </span>
              </div>
              <div className="flex justify-between text-xs font-mono">
                <span className="text-zinc-400">Resolution &amp; FPS:</span>
                <span className="text-zinc-200">1080x1920 (9:16) @ 24fps</span>
              </div>
            </div>

            {/* Export Notice Banner */}
            {exportNotice && (
              <div className="p-3 bg-zinc-900 border border-zinc-700 rounded-md text-xs font-mono text-zinc-200 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>{exportNotice}</span>
              </div>
            )}

            {/* Primary Action Buttons */}
            <div className="space-y-3">
              {/* Apple Final Cut Pro XML Export Wizard */}
              <button
                onClick={() => setIsExportWizardOpen(true)}
                className="w-full h-10 rounded-md bg-zinc-100 text-zinc-950 hover:bg-white text-xs font-semibold flex items-center justify-center gap-2 transition-colors shadow-sm"
              >
                <Download className="w-4 h-4" />
                <span>Launch FCPXML Export Wizard (.fcpxml)</span>
              </button>

              {/* JSON Manifest Export */}
              <button
                onClick={handleExportManifest}
                className="w-full h-9 rounded-md bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 hover:text-white text-xs font-mono flex items-center justify-center gap-2 transition-colors"
              >
                <FileText className="w-3.5 h-3.5" />
                <span>Download Sequence Manifest (.json)</span>
              </button>
            </div>
          </div>

          {/* Quick Back to Timeline link */}
          <div className="pt-4 border-t border-zinc-800/80 flex items-center justify-between text-xs font-mono text-zinc-500">
            <Link
              href={`/project/${id}/pipeline`}
              className="text-zinc-400 hover:text-zinc-200 flex items-center gap-1.5 transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Timeline Composer</span>
            </Link>
            <span>v2.0 Master</span>
          </div>
        </div>
      </main>

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
      />

      <FCPXMLExportWizard
        isOpen={isExportWizardOpen}
        onClose={() => setIsExportWizardOpen(false)}
        projectName={project?.title || "Director_AI_Sequence"}
        scenes={scenes}
        fps={24}
      />
    </div>
  );
}
