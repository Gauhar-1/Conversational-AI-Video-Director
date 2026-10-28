"use client";

/**
 * @file src/components/casting/CastingWizard.tsx
 * @description The Casting & Scouting Wizard interface (Stage 2).
 * A clean e-commerce grid for generating, reviewing, and approving static references.
 * Features large prompt inputs with Groq enrichment, paste support, and optimistic approval state.
 * Strictly adheres to monochromatic zinc studio design.
 */

import { useState } from "react";
import { 
  Users, Mountain, Plus, Sparkles, 
  CheckCircle2, ArrowRight, ShieldCheck, X, Loader2 
} from "lucide-react";
import { CharacterCard } from "./CharacterCard";
import { LocationCard } from "./LocationCard";
import type { CharacterAsset, LocationAsset, GlobalAssets } from "@/lib/validations/project";
import {
  generateCharacterAssetAction,
  approveCharacterAssetAction,
  deleteCharacterAssetAction,
  generateLocationAssetAction,
  approveLocationAssetAction,
  deleteLocationAssetAction,
  updateCharacterPromptAction,
  updateLocationPromptAction,
} from "@/actions/assets";

interface CastingWizardProps {
  projectId: string;
  initialAssets: GlobalAssets;
  onProceedToTimeline: () => void;
}

