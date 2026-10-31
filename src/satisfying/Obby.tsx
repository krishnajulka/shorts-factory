import React, { useMemo } from "react";
import { interpolate, random, useCurrentFrame, useVideoConfig } from "remotion";

// Blocky-avatar obstacle course ("obby"): a little block character runs and
// jumps across floating platforms over lava. Every 4th platform is a
// checkpoint that bumps the STAGE counter; now and then a jump falls short,
// the avatar drops into the lava and respawns at the last checkpoint.
// Original art drawn in code (no game footage, logos or sounds).

const W = 1080;
const H = 960;
const LAVA_Y = 830;
const RUN = 9; // px per frame
const JUMP = 22; // frames per jump
const FALL = 26;
const RESPAWN = 16;
const CHECKPOINT_EVERY = 4;
const COLORS = [212, 4, 48, 135, 280, 190, 25];

type Platform = { x: number; w: number; y: number; hue: number; checkpoint: boolean };
type Segment = {
  kind: "run" | "jump" | "fall" | "respawn";
  start: number;
  dur: number;
  x0: number;
  y0: number;
  x1: number;
  y1: number;
  stage: number;
};

const platformsFor = (seed: number, count: number): Platform[] => {
  const list: Platform[] = [];
  let x = 60;
  for (let i = 0; i < count; i++) {
    const r = (k: string) => random(`ob${seed}-${i}-${k}`);
    const checkpoint = i % CHECKPOINT_EVERY === 0;
    const w = checkpoint ? 300 : 150 + r("w") * 170;
    const y = i === 0 ? 640 : 540 + r("y") * 170;
    list.push({ x, w, y, hue: COLORS[Math.floor(r("c") * COLORS.length)], checkpoint });
    x += w + 150 + r("g") * 130;
  }
  return list;
};

// The whole run as timed segments, simulated once per render.
export const simulateObby = (frames: number, seed: number) => {
  const platforms = platformsFor(seed, 400);
  const segments: Segment[] = [];
  let t = 0;
  let i = 0;
  let x = platforms[0].x + 40;
  let lastCheckpoint = 0;
  let stage = 1;
  const failed = new Set<number>();
  while (t < frames && i < platforms.length - 1) {
    const p = platforms[i];
    const n = platforms[i + 1];
    // Run to the edge of this platform.
    const edge = p.x + p.w - 30;
    if (edge > x) {
      const dur = Math.max(4, Math.round((edge - x) / RUN));
      segments.push({ kind: "run", start: t, dur, x0: x, y0: p.y, x1: edge, y1: p.y, stage });
      t += dur;
    }
    // Some jumps fall short (never twice on the same gap, never near the start).
    const fails = i > 2 && !failed.has(i) && random(`obf${seed}-${i}`) < 0.12;
    if (fails) {
      failed.add(i);
      const gapMid = (p.x + p.w + n.x) / 2;
      segments.push({ kind: "fall", start: t, dur: FALL, x0: edge, y0: p.y, x1: gapMid, y1: LAVA_Y + 60, stage });
      t += FALL;
      const cp = platforms[lastCheckpoint];
      segments.push({ kind: "respawn", start: t, dur: RESPAWN, x0: cp.x + 60, y0: cp.y, x1: cp.x + 60, y1: cp.y, stage });
      t += RESPAWN;
      i = lastCheckpoint;
      x = cp.x + 60;
      continue;
    }
    const land = n.x + 30;
    segments.push({ kind: "jump", start: t, dur: JUMP, x0: edge, y0: p.y, x1: land, y1: n.y, stage });
    t += JUMP;
    i += 1;
    x = land;
    if (n.checkpoint && i > lastCheckpoint) {
      lastCheckpoint = i;
      stage += 1;
    }
  }
  return { platforms, segments };
};

export const obbySounds = (frames: number, seed: number) =>
  simulateObby(frames, seed)
    .segments.filter((s) => s.start < frames && s.kind !== "run")
    .map((s) => ({ frame: s.start, rate: s.kind === "jump" ? 1.25 : s.kind === "fall" ? 0.6 : 1.7 }));

