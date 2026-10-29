import React from "react";
import { random, useCurrentFrame } from "remotion";

// Clean "satisfying cutting": a blade slices layered soap bars; each slice tips
// over and falls away. Pure function of the frame.

const W = 1080;
const H = 960;
const CUT_X = 730; // where the blade comes down
const BAR_W = 576;
const BAR_H = 380;
const BAR_Y = 330; // top of the bar
const SLICE = 48;
const SLICES_PER_BAR = BAR_W / SLICE;
const SLICE_FRAMES = 22;
const BAR_FRAMES = SLICE_FRAMES * SLICES_PER_BAR + 30; // + time to slide a new bar in
const BLADE_DOWN = 0.42; // share of a slice cycle spent cutting

const palette = (seed: number, bar: number) => {
  const base = (seed * 47 + bar * 67) % 360;
  return [0, 18, 36, 54].map((d) => `hsl(${(base + d) % 360} 70% ${78 - d / 6}%)`);
};

export const soapSounds = (frames: number) => {
  const out: { frame: number; rate: number }[] = [];
  for (let f = 0; f < frames; f++) {
    const local = f % BAR_FRAMES;
    if (local < 30) continue;
    if ((local - 30) % SLICE_FRAMES === Math.round(SLICE_FRAMES * BLADE_DOWN)) out.push({ frame: f, rate: 1.1 + (out.length % 4) * 0.06 });
  }
  return out;
};

const Bar: React.FC<{ x: number; width: number; colors: string[]; seed: number; bar: number }> = ({ x, width, colors, seed, bar }) => {
  const band = BAR_H / colors.length;
  return (
    <g>
      <rect x={x + 10} y={BAR_Y + BAR_H + 6} width={width} height={22} rx={11} fill="#000" opacity={0.08} />
      <clipPath id={`bar-clip-${bar}`}>
        <rect x={x} y={BAR_Y} width={width} height={BAR_H} rx={26} />
      </clipPath>
      <g clipPath={`url(#bar-clip-${bar})`}>
        {colors.map((c, i) => (
          <rect key={i} x={x} y={BAR_Y + i * band} width={width} height={band + 1} fill={c} />
        ))}
        {new Array(26).fill(0).map((_, i) => (
          <circle key={i} cx={x + random(`sp${seed}-${bar}-${i}`) * BAR_W} cy={BAR_Y + random(`sq${seed}-${bar}-${i}`) * BAR_H} r={2 + random(`sr${i}`) * 3} fill="#fff" opacity={0.55} />
        ))}
        <rect x={x} y={BAR_Y} width={width} height={22} fill="#fff" opacity={0.35} />
      </g>
    </g>
  );
};

export const Soap: React.FC<{ seed: number }> = ({ seed }) => {
  const frame = useCurrentFrame();
  const bar = Math.floor(frame / BAR_FRAMES);
  const local = frame % BAR_FRAMES;
  const colors = palette(seed, bar);

  // A fresh bar slides in from the left for the first 30 frames.
  const slideIn = local < 30 ? 1 - local / 30 : 0;
  const cycle = local < 30 ? -1 : Math.floor((local - 30) / SLICE_FRAMES);
  const p = local < 30 ? 0 : ((local - 30) % SLICE_FRAMES) / SLICE_FRAMES;
  const cut = cycle < 0 ? 0 : cycle + (p >= BLADE_DOWN ? 1 : 0);
  const remaining = BAR_W - cut * SLICE;
  // Blade tip: rests just above the bar, plunges to the floor, comes back up.
  const REST = BAR_Y - 50;
  const FLOOR = BAR_Y + BAR_H + 8;
  const tipY = cycle < 0 ? REST : p < BLADE_DOWN ? REST + (FLOOR - REST) * Math.pow(p / BLADE_DOWN, 1.6) : FLOOR - (FLOOR - REST) * ((p - BLADE_DOWN) / (1 - BLADE_DOWN));
  const barX = CUT_X - remaining - slideIn * 900;

  // The last few slices are still falling: tip over the cut edge and drop.
  const falling = [];
  for (let k = Math.max(0, cut - 3); k < cut; k++) {
    const age = local - 30 - k * SLICE_FRAMES - SLICE_FRAMES * BLADE_DOWN;
    if (age < 0) continue;
    const tip = Math.min(1, age / 10);
    const drop = Math.max(0, age - 8);
    falling.push({ k, rot: tip * 82 + drop * 2, x: CUT_X + tip * 30 + drop * 4, y: BAR_Y + drop * drop * 0.9 });
  }

  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{ display: "block", background: "#f6f1ea" }}>
      <rect x={0} y={BAR_Y + BAR_H + 20} width={W} height={H} fill="#ece4d8" />
      <rect x={0} y={BAR_Y + BAR_H + 18} width={W} height={4} fill="#ddd2c2" />
      {remaining > 0 ? <Bar x={barX} width={remaining} colors={colors} seed={seed} bar={bar} /> : null}
      {falling.map((s) => (
        <g key={s.k} transform={`translate(${s.x} ${s.y + BAR_H}) rotate(${s.rot}) translate(0 ${-BAR_H})`}>
          {colors.map((c, i) => (
            <rect key={i} x={0} y={(i * BAR_H) / colors.length} width={SLICE - 2} height={BAR_H / colors.length + 1} fill={c} />
          ))}
          <rect x={0} y={0} width={SLICE - 2} height={BAR_H} rx={6} fill="none" stroke="#000" strokeOpacity={0.06} strokeWidth={3} />
        </g>
      ))}
      {/* blade: steel strip with a handle, always on screen */}
      <g transform={`translate(${CUT_X} ${tipY})`}>
        <rect x={-14} y={-260} width={28} height={250} rx={4} fill="url(#steel)" stroke="#9aa5b1" strokeWidth={2} />
        <polygon points="-14,-12 14,-12 0,6" fill="#dfe5eb" />
        <rect x={-46} y={-330} width={92} height={78} rx={20} fill="#3d3a46" />
        <rect x={-46} y={-330} width={92} height={22} rx={11} fill="#57536a" />
      </g>
      <defs>
        <linearGradient id="steel" x1="0" x2="1">
          <stop offset="0" stopColor="#eef2f6" />
          <stop offset="0.5" stopColor="#b9c2cc" />
          <stop offset="1" stopColor="#f8fafc" />
        </linearGradient>
      </defs>
    </svg>
  );
};
