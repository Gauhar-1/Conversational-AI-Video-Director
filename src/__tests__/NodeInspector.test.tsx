/**
 * @file src/__tests__/NodeInspector.test.tsx
 * @description React Testing Library component tests for NodeInspector (InspectorDrawer).
 * Verifies the Takes variation engine, active take designation, and take deletion.
 */

import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import NodeInspector from "@/components/storyboard/NodeInspector";
import type { ISceneDoc } from "@/models/Project";

describe("NodeInspector Component (Takes Variation Engine)", () => {
  const mockScene: ISceneDoc = {
    sceneId: "scene-1",
    order: 1,
    duration: 10,
    cameraAngle: "CAM_A_CENTER",
    rawDelta: "Cinematic establishing action",
    imagePrompt: "Master establishing frame",
    motionPrompt: "Center push in",
    status: "ready",
    activeTakeId: "take-2",
    takes: [
      {
        takeId: "take-1",
        takeNumber: 1,
        videoUrl: "https://cdn.example.com/take1.mp4",
        prompt: "First take prompt variation",
        model: "kling-2.5",
        status: "completed",
        duration: 10,
        createdAt: new Date().toISOString(),
      },
      {
        takeId: "take-2",
        takeNumber: 2,
        videoUrl: "https://cdn.example.com/take2.mp4",
        prompt: "Second take prompt variation",
        model: "wan-2.5",
        status: "completed",
        duration: 10,
        createdAt: new Date().toISOString(),
      },
    ],
  };

  it("renders Takes tab and lists all available takes", () => {
    const handleSelectTake = jest.fn();
    const handleDeleteTake = jest.fn();

    render(
      <NodeInspector
        scene={mockScene}
        projectId="proj-1"
        isOpen={true}
        onClose={jest.fn()}
        onUpdateScene={jest.fn()}
        onEnrichDelta={jest.fn()}
        onGenerateVideo={jest.fn()}
        onGenerateFrame={jest.fn()}
        onSelectTake={handleSelectTake}
        onDeleteTake={handleDeleteTake}
      />
    );

    // Verify Takes tab button is present with correct count
    expect(screen.getByRole("button", { name: /Takes \(2\)/i })).toBeInTheDocument();

    // Verify Take 1 and Take 2 are rendered
    expect(screen.getByText("Take 1")).toBeInTheDocument();
    expect(screen.getByText("Take 2")).toBeInTheDocument();

    // Verify Take 2 has the ACTIVE badge
    expect(screen.getByText("ACTIVE")).toBeInTheDocument();
  });

  it("calls onSelectTake when clicking 'Set as Active Take' on an inactive take", () => {
    const handleSelectTake = jest.fn();

    render(
      <NodeInspector
        scene={mockScene}
        projectId="proj-1"
        isOpen={true}
        onClose={jest.fn()}
        onUpdateScene={jest.fn()}
        onEnrichDelta={jest.fn()}
        onGenerateVideo={jest.fn()}
        onGenerateFrame={jest.fn()}
        onSelectTake={handleSelectTake}
      />
    );

    // Find the 'Set as Active Take' button on Take 1
    const setActiveBtn = screen.getByText("Set as Active Take");
    fireEvent.click(setActiveBtn);

    expect(handleSelectTake).toHaveBeenCalledWith("scene-1", "take-1");
  });

  it("calls onDeleteTake when clicking the delete button on a take", () => {
    const handleDeleteTake = jest.fn();

    render(
      <NodeInspector
        scene={mockScene}
        projectId="proj-1"
        isOpen={true}
        onClose={jest.fn()}
        onUpdateScene={jest.fn()}
        onEnrichDelta={jest.fn()}
        onGenerateVideo={jest.fn()}
        onGenerateFrame={jest.fn()}
        onDeleteTake={handleDeleteTake}
      />
    );

    const deleteButtons = screen.getAllByTitle("Delete this take");
    fireEvent.click(deleteButtons[0]);

    expect(handleDeleteTake).toHaveBeenCalledWith("scene-1", "take-1");
  });

  it("renders abstracted read-only character and background avatar pills with Edit in Casting Tab link", () => {
    render(
      <NodeInspector
        scene={mockScene}
        projectId="proj-1"
        isOpen={true}
        globalAssets={{
          characters: [{ assetId: "char-1", name: "Detective Moreau", imageUrl: "https://example.com/moreau.png" }],
          locations: [{ assetId: "loc-1", name: "Rainy Alleyway", imageUrl: "https://example.com/alley.png" }],
        }}
        onClose={jest.fn()}
        onUpdateScene={jest.fn()}
        onEnrichDelta={jest.fn()}
        onGenerateVideo={jest.fn()}
        onGenerateFrame={jest.fn()}
      />
    );

    // Verify avatar pill labels
    expect(screen.getByText("Detective Moreau")).toBeInTheDocument();
    expect(screen.getByText("Rainy Alleyway")).toBeInTheDocument();

    // Verify escape hatch link to Casting stage
    const castingLink = screen.getByRole("link", { name: /Edit in Casting Tab/i });
    expect(castingLink).toBeInTheDocument();
    expect(castingLink).toHaveAttribute("href", "/project/proj-1/casting");
  });

  it("renders Pre-Flight Checklist and First Frame Decision for ungenerated scene", () => {
    const ungeneratedScene: ISceneDoc = {
      ...mockScene,
      videoUrl: "",
      takes: [],
      activeTakeId: "",
    };

    const handleGenerateFrame = jest.fn();
    const handleGenerateVideo = jest.fn();

    render(
      <NodeInspector
        scene={ungeneratedScene}
        projectId="proj-1"
        isOpen={true}
        onClose={jest.fn()}
        onUpdateScene={jest.fn()}
        onEnrichDelta={jest.fn()}
        onGenerateVideo={handleGenerateVideo}
        onGenerateFrame={handleGenerateFrame}
      />
    );

    // Verify Pre-Flight Checklist items
    expect(screen.getByText("Pre-Flight Production Checklist")).toBeInTheDocument();
    expect(screen.getByText("LLM Script Breakdown Loaded")).toBeInTheDocument();
    expect(screen.getByText("Character Locked")).toBeInTheDocument();
    expect(screen.getByText("Environment Locked")).toBeInTheDocument();
    expect(screen.getByText("Camera Framing Configured")).toBeInTheDocument();

    // Verify The First Frame Decision buttons
    const frameBtn = screen.getByRole("button", { name: /Generate First Frame \(Recommended\)/i });
    const modelDecideBtn = screen.getByRole("button", { name: /Let Model Decide \(Fast\)/i });

    expect(frameBtn).toBeInTheDocument();
    expect(modelDecideBtn).toBeInTheDocument();

    // Click Primary Button
    fireEvent.click(frameBtn);
    expect(handleGenerateFrame).toHaveBeenCalledWith("scene-1", expect.any(String));

    // Click Secondary Button
    fireEvent.click(modelDecideBtn);
    expect(handleGenerateVideo).toHaveBeenCalled();
  });

  it("shows Pre-Flight Checklist exclusively in Compose tab and hides it in other tabs", () => {
    const ungeneratedScene: ISceneDoc = {
      ...mockScene,
      videoUrl: "",
      takes: [],
      activeTakeId: "",
    };

    render(
      <NodeInspector
        scene={ungeneratedScene}
        projectId="proj-1"
        isOpen={true}
        onClose={jest.fn()}
        onUpdateScene={jest.fn()}
        onEnrichDelta={jest.fn()}
        onGenerateVideo={jest.fn()}
        onGenerateFrame={jest.fn()}
      />
    );

    // Initial ungenerated scene lands on Compose tab -> Checklist visible
    expect(screen.getByText("Pre-Flight Production Checklist")).toBeInTheDocument();

    // Switch to Prompts tab -> Checklist should NOT be present
    const promptsTabBtn = screen.getByRole("button", { name: /Prompts/i });
    fireEvent.click(promptsTabBtn);
    expect(screen.queryByText("Pre-Flight Production Checklist")).not.toBeInTheDocument();

    // Switch to Render tab -> Checklist should NOT be present
    const renderTabBtn = screen.getByRole("button", { name: /Render/i });
    fireEvent.click(renderTabBtn);
    expect(screen.queryByText("Pre-Flight Production Checklist")).not.toBeInTheDocument();

    // Switch back to Compose tab -> Checklist is present again
    const composeTabBtn = screen.getByRole("button", { name: /Compose/i });
    fireEvent.click(composeTabBtn);
    expect(screen.getByText("Pre-Flight Production Checklist")).toBeInTheDocument();
  });

  it("renders Post-Generation UX: Accept & Next and Iterate & Branch buttons", () => {
    const handleNextScene = jest.fn();
    const handleIterateTake = jest.fn();

    render(
      <NodeInspector
        scene={mockScene}
        projectId="proj-1"
        isOpen={true}
        onClose={jest.fn()}
        onUpdateScene={jest.fn()}
        onEnrichDelta={jest.fn()}
        onGenerateVideo={jest.fn()}
        onGenerateFrame={jest.fn()}
        onNextScene={handleNextScene}
        onIterateTake={handleIterateTake}
      />
    );

    // Verify Active Take Ready header
    expect(screen.getByText("Active Take Ready")).toBeInTheDocument();

    // Verify Accept & Next and Iterate & Branch buttons
    const acceptBtn = screen.getByRole("button", { name: /Accept & Next/i });
    const iterateBtn = screen.getByRole("button", { name: /Iterate & Branch/i });

    expect(acceptBtn).toBeInTheDocument();
    expect(iterateBtn).toBeInTheDocument();

    fireEvent.click(acceptBtn);
    expect(handleNextScene).toHaveBeenCalled();

    fireEvent.click(iterateBtn);
    expect(handleIterateTake).toHaveBeenCalledWith("scene-1");
  });
});