// Where the avatar is at a frame, and how it moves.
const pose = (segments: Segment[], frame: number) => {
  const s = segments.find((seg) => frame >= seg.start && frame < seg.start + seg.dur) ?? segments[segments.length - 1];
  const k = Math.min(1, Math.max(0, (frame - s.start) / s.dur));
  if (s.kind === "jump") {
    const apex = Math.min(s.y0, s.y1) - 190;
    const y = (1 - k) * (1 - k) * s.y0 + 2 * (1 - k) * k * apex + k * k * s.y1;
    return { seg: s, x: s.x0 + (s.x1 - s.x0) * k, y, k };
  }
  if (s.kind === "fall") {
    // Arcs toward the gap, then drops into the lava.
    const x = s.x0 + (s.x1 - s.x0) * Math.min(1, k * 1.6);
    const y = s.y0 - 90 * Math.sin(Math.min(1, k * 1.6) * Math.PI * 0.5) + Math.max(0, k - 0.35) ** 2 * 1200;
    return { seg: s, x, y, k };
  }
  return { seg: s, x: s.x0 + (s.x1 - s.x0) * k, y: s.y0, k };
};

// A block platform with a lit top face and a darker side.
const Block: React.FC<{ p: Platform; cam: number; frame: number }> = ({ p, cam, frame }) => {
  const x = p.x - cam;
  const top = `hsl(${p.hue} 85% 62%)`;
  return (
    <g>
      <rect x={x} y={p.y} width={p.w} height={70} rx={8} fill={`hsl(${p.hue} 70% 46%)`} />
      <rect x={x} y={p.y} width={p.w} height={20} rx={6} fill={top} />
      {p.checkpoint ? (
        <g>
          <rect x={x + p.w / 2 - 70} y={p.y - 8} width={140} height={10} rx={4} fill="#3dff8a" opacity={0.6 + 0.4 * Math.sin(frame / 5)} />
          <line x1={x + p.w - 40} y1={p.y} x2={x + p.w - 40} y2={p.y - 120} stroke="#ddd" strokeWidth={6} />
          <polygon points={`${x + p.w - 40},${p.y - 120} ${x + p.w + 20},${p.y - 102} ${x + p.w - 40},${p.y - 84}`} fill="#3dff8a" />
        </g>
      ) : null}
    </g>
  );
};

// The blocky avatar: square head, torso, swinging arms and legs.
const Avatar: React.FC<{ x: number; y: number; running: boolean; airborne: boolean; frame: number; alpha: number }> = ({ x, y, running, airborne, frame, alpha }) => {
  const swing = running ? Math.sin(frame * 0.7) * 28 : airborne ? 22 : 0;
  const bottom = y; // feet
  const legH = 40;
  const torsoH = 44;
  const head = 40;
  return (
    <g opacity={alpha} transform={`translate(${x}, ${bottom}) scale(1.6)`}>
      <ellipse cx={0} cy={2} rx={28} ry={7} fill="rgba(0,0,0,0.25)" opacity={airborne ? 0 : 1} />
      <rect x={-20} y={-legH} width={18} height={legH} fill="#2b3a8c" transform={`rotate(${swing}, -11, ${-legH})`} />
      <rect x={2} y={-legH} width={18} height={legH} fill="#2b3a8c" transform={`rotate(${-swing}, 11, ${-legH})`} />
      <rect x={-24} y={-legH - torsoH} width={48} height={torsoH} rx={3} fill="#1fb6c9" />
      <rect x={-38} y={-legH - torsoH + 2} width={14} height={40} rx={3} fill="#f4c542" transform={`rotate(${-swing}, -31, ${-legH - torsoH + 4})`} />
      <rect x={24} y={-legH - torsoH + 2} width={14} height={40} rx={3} fill="#f4c542" transform={`rotate(${swing}, 31, ${-legH - torsoH + 4})`} />
      <rect x={-20} y={-legH - torsoH - head} width={head} height={head} rx={6} fill="#f4c542" />
      <rect x={-10} y={-legH - torsoH - head + 13} width={6} height={8} fill="#222" />
      <rect x={6} y={-legH - torsoH - head + 13} width={6} height={8} fill="#222" />
      <path d={`M -9 ${-legH - torsoH - 12} Q 1 ${-legH - torsoH - 5} 11 ${-legH - torsoH - 12}`} stroke="#222" strokeWidth={3} fill="none" />
    </g>
  );
};

