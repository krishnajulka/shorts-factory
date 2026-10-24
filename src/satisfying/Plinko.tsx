import React, { useMemo } from "react";
import { random, useCurrentFrame, useVideoConfig } from "remotion";

// Plinko board: a ball drops every few frames, bounces down the peg triangle
// and stacks up in a bin. Every ball is simulated independently up front.

const W = 1080;
const H = 960;
const ROWS = 10;
const GAP = 84;
const TOP = 120;
const ROW_H = 64;
const PEG_R = 9;
const BALL_R = 15;
const SPAWN_EVERY = 9;
const GRAVITY = 0.55;
const SUBSTEPS = 4;
const BIN_TOP = TOP + ROWS * ROW_H + 20;
const FLOOR = H - 40;

const pegs = (() => {
  const out: { x: number; y: number }[] = [];
  for (let r = 0; r < ROWS; r++) {
    const n = r + 3;
    for (let k = 0; k < n; k++) out.push({ x: W / 2 + (k - (n - 1) / 2) * GAP, y: TOP + r * ROW_H });
  }
  return out;
})();
const lastRow = ROWS + 2;
const binEdges = new Array(lastRow + 1).fill(0).map((_, k) => W / 2 + (k - lastRow / 2) * GAP);
const BINS = binEdges.length - 1;

type Ball = { spawn: number; path: { x: number; y: number }[]; bin: number; land: number; slot: number; hue: number };

export const simulatePlinko = (frames: number, seed: number) => {
  const balls: Ball[] = [];
  const fill = new Array(BINS).fill(0);
  for (let spawn = 0, i = 0; spawn < frames; spawn += SPAWN_EVERY, i++) {
    let x = W / 2 + (random(`pk${seed}-${i}`) - 0.5) * 30;
    let y = TOP - 70;
    let vx = 0;
    let vy = 0;
    const path: { x: number; y: number }[] = [];
    for (let f = 0; f < 400 && y < BIN_TOP; f++) {
      for (let s = 0; s < SUBSTEPS; s++) {
        vy += GRAVITY / SUBSTEPS;
        x += vx / SUBSTEPS;
        y += vy / SUBSTEPS;
        for (const p of pegs) {
          const dx = x - p.x;
          const dy = y - p.y;
          const d = Math.hypot(dx, dy);
          if (d < PEG_R + BALL_R && d > 0) {
            const nx = dx / d;
            const ny = dy / d;
            x = p.x + nx * (PEG_R + BALL_R);
            y = p.y + ny * (PEG_R + BALL_R);
            const dot = vx * nx + vy * ny;
            vx = (vx - 1.5 * dot * nx) * 0.9 + (random(`pj${seed}-${i}-${f}-${s}`) - 0.5) * 1.2;
            vy = (vy - 1.5 * dot * ny) * 0.9;
          }
        }
        x = Math.min(Math.max(x, binEdges[0] + BALL_R), binEdges[BINS] - BALL_R);
      }
      path.push({ x, y });
    }
    const bin = Math.min(BINS - 1, Math.max(0, Math.floor((x - binEdges[0]) / GAP)));
    const slot = fill[bin]++;
    balls.push({ spawn, path, bin, land: spawn + path.length, slot, hue: (bin * 32 + seed * 7) % 360 });
  }
  return balls;
};

// Ball landing frames, for click sounds (higher pitch for outer bins).
export const plinkoSounds = (frames: number, seed: number) =>
  simulatePlinko(frames, seed)
    .filter((b) => b.land < frames)
    .map((b) => ({ frame: b.land, rate: 0.9 + Math.abs(b.bin - BINS / 2) * 0.08 }));

export const Plinko: React.FC<{ seed: number }> = ({ seed }) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const balls = useMemo(() => simulatePlinko(durationInFrames, seed), [durationInFrames, seed]);
  const counts = new Array(BINS).fill(0);
  for (const b of balls) if (b.land <= frame) counts[b.bin]++;
  const perRow = 2;

  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{ display: "block", background: "#0a0716" }}>
      {binEdges.map((x, i) => (
        <line key={i} x1={x} y1={BIN_TOP} x2={x} y2={FLOOR} stroke="#3b3360" strokeWidth={6} />
      ))}
      <line x1={binEdges[0]} y1={FLOOR} x2={binEdges[BINS]} y2={FLOOR} stroke="#3b3360" strokeWidth={6} />
      {pegs.map((p, i) => {
        const near = balls.some((b) => frame >= b.spawn && frame < b.land && Math.hypot(b.path[frame - b.spawn].x - p.x, b.path[frame - b.spawn].y - p.y) < 40);
        return <circle key={i} cx={p.x} cy={p.y} r={PEG_R + (near ? 4 : 0)} fill={near ? "#fff" : "#8f86c9"} />;
      })}
      {balls.map((b, i) => {
        if (frame < b.spawn) return null;
        if (frame < b.land) {
          const p = b.path[frame - b.spawn];
          return <circle key={i} cx={p.x} cy={p.y} r={BALL_R} fill={`hsl(${b.hue} 95% 60%)`} stroke="#fff" strokeWidth={3} />;
        }
        const col = b.slot % perRow;
        const row = Math.floor(b.slot / perRow);
        const y = FLOOR - BALL_R - 4 - row * (BALL_R * 2 - 2);
        if (y < BIN_TOP) return null;
        return <circle key={i} cx={binEdges[b.bin] + GAP / 2 + (col - 0.5) * (BALL_R * 2 + 2)} cy={y} r={BALL_R} fill={`hsl(${b.hue} 95% 60%)`} />;
      })}
      {counts.map((c, i) => (
        <text key={i} x={binEdges[i] + GAP / 2} y={BIN_TOP - 12} textAnchor="middle" fontSize={30} fontWeight={900} fill="#fff" opacity={0.85} fontFamily="Montserrat">
          {c}
        </text>
      ))}
    </svg>
  );
};
