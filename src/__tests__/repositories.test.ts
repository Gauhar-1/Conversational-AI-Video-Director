/**
 * @file src/__tests__/repositories.test.ts
 * @description Comprehensive unit tests for Zod schemas and isolated repositories
 * (ProjectRepository, AssetRepository, SceneRepository) verifying SOLID principles,
 * delta updates, multi-tenant isolation, and projection optimization.
 */

import {
  characterAssetSchema,
  locationAssetSchema,
  sceneDocSchema,
  patchSceneDeltaSchema,
  projectSummarySchema,
  createProjectSchema,
} from "@/lib/validations/project";
import { Project } from "@/models/Project";
import { projectRepository } from "@/lib/db/repositories/projectRepository";
import { assetRepository } from "@/lib/db/repositories/assetRepository";
import { sceneRepository } from "@/lib/db/repositories/sceneRepository";

jest.mock("@/lib/db", () => ({
  __esModule: true,
  default: jest.fn().mockResolvedValue(true),
}));

jest.mock("@/lib/db/transaction", () => ({
  withMongoTransaction: jest.fn((cb) => cb(null)),
}));

jest.mock("@/models/Project", () => {
  const actual = jest.requireActual("@/models/Project");
  return {
    ...actual,
    Project: {
      find: jest.fn(),
      findOne: jest.fn(),
      findOneAndUpdate: jest.fn(),
      deleteOne: jest.fn(),
    },
  };
});

describe("Guided Pipeline Zod Schemas Validation", () => {
  it("validates Character Asset schema and enforces default pulidSeed and draft status", () => {
    const rawData = {
      assetId: "char-1",
      name: "Neo",
      appearancePrompt: "Cyberpunk protagonist with dark leather trench coat and round sunglasses",
    };

    const parsed = characterAssetSchema.parse(rawData);
    expect(parsed.assetId).toBe("char-1");
    expect(parsed.name).toBe("Neo");
    expect(parsed.pulidSeed).toBe(42);
    expect(parsed.status).toBe("draft");
    expect(parsed.generationHistory).toEqual([]);
  });

  it("validates Location Asset schema with environmental defaults", () => {
    const rawData = {
      assetId: "loc-1",
      name: "Rooftop Rain",
      environmentPrompt: "Moody neon cityscape under torrential rain at midnight",
    };

    const parsed = locationAssetSchema.parse(rawData);
    expect(parsed.lightingProfile).toBe("Cinematic atmospheric lighting");
    expect(parsed.status).toBe("draft");
  });

  it("validates SceneDoc schema and supports nested takes array", () => {
    const sceneData = {
      sceneId: "scene-101",
      order: 1,
      cameraAngle: "CLOSE_UP",
      rawDelta: "Hero looks up at the sky",
      imagePrompt: "Close-up shot of hero",
      motionPrompt: "Hero blinks and turns head",
      takes: [
        {
          takeId: "take-1",
          takeNumber: 1,
          videoUrl: "https://cdn.example.com/take1.mp4",
          prompt: "High speed temporal generation",
          model: "kling-2.5",
          status: "completed",
          duration: 10,
        },
      ],
      activeTakeId: "take-1",
    };

    const parsed = sceneDocSchema.parse(sceneData);
    expect(parsed.cameraAngle).toBe("CLOSE_UP");
    expect(parsed.takes.length).toBe(1);
    expect(parsed.takes[0].takeId).toBe("take-1");
    expect(parsed.activeTakeId).toBe("take-1");
  });

  it("validates granular delta updates for PATCH /api/scenes/[id]", () => {
    const deltaPayload = {
      cameraAngle: "CLOSE_UP",
    };

    const parsed = patchSceneDeltaSchema.parse(deltaPayload);
    expect(parsed.cameraAngle).toBe("CLOSE_UP");
    expect(parsed.rawDelta).toBeUndefined();
  });

  it("validates lean ProjectSummary schema for fast /dashboard rendering", () => {
    const summaryData = {
      _id: "proj_123",
      userId: "user_abc",
      title: "Cyberpunk Epic",
      currentStage: "casting_scouting",
      aspectRatio: "9:16",
      sceneCount: 5,
      characterCount: 2,
      locationCount: 3,
      updatedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    };

    const parsed = projectSummarySchema.parse(summaryData);
    expect(parsed.sceneCount).toBe(5);
    expect(parsed.characterCount).toBe(2);
    expect(parsed.currentStage).toBe("casting_scouting");
  });
});