export const Obby: React.FC<{ seed: number }> = ({ seed }) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const { platforms, segments } = useMemo(() => simulateObby(durationInFrames + 60, seed), [durationInFrames, seed]);
  const { seg, x, y, k } = pose(segments, frame);
  const cam = x - W * 0.36;
  const visible = platforms.filter((p) => p.x + p.w > cam - 40 && p.x < cam + W + 40);
  const respawning = seg.kind === "respawn";
  const fallen = seg.kind === "fall" && y > LAVA_Y;
  const alpha = respawning ? interpolate(k, [0, 0.6, 1], [0, 0, 1]) : fallen ? 0 : 1;
  const flash = respawning ? interpolate(k, [0, 0.3], [0.5, 0], { extrapolateRight: "clamp" }) : 0;

  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{ display: "block" }}>
      <defs>
        <linearGradient id="obby-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#6fc3ff" />
          <stop offset="1" stopColor="#c9ecff" />
        </linearGradient>
        <linearGradient id="obby-lava" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffb02e" />
          <stop offset="0.35" stopColor="#ff4d1a" />
          <stop offset="1" stopColor="#b3120a" />
        </linearGradient>
      </defs>
      <rect width={W} height={H} fill="url(#obby-sky)" />
      {/* blocky clouds drifting slower than the course (parallax) */}
      {[0, 1, 2, 3, 4].map((c) => {
        const cx = ((c * 420 - cam * 0.25) % (W + 400) + W + 400) % (W + 400) - 200;
        const cy = 90 + c * 37 + (c % 2) * 40;
        return (
          <g key={c} opacity={0.9}>
            <rect x={cx} y={cy} width={150} height={44} rx={10} fill="#fff" />
            <rect x={cx + 36} y={cy - 26} width={80} height={40} rx={10} fill="#fff" />
          </g>
        );
      })}
      {visible.map((p) => (
        <Block key={p.x} p={p} cam={cam} frame={frame} />
      ))}
      <Avatar x={x - cam} y={y} running={seg.kind === "run"} airborne={seg.kind === "jump" || seg.kind === "fall"} frame={frame} alpha={alpha} />
      {/* lava with a moving surface */}
      <path
        d={`M 0 ${LAVA_Y} ${Array.from({ length: 13 }, (_, j) => `L ${j * 90} ${LAVA_Y + Math.sin(frame / 8 + j) * 8}`).join(" ")} L ${W} ${LAVA_Y} L ${W} ${H} L 0 ${H} Z`}
        fill="url(#obby-lava)"
      />
      {seg.kind === "fall" && y > LAVA_Y - 40 ? (
        <text x={x - cam} y={LAVA_Y - 30} textAnchor="middle" fontSize={64} fontWeight={900} fill="#fff" stroke="#b3120a" strokeWidth={10} paintOrder="stroke" fontFamily="Montserrat">
          SPLASH!
        </text>
      ) : null}
      <rect x={40} y={56} width={300} height={84} rx={18} fill="rgba(20,30,60,0.55)" />
      <text x={190} y={114} textAnchor="middle" fontSize={50} fontWeight={900} fill="#fff" fontFamily="Montserrat">
        STAGE {seg.stage}
      </text>
      {flash > 0 ? <rect width={W} height={H} fill="#fff" opacity={flash} /> : null}
    </svg>
  );
};
