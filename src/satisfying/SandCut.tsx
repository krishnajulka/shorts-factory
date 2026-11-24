import React, { useMemo } from "react";
import { Easing, interpolate, random, useCurrentFrame } from "remotion";

// Kinetic sand cutting: a knife slices thin layers off a striped sand block;
// each slice tips over and crumbles into grains. When the block runs out, a new
// one in fresh colours slides in. Deterministic per seed.

const W = 1080;
const H = 960;
const CUT_X = 330; // where the knife comes down
const TOP = 300;
const BOTTOM = 760;
const BLOCK_W = 620;
const SLICE = 40;
const CYCLE = 26; // frames per slice
const CUTS = Math.floor(BLOCK_W / SLICE) - 2;
const ENTER = 30; // frames for a new block to slide in
const BLOCK_FRAMES = CUTS * CYCLE + ENTER;

const PALETTES = [
  ["#ff9ec7", "#ffd27f", "#9ee6c9", "#9ec5ff", "#c9a7ff"],
  ["#ff8a80", "#ffcc80", "#fff59d", "#a5d6a7", "#80deea"],
  ["#b39ddb", "#f48fb1", "#80cbc4", "#ffe082", "#90caf9"],
  ["#ffab91", "#ce93d8", "#81d4fa", "#c5e1a5", "#fff176"],
];

export const sandCutSounds = (frames: number) => {
  const out: { frame: number; rate: number }[] = [];
  for (let f = 0; f < frames; f++) {
    const local = f % BLOCK_FRAMES;
    if (local >= ENTER && (local - ENTER) % CYCLE === 8) out.push({ frame: f, rate: 0.9 + random(`sc${f}`) * 0.3 });
  }
  return out;
};

// Wavy layer boundaries across the block (block coordinates), fixed per block.
const layerPaths = (key: string) => {
  const bands = 5;
  const h = (BOTTOM - TOP) / bands;
  const edge = (i: number, px: number) => {
    if (i === 0) return TOP;
    if (i === bands) return BOTTOM;
    const amp = 10 + random(`${key}a${i}`) * 18;
    const ph = random(`${key}p${i}`) * 6;
    return TOP + i * h + Math.sin(px / 90 + ph) * amp;
  };
  return new Array(bands).fill(0).map((_, i) => {
    const top: string[] = [];
    const bot: string[] = [];
    for (let px = 0; px <= BLOCK_W; px += 20) top.push(`${px},${edge(i, px)}`);
    for (let px = BLOCK_W; px >= 0; px -= 20) bot.push(`${px},${edge(i + 1, px)}`);
    return `M${top.join(" L")} L${bot.join(" L")} Z`;
  });
};

const Layers: React.FC<{ paths: string[]; palette: string[] }> = ({ paths, palette }) => (
  <>
    {paths.map((d, i) => (
      <path key={i} d={d} fill={palette[i]} />
    ))}
  </>
);