describe("ProjectRepository Multi-Tenant & Projection Isolation", () => {
  const userId = "test-user-uuid-123";

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("getUserProjects requests only minimal projection fields to prevent bandwidth bloat", async () => {
    const mockSelect = jest.fn().mockReturnThis();
    const mockSort = jest.fn().mockReturnThis();
    const mockLean = jest.fn().mockResolvedValue([
      {
        _id: "proj-1",
        userId,
        title: "Test Movie",
        currentStage: "writers_room",
        aspectRatio: "9:16",
        scenes: [{ sceneId: "scene-1" }, { sceneId: "scene-2" }],
        global_assets: {
          characters: [{ assetId: "char-1" }],
          locations: [],
        },
        updatedAt: new Date(),
        createdAt: new Date(),
      },
    ]);

    (Project.find as jest.Mock).mockReturnValue({
      select: mockSelect,
      sort: mockSort,
      lean: mockLean,
    });

    const summaries = await projectRepository.getUserProjects(userId);

    expect(Project.find).toHaveBeenCalledWith({ userId });
    expect(mockSelect).toHaveBeenCalledWith(
      expect.stringContaining("scenes.sceneId")
    );
    expect(summaries.length).toBe(1);
    expect(summaries[0].sceneCount).toBe(2);
    expect(summaries[0].characterCount).toBe(1);
    expect(summaries[0].locationCount).toBe(0);
  });

  it("getProjectById strictly scopes query by userId and projectId", async () => {
    const mockProject = { _id: "proj-1", userId, title: "Test Movie" };
    (Project.findOne as jest.Mock).mockResolvedValue(mockProject);

    const result = await projectRepository.getProjectById(userId, "proj-1");

    expect(Project.findOne).toHaveBeenCalledWith({ _id: "proj-1", userId });
    expect(result).toEqual(mockProject);
  });

  it("updateStage transitions project stage cleanly", async () => {
    (Project.findOneAndUpdate as jest.Mock).mockResolvedValue({
      _id: "proj-1",
      userId,
      currentStage: "timeline",
    });

    const result = await projectRepository.updateStage(userId, "proj-1", "timeline");

    expect(Project.findOneAndUpdate).toHaveBeenCalledWith(
      { _id: "proj-1", userId },
      { $set: { currentStage: "timeline" } },
      { new: true, runValidators: true }
    );
    expect(result?.currentStage).toBe("timeline");
  });
});

describe("AssetRepository Casting & Scouting Operations", () => {
  const userId = "test-user-uuid-123";
  const projectId = "proj-1";

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("addCharacter pushes new character to global_assets.characters", async () => {
    const character = {
      assetId: "char-10",
      name: "Trinity",
      role: "Lead",
      appearancePrompt: "Leather jacket and combat boots",
      imageUrl: "",
      pulidSeed: 42,
      status: "draft" as const,
      generationHistory: [],
    };

    (Project.findOneAndUpdate as jest.Mock).mockResolvedValue({
      _id: projectId,
      userId,
      global_assets: {
        characters: [character],
        locations: [],
      },
    });

    const result = await assetRepository.addCharacter(userId, projectId, character);

    expect(Project.findOneAndUpdate).toHaveBeenCalledWith(
      { _id: projectId, userId },
      { $push: { "global_assets.characters": character } },
      { new: true, runValidators: true }
    );
    expect(result?.name).toBe("Trinity");
  });

  it("approveCharacter updates status, imageUrl, and appends to generation history", async () => {
    const approvedUrl = "https://cdn.example.com/trinity-approved.jpg";
    const approvedChar = {
      assetId: "char-10",
      name: "Trinity",
      imageUrl: approvedUrl,
      status: "approved",
      generationHistory: [{ id: "hist-1", url: approvedUrl, prompt: "Approved reference image" }],
    };

    (Project.findOneAndUpdate as jest.Mock).mockResolvedValue({
      _id: projectId,
      userId,
      global_assets: {
        characters: [approvedChar],
        locations: [],
      },
    });

    const result = await assetRepository.approveCharacter(
      userId,
      projectId,
      "char-10",
      approvedUrl
    );

    expect(Project.findOneAndUpdate).toHaveBeenCalledWith(
      { _id: projectId, userId, "global_assets.characters.assetId": "char-10" },
      expect.objectContaining({
        $set: {
          "global_assets.characters.$.imageUrl": approvedUrl,
          "global_assets.characters.$.status": "approved",
        },
      }),
      { new: true, runValidators: true }
    );
    expect(result?.status).toBe("approved");
    expect(result?.imageUrl).toBe(approvedUrl);
  });
});

