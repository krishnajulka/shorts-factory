import React from "react";
import { Breakout, breakoutSounds } from "./Breakout";
import { Corner, cornerSounds } from "./Corner";
import { Dominoes, dominoSounds } from "./Dominoes";
import { Obby, obbySounds } from "./Obby";
import { Plinko, plinkoSounds } from "./Plinko";
import { Race, defaultRacers, raceSounds } from "./Race";
import { RingEscape } from "./RingEscape";
import { simulate as simulateRings } from "./ringsSim";
import { Soap, soapSounds } from "./Soap";
import { Spiral } from "./Spiral";
import { Stack, stackSounds } from "./Stack";
import { Territory, territorySounds } from "./Territory";
import { Wheel, wheelLineup, wheelSounds } from "./Wheel";

// Bottom-half "satisfying" loops. Each is deterministic for a given seed and
// reports the frames where it wants a sound (pitch via `rate`).

// The clean pastel set used for new stories; the older neon loops stay
// renderable for stories that already name them.
export const CLEAN_BOTTOMS = ["soap", "stack", "dominoes", "obby"] as const;
export const BOTTOM_KINDS = [...CLEAN_BOTTOMS, "rings", "plinko", "race", "breakout", "spiral", "territory", "wheel", "corner"] as const;
export type BottomKind = (typeof BOTTOM_KINDS)[number];

export type BottomSound = { frame: number; rate: number };

export const Bottom: React.FC<{ kind: BottomKind; seed: number; racers?: string[] }> = ({ kind, seed, racers }) => {
  switch (kind) {
    case "plinko":
      return <Plinko seed={seed} />;
    case "race":
      return <Race seed={seed} racers={racers} />;
    case "breakout":
      return <Breakout seed={seed} />;
    case "spiral":
      return <Spiral seed={seed} />;
    case "territory":
      return <Territory seed={seed} />;
    case "wheel":
      return <Wheel seed={seed} racers={racers} />;
    case "corner":
      return <Corner seed={seed} />;
    case "soap":
      return <Soap seed={seed} />;
    case "stack":
      return <Stack seed={seed} />;
    case "dominoes":
      return <Dominoes seed={seed} />;
    case "obby":
      return <Obby seed={seed} />;
    default:
      return <RingEscape seed={seed} />;
  }
};

export const bottomSounds = (kind: BottomKind, frames: number, seed: number, racers?: string[]): BottomSound[] => {
  switch (kind) {
    case "plinko":
      return plinkoSounds(frames, seed);
    case "race":
      return raceSounds(frames, seed, (racers && racers.length >= 2 ? racers.slice(0, 5) : defaultRacers(seed)).length);
    case "breakout":
      return breakoutSounds(frames, seed);
    case "spiral":
      return [];
    case "territory":
      return territorySounds(frames, seed);
    case "wheel":
      return wheelSounds(frames, seed, wheelLineup(seed, racers).length);
    case "corner":
      return cornerSounds(frames, seed);
    case "soap":
      return soapSounds(frames);
    case "stack":
      return stackSounds(frames, seed);
    case "dominoes":
      return dominoSounds(frames, seed);
    case "obby":
      return obbySounds(frames, seed);
    default:
      return simulateRings(frames, seed).breaks.map((b) => ({ frame: b.frame, rate: 0.85 + b.ring * 0.07 }));
  }
};
