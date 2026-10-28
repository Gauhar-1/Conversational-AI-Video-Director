/**
 * @file src/__tests__/fcpxml.test.ts
 * @description Unit tests for the Final Cut Pro XML (FCPXML v1.9) string compiler.
 * Verifies NLE timeline output, frame durations, and dynamic punch-in transforms.
 */

import { compileFCPXML } from "@/lib/fcpxml";
import type { ISceneDoc } from "@/models/Project";

describe("FCPXML v1.9 Compiler Utility", () => {
  it("compiles vertical 1080x1920 24fps timeline correctly", () => {
    const scenes: ISceneDoc[] = [
      {
        sceneId: "scene-1",
        order: 1,
        duration: 10,
        cameraAngle: "CAM_A_CENTER",
        rawDelta: "Hero stands centered in neon rain",
        imagePrompt: "Master establishing frame",
        motionPrompt: "Center tracking shot",
        videoUrl: "https://cdn.example.com/scene1.mp4",
        status: "completed",
        takes: [],
      },
    ];

    const xml = compileFCPXML({
      projectTitle: "Cyberpunk Sequence",
      scenes,
      fps: 24,
    });

    expect(xml).toContain('<fcpxml version="1.9">');
    expect(xml).toContain('name="FFVideoFormat1080x1920p24"');
    expect(xml).toContain('frameDuration="100/2400s"');
    expect(xml).toContain('project name="Cyberpunk Sequence"');
    expect(xml).toContain('src="https://cdn.example.com/scene1.mp4"');
  });

  it("injects automated 1.3x scale punch-in transform for CAM_B_45_CLOSE and CAM_C_OTS", () => {
    const scenes: ISceneDoc[] = [
      {
        sceneId: "scene-1",
        order: 1,
        duration: 10,
        cameraAngle: "CAM_A_CENTER",
        rawDelta: "Wide establishing shot",
        imagePrompt: "Wide master",
        motionPrompt: "Static",
        videoUrl: "https://cdn.example.com/scene1.mp4",
        status: "completed",
        takes: [],
      },
      {
        sceneId: "scene-2",
        order: 2,
        duration: 10,
        cameraAngle: "CAM_B_45_CLOSE",
        rawDelta: "Close-up dialogue punch-in",
        imagePrompt: "45-degree angle close-up",
        motionPrompt: "Orbital push-in",
        videoUrl: "https://cdn.example.com/scene2.mp4",
        status: "completed",
        takes: [],
      },
      {
        sceneId: "scene-3",
        order: 3,
        duration: 10,
        cameraAngle: "CAM_C_OTS",
        rawDelta: "Over the shoulder tracking",
        imagePrompt: "OTS silhouette",
        motionPrompt: "Forward dolly",
        videoUrl: "https://cdn.example.com/scene3.mp4",
        status: "completed",
        takes: [],
      },
    ];

    const xml = compileFCPXML({
      projectTitle: "Cinematic Test",
      scenes,
      fps: 24,
    });

    // CAM_A_CENTER should NOT have adjust-transform tag
    const scene1Clip = xml.split('name="Scene 1')[1].split('</asset-clip>')[0];
    expect(scene1Clip).not.toContain('<adjust-transform');

    // CAM_B_45_CLOSE should inject 1.3x scale
    const scene2Clip = xml.split('name="Scene 2')[1].split('</asset-clip>')[0];
    expect(scene2Clip).toContain('<adjust-transform scale="1.3 1.3" position="0 0"/>');

    // CAM_C_OTS should inject 1.3x scale
    const scene3Clip = xml.split('name="Scene 3')[1].split('</asset-clip>')[0];
    expect(scene3Clip).toContain('<adjust-transform scale="1.3 1.3" position="0 0"/>');
  });

  it("safely escapes special XML characters in titles and media paths", () => {
    const scenes: ISceneDoc[] = [
      {
        sceneId: "scene-1",
        order: 1,
        duration: 5,
        cameraAngle: "CAM_A_CENTER",
        rawDelta: 'Hero & Villain <confrontation> "in the dark"',
        imagePrompt: "Prompt with special characters",
        motionPrompt: "Motion",
        videoUrl: "https://cdn.example.com/video?a=1&b=2",
        status: "completed",
        takes: [],
      },
    ];

    const xml = compileFCPXML({
      projectTitle: 'Tom & Jerry: "The Encounter"',
      scenes,
      fps: 24,
    });

    expect(xml).toContain('project name="Tom &amp; Jerry: &quot;The Encounter&quot;"');
    expect(xml).toContain('src="https://cdn.example.com/video?a=1&amp;b=2"');
  });
});

