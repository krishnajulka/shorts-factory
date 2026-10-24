import React from "react";
import { Easing, interpolate, random, useCurrentFrame, useVideoConfig } from "remotion";

// "Will it hit the corner?": a block bounces around the box, changing color
// on every wall, with near misses — and lands perfectly in a corner at the end.

const W = 1080;
const H = 960;
const TOP = 200;
const BOX_W = 250;
const BOX_H = 130;
const SPAN_X = W - BOX_W;
const SPAN_Y = H - TOP - BOX_H;
const HIT_AT = 0.93;

// Triangle wave: phase 0→1 goes 0→1, 1→2 goes back to 0.
const tri = (phase: number) => {
  const p = ((phase % 2) + 2) % 2;
  return p <= 1 ? p : 2 - p;
};

// Phases chosen so both axes reach a wall at exactly the hit frame.
const paths = (frames: number, seed: number) => {
  const T = frames * HIT_AT;
  const nx = Math.max(3, Math.round((T * 7.5) / SPAN_X));
  const ny = Math.max(3, Math.round((T * 5.5) / SPAN_Y));
  const x0 = 0.15 + random(`cx${seed}`) * 0.6;
  const y0 = 0.15 + random(`cy${seed}`) * 0.6;
  return { T, x0, y0, vx: (nx - x0) / T, vy: (ny - y0) / T };
};

const phasesAt = (frames: number, seed: number, frame: number) => {
  const p = paths(frames, seed);
  const t = Math.min(frame, p.T);
  return { px: p.x0 + p.vx * t, py: p.y0 + p.vy * t, T: p.T };
};

export const cornerSounds = (frames: number, seed: number) => {
  const out: { frame: number; rate: number }[] = [];
  const { T } = paths(frames, seed);
  for (let f = 1; f <= Math.ceil(T); f++) {
    const a = phasesAt(frames, seed, f - 1);
    const b = phasesAt(frames, seed, f);
    if (Math.floor(a.px) !== Math.floor(b.px) || Math.floor(a.py) !== Math.floor(b.py)) out.push({ frame: f, rate: 0.9 + (out.length % 6) * 0.08 });
  }
  return out;
};

export const Corner: React.FC<{ seed: number }> = ({ seed }) => {
  const frame = useCurrentFrame();
  const { durationInFrames, fps } = useVideoConfig();
  const { px, py, T } = phasesAt(durationInFrames, seed, frame);
  const x = tri(px) * SPAN_X;
  const y = TOP + tri(py) * SPAN_Y;
  const bounces = Math.floor(px) + Math.floor(py);
  const hue = (bounces * 47 + seed * 31) % 360;
  const hit = frame >= T;
  const since = (frame - T) / fps;
  // How close to a corner right now (for the "SO CLOSE" tension).
  const near = Math.min(Math.min(x, SPAN_X - x) + Math.min(y - TOP, TOP + SPAN_Y - y), 999);

  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{ display: "block", background: "#05050a" }}>
      <rect x={3} y={TOP - 3} width={W - 6} height={H - TOP} fill="none" stroke="#2c2c40" strokeWidth={6} />
      {[
        [0, TOP],
        [W, TOP],
        [0, H],
        [W, H],
      ].map(([cx, cy], i) => (
        <circle key={i} cx={cx} cy={cy} r={hit ? 60 + since * 200 : 26} fill={`hsl(${hue} 100% 60%)`} opacity={hit ? Math.max(0, 0.8 - since) : 0.35} />
      ))}
      <g transform={`translate(${x} ${y}) scale(${hit ? interpolate(since, [0, 0.15, 0.4], [1, 1.25, 1], { extrapolateRight: "clamp", easing: Easing.out(Easing.quad) }) : 1})`}>
        <rect width={BOX_W} height={BOX_H} rx={28} fill={`hsl(${hue} 95% 55%)`} stroke="#fff" strokeWidth={6} />
        <text x={BOX_W / 2} y={BOX_H / 2 + 30} textAnchor="middle" fontSize={84}>
          {hit ? "🤯" : "📀"}
        </text>
      </g>
      <text x={W / 2} y={170} textAnchor="middle" fontSize={56} fontWeight={900} fill="#fff" fontFamily="Montserrat" stroke="#000" strokeWidth={10} paintOrder="stroke">
        {hit ? "IT HIT THE CORNER!!" : near < 40 ? "SO CLOSE 😱" : "WILL IT HIT THE CORNER? 👀"}
      </text>
      <text x={W - 40} y={H - 30} textAnchor="end" fontSize={40} fontWeight={900} fill="#fff" opacity={0.8} fontFamily="Montserrat">
        {bounces} BOUNCES
      </text>
    </svg>
  );
};
