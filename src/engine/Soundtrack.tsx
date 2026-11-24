import { Audio } from "@remotion/media";
import React, { useMemo } from "react";
import { Sequence, staticFile, useVideoConfig } from "remotion";
import { cue } from "./SceneView";
import { RenderScene, RenderStory } from "./types";

// Sound design that runs on its own from the story data: a music bed that
// ducks under the narrator, and our own synthesized effects (scripts/gen-audio.mjs)
// landing on the exact words where things happen on screen.

export type MusicMood = "playful" | "mystery" | "tense";
const MOODS: MusicMood[] = ["playful", "mystery", "tense"];

type Cue = { at: number; sound: string; volume: number };

// Effects for one scene, in seconds from the scene start.
export const sceneCues = (scene: RenderScene): Cue[] => {
  const out: Cue[] = [];
  const at = (word: string | undefined, fallback = 0) => cue(scene.words, word) ?? fallback;
  for (const actor of scene.actors ?? []) {
    if (actor.action === "jump") out.push({ at: at(actor.at), sound: "boing", volume: 0.35 });
    if (actor.action === "fall") out.push({ at: at(actor.at), sound: "slideDown", volume: 0.3 });
    if (actor.action === "faint") out.push({ at: at(actor.at), sound: "slideDown", volume: 0.35 });
    if (actor.action === "grow") out.push({ at: at(actor.at), sound: "sparkle", volume: 0.35 });
    if (actor.action === "spin" || actor.action === "exit") out.push({ at: at(actor.at), sound: "swish", volume: 0.3 });
    if (actor.action === "enter") out.push({ at: Math.max(0, at(actor.at, 0.5) - 0.45), sound: "swish", volume: 0.3 });
  }
  if (scene.setting === "collapse") out.push({ at: 0, sound: "thud", volume: 0.6 });
  if (scene.drop) out.push({ at: at(scene.drop.at), sound: "thud", volume: 0.5 });
  if (scene.burst) out.push({ at: at(scene.burst.at), sound: "pop", volume: 0.45 });
  if (scene.flash) out.push({ at: at(scene.flash), sound: "thud", volume: 0.45 });
  if (scene.effects?.includes("confetti") || scene.effects?.includes("rays")) out.push({ at: 0.1, sound: "sparkle", volume: 0.3 });
  // Several actors doing the same thing at once should make one sound, not a pile-up.
  const seen = new Set<string>();
  return out.filter((c) => {
    const k = `${c.sound}@${c.at.toFixed(2)}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
};

export const SceneEffects: React.FC<{ scene: RenderScene; fps: number }> = ({ scene, fps }) => (
  <>
    {sceneCues(scene).map((c, i) => (
      <Sequence key={`${c.sound}-${i}`} from={Math.max(0, Math.round(c.at * fps))} durationInFrames={2 * fps} layout="none" name={`sfx ${c.sound}`}>
        <Audio src={staticFile(`sfx/${c.sound}.wav`)} volume={c.volume} />
      </Sequence>
    ))}
  </>
);

export const musicMood = (story: RenderStory, seed: number): MusicMood | null => {
  if (story.music === "none") return null;
  return story.music ?? MOODS[seed % MOODS.length];
};

// Music volume per frame: low under speech, swelling in pauses and at the end.
const UNDER_VOICE = 0.07;
const IN_PAUSE = 0.16;

export const MusicBed: React.FC<{ mood: MusicMood; items: { scene: RenderScene; from: number; frames: number }[] }> = ({ mood, items }) => {
  const { fps, durationInFrames } = useVideoConfig();
  const volumes = useMemo(() => {
    const target = new Float32Array(durationInFrames).fill(IN_PAUSE);
    for (const { scene, from, frames } of items) {
      for (let f = 0; f < frames; f++) {
        const t = f / fps;
        const last = [...scene.words].reverse().find((w) => w.start <= t);
        const next = scene.words.find((w) => w.start > t);
        // Speaking if a word started within 0.6 s, or the next one is close.
        const speaking = (last && t - last.start < 0.6) || (next && next.start - t < 0.15);
        if (from + f < durationInFrames) target[from + f] = speaking ? UNDER_VOICE : IN_PAUSE;
      }
    }
    // Smooth so the music glides rather than jumps (~0.25 s).
    const out = new Float32Array(durationInFrames);
    let v = target[0];
    for (let f = 0; f < durationInFrames; f++) {
      v += (target[f] - v) * 0.15;
      out[f] = v;
    }
    return out;
  }, [items, fps, durationInFrames]);
  return <Audio src={staticFile(`music/${mood}.wav`)} loop volume={(f) => volumes[Math.min(f, volumes.length - 1)] ?? UNDER_VOICE} />;
};

// Tension riser that peaks exactly as the final scene (the payoff) starts.
export const RISER_SECONDS = 1.6;
