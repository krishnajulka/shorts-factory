import React, { useMemo } from "react";
import { Easing, interpolate, random, useCurrentFrame, useVideoConfig } from "remotion";

// Rainbow jar fill: glossy balls pour in one after another, bounce into their
// spot and stack up in colour bands until the jar is full; then the lid pops,
// the jar tips and empties, and it starts again. Deterministic per seed.

const W = 1080;
const H = 960;
const JAR_L = 250;
const JAR_R = 830;
const JAR_BOTTOM = 880;
const JAR_TOP = 250;
const BALL = 26; // radius
const EVERY = 2; // frames between balls
const FALL = 16; // frames to fall into place
const EMPTY = 40; // frames to tip out

// Hex-packed slots inside the jar, bottom row first.
const slots = (() => {
  const out: { x: number; y: number; row: number }[] = [];
  const dy = BALL * Math.sqrt(3);
  for (let row = 0; JAR_BOTTOM - BALL - row * dy > JAR_TOP + BALL; row++) {
    const y = JAR_BOTTOM - BALL - 6 - row * dy;
    const offset = row % 2 ? BALL : 0;
    for (let x = JAR_L + BALL + 8 + offset; x < JAR_R - BALL - 6; x += BALL * 2) out.push({ x, y, row });
  }
  return out;
})();
const FILL_FRAMES = slots.length * EVERY + FALL;
const CYCLE = FILL_FRAMES + 20 + EMPTY;

export const jarFillSounds = (frames: number, seed: number) => {
  const out: { frame: number; rate: number }[] = [];
  for (let f = 0; f < frames; f++) {
    const local = f % CYCLE;
    const i = (local - FALL) / EVERY;
    // A soft tick on every third landing; pitch climbs as the jar fills.
    if (Number.isInteger(i) && i >= 0 && i < slots.length && i % 3 === 0) out.push({ frame: f, rate: 0.8 + (i / slots.length) * 1.2 + random(`jf${seed}${f}`) * 0.05 });
  }
  return out;
};

export const JarFill: React.FC<{ seed: number }> = ({ seed }) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const cycle = Math.floor(frame / CYCLE);
  const local = frame % CYCLE;
  const baseHue = (seed * 53 + cycle * 70) % 360;
  const rows = useMemo(() => Math.max(...slots.map((s) => s.row)) + 1, []);
  const tip = interpolate(local, [FILL_FRAMES + 20, FILL_FRAMES + 20 + EMPTY * 0.6], [0, -110], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.in(Easing.cubic),
  });
  const placed = Math.max(0, Math.min(slots.length, Math.floor((local - FALL) / EVERY) + 1));
  const pct = Math.round((placed / slots.length) * 100);
  void durationInFrames;

  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{ display: "block" }}>
      <defs>
        <linearGradient id="jar-bg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={`hsl(${baseHue} 70% 93%)`} />
          <stop offset="1" stopColor={`hsl(${(baseHue + 60) % 360} 70% 88%)`} />
        </linearGradient>
        <radialGradient id="jar-shine" cx="0.35" cy="0.3" r="0.65">
          <stop offset="0" stopColor="#fff" stopOpacity={0.85} />
          <stop offset="0.4" stopColor="#fff" stopOpacity={0} />
        </radialGradient>
      </defs>
      <rect width={W} height={H} fill="url(#jar-bg)" />
      <g transform={`rotate(${tip} ${JAR_R} ${JAR_BOTTOM})`}>
        {slots.map((s, i) => {
          const start = i * EVERY;
          const age = local - start;
          if (age < 0) return null;
          // Drop from the spout, land with a little bounce.
          const fromX = W / 2 + (random(`jx${seed}-${cycle}-${i}`) - 0.5) * 60;
          const p = Math.min(1, age / FALL);
          const x = fromX + (s.x - fromX) * Easing.out(Easing.quad)(p);
          const land = age >= FALL ? Math.max(0, Math.sin(((age - FALL) / 6) * Math.PI) * 10 * Math.exp(-(age - FALL) / 4)) : 0;
          const y = interpolate(p, [0, 1], [70, s.y], { easing: Easing.in(Easing.quad) }) - land;
          const hue = (baseHue + (s.row / rows) * 300) % 360;
          // When tipping, balls tumble out of the jar mouth.
          const out = local > FILL_FRAMES + 20 + EMPTY * 0.45 ? (local - (FILL_FRAMES + 20 + EMPTY * 0.45)) * (6 + (i % 7)) : 0;
          return (
            <g key={i} transform={`translate(${x - out * 0.3} ${y + out * 0.5 + out * out * 0.02})`}>
              <circle r={BALL} fill={`hsl(${hue} 85% 62%)`} stroke={`hsl(${hue} 60% 42%)`} strokeWidth={3} />
              <circle r={BALL} fill="url(#jar-shine)" />
            </g>
          );
        })}
        {/* the glass jar */}
        <path
          d={`M${JAR_L},${JAR_TOP - 30} L${JAR_L},${JAR_BOTTOM - 40} Q${JAR_L},${JAR_BOTTOM} ${JAR_L + 40},${JAR_BOTTOM} L${JAR_R - 40},${JAR_BOTTOM} Q${JAR_R},${JAR_BOTTOM} ${JAR_R},${JAR_BOTTOM - 40} L${JAR_R},${JAR_TOP - 30}`}
          fill="#fff"
          fillOpacity={0.12}
          stroke="#fff"
          strokeWidth={12}
          strokeLinejoin="round"
        />
        <rect x={JAR_L + 26} y={JAR_TOP + 10} width={22} height={JAR_BOTTOM - JAR_TOP - 90} rx={11} fill="#fff" opacity={0.45} />
      </g>
      {/* spout */}
      <rect x={W / 2 - 50} y={0} width={100} height={60} rx={14} fill="#2b2b3a" opacity={local < FILL_FRAMES ? 1 : 0.4} />
      <text x={70} y={130} fontSize={72} fontWeight={900} fill={`hsl(${baseHue} 50% 40%)`} fontFamily="Montserrat" opacity={0.85}>
        {`${pct}%`}
      </text>
    </svg>
  );
};
