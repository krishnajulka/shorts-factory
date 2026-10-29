import React, { useMemo } from "react";
import { useCurrentFrame, useVideoConfig } from "remotion";

// Clean domino wave, seen from above: pastel dominoes along a winding path
// tip over one after another; the wave reaches the last domino at the end.

const W = 1080;
const H = 960;
const TOP = 160;
const ROW_GAP = 66;
const SPACING = 40;
const FALL_FRAMES = 7;
const THICK = 16;
const TALL = 58;

type Domino = { x: number; y: number; angle: number; hue: number };

// Serpentine path: left→right, U-turn, right→left, ... filling the board.
const path = (seed: number): Domino[] => {
  const out: Domino[] = [];
  const rows = Math.floor((H - TOP - 40) / ROW_GAP);
  for (let r = 0; r < rows; r++) {
    const y = TOP + r * ROW_GAP;
    const ltr = r % 2 === 0;
    for (let x = 70; x <= W - 70; x += SPACING) {
      out.push({ x: ltr ? x : W - x, y, angle: ltr ? 0 : 180, hue: 0 });
    }
    if (r < rows - 1) {
      // Little U-turn of three dominoes at the end of the row.
      const ex = ltr ? W - 50 : 50;
      out.push({ x: ex, y: y + ROW_GAP / 2, angle: 90, hue: 0 });
    }
  }
  return out.map((d, i) => ({ ...d, hue: (seed * 29 + i * 1.6) % 360 }));
};

export const dominoSchedule = (frames: number, seed: number) => {
  const dominoes = path(seed);
  const per = (frames * 0.94) / dominoes.length; // frames between falls
  return { dominoes, per };
};

export const dominoSounds = (frames: number, seed: number) => {
  const { dominoes, per } = dominoSchedule(frames, seed);
  return dominoes.filter((_, i) => i % 2 === 0).map((_, k) => ({ frame: Math.round(k * 2 * per), rate: 1.2 + (k % 5) * 0.04 }));
};

export const Dominoes: React.FC<{ seed: number }> = ({ seed }) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const { dominoes, per } = useMemo(() => dominoSchedule(durationInFrames, seed), [durationInFrames, seed]);
  const fallen = Math.min(dominoes.length, Math.floor(frame / per));

  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{ display: "block", background: "#f7f3ee" }}>
      {dominoes.map((d, i) => {
        const age = frame - i * per;
        const p = age <= 0 ? 0 : Math.min(1, age / FALL_FRAMES);
        // Top-down: a standing domino is a thin bar; it lengthens as it falls flat.
        const len = THICK + (TALL - THICK) * Math.sin((p * Math.PI) / 2);
        const sat = p > 0 ? 72 : 60;
        const light = p > 0 ? 66 : 70;
        return (
          <g key={i} transform={`translate(${d.x} ${d.y}) rotate(${d.angle})`}>
            <rect x={-2} y={-17} width={len + 4} height={38} rx={7} fill="#000" opacity={p > 0 ? 0.08 : 0.04} transform="translate(3 4)" />
            <rect x={0} y={-17} width={len} height={34} rx={6} fill={`hsl(${d.hue} ${sat}% ${light}%)`} stroke="#ffffff" strokeWidth={2} />
            {p >= 1 ? <circle cx={len / 2} cy={0} r={4} fill="#fff" opacity={0.8} /> : null}
          </g>
        );
      })}
      <text x={W / 2} y={H - 18} textAnchor="middle" fontSize={44} fontWeight={900} fill="#bdb3a6" fontFamily="Montserrat">
        {fallen} / {dominoes.length}
      </text>
    </svg>
  );
};
