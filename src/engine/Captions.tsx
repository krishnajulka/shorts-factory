import React from "react";
import { Easing, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { TimedWord } from "./types";

const CHUNK = 3;
const PAUSE = 0.6;

// Index of the first word of each caption chunk. Phrases break at spoken
// pauses or punctuation, then split evenly into chunks of at most CHUNK words
// so no word is left dangling on its own.
export const chunkStarts = (words: TimedWord[]) => {
  const phrases = [0];
  for (let i = 1; i < words.length; i++) {
    if (words[i].start - words[i - 1].start > PAUSE || /[.,!?]$/.test(words[i - 1].word)) phrases.push(i);
  }
  phrases.push(words.length);
  const starts: number[] = [];
  for (let p = 0; p < phrases.length - 1; p++) {
    const len = phrases[p + 1] - phrases[p];
    const parts = Math.ceil(len / CHUNK);
    for (let k = 0; k < parts; k++) starts.push(phrases[p] + Math.round((k * len) / parts));
  }
  return starts;
};

// Big pop-in captions, a few words at a time, active word highlighted.
// Story keywords get their own color and size.
export const Captions: React.FC<{ words: TimedWord[]; fontFamily: string; keywords: string[] }> = ({ words, fontFamily, keywords }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;

  let active = -1;
  for (let i = 0; i < words.length; i++) {
    if (words[i].start <= t) active = i;
  }
  if (active < 0) return null;

  const starts = chunkStarts(words);
  const chunkIndex = starts.filter((s) => s <= active).length - 1;
  const chunkStart = starts[chunkIndex];
  const chunk = words.slice(chunkStart, starts[chunkIndex + 1] ?? words.length);
  const since = t - words[active].start;

  return (
    <div
      style={{
        position: "absolute",
        left: 60,
        right: 60,
        top: 960,
        translate: "0 -50%",
        display: "flex",
        flexWrap: "wrap",
        justifyContent: "center",
        gap: "0 40px",
        fontFamily,
        fontWeight: 900,
        fontSize: 100,
        lineHeight: 1.05,
        textTransform: "uppercase",
        textAlign: "center",
      }}
    >
      {chunk.map((w, i) => {
        const isActive = chunkStart + i === active;
        const isKey = keywords.includes(w.word.toLowerCase().replace(/[^a-z0-9]/g, ""));
        return (
          <span
            key={chunkStart + i}
            style={{
              color: isKey ? "#4dff7a" : isActive ? "#ffe14d" : "#fff",
              fontSize: isKey ? 124 : undefined,
              WebkitTextStroke: "14px #000",
              paintOrder: "stroke fill",
              textShadow: "0 10px 0 rgba(0,0,0,0.6)",
              scale: isActive
                ? interpolate(since, [0, 0.12], [1.35, 1.1], {
                    extrapolateLeft: "clamp",
                    extrapolateRight: "clamp",
                    easing: Easing.bezier(0.34, 1.56, 0.64, 1),
                  })
                : 1,
              opacity: chunkStart + i <= active ? 1 : 0,
            }}
          >
            {w.word.replace(/[.,!?]/g, "")}
          </span>
        );
      })}
    </div>
  );
};
