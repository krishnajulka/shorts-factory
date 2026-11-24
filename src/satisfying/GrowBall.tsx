import React, { useMemo } from "react";
import { random, useCurrentFrame, useVideoConfig } from "remotion";

// "It grows every time it bounces": a ball bounces around inside a circle and
// gets bigger with every hit, leaving a rainbow trail, until it fills the whole
// arena and pops into confetti. Then a new ball starts. Deterministic per seed.

const W = 1080;
const H = 960;
const CX = W / 2;
const CY = 490;
const R = 410; // arena radius
const START_R = 22;
const GROW = 9;
const GRAVITY = 0.55;
const SUBSTEPS = 4;
const POP_FRAMES = 24;
const TRAIL = 22;

type State = { x: number; y: number; r: number; hue: number; bounces: number; popAge: number };

export const simulateGrowBall = (frames: number, seed: number) => {
  const states: State[] = [];
  const hits: { frame: number; r: number }[] = [];
  let round = 0;
  const reset = () => ({
    x: CX + (random(`gbx${seed}-${round}`) - 0.5) * 200,
    y: CY - 150,
    vx: (random(`gbv${seed}-${round}`) - 0.5) * 22,
    vy: 0,
    r: START_R,
    hue: (seed * 47 + round * 90) % 360,
  });
  let b = reset();
  let bounces = 0;
  let popAge = -1;
  let cooldown = 0;
  for (let f = 0; f < frames; f++) {
    if (popAge >= 0) {
      popAge++;
      if (popAge > POP_FRAMES) {
        round++;
        b = reset();
        bounces = 0;
        popAge = -1;
      }
    } else {
      for (let s = 0; s < SUBSTEPS; s++) {
        b.vy += GRAVITY / SUBSTEPS;
        b.x += b.vx / SUBSTEPS;
        b.y += b.vy / SUBSTEPS;
        const dx = b.x - CX;
        const dy = b.y - CY;
        const d = Math.hypot(dx, dy);
        if (d + b.r > R) {
          const nx = dx / d;
          const ny = dy / d;
          const dot = b.vx * nx + b.vy * ny;
          if (dot > 0) {
            b.vx -= 2 * dot * nx;
            b.vy -= 2 * dot * ny;
            // A small sideways kick keeps the path from settling into a loop.
            const kick = (random(`gbk${seed}-${f}-${s}`) - 0.5) * 3;
            b.vx += -ny * kick;
            b.vy += nx * kick;
            // Keep it lively: never let the speed fade away.
            const speed = Math.hypot(b.vx, b.vy);
            if (speed < 17) {
              b.vx *= 17 / speed;
              b.vy *= 17 / speed;
            }
            if (cooldown <= 0) {
              b.r += GROW;
              b.hue = (b.hue + 13) % 360;
              bounces++;
              hits.push({ frame: f, r: b.r });
              cooldown = 3;
            }
          }
          const inside = R - b.r - 0.5;
          b.x = CX + nx * inside;
          b.y = CY + ny * inside;
        }
      }
      cooldown--;
      if (b.r >= R - 30) popAge = 0;
    }
    states.push({ x: b.x, y: b.y, r: b.r, hue: b.hue, bounces, popAge });
  }
  return { states, hits };
};

export const growBallSounds = (frames: number, seed: number) =>
  simulateGrowBall(frames, seed).hits.map((h) => ({ frame: h.frame, rate: 0.7 + (h.r / R) * 1.3 }));

export const GrowBall: React.FC<{ seed: number }> = ({ seed }) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const { states } = useMemo(() => simulateGrowBall(durationInFrames, seed), [durationInFrames, seed]);
  const s = states[Math.min(frame, states.length - 1)];
  const trail = [];
  for (let k = TRAIL; k >= 1; k--) {
    const p = states[frame - k];
    if (p && p.popAge < 0 && s.popAge < 0) trail.push({ ...p, k });
  }
  const popping = s.popAge >= 0;
  const flash = popping ? Math.max(0, 1 - s.popAge / 10) : 0;

  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{ display: "block" }}>
      <defs>
        <radialGradient id="gb-bg" cx="0.5" cy="0.45" r="0.8">
          <stop offset="0" stopColor="#2a2350" />
          <stop offset="1" stopColor="#0e0b1f" />
        </radialGradient>
        <radialGradient id="gb-shine" cx="0.35" cy="0.3" r="0.7">
          <stop offset="0" stopColor="#fff" stopOpacity={0.75} />
          <stop offset="0.35" stopColor="#fff" stopOpacity={0} />
        </radialGradient>
      </defs>
      <rect width={W} height={H} fill="url(#gb-bg)" />
      {/* arena ring glows in the ball's colour */}
      <circle cx={CX} cy={CY} r={R + 10} fill="none" stroke={`hsl(${s.hue} 90% 65%)`} strokeWidth={14} opacity={0.35} />
      <circle cx={CX} cy={CY} r={R + 4} fill="none" stroke="#fff" strokeWidth={6} />
      {trail.map((p) => (
        <circle key={p.k} cx={p.x} cy={p.y} r={p.r * (1 - p.k / (TRAIL * 1.6))} fill={`hsl(${p.hue} 90% 62%)`} opacity={0.5 * (1 - p.k / TRAIL)} />
      ))}
      {!popping ? (
        <g>
          <circle cx={s.x} cy={s.y} r={s.r} fill={`hsl(${s.hue} 90% 60%)`} stroke="#fff" strokeWidth={5} />
          <circle cx={s.x} cy={s.y} r={s.r} fill="url(#gb-shine)" />
        </g>
      ) : (
        new Array(36).fill(0).map((_, i) => {
          const a = (i / 36) * Math.PI * 2 + random(`gpa${seed}-${i}`);
          const v = 14 + random(`gpv${seed}-${i}`) * 16;
          const age = s.popAge;
          const px = CX + Math.cos(a) * v * age;
          const py = CY + Math.sin(a) * v * age + 0.6 * age * age;
          return (
            <rect
              key={i}
              x={px}
              y={py}
              width={22}
              height={34}
              fill={`hsl(${(s.hue + i * 25) % 360} 90% 62%)`}
              transform={`rotate(${age * 20 + i * 30} ${px + 11} ${py + 17})`}
              opacity={1 - age / POP_FRAMES}
            />
          );
        })
      )}
      {flash > 0 ? <circle cx={CX} cy={CY} r={R} fill="#fff" opacity={flash * 0.8} /> : null}
      <text x={CX} y={935} textAnchor="middle" fontSize={48} fontWeight={900} fill="#fff" fontFamily="Montserrat" letterSpacing={2}>
        {`BOUNCES: ${s.bounces}`}
      </text>
    </svg>
  );
};
