import React, { useMemo } from "react";
import { interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import {
  BALL_R,
  CX,
  CY,
  GAP_DEG,
  H,
  OUTER,
  RING_COUNT,
  W,
  gapCenter,
  ringRadius,
  simulate,
} from "./ringsSim";

const TRAIL = 14;
const SHATTER_FRAMES = 22;
const hueOf = (ring: number, level: number) => (ring * 29 + level * 140) % 360;

// SVG arc of a ring with the gap cut out.
const arcPath = (r: number, gapMid: number, gap: number) => {
  const a0 = ((gapMid + gap / 2) * Math.PI) / 180;
  const a1 = ((gapMid + 360 - gap / 2) * Math.PI) / 180;
  const p = (a: number) => `${CX + Math.cos(a) * r} ${CY + Math.sin(a) * r}`;
  return `M ${p(a0)} A ${r} ${r} 0 1 1 ${p(a1)}`;
};

export const RingEscape: React.FC<{ seed: number }> = ({ seed }) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const sim = useMemo(() => simulate(durationInFrames, seed), [durationInFrames, seed]);
  const s = sim.states[Math.min(frame, sim.states.length - 1)];
  const hit = Math.max(0, 1 - (frame - s.lastHit) / 6);
  const trail = sim.states.slice(Math.max(s.levelStart, frame - TRAIL), frame);
  const shattering = sim.breaks.filter((b) => b.frame <= frame && frame - b.frame < SHATTER_FRAMES);
  const lastBreak = [...sim.breaks].reverse().find((b) => b.frame <= frame);
  const flash = lastBreak ? Math.max(0, 1 - (frame - lastBreak.frame) / 8) : 0;
  const ballHue = hueOf(s.ring, s.level + seed);

  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{ display: "block", background: "#06060c" }}>
      <circle cx={CX} cy={CY} r={OUTER} fill={`hsl(${ballHue} 90% 50%)`} opacity={0.05 + flash * 0.12} />
      <circle cx={CX} cy={CY} r={OUTER} fill="none" stroke="#2a2a3a" strokeWidth={6} />
      {new Array(RING_COUNT).fill(0).map((_, i) => {
        if (i < s.ring) return null;
        const hue = hueOf(i, s.level + seed);
        const appear = interpolate(frame - s.levelStart, [i * 2, i * 2 + 10], [0, 1], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        });
        const isWall = i === s.ring;
        return (
          <path
            key={`${s.level}-${i}`}
            d={arcPath(ringRadius(i) * appear, gapCenter(i, s.level, frame, seed), isWall ? s.gap : GAP_DEG)}
            fill="none"
            stroke={`hsl(${hue} 100% ${isWall ? 60 + hit * 20 : 55}%)`}
            strokeWidth={isWall ? 10 + hit * 6 : 8}
            strokeLinecap="round"
            opacity={appear}
          />
        );
      })}
      {shattering.map((b) =>
        new Array(28).fill(0).map((_, k) => {
          const age = (frame - b.frame) / SHATTER_FRAMES;
          const a = (k / 28) * Math.PI * 2;
          const r = ringRadius(b.ring) + age * 160;
          return (
            <circle
              key={`${b.level}-${b.ring}-${k}`}
              cx={CX + Math.cos(a) * r}
              cy={CY + Math.sin(a) * r + age * age * 120}
              r={7 * (1 - age)}
              fill={`hsl(${hueOf(b.ring, b.level + seed)} 100% 65%)`}
            />
          );
        }),
      )}
      {trail.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r={BALL_R * (0.4 + (0.6 * i) / TRAIL)} fill={`hsl(${ballHue} 100% 70%)`} opacity={(i / TRAIL) * 0.5} />
      ))}
      <circle cx={s.x} cy={s.y} r={BALL_R + hit * 4} fill="#fff" />
      <text x={70} y={H - 40} fontSize={44} fontWeight={900} fill="#fff" opacity={0.85} fontFamily="Montserrat">
        LEVEL {s.level + 1}
      </text>
      <text x={W - 70} y={H - 40} textAnchor="end" fontSize={44} fontWeight={900} fill="#fff" opacity={0.85} fontFamily="Montserrat">
        {s.escapes} ESCAPES
      </text>
    </svg>
  );
};