export const SandCut: React.FC<{ seed: number }> = ({ seed }) => {
  const frame = useCurrentFrame();
  const block = Math.floor(frame / BLOCK_FRAMES);
  const local = frame % BLOCK_FRAMES;
  const palette = PALETTES[(seed + block) % PALETTES.length];
  const key = `sand${seed}-${block}`;
  const paths = useMemo(() => layerPaths(key), [key]);
  const grains = useMemo(
    () =>
      new Array(220).fill(0).map((_, i) => ({
        x: random(`gx${i}`) * BLOCK_W,
        y: TOP + random(`gy${i}`) * (BOTTOM - TOP),
        r: 1.4 + random(`gr${i}`) * 1.8,
        light: random(`gc${i}`) > 0.5,
      })),
    [],
  );

  const slideIn = interpolate(local, [0, ENTER], [W, 0], { extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) });
  const t = Math.max(0, local - ENTER);
  const cut = Math.min(CUTS - 1, Math.floor(t / CYCLE));
  const phase = t - cut * CYCLE;
  const cutDone = phase >= 8;
  // After each cut the block shuffles left so the next slice sits under the knife.
  const shuffle = interpolate(phase, [14, 24], [0, SLICE], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.inOut(Easing.quad) });
  const blockX = CUT_X - SLICE + slideIn - (cut * SLICE + shuffle); // screen x of block coordinate 0
  const knifeY = interpolate(phase, [0, 8, 14], [TOP - 280, BOTTOM - 320, TOP - 280], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.inOut(Easing.quad),
  });
  const visibleFrom = (cut + (cutDone ? 1 : 0)) * SLICE;
  const clipId = `${key}-clip`;

  // Recently cut slices tip over, then crumble into grains.
  const slices: { k: number; age: number }[] = [];
  for (let k = Math.max(0, cut - 3); k <= cut; k++) {
    const age = t - k * CYCLE - 8;
    if (age >= 0) slices.push({ k, age });
  }

  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{ display: "block" }}>
      <defs>
        <linearGradient id="sand-bg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fff6ee" />
          <stop offset="1" stopColor="#f3e3d3" />
        </linearGradient>
        <clipPath id={clipId}>
          <rect x={visibleFrom} y={0} width={BLOCK_W} height={H} />
        </clipPath>
        {slices.map(({ k }) => (
          <clipPath key={k} id={`${key}-s${k}`}>
            <rect x={k * SLICE} y={0} width={SLICE} height={H} />
          </clipPath>
        ))}
      </defs>
      <rect width={W} height={H} fill="url(#sand-bg)" />
      <rect x={0} y={BOTTOM} width={W} height={H - BOTTOM} fill="#e8d2bd" />
      <ellipse cx={blockX + (visibleFrom + BLOCK_W) / 2} cy={BOTTOM + 8} rx={(BLOCK_W - visibleFrom) / 2 + 30} ry={16} fill="#000" opacity={0.12} />

      {/* the block, with a grainy sand texture */}
      <g transform={`translate(${blockX} 0)`} clipPath={`url(#${clipId})`}>
        <Layers paths={paths} palette={palette} />
        {grains.map((g, i) => (
          <circle key={i} cx={g.x} cy={g.y} r={g.r} fill={g.light ? "#fff" : "#000"} opacity={0.13} />
        ))}
        <rect x={visibleFrom} y={TOP} width={6} height={BOTTOM - TOP} fill="#000" opacity={0.08} />
      </g>

      {/* falling slices and their crumbs */}
      {slices.map(({ k, age }) => {
        const pivotX = blockX + k * SLICE;
        const tip = interpolate(age, [0, 12], [0, -85], { extrapolateRight: "clamp", easing: Easing.in(Easing.quad) });
        const crumble = Math.max(0, age - 12);
        return (
          <g key={k}>
            {crumble < 8 ? (
              <g transform={`rotate(${tip} ${pivotX} ${BOTTOM})`} opacity={1 - crumble / 8}>
                <g transform={`translate(${blockX} 0)`} clipPath={`url(#${key}-s${k})`}>
                  <Layers paths={paths} palette={palette} />
                </g>
              </g>
            ) : null}
            {crumble > 0
              ? new Array(28).fill(0).map((_, i) => {
                  const along = random(`${key}c${k}x${i}`);
                  const bandIndex = Math.min(palette.length - 1, Math.floor(along * palette.length));
                  const px = pivotX - 20 - along * (BOTTOM - TOP) * 0.95;
                  const spread = (random(`${key}c${k}s${i}`) - 0.5) * 70 * Math.min(1, crumble / 8);
                  const y = Math.min(BOTTOM - 6, BOTTOM - 40 + crumble * crumble * 0.9);
                  return (
                    <circle
                      key={i}
                      cx={px + spread}
                      cy={y - random(`${key}c${k}y${i}`) * 26}
                      r={5 + random(`${key}c${k}r${i}`) * 9}
                      fill={palette[palette.length - 1 - bandIndex]}
                      opacity={Math.max(0, 1 - crumble / 46)}
                    />
                  );
                })
              : null}
          </g>
        );
      })}

      {/* knife */}
      <g transform={`translate(${CUT_X} ${knifeY})`}>
        <rect x={-15} y={-150} width={30} height={150} rx={10} fill="#3b2f2a" />
        <rect x={-10} y={-140} width={6} height={130} rx={3} fill="#6b5a52" />
        <polygon points="-8,0 8,0 8,300 -8,332" fill="#d9dde3" stroke="#9aa3ad" strokeWidth={3} />
        <polygon points="-8,0 0,0 0,322 -8,332" fill="#fff" opacity={0.6} />
      </g>
      <text x={W - 60} y={110} textAnchor="end" fontSize={64} fontWeight={900} fill="#c9a98d" fontFamily="Montserrat">
        {`CUTS: ${block * CUTS + cut + (cutDone ? 1 : 0)}`}
      </text>
    </svg>
  );
};