describe("SceneRepository Delta Updates & Takes Variation", () => {
  const userId = "test-user-uuid-123";
  const sceneId = "scene-101";

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("updateSceneDelta performs atomic positional $set without full document rewrite", async () => {
    const delta = { cameraAngle: "CLOSE_UP" as const };
    const mockUpdatedScene = {
      sceneId,
      order: 1,
      cameraAngle: "CLOSE_UP",
      duration: 10,
      takes: [],
    };

    (Project.findOneAndUpdate as jest.Mock).mockResolvedValue({
      scenes: [mockUpdatedScene],
    });

    const result = await sceneRepository.updateSceneDelta(userId, sceneId, delta);

    expect(Project.findOneAndUpdate).toHaveBeenCalledWith(
      { userId, "scenes.sceneId": sceneId },
      { $set: { "scenes.$.cameraAngle": "CLOSE_UP" } },
      { new: true, runValidators: true }
    );
    expect(result?.cameraAngle).toBe("CLOSE_UP");
  });

  it("addTake pushes new generation take to scene", async () => {
    const take = {
      takeId: "take-99",
      takeNumber: 2,
      videoUrl: "https://replicate.delivery/video.mp4",
      prompt: "Dramatic lighting cinematic motion",
      model: "wan-2.5",
      status: "completed" as const,
      duration: 10,
      createdAt: new Date().toISOString(),
    };

    (Project.findOneAndUpdate as jest.Mock).mockResolvedValue({
      scenes: [
        {
          sceneId,
          takes: [take],
        },
      ],
    });

    const result = await sceneRepository.addTake(userId, sceneId, take);

    expect(Project.findOneAndUpdate).toHaveBeenCalledWith(
      { userId, "scenes.sceneId": sceneId },
      { $push: { "scenes.$.takes": take } },
      { new: true, runValidators: true }
    );
    expect(result?.takeId).toBe("take-99");
  });

  it("setActiveTake updates both activeTakeId and videoUrl for sequential playback", async () => {
    const take = {
      takeId: "take-99",
      videoUrl: "https://replicate.delivery/active.mp4",
    };

    (Project.findOne as jest.Mock).mockReturnValue({
      lean: jest.fn().mockResolvedValue({
        scenes: [
          {
            sceneId,
            takes: [take],
          },
        ],
      }),
    });

    (Project.findOneAndUpdate as jest.Mock).mockResolvedValue({
      scenes: [
        {
          sceneId,
          activeTakeId: "take-99",
          videoUrl: "https://replicate.delivery/active.mp4",
          takes: [take],
        },
      ],
    });

    const result = await sceneRepository.setActiveTake(userId, sceneId, "take-99");

    expect(Project.findOneAndUpdate).toHaveBeenCalledWith(
      { userId, "scenes.sceneId": sceneId },
      {
        $set: {
          "scenes.$.activeTakeId": "take-99",
          "scenes.$.videoUrl": "https://replicate.delivery/active.mp4",
        },
      },
      { new: true, runValidators: true }
    );
    expect(result?.activeTakeId).toBe("take-99");
    expect(result?.videoUrl).toBe("https://replicate.delivery/active.mp4");
  });
});