export function CastingWizard({
  projectId,
  initialAssets,
  onProceedToTimeline,
}: CastingWizardProps) {
  const [activeTab, setActiveTab] = useState<"characters" | "locations">("characters");
  const [assets, setAssets] = useState<GlobalAssets>(initialAssets);
  const [generatingId, setGeneratingId] = useState<string | null>(null);

  // New character modal state
  const [isAddCharOpen, setIsAddCharOpen] = useState(false);
  const [newCharName, setNewCharName] = useState("");
  const [newCharRole, setNewCharRole] = useState("Lead");
  const [newCharPrompt, setNewCharPrompt] = useState("");
  const [isEnrichingChar, setIsEnrichingChar] = useState(false);

  // New location modal state
  const [isAddLocOpen, setIsAddLocOpen] = useState(false);
  const [newLocName, setNewLocName] = useState("");
  const [newLocPrompt, setNewLocPrompt] = useState("");
  const [newLocLighting, setNewLocLighting] = useState("Cinematic atmospheric lighting");
  const [isEnrichingLoc, setIsEnrichingLoc] = useState(false);

  const characters = assets.characters || [];
  const locations = assets.locations || [];

  const approvedCharsCount = characters.filter((c) => c.status === "approved").length;
  const approvedLocsCount = locations.filter((l) => l.status === "approved").length;

  // Character Prompt Enrichment
  const handleEnrichNewCharPrompt = async () => {
    if (!newCharPrompt.trim() || isEnrichingChar) return;
    setIsEnrichingChar(true);
    try {
      const groqKey = typeof window !== "undefined" ? localStorage.getItem("groq_api_key") : null;
      const res = await fetch("/api/enrich-prompt", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(groqKey ? { "X-Groq-Key": groqKey } : {}),
        },
        body: JSON.stringify({
          prompt: newCharPrompt,
          type: "character",
        }),
      });

      if (!res.ok) throw new Error("Failed to enrich prompt");
      const data = await res.json();
      if (data.enrichedPrompt) {
        setNewCharPrompt(data.enrichedPrompt);
      }
    } catch (err) {
      console.error("Enrich error:", err);
    } finally {
      setIsEnrichingChar(false);
    }
  };

  // Location Prompt Enrichment
  const handleEnrichNewLocPrompt = async () => {
    if (!newLocPrompt.trim() || isEnrichingLoc) return;
    setIsEnrichingLoc(true);
    try {
      const groqKey = typeof window !== "undefined" ? localStorage.getItem("groq_api_key") : null;
      const res = await fetch("/api/enrich-prompt", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(groqKey ? { "X-Groq-Key": groqKey } : {}),
        },
        body: JSON.stringify({
          prompt: newLocPrompt,
          type: "location",
        }),
      });

      if (!res.ok) throw new Error("Failed to enrich prompt");
      const data = await res.json();
      if (data.enrichedPrompt) {
        setNewLocPrompt(data.enrichedPrompt);
      }
    } catch (err) {
      console.error("Enrich error:", err);
    } finally {
      setIsEnrichingLoc(false);
    }
  };

  // Character Handlers
  const handleGenerateCharacter = async (
    char: CharacterAsset,
    newPrompt?: string,
    seed?: number
  ) => {
    setGeneratingId(char.assetId);
    try {
      const updated = await generateCharacterAssetAction(projectId, {
        name: char.name,
        role: char.role,
        appearancePrompt: newPrompt || char.appearancePrompt,
        pulidSeed: seed || char.pulidSeed,
      });

      setAssets((prev) => ({
        ...prev,
        characters: prev.characters.map((c) =>
          c.assetId === char.assetId ? { ...c, ...updated } : c
        ),
      }));
    } catch (err: any) {
      alert(err.message || "Failed to generate character plate.");
    } finally {
      setGeneratingId(null);
    }
  };

  const handleApproveCharacter = async (assetId: string, approvedImageUrl: string) => {
    setAssets((prev) => ({
      ...prev,
      characters: prev.characters.map((c) =>
        c.assetId === assetId ? { ...c, imageUrl: approvedImageUrl, status: "approved" as const } : c
      ),
    }));

    try {
      await approveCharacterAssetAction(projectId, assetId, approvedImageUrl);
    } catch (err: any) {
      alert(err.message || "Failed to approve character.");
    }
  };

  const handleDeleteCharacter = async (assetId: string) => {
    setAssets((prev) => ({
      ...prev,
      characters: prev.characters.filter((c) => c.assetId !== assetId),
    }));
    await deleteCharacterAssetAction(projectId, assetId);
  };

  const handleAddCharacterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCharName.trim() || !newCharPrompt.trim()) return;

    setIsAddCharOpen(false);
    const tempId = `temp-${Date.now()}`;
    setGeneratingId(tempId);

    try {
      const created = await generateCharacterAssetAction(projectId, {
        name: newCharName,
        role: newCharRole,
        appearancePrompt: newCharPrompt,
        pulidSeed: 42,
      });

      setAssets((prev) => ({
        ...prev,
        characters: [...prev.characters, created],
      }));
      setNewCharName("");
      setNewCharPrompt("");
    } catch (err: any) {
      alert(err.message || "Failed to create character.");
    } finally {
      setGeneratingId(null);
    }
  };

  // Location Handlers
  const handleGenerateLocation = async (
    loc: LocationAsset,
    newPrompt?: string,
    lighting?: string
  ) => {
    setGeneratingId(loc.assetId);
    try {
      const updated = await generateLocationAssetAction(projectId, {
        name: loc.name,
        environmentPrompt: newPrompt || loc.environmentPrompt,
        lightingProfile: lighting || loc.lightingProfile,
      });

      setAssets((prev) => ({
        ...prev,
        locations: prev.locations.map((l) =>
          l.assetId === loc.assetId ? { ...l, ...updated } : l
        ),
      }));
    } catch (err: any) {
      alert(err.message || "Failed to generate location plate.");
    } finally {
      setGeneratingId(null);
    }
  };

  const handleApproveLocation = async (assetId: string, approvedImageUrl: string) => {
    setAssets((prev) => ({
      ...prev,
      locations: prev.locations.map((l) =>
        l.assetId === assetId ? { ...l, imageUrl: approvedImageUrl, status: "approved" as const } : l
      ),
    }));

    try {
      await approveLocationAssetAction(projectId, assetId, approvedImageUrl);
    } catch (err: any) {
      alert(err.message || "Failed to approve location.");
    }
  };

  const handleDeleteLocation = async (assetId: string) => {
    setAssets((prev) => ({
      ...prev,
      locations: prev.locations.filter((l) => l.assetId !== assetId),
    }));
    await deleteLocationAssetAction(projectId, assetId);
  };

  const handleAddLocationSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLocName.trim() || !newLocPrompt.trim()) return;

    setIsAddLocOpen(false);
    const tempId = `temp-${Date.now()}`;
    setGeneratingId(tempId);

    try {
      const created = await generateLocationAssetAction(projectId, {
        name: newLocName,
        environmentPrompt: newLocPrompt,
        lightingProfile: newLocLighting,
      });

      setAssets((prev) => ({
        ...prev,
        locations: [...prev.locations, created],
      }));
      setNewLocName("");
      setNewLocPrompt("");
    } catch (err: any) {
      alert(err.message || "Failed to create location plate.");
    } finally {
      setGeneratingId(null);
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-zinc-950 text-zinc-100">
      {/* Subheader: Tabs, Approval Count, and Add Button */}
      <div className="h-12 border-b border-zinc-800 bg-zinc-950 px-6 flex items-center justify-between shrink-0">
        {/* Navigation Tabs */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => setActiveTab("characters")}
            className={`flex items-center gap-2 px-3 py-1.5 rounded text-xs font-mono transition-all ${
              activeTab === "characters"
                ? "bg-zinc-800 text-zinc-100 font-semibold"
                : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Characters ({characters.length})</span>
            {approvedCharsCount > 0 && (
              <span className="w-4 h-4 rounded-full bg-zinc-700 text-[10px] flex items-center justify-center font-sans">
                {approvedCharsCount}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab("locations")}
            className={`flex items-center gap-2 px-3 py-1.5 rounded text-xs font-mono transition-all ${
              activeTab === "locations"
                ? "bg-zinc-800 text-zinc-100 font-semibold"
                : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            <Mountain className="w-3.5 h-3.5" />
            <span>Locations ({locations.length})</span>
            {approvedLocsCount > 0 && (
              <span className="w-4 h-4 rounded-full bg-zinc-700 text-[10px] flex items-center justify-center font-sans">
                {approvedLocsCount}
              </span>
            )}
          </button>
        </div>

        {/* Right Action: Add New Anchor */}
        <div className="flex items-center gap-2">
          {activeTab === "characters" ? (
            <button
              onClick={() => setIsAddCharOpen(true)}
              className="h-7 px-2.5 rounded bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-200 text-xs font-mono flex items-center gap-1.5 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Character</span>
            </button>
          ) : (
            <button
              onClick={() => setIsAddLocOpen(true)}
              className="h-7 px-2.5 rounded bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-200 text-xs font-mono flex items-center gap-1.5 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Location</span>
            </button>
          )}
        </div>
      </div>

      {/* Main E-Commerce Card Grid */}
      <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
        {activeTab === "characters" ? (
          characters.length === 0 ? (
            <div className="h-64 flex flex-col items-center justify-center text-center p-6 border border-dashed border-zinc-800 rounded-md">
              <Users className="w-10 h-10 text-zinc-600 mb-3" />
              <h3 className="text-sm font-semibold text-zinc-300 mb-1">No Characters Added Yet</h3>
              <p className="text-xs text-zinc-500 max-w-sm mb-4">
                Parse a screenplay in the Writer&apos;s Room or click below to cast your first protagonist.
              </p>
              <button
                onClick={() => setIsAddCharOpen(true)}
                className="h-8 px-3 rounded bg-zinc-100 text-zinc-950 text-xs font-semibold hover:bg-white"
              >
                Cast Lead Character
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {characters.map((char) => (
                <CharacterCard
                  key={char.assetId}
                  character={char}
                  onGenerate={handleGenerateCharacter}
                  onApprove={handleApproveCharacter}
                  onSavePrompt={async (assetId, prompt) => {
                    await updateCharacterPromptAction(projectId, assetId, prompt);
                  }}
                  onDelete={handleDeleteCharacter}
                  isGenerating={generatingId === char.assetId}
                />
              ))}
            </div>
          )
        ) : locations.length === 0 ? (
          <div className="h-64 flex flex-col items-center justify-center text-center p-6 border border-dashed border-zinc-800 rounded-md">
            <Mountain className="w-10 h-10 text-zinc-600 mb-3" />
            <h3 className="text-sm font-semibold text-zinc-300 mb-1">No Locations Scouted Yet</h3>
            <p className="text-xs text-zinc-500 max-w-sm mb-4">
              Add environmental backdrops to serve as spatial anchors across all timeline scenes.
            </p>
            <button
              onClick={() => setIsAddLocOpen(true)}
              className="h-8 px-3 rounded bg-zinc-100 text-zinc-950 text-xs font-semibold hover:bg-white"
            >
              Scout Location
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {locations.map((loc) => (
              <LocationCard
                key={loc.assetId}
                location={loc}
                onGenerate={handleGenerateLocation}
                onApprove={handleApproveLocation}
                onSavePrompt={async (assetId, prompt, lighting) => {
                  await updateLocationPromptAction(projectId, assetId, prompt, lighting);
                }}
                onDelete={handleDeleteLocation}
                isGenerating={generatingId === loc.assetId}
              />
            ))}
          </div>
        )}
      </div>

      {/* Floating Bottom Status & Progression Bar */}
      <div className="h-14 border-t border-zinc-800 bg-zinc-950/95 backdrop-blur-md px-6 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3 text-xs font-mono text-zinc-400">
          <span className="flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-zinc-300" />
            <span>
              {approvedCharsCount}/{characters.length} Characters Approved
            </span>
          </span>
          <span className="text-zinc-700">•</span>
          <span className="flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-zinc-300" />
            <span>
              {approvedLocsCount}/{locations.length} Locations Approved
            </span>
          </span>
        </div>

        <button
          onClick={onProceedToTimeline}
          className="h-8 px-4 rounded bg-zinc-100 text-zinc-950 hover:bg-white text-xs font-semibold flex items-center gap-2 transition-colors shadow-sm"
        >
          <span>Lock References &amp; Enter Timeline</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Modal: Add Character with Large Textarea & Groq Enrichment */}
      {isAddCharOpen && (
        <div className="fixed inset-0 bg-zinc-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="w-full max-w-lg bg-zinc-900 border border-zinc-800 rounded-md p-5 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
              <h3 className="text-sm font-semibold text-zinc-100">Cast New Character</h3>
              <button
                onClick={() => setIsAddCharOpen(false)}
                className="text-zinc-500 hover:text-zinc-300"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddCharacterSubmit} className="mt-4 space-y-3">
              <div>
                <label className="block text-[11px] font-mono text-zinc-400 mb-1">
                  Character Name
                </label>
                <input
                  type="text"
                  required
                  value={newCharName}
                  onChange={(e) => setNewCharName(e.target.value)}
                  placeholder="e.g. Commander Sarah Vance"
                  className="w-full bg-zinc-950 border border-zinc-700 rounded px-2.5 py-1.5 text-xs text-zinc-100 outline-none focus:border-zinc-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-mono text-zinc-400 mb-1">
                  Narrative Role
                </label>
                <select
                  value={newCharRole}
                  onChange={(e) => setNewCharRole(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-700 rounded px-2.5 py-1.5 text-xs text-zinc-100 outline-none focus:border-zinc-500"
                >
                  <option value="Lead">Lead Protagonist</option>
                  <option value="Antagonist">Antagonist</option>
                  <option value="Supporting">Supporting</option>
                  <option value="Extra">Background Character</option>
                </select>
              </div>

              {/* Large Textarea with Enrichment & Paste Support */}
              <div>
                <label className="block text-[11px] font-mono text-zinc-400 mb-1">
                  Appearance Conditioning Prompt
                </label>
                <textarea
                  required
                  value={newCharPrompt}
                  onChange={(e) => setNewCharPrompt(e.target.value)}
                  placeholder="Paste or write detailed appearance conditioning prompt: ethnicity, facial geometry, hairstyle, wardrobe, lighting, 8k..."
                  className="w-full min-h-[160px] p-4 text-sm leading-relaxed resize-y bg-zinc-900 border border-zinc-700 rounded-md text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-zinc-500 overflow-y-auto custom-scrollbar font-sans"
                />
                
                {/* Enrichment Action Directly Below Textarea */}
                <div className="flex items-center justify-between pt-1.5">
                  <button
                    type="button"
                    onClick={handleEnrichNewCharPrompt}
                    disabled={isEnrichingChar || !newCharPrompt.trim()}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 text-xs font-mono transition-colors disabled:opacity-50"
                  >
                    {isEnrichingChar ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-zinc-300" />
                        <span>Enriching via Groq...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-3.5 h-3.5 text-zinc-300" />
                        <span>Enrich Prompt</span>
                      </>
                    )}
                  </button>
                  <span className="text-[10px] font-mono text-zinc-500">Paste external prompts supported</span>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => setIsAddCharOpen(false)}
                  className="px-3 py-1.5 rounded bg-zinc-800 text-zinc-300 text-xs hover:bg-zinc-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!newCharName.trim() || !newCharPrompt.trim()}
                  className="px-3.5 py-1.5 rounded bg-zinc-100 text-zinc-950 text-xs font-semibold hover:bg-white disabled:opacity-50"
                >
                  Generate Reference Sheet
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Add Location with Large Textarea & Groq Enrichment */}
      {isAddLocOpen && (
        <div className="fixed inset-0 bg-zinc-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="w-full max-w-lg bg-zinc-900 border border-zinc-800 rounded-md p-5 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
              <h3 className="text-sm font-semibold text-zinc-100">Scout New Location</h3>
              <button
                onClick={() => setIsAddLocOpen(false)}
                className="text-zinc-500 hover:text-zinc-300"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddLocationSubmit} className="mt-4 space-y-3">
              <div>
                <label className="block text-[11px] font-mono text-zinc-400 mb-1">
                  Location Name
                </label>
                <input
                  type="text"
                  required
                  value={newLocName}
                  onChange={(e) => setNewLocName(e.target.value)}
                  placeholder="e.g. Cyberpunk Alleyway Night"
                  className="w-full bg-zinc-950 border border-zinc-700 rounded px-2.5 py-1.5 text-xs text-zinc-100 outline-none focus:border-zinc-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-mono text-zinc-400 mb-1">
                  Lighting Profile
                </label>
                <input
                  type="text"
                  value={newLocLighting}
                  onChange={(e) => setNewLocLighting(e.target.value)}
                  placeholder="e.g. High contrast neon rim lighting, wet reflections"
                  className="w-full bg-zinc-950 border border-zinc-700 rounded px-2.5 py-1.5 text-xs text-zinc-100 outline-none focus:border-zinc-500"
                />
              </div>

              {/* Large Textarea with Enrichment & Paste Support */}
              <div>
                <label className="block text-[11px] font-mono text-zinc-400 mb-1">
                  Environment Prompt
                </label>
                <textarea
                  required
                  value={newLocPrompt}
                  onChange={(e) => setNewLocPrompt(e.target.value)}
                  placeholder="Paste or write detailed environment prompt: architectural details, volumetric lighting, empty of people, 16:9 matte plate..."
                  className="w-full min-h-[160px] p-4 text-sm leading-relaxed resize-y bg-zinc-900 border border-zinc-700 rounded-md text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-zinc-500 overflow-y-auto custom-scrollbar font-sans"
                />
                
                {/* Enrichment Action Directly Below Textarea */}
                <div className="flex items-center justify-between pt-1.5">
                  <button
                    type="button"
                    onClick={handleEnrichNewLocPrompt}
                    disabled={isEnrichingLoc || !newLocPrompt.trim()}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 text-xs font-mono transition-colors disabled:opacity-50"
                  >
                    {isEnrichingLoc ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-zinc-300" />
                        <span>Enriching via Groq...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-3.5 h-3.5 text-zinc-300" />
                        <span>Enrich Prompt</span>
                      </>
                    )}
                  </button>
                  <span className="text-[10px] font-mono text-zinc-500">Paste external prompts supported</span>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => setIsAddLocOpen(false)}
                  className="px-3 py-1.5 rounded bg-zinc-800 text-zinc-300 text-xs hover:bg-zinc-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!newLocName.trim() || !newLocPrompt.trim()}
                  className="px-3.5 py-1.5 rounded bg-zinc-100 text-zinc-950 text-xs font-semibold hover:bg-white disabled:opacity-50"
                >
                  Generate Background Plate
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
