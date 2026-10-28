import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { FCPXMLExportWizard } from "@/components/export/FCPXMLExportWizard";
import type { ISceneDoc } from "@/models/Project";

const mockScenes: ISceneDoc[] = [
  {
    sceneId: "scene-1",
    order: 1,
    title: "Opening Scene",
    duration: 10,
    cameraAngle: "CAM_A_CENTER",
    cameraMovement: "STATIC",
    rawDelta: "A detective in the rain",
    imagePrompt: "Detective in the rain",
    motionPrompt: "Slow push in",
    videoUrl: "https://example.com/scene1.mp4",
    takes: [
      {
        takeId: "take-1",
        takeNumber: 1,
        videoUrl: "https://example.com/scene1.mp4",
        prompt: "Detective in the rain",
        model: "kling-2.5",
        status: "completed",
        duration: 10,
        createdAt: new Date().toISOString(),
      },
    ],
    activeTakeId: "take-1",
    status: "completed",
  },
];

describe("FCPXMLExportWizard", () => {
  it("renders Step 1 instructions and Select Folder button", () => {
    render(
      <FCPXMLExportWizard
        isOpen={true}
        onClose={jest.fn()}
        projectName="Test Project"
        scenes={mockScenes}
      />
    );

    // Verify modal title
    expect(screen.getByText("FCPXML Export Wizard")).toBeInTheDocument();

    // Verify Step 1 instructions
    expect(
      screen.getByText(/Select a local destination folder\. Director AI will download all active clips directly to this folder to ensure offline linking\./i)
    ).toBeInTheDocument();

    // Verify select folder button
    expect(
      screen.getByRole("button", { name: /Select Folder & Sync Clips/i })
    ).toBeInTheDocument();
  });

  it("completes export and shows Success State with DaVinci Resolve instruction", async () => {
    render(
      <FCPXMLExportWizard
        isOpen={true}
        onClose={jest.fn()}
        projectName="Test Project"
        scenes={mockScenes}
      />
    );

    const selectFolderBtn = screen.getByRole("button", { name: /Select Folder & Sync Clips/i });
    fireEvent.click(selectFolderBtn);

    // Verify Step 3 Success State
    await waitFor(() => {
      expect(screen.getByText("Export Complete")).toBeInTheDocument();
    });

    expect(screen.getByText(/Drag the/i)).toBeInTheDocument();
    expect(screen.getByText("timeline.fcpxml")).toBeInTheDocument();
    expect(screen.getByText(/file into DaVinci Resolve/i)).toBeInTheDocument();
  });
});
