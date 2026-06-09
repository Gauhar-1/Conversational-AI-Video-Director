// src/lib/video-providers/CloudinaryProvider.ts
import { BaseVideoProvider, GenerationParams } from "./BaseProvider";

export class CloudinaryProvider extends BaseVideoProvider {
  name = "Cloudinary Ken Burns Failsafe";

  async generate({ startFrameUrl }: GenerationParams): Promise<string> {
    if (startFrameUrl?.includes('cloudinary.com') && startFrameUrl.includes('/image/upload/')) {
      const finalVideoUrl = startFrameUrl
        .replace('/upload/', '/upload/e_zoompan/')
        .replace(/\.(png|jpg|jpeg|webp)$/i, '.mp4');
      
      return finalVideoUrl;
    }
    throw new Error("Start Frame is not hosted on Cloudinary; Ken Burns effect unavailable.");
  }
}