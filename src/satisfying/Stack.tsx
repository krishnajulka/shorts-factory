import React, { useMemo } from "react";
import { Easing, interpolate, random, useCurrentFrame, useVideoConfig } from "remotion";

// Clean 3D stacking tower: each block slides in, drops on the stack, and any
// overhang is trimmed off and falls. Perfect drops flash and widen the block.

const W = 1080;
const H = 960;
const BLOCK_H = 56;
const DEPTH = 34; // isometric top-face depth
const START_W = 520;
const SLIDE = 30; // frames the block slides before dropping
const DROP = 6;
const STEP = SLIDE + DROP + 4;
const TOP_TARGET = 430; // screen y the tower's top settles at

type Block = { x: number; w: number; hue: number; cut?: { x: number; w: number }; perfect: boolean; start: number; from: number };

export const simulateStack = (frames: number, seed: number) => {
  const blocks: Block[] = [{ x: (W - START_W) / 2, w: START_W, hue: (seed * 37) % 360, perfect: false, start: -STEP, from: 0 }];
  for (let i = 1; i * STEP < frames; i++) {
    const below = blocks[i - 1];
    const fromLeft = i % 2 === 0;
    const perfect = random(`sp${seed}-${i}`) < 0.3;
    const err = perfect ? 0 : (random(`se${seed}-${i}`) - 0.5) * 2 * Math.min(70, below.w * 0.25);
    let x = below.x + err;
    let w = below.w;
    let cut: Block["cut"];
    if (!perfect) {
      // Keep only the overlap with the block below; the rest falls off.
      const l = Math.max(x, below.x);
      const r = Math.min(x + w, below.x + below.w);
      cut = err > 0 ? { x: r, w: x + w - r } : { x, w: l - x };
      x = l;
      w = r - l;
    } else {
      w = Math.min(START_W, w + 16);
      x = below.x - 8;
    }
    if (w < 140) {
      // Never let it get impossible: a generous reset keeps the loop going.
      w = START_W * 0.8;
      x = (W - w) / 2;
      cut = undefined;
    }
    blocks.push({ x, w, hue: (blocks[i - 1].hue + 11) % 360, cut, perfect, start: i * STEP, from: fromLeft ? -W * 0.6 : W * 0.6 });
  }
  return blocks;
};

export const stackSounds = (frames: number, seed: number) =>
  simulateStack(frames, seed)
    .slice(1)
    .filter((b) => b.start + SLIDE + DROP < frames)
    .map((b) => ({ frame: b.start + SLIDE + DROP, rate: b.perfect ? 1.5 : 1 }));

const Box: React.FC<{ x: number; y: number; w: number; hue: number; alpha?: number }> = ({ x, y, w, hue, alpha = 1 }) => (
  <g opacity={alpha}>
    <polygon points={`${x},${y} ${x + DEPTH},${y - DEPTH} ${x + w + DEPTH},${y - DEPTH} ${x + w},${y}`} fill={`hsl(${hue} 75% 82%)`} />
    <polygon points={`${x + w},${y} ${x + w + DEPTH},${y - DEPTH} ${x + w + DEPTH},${y - DEPTH + BLOCK_H} ${x + w},${y + BLOCK_H}`} fill={`hsl(${hue} 55% 58%)`} />
    <rect x={x} y={y} width={w} height={BLOCK_H} fill={`hsl(${hue} 65% 68%)`} />
  </g>
);

export const Stack: React.FC<{ seed: number }> = ({ seed }) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const blocks = useMemo(() => simulateStack(durationInFrames, seed), [durationInFrames, seed]);
  const current = Math.max(1, Math.min(blocks.length - 1, Math.floor(frame / STEP)));
  const placed = blocks.filter((b, i) => i === 0 || frame >= b.start + SLIDE + DROP);
  const height = placed.length;
  // Camera rises smoothly so the top of the tower stays at TOP_TARGET.
  const camera = interpolate(frame, [blocks[current].start, blocks[current].start + STEP], [Math.max(0, current - 1), current], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.inOut(Easing.quad),
  });
  const baseY = TOP_TARGET + camera * BLOCK_H;
  const yOf = (i: number) => baseY - i * BLOCK_H;
  const b = blocks[current];
  const t = frame - b.start;
  const lastPerfect = [...placed].reverse().find((p) => p.perfect);
  const perfectAge = lastPerfect ? frame - (lastPerfect.start + SLIDE + DROP) : 999;

  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{ display: "block", background: "linear-gradient(#eef3ff, #fdf2f8)" }}>
      <defs>
        <linearGradient id="stack-bg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={`hsl(${b.hue} 60% 94%)`} />
          <stop offset="1" stopColor={`hsl(${(b.hue + 40) % 360} 60% 97%)`} />
        </linearGradient>
      </defs>
      <rect width={W} height={H} fill="url(#stack-bg)" />
      {placed.map((p, i) =>
        yOf(i) < H + 60 && yOf(i) > -BLOCK_H ? <Box key={i} x={p.x} y={yOf(i)} w={p.w} hue={p.hue} /> : null,
      )}
      {/* trimmed overhang falling away */}
      {placed.map((p, i) => {
        if (!p.cut || i === 0) return null;
        const age = frame - (p.start + SLIDE + DROP);
        if (age < 0 || age > 40) return null;
        return <Box key={`c${i}`} x={p.cut.x + (p.cut.x > p.x ? age * 2 : -age * 2)} y={yOf(i) + age * age * 0.6} w={p.cut.w} hue={p.hue} alpha={1 - age / 40} />;
      })}
      {/* the block currently sliding in */}
      {frame < b.start + SLIDE + DROP && current < blocks.length ? (
        <Box
          x={b.x + (t < SLIDE ? interpolate(t, [0, SLIDE], [b.from, 0], { easing: Easing.out(Easing.quad) }) : 0)}
          y={yOf(current) - (t < SLIDE ? 40 : interpolate(t, [SLIDE, SLIDE + DROP], [40, 0], { extrapolateRight: "clamp" }))}
          w={b.w}
          hue={b.hue}
        />
      ) : null}
      {perfectAge < 22 ? (
        <text x={W / 2} y={TOP_TARGET - 120 - perfectAge * 2} textAnchor="middle" fontSize={64} fontWeight={900} fill="#fff" stroke={`hsl(${b.hue} 60% 50%)`} strokeWidth={10} paintOrder="stroke" fontFamily="Montserrat" opacity={1 - perfectAge / 22}>
          PERFECT!
        </text>
      ) : null}
      <text x={70} y={210} textAnchor="start" fontSize={84} fontWeight={900} fill={`hsl(${b.hue} 45% 45%)`} fontFamily="Montserrat" opacity={0.85}>
        {height - 1}
      </text>
    </svg>
  );
};
