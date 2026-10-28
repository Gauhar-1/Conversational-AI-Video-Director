"use client";

/**
 * @file src/components/export/SequentialVideoPlayer.tsx
 * @description Decoupled Sequential Video Player for Stage 4 (Master Export).
 * Seamlessly swaps video elements on the 'onEnded' event without full FFmpeg client-side rendering.
 * Optimized with Next.js Image for poster keyframes and lazy loaded for low-end device performance.
 */

import React, { useRef } from "react";
import Image from "next/image";
import { 
  Play, Pause, SkipBack, SkipForward, 
  Film, Volume2, VolumeX, Maximize2 
} from "lucide-react";

export interface PlayableSceneItem {
  sceneId: string;
  order: number;
  title: string;
  duration: number;
  cameraAngle?: string;
  videoUrl: string;
  firstFrameUrl?: string;
  takeNumber?: number;
  model?: string;
  rawDelta?: string;
}

interface SequentialVideoPlayerProps {
  playableScenes: PlayableSceneItem[];
  currentIndex: number;
  onSelectScene: (index: number) => void;
  isPlaying: boolean;
  onTogglePlay: () => void;
  isMuted: boolean;
  onToggleMute: () => void;
  onPrev: () => void;
  onNext: () => void;
  onVideoEnded: () => void;
}

export function SequentialVideoPlayer({
  playableScenes,
  currentIndex,
  onSelectScene,
  isPlaying,
  onTogglePlay,
  isMuted,
  onToggleMute,
  onPrev,
  onNext,
  onVideoEnded,
}: SequentialVideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const currentScene = playableScenes[currentIndex] || null;

  return (
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
              onEnded={onVideoEnded}
            />
          ) : currentScene?.firstFrameUrl ? (
            <div className="w-full h-full relative">
              <Image
                src={currentScene.firstFrameUrl}
                alt={currentScene.title}
                fill
                sizes="(max-width: 768px) 100vw, 400px"
                className="object-cover"
                unoptimized={currentScene.firstFrameUrl.startsWith("data:")}
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
                onClick={() => onSelectScene(idx)}
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
              onClick={onPrev}
              disabled={currentIndex === 0}
              className="w-8 h-8 rounded bg-zinc-950 border border-zinc-800 hover:bg-zinc-800 text-zinc-300 disabled:opacity-40 flex items-center justify-center transition-colors"
              title="Previous Scene"
            >
              <SkipBack className="w-4 h-4" />
            </button>

            <button
              onClick={onTogglePlay}
              className="w-9 h-9 rounded bg-zinc-100 hover:bg-white text-zinc-950 flex items-center justify-center font-semibold shadow-sm transition-colors"
              title={isPlaying ? "Pause" : "Play Sequential Timeline"}
            >
              {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
            </button>

            <button
              onClick={onNext}
              disabled={currentIndex === playableScenes.length - 1}
              className="w-8 h-8 rounded bg-zinc-950 border border-zinc-800 hover:bg-zinc-800 text-zinc-300 disabled:opacity-40 flex items-center justify-center transition-colors"
              title="Next Scene"
            >
              <SkipForward className="w-4 h-4" />
            </button>
          </div>

          <div className="text-xs font-mono text-zinc-400">
            {currentScene?.duration || 10}s • {currentScene?.cameraAngle || "CAM_A_CENTER"}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onToggleMute}
              className="w-8 h-8 rounded bg-zinc-950 border border-zinc-800 hover:bg-zinc-800 text-zinc-300 flex items-center justify-center transition-colors"
              title={isMuted ? "Unmute" : "Mute Audio"}
            >
              {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </button>

            <button
              onClick={() => {
                if (videoRef.current?.requestFullscreen) {
                  videoRef.current.requestFullscreen();
                }
              }}
              className="w-8 h-8 rounded bg-zinc-950 border border-zinc-800 hover:bg-zinc-800 text-zinc-300 flex items-center justify-center transition-colors"
              title="Fullscreen"
            >
              <Maximize2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default SequentialVideoPlayer;
