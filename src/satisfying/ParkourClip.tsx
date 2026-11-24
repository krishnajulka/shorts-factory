import { Video } from "@remotion/media";
import React from "react";
import { random, staticFile, useVideoConfig } from "remotion";
import { parkourSounds } from "./Parkour";

// The parkour bottom as a pre-rendered clip: rendering the 3D run live is far
// too slow on the GPU-less cloud machine, so scripts/render-parkour-clips.mjs
// renders a few long runs on a PC and every Short plays one of them, starting
// at a seeded point so consecutive Shorts don't look the same.
export const PARKOUR_CLIP_SECONDS = 80;
export const PARKOUR_CLIP_SEEDS = [11]; // add 23, 37 once rendered (scripts/render-parkour-clips.mjs)
const FPS = 30;

export const clipChoice = (seed: number, frames: number) => {
  const clipSeed = PARKOUR_CLIP_SEEDS[seed % PARKOUR_CLIP_SEEDS.length];
  const room = Math.max(0, PARKOUR_CLIP_SECONDS * FPS - frames);
  const offset = Math.floor(random(`pkoff${seed}`) * room);
  return { clipSeed, offset };
};

export const parkourClipSounds = (frames: number, seed: number) => {
  const { clipSeed, offset } = clipChoice(seed, frames);
  return parkourSounds(offset + frames, clipSeed)
    .filter((s) => s.frame >= offset)
    .map((s) => ({ ...s, frame: s.frame - offset }));
};

export const ParkourClip: React.FC<{ seed: number }> = ({ seed }) => {
  const { durationInFrames } = useVideoConfig();
  const { clipSeed, offset } = clipChoice(seed, durationInFrames);
  return (
    <Video
      src={staticFile(`clips/parkour-${clipSeed}.mp4`)}
      trimBefore={offset}
      muted
      style={{ width: 1080, height: 960, objectFit: "cover", display: "block" }}
    />
  );
};
