/**
 * @file src/lib/db/repositories/types.ts
 * @description Repository Interface Abstractions following Dependency Inversion (DIP) and Single Responsibility (SRP).
 */

import type {
  IProject,
  ISceneDoc,
  ITakeDoc,
  ICharacterAssetDoc,
  ILocationAssetDoc,
  IGlobalAssetsDoc,
} from "@/models/Project";
import type {
  CreateProjectType,
  UpdateProjectType,
  ProjectSummary,
  ProjectStage,
  CharacterAsset,
  LocationAsset,
  SceneDoc,
  PatchSceneDelta,
  Take,
} from "@/lib/validations/project";

export interface IProjectRepository {
  /**
   * Retrieves high-speed dashboard summary cards for a user.
   * Uses projection to strictly omit scenes and heavy payloads.
   */
  getUserProjects(userId: string): Promise<ProjectSummary[]>;

  /**
   * Retrieves a full project document scoped strictly to userId.
   */
  getProjectById(userId: string, projectId: string): Promise<IProject | null>;

  /**
   * Creates a new project document inside an ACID transaction.
   */
  createProject(userId: string, data?: CreateProjectType): Promise<IProject>;

  /**
   * Updates top-level project metadata.
   */
  updateProject(
    userId: string,
    projectId: string,
    data: UpdateProjectType
  ): Promise<IProject | null>;

  /**
   * Transitions the project through the 4 progressive disclosure stages:
   * 'writers_room' -> 'casting_scouting' -> 'timeline' -> 'export'
   */
  updateStage(
    userId: string,
    projectId: string,
    stage: ProjectStage
  ): Promise<IProject | null>;

  /**
   * Updates the raw script content from the Writer's Room.
   */
  updateScript(
    userId: string,
    projectId: string,
    scriptContent: string
  ): Promise<IProject | null>;

  /**
   * Deletes a project scoped strictly to userId.
   */
  deleteProject(userId: string, projectId: string): Promise<boolean>;
}

export interface IAssetRepository {
  /**
   * Retrieves the global assets vault (Characters + Locations) for a project.
   */
  getGlobalAssets(userId: string, projectId: string): Promise<IGlobalAssetsDoc | null>;

  /**
   * Adds a new character asset to Project.global_assets.characters.
   */
  addCharacter(
    userId: string,
    projectId: string,
    character: CharacterAsset
  ): Promise<ICharacterAssetDoc | null>;

  /**
   * Updates an existing character asset in Project.global_assets.characters.
   */
  updateCharacter(
    userId: string,
    projectId: string,
    assetId: string,
    updates: Partial<CharacterAsset>
  ): Promise<ICharacterAssetDoc | null>;

  /**
   * Approves a character reference image generated via FLUX + PuLID.
   */
  approveCharacter(
    userId: string,
    projectId: string,
    assetId: string,
    approvedImageUrl: string
  ): Promise<ICharacterAssetDoc | null>;

  /**
   * Removes a character asset from Project.global_assets.characters.
   */
  removeCharacter(
    userId: string,
    projectId: string,
    assetId: string
  ): Promise<boolean>;

  /**
   * Adds a new location/background asset to Project.global_assets.locations.
   */
  addLocation(
    userId: string,
    projectId: string,
    location: LocationAsset
  ): Promise<ILocationAssetDoc | null>;

  /**
   * Updates an existing location asset in Project.global_assets.locations.
   */
  updateLocation(
    userId: string,
    projectId: string,
    assetId: string,
    updates: Partial<LocationAsset>
  ): Promise<ILocationAssetDoc | null>;

  /**
   * Approves a location background reference image.
   */
  approveLocation(
    userId: string,
    projectId: string,
    assetId: string,
    approvedImageUrl: string
  ): Promise<ILocationAssetDoc | null>;

  /**
   * Removes a location asset from Project.global_assets.locations.
   */
  removeLocation(
    userId: string,
    projectId: string,
    assetId: string
  ): Promise<boolean>;
}

export interface ISceneRepository {
  /**
   * Retrieves all scenes for a project sorted by scene order.
   */
  getScenesByProject(userId: string, projectId: string): Promise<ISceneDoc[]>;

  /**
   * Retrieves a single scene by its unique sceneId.
   */
  getSceneById(
    userId: string,
    sceneId: string,
    projectId?: string
  ): Promise<ISceneDoc | null>;

  /**
   * Granular Delta Update: Updates specific properties of a single scene
   * without fetching or rewriting the entire project document.
   */
  updateSceneDelta(
    userId: string,
    sceneId: string,
    delta: PatchSceneDelta,
    projectId?: string
  ): Promise<ISceneDoc | null>;

  /**
   * Appends a new scene to a project timeline.
   */
  addScene(
    userId: string,
    projectId: string,
    scene: SceneDoc
  ): Promise<ISceneDoc | null>;

  /**
   * Removes a scene from a project timeline.
   */
  deleteScene(
    userId: string,
    projectId: string,
    sceneId: string
  ): Promise<boolean>;

  /**
   * Reorders scenes on the horizontal timeline.
   */
  reorderScenes(
    userId: string,
    projectId: string,
    orders: { sceneId: string; order: number }[]
  ): Promise<ISceneDoc[] | null>;

  /**
   * Adds a new video generation take to a scene's takes array.
   */
  addTake(
    userId: string,
    sceneId: string,
    take: Take,
    projectId?: string
  ): Promise<ITakeDoc | null>;

  /**
   * Selects an active take for sequential playback and FCPXML export.
   */
  setActiveTake(
    userId: string,
    sceneId: string,
    takeId: string,
    projectId?: string
  ): Promise<ISceneDoc | null>;

  /**
   * Deletes a specific take from a scene.
   */
  deleteTake(
    userId: string,
    sceneId: string,
    takeId: string,
    projectId?: string
  ): Promise<boolean>;
}

