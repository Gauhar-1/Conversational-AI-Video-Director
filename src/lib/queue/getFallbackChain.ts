import { PVideoProvider } from "../video-providers/PVideoProvider";
import { PixVerseV6Provider } from "../video-providers/PixVerseV6Provider";
import { SeedanceReplicateProvider } from "../video-providers/SeedanceReplicateProvider";
import { VeedFabricProvider } from "../video-providers/VeedFabricProvider";
import { ReplicateProvider } from "../video-providers/ReplicateProvider";
import { CloudinaryProvider } from "../video-providers/CloudinaryProvider";
import { Veo3Provider } from "../video-providers/Veo3Provider";
import { Kling25Provider } from "../video-providers/Kling25Provider";
import { RunwayGen45Provider } from "../video-providers/RunwayGen45Provider";
import { Wan25Provider } from "../video-providers/Wan25Provider";

export const getFallbackChain = (
  keys: any, 
  userPreference: string, 
  isDraft: boolean = false, 
  hasAudioFile: boolean = false
) => {
  const chain = [];
  
  if (keys.replicate) {
    // 1. FAST DRAFT OVERRIDE: Ignore preferences to save time and money
    if (isDraft) {
      chain.push(new PVideoProvider(keys.replicate));
      return chain; // Stop here, do not add expensive cinematic fallbacks
    }

    // 2. PRIMARY USER PREFERENCE ROUTING
    if (userPreference === 'veed') {
      if (hasAudioFile) {
        chain.push(new VeedFabricProvider(keys.replicate));
      } else {
        console.warn("⚠️ VEED Fabric requested but no audio file provided. Falling back to P-Video.");
        // We push P-Video as the primary instead because it can handle text-to-speech
        chain.push(new PVideoProvider(keys.replicate));
      }
    }
    else if (userPreference === 'veo') {
      chain.push(new Veo3Provider(keys.replicate));
    } 
    else if (userPreference === 'runway-gen4.5') {
      chain.push(new RunwayGen45Provider(keys.replicate));
    }
    else if (userPreference === 'wan-2.5') {
      chain.push(new Wan25Provider(keys.replicate));
    }
    else if (userPreference === 'kling-2.5') {
      chain.push(new Kling25Provider(keys.replicate));
    }
    else if (userPreference === 'p-video') {
      chain.push(new PVideoProvider(keys.replicate));
    } else if (userPreference === 'pixverse') {
      chain.push(new PixVerseV6Provider(keys.replicate));
    } else if (userPreference === 'seedance') {
      chain.push(new SeedanceReplicateProvider(keys.replicate));
    } else if (userPreference === 'luma') {
      chain.push(new ReplicateProvider(keys.replicate, "luma/ray"));
    }
    
    // 3. AUTOMATED FALLBACKS (If the primary model fails or rate-limits)
    
    // If the user wanted a talking head (veed), the next best lip-sync model is P-Video
    if (userPreference === 'veed' && hasAudioFile) {
      chain.push(new PVideoProvider(keys.replicate));
    }

    if (userPreference !== 'veo') {
      chain.push(new Veo3Provider(keys.replicate)); // Veo is a fantastic primary fallback
    }
    
    // Add the heavy cinematic models as general fallbacks (ensuring no duplicates)
    if (userPreference !== 'pixverse') {
      chain.push(new PixVerseV6Provider(keys.replicate));
    }

    if (userPreference !== 'kling-2.5') {
      chain.push(new Kling25Provider(keys.replicate));
    }
    
    if (userPreference !== 'seedance') {
      chain.push(new SeedanceReplicateProvider(keys.replicate));
    }

    if (userPreference !== 'wan-2.5') {
        chain.push(new Wan25Provider(keys.replicate));
    }

    if (userPreference !== 'runway-gen4.5') {
        chain.push(new RunwayGen45Provider(keys.replicate));
    }
    
    if (userPreference !== 'luma') {
      chain.push(new ReplicateProvider(keys.replicate, "luma/ray"));
    }
  }
  
  // 4. THE ABSOLUTE FAILSAFE
  // If Replicate is completely down or the user has no key, Ken Burns the image.
  chain.push(new CloudinaryProvider()); 
  
  return chain;
};