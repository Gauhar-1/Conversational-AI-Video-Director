/**
 * @file src/lib/generators/VideoGeneratorFactory.ts
 * @description Factory class creating IVideoGenerator instances based on provider or model preference.
 */

import type { IVideoGenerator } from "./types";
import { ReplicateVideoGenerator } from "./ReplicateVideoGenerator";

export class VideoGeneratorFactory {
  /**
   * Resolves and instantiates the appropriate IVideoGenerator.
   *
   * @param preference Model or provider string (e.g. "kling", "wan", "minimax", "luma")
   * @returns An instance conforming to IVideoGenerator
   */
  static getGenerator(preference: string = "kling"): IVideoGenerator {
    // Currently, Replicate handles Kling, Wan, MiniMax, and Luma.
    // Additional direct providers (e.g. Fal.ai, Runway Gen-3) can be plugged here effortlessly.
    return new ReplicateVideoGenerator(preference);
  }
}
