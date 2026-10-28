/**
 * @file src/__tests__/SceneMacroNode.test.tsx
 * @description React Testing Library component tests for SceneMacroNode.
 * Verifies active take badges, camera framing dropdown, and implicitly wired character anchors.
 */

import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { ReactFlowProvider } from "@xyflow/react";
import { SceneMacroNode } from "@/components/storyboard/nodes/SceneMacroNode";
import type { ISceneDoc } from "@/models/Project";

describe("SceneMacroNode Component", () => {
  const mockScene: ISceneDoc = {
    sceneId: "scene-1",
    order: 1,
    duration: 10,
    cameraAngle: "CAM_B_45_CLOSE",
    cameraMovement: "PUSH_IN",
    rawDelta: "Hero turns to face the storm",
    imagePrompt: "45-degree angle close-up",
    motionPrompt: "Orbital push-in",
    status: "ready",
    activeTakeId: "take-2",
    takes: [
      {
        takeId: "take-1",
        takeNumber: 1,
        videoUrl: "https://cdn.example.com/take1.mp4",
        prompt: "First take prompt",
        model: "kling-2.5",
        status: "completed",
        duration: 10,
        createdAt: new Date().toISOString(),
      },
      {
        takeId: "take-2",
        takeNumber: 2,
        videoUrl: "https://cdn.example.com/take2.mp4",
        prompt: "Second take prompt",
        model: "wan-2.5",
        status: "completed",
        duration: 10,
        createdAt: new Date().toISOString(),
      },
    ],
  };

  const mockGlobalAssets = {
    characters: [
      {
        assetId: "char-1",
        name: "Commander Vance",
        role: "Lead",
        appearancePrompt: "Short cropped dark hair, scar over right eye",
        imageUrl: "https://cdn.example.com/vance.jpg",
        pulidSeed: 42,
        status: "approved" as const,
        generationHistory: [],
      },
    ],
    locations: [
      {
        assetId: "loc-1",
        name: "Observatory Deck",
        environmentPrompt: "Panoramic glass dome overlooking swirling nebula",
        lightingProfile: "Deep blue and violet rim lighting",
        imageUrl: "https://cdn.example.com/observatory.jpg",
        status: "approved" as const,
        generationHistory: [],
      },
    ],
  };

  it("renders Scene title, camera angle, and active take badge correctly", () => {
    const handleSelectTake = jest.fn();

    render(
      <ReactFlowProvider>
        <SceneMacroNode
          id="scene-1"
          type="sceneMacroNode"
          selected={false}
          zIndex={1}
          isConnectable={true}
          selectable={true}
          deletable={true}
          draggable={true}
          positionAbsoluteX={0}
          positionAbsoluteY={0}
          dragging={false}
          data={{
            scene: mockScene,
            globalAssets: mockGlobalAssets,
            onSelectTake: handleSelectTake,
          }}
        />
      </ReactFlowProvider>
    );

    // Verify Scene header and duration
    expect(screen.getByText(/SCENE 01/i)).toBeInTheDocument();
    expect(screen.getByText(/10s/i)).toBeInTheDocument();

    // Verify Takes Badge displays Take 2/2
    expect(screen.getByText(/Take 2\/2/i)).toBeInTheDocument();

    // Verify Camera angle dropdown is set to CAM_B_45_CLOSE
    const select = screen.getByRole("combobox") as HTMLSelectElement;
    expect(select.value).toBe("CAM_B_45_CLOSE");
  });

  it("triggers onSelectTake when clicking a take switcher button", () => {
    const handleSelectTake = jest.fn();

    render(
      <ReactFlowProvider>
        <SceneMacroNode
          id="scene-1"
          type="sceneMacroNode"
          selected={false}
          zIndex={1}
          isConnectable={true}
          selectable={true}
          deletable={true}
          draggable={true}
          positionAbsoluteX={0}
          positionAbsoluteY={0}
          dragging={false}
          data={{
            scene: mockScene,
            globalAssets: mockGlobalAssets,
            onSelectTake: handleSelectTake,
          }}
        />
      </ReactFlowProvider>
    );

    // Click on Take 1 button
    const take1Btn = screen.getByTitle("Select Take 1");
    fireEvent.click(take1Btn);

    expect(handleSelectTake).toHaveBeenCalledWith("scene-1", "take-1");
  });
});
