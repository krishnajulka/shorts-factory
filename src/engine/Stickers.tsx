import React from "react";
import { Easing, interpolate, random, useCurrentFrame, useVideoConfig } from "remotion";
import { cue } from "./SceneView";
import { TimedWord } from "./types";

type Sticker = { word: string; emoji: string };

// Seconds (scene-relative) at which each sticker fires.
export const stickerTimes = (stickers: Sticker[] | undefined, words: TimedWord[]) =>
  (stickers ?? []).flatMap((s) => {
    const at = cue(words, s.word);
    return at === null ? [] : [{ ...s, at }];
  });

const HOLD = 1.1;

// Emoji that slam onto the story half when their word is spoken.
export const Stickers: React.FC<{ stickers?: Sticker[]; words: TimedWord[]; seed: string }> = ({ stickers, words, seed }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;
  return (
    <>
      {stickerTimes(stickers, words).map((s, i) => {
        const age = t - s.at;
        if (age < 0 || age > HOLD) return null;
        const right = i % 2 === 1;
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              top: 150 + random(`st-${seed}-${i}`) * 220,
              left: right ? undefined : 70,
              right: right ? 70 : undefined,
              fontSize: 230,
              lineHeight: 1,
              filter: "drop-shadow(0 12px 0 rgba(0,0,0,0.45))",
              scale: interpolate(age, [0, 0.14, HOLD - 0.12, HOLD], [0, 1.15, 1, 0], {
                extrapolateLeft: "clamp",
                extrapolateRight: "clamp",
                easing: Easing.bezier(0.34, 1.56, 0.64, 1),
              }),
              rotate: `${(right ? 1 : -1) * (12 + Math.sin(age * 14) * 6)}deg`,
            }}
          >
            {s.emoji}
          </div>
        );
      })}
    </>
  );
};
