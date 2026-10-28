/**
 * @file src/lib/db/repositories/assetRepository.ts
 * @description Mongoose implementation of IAssetRepository for the Casting & Scouting Wizard.
 * Manages character and environment anchors stored in Project.global_assets with multi-tenant isolation.
 */

import {
  Project,
  ICharacterAssetDoc,
  ILocationAssetDoc,
  IGlobalAssetsDoc,
} from "@/models/Project";
import dbConnect from "@/lib/db";
import type { IAssetRepository } from "./types";
import type { CharacterAsset, LocationAsset } from "@/lib/validations/project";

export class AssetRepository implements IAssetRepository {
  /**
   * Retrieves the global assets vault for a project.
   */
  async getGlobalAssets(userId: string, projectId: string): Promise<IGlobalAssetsDoc | null> {
    await dbConnect();
    const project = await Project.findOne(
      { _id: projectId, userId },
      { global_assets: 1 }
    ).lean();

    return (project?.global_assets as IGlobalAssetsDoc) || null;
  }

  /**
   * Adds a character to Project.global_assets.characters.
   */
  async addCharacter(
    userId: string,
    projectId: string,
    character: CharacterAsset
  ): Promise<ICharacterAssetDoc | null> {
    await dbConnect();

    const updated = await Project.findOneAndUpdate(
      { _id: projectId, userId },
      { $push: { "global_assets.characters": character } },
      { new: true, runValidators: true }
    );

    if (!updated) return null;
    return (
      updated.global_assets.characters.find(
        (c) => c.assetId === character.assetId
      ) || null
    );
  }

  /**
   * Updates an existing character asset using positional array operators.
   */
  async updateCharacter(
    userId: string,
    projectId: string,
    assetId: string,
    updates: Partial<CharacterAsset>
  ): Promise<ICharacterAssetDoc | null> {
    await dbConnect();

    const setFields: Record<string, any> = {};
    for (const [key, val] of Object.entries(updates)) {
      if (val !== undefined && key !== "assetId") {
        setFields[`global_assets.characters.$.${key}`] = val;
      }
    }

    const updated = await Project.findOneAndUpdate(
      { _id: projectId, userId, "global_assets.characters.assetId": assetId },
      { $set: setFields },
      { new: true, runValidators: true }
    );

    if (!updated) return null;
    return (
      updated.global_assets.characters.find((c) => c.assetId === assetId) || null
    );
  }

  /**
   * Approves a character reference image, updating status and adding to history.
   */
  async approveCharacter(
    userId: string,
    projectId: string,
    assetId: string,
    approvedImageUrl: string
  ): Promise<ICharacterAssetDoc | null> {
    await dbConnect();

    const historyItem = {
      id: `hist-${Date.now()}`,
      url: approvedImageUrl,
      prompt: "Approved reference image",
      createdAt: new Date().toISOString(),
    };

    const updated = await Project.findOneAndUpdate(
      { _id: projectId, userId, "global_assets.characters.assetId": assetId },
      {
        $set: {
          "global_assets.characters.$.imageUrl": approvedImageUrl,
          "global_assets.characters.$.status": "approved",
        },
        $push: {
          "global_assets.characters.$.generationHistory": historyItem,
        },
      },
      { new: true, runValidators: true }
    );

    if (!updated) return null;
    return (
      updated.global_assets.characters.find((c) => c.assetId === assetId) || null
    );
  }

  /**
   * Removes a character from Project.global_assets.characters.
   */
  async removeCharacter(
    userId: string,
    projectId: string,
    assetId: string
  ): Promise<boolean> {
    await dbConnect();

    const updated = await Project.findOneAndUpdate(
      { _id: projectId, userId },
      { $pull: { "global_assets.characters": { assetId } } },
      { new: true }
    );

    return !!updated;
  }

  /**
   * Adds a location to Project.global_assets.locations.
   */
  async addLocation(
    userId: string,
    projectId: string,
    location: LocationAsset
  ): Promise<ILocationAssetDoc | null> {
    await dbConnect();

    const updated = await Project.findOneAndUpdate(
      { _id: projectId, userId },
      { $push: { "global_assets.locations": location } },
      { new: true, runValidators: true }
    );

    if (!updated) return null;
    return (
      updated.global_assets.locations.find((l) => l.assetId === location.assetId) ||
      null
    );
  }

  /**
   * Updates an existing location asset.
   */
  async updateLocation(
    userId: string,
    projectId: string,
    assetId: string,
    updates: Partial<LocationAsset>
  ): Promise<ILocationAssetDoc | null> {
    await dbConnect();

    const setFields: Record<string, any> = {};
    for (const [key, val] of Object.entries(updates)) {
      if (val !== undefined && key !== "assetId") {
        setFields[`global_assets.locations.$.${key}`] = val;
      }
    }

    const updated = await Project.findOneAndUpdate(
      { _id: projectId, userId, "global_assets.locations.assetId": assetId },
      { $set: setFields },
      { new: true, runValidators: true }
    );

    if (!updated) return null;
    return (
      updated.global_assets.locations.find((l) => l.assetId === assetId) || null
    );
  }

  /**
   * Approves a location background reference image.
   */
  async approveLocation(
    userId: string,
    projectId: string,
    assetId: string,
    approvedImageUrl: string
  ): Promise<ILocationAssetDoc | null> {
    await dbConnect();

    const historyItem = {
      id: `hist-${Date.now()}`,
      url: approvedImageUrl,
      prompt: "Approved reference background",
      createdAt: new Date().toISOString(),
    };

    const updated = await Project.findOneAndUpdate(
      { _id: projectId, userId, "global_assets.locations.assetId": assetId },
      {
        $set: {
          "global_assets.locations.$.imageUrl": approvedImageUrl,
          "global_assets.locations.$.status": "approved",
        },
        $push: {
          "global_assets.locations.$.generationHistory": historyItem,
        },
      },
      { new: true, runValidators: true }
    );

    if (!updated) return null;
    return (
      updated.global_assets.locations.find((l) => l.assetId === assetId) || null
    );
  }

  /**
   * Removes a location from Project.global_assets.locations.
   */
  async removeLocation(
    userId: string,
    projectId: string,
    assetId: string
  ): Promise<boolean> {
    await dbConnect();

    const updated = await Project.findOneAndUpdate(
      { _id: projectId, userId },
      { $pull: { "global_assets.locations": { assetId } } },
      { new: true }
    );

    return !!updated;
  }
}

export const assetRepository = new AssetRepository();

