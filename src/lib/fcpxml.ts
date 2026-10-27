// src/lib/fcpxml.ts
import { ISceneDoc } from "@/models/Project";

function escapeXml(unsafe: string): string {
  if (!unsafe) return "";
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export interface FCPXMLExportOptions {
  projectTitle?: string;
  scenes: ISceneDoc[];
  fps?: number; // default 24
}

export function compileFCPXML({
  projectTitle = "Director AI Vertical Cut",
  scenes = [],
  fps = 24
}: FCPXMLExportOptions): string {
  const frameDurationFraction = `100/${fps * 100}s`; // e.g. 100/2400s = 1/24s
  const safeTitle = escapeXml(projectTitle);

  // Compute total sequence duration
  const totalSeconds = scenes.reduce((acc, s) => acc + (s.duration || 10), 0);
  const totalSequenceDuration = `${totalSeconds * fps * 100}/${fps * 100}s`;

  // Build resources assets
  const resourceAssets = scenes.map((scene, idx) => {
    const assetId = `r_asset_${idx + 1}`;
    const sceneDurationSec = scene.duration || 10;
    const durationFraction = `${sceneDurationSec * fps * 100}/${fps * 100}s`;
    const mediaSrc = scene.videoUrl || scene.firstFrameUrl || `file://localhost/Scene_${scene.order || idx + 1}.mp4`;
    
    return `    <asset id="${assetId}" name="Scene_${scene.order || idx + 1}_${escapeXml(scene.cameraAngle)}" src="${escapeXml(mediaSrc)}" start="0s" duration="${durationFraction}" hasVideo="1" format="r1"/>`;
  }).join("\n");

  // Build spine timeline clips
  let currentOffsetSeconds = 0;
  const spineClips = scenes.map((scene, idx) => {
    const assetId = `r_asset_${idx + 1}`;
    const sceneDurationSec = scene.duration || 10;
    const clipDuration = `${sceneDurationSec * fps * 100}/${fps * 100}s`;
    const offsetDuration = `${currentOffsetSeconds * fps * 100}/${fps * 100}s`;
    currentOffsetSeconds += sceneDurationSec;

    // Automatically inject <adjust-transform scale="1.3 1.3"> punch-in based on cameraAngle metadata
    const isPunchIn = scene.cameraAngle === "CAM_B_45_CLOSE" || scene.cameraAngle === "CAM_C_OTS";
    const transformTag = isPunchIn 
      ? `\n          <adjust-transform scale="1.3 1.3" position="0 0"/>` 
      : "";

    return `        <asset-clip ref="${assetId}" offset="${offsetDuration}" name="Scene ${scene.order || idx + 1} - ${escapeXml(scene.cameraAngle)}" duration="${clipDuration}" start="0s">${transformTag}
        </asset-clip>`;
  }).join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE fcpxml>
<fcpxml version="1.9">
  <resources>
    <format id="r1" name="FFVideoFormat1080x1920p24" frameDuration="${frameDurationFraction}" width="1080" height="1920"/>
${resourceAssets}
  </resources>
  <library>
    <event name="Director AI Productions">
      <project name="${safeTitle}">
        <sequence format="r1" duration="${totalSequenceDuration}">
          <spine>
${spineClips}
          </spine>
        </sequence>
      </project>
    </event>
  </library>
</fcpxml>`;
}

export function downloadFCPXML(xmlContent: string, fileName: string = "Sequence_9x16.fcpxml"): void {
  const blob = new Blob([xmlContent], { type: "application/xml;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName.endsWith(".fcpxml") ? fileName : `${fileName}.fcpxml`;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}
