import React, { useMemo } from "react";
import { random, useCurrentFrame, useVideoConfig } from "remotion";

// Color territory battle: two teams' balls bounce through their own color and
// flip every enemy cell they hit. The score swings back and forth all video.

const W = 1080;
const H = 960;
const CELL = 45;
const COLS = W / CELL;
const TOP = 195; // below the captions that overlap the split line
const ROWS = Math.floor((H - TOP) / CELL);
const BALL_R = 14;
const SPEED = 13;
const SUBSTEPS = 3;
const BALLS_PER_TEAM = 3;

const PALETTES = [
  ["#ff3b5c", "#2f7bff"],
  ["#ffd23f", "#7b2ff7"],
  ["#00e0a4", "#ff6b00"],
  ["#ff4fd8", "#00c2ff"],
];
export const territoryColors = (seed: number) => PALETTES[seed % PALETTES.length];

type Sim = { grids: Uint8Array[]; balls: { x: number; y: number; team: number }[][]; flips: { frame: number; team: number }[] };

export const simulateTerritory = (frames: number, seed: number): Sim => {
  const grid = new Uint8Array(COLS * ROWS);
  for (let c = 0; c < COLS; c++) for (let r = 0; r < ROWS; r++) grid[r * COLS + c] = c < COLS / 2 ? 0 : 1;
  const balls = new Array(BALLS_PER_TEAM * 2).fill(0).map((_, i) => {
    const team = i % 2;
    const a = random(`ta${seed}-${i}`) * Math.PI * 2;
    return {
      team,
      x: team === 0 ? W * 0.25 : W * 0.75,
      y: TOP + (ROWS * CELL * (1 + Math.floor(i / 2))) / (BALLS_PER_TEAM + 1),
      vx: Math.cos(a) * SPEED,
      vy: Math.sin(a) * SPEED,
    };
  });
  const grids: Uint8Array[] = [];
  const positions: Sim["balls"] = [];
  const flips: Sim["flips"] = [];
  const cellAt = (x: number, y: number) => {
    const c = Math.floor(x / CELL);
    const r = Math.floor((y - TOP) / CELL);
    return c >= 0 && c < COLS && r >= 0 && r < ROWS ? r * COLS + c : -1;
  };

  for (let f = 0; f < frames; f++) {
    for (let s = 0; s < SUBSTEPS; s++) {
      for (const b of balls) {
        // Probe around the rim; an enemy cell flips and bounces the ball.
        for (let k = 0; k < 8; k++) {
          const a = (k / 8) * Math.PI * 2;
          const idx = cellAt(b.x + Math.cos(a) * BALL_R, b.y + Math.sin(a) * BALL_R);
          if (idx >= 0 && grid[idx] !== b.team) {
            grid[idx] = b.team;
            flips.push({ frame: f, team: b.team });
            // Sometimes punch straight through for deep raids into enemy turf.
            if (random(`tp${seed}-${flips.length}`) < 0.45) break;
            if (Math.abs(Math.cos(a)) > Math.abs(Math.sin(a))) b.vx = -b.vx;
            else b.vy = -b.vy;
            break;
          }
        }
        // Momentum swings: teams take turns being fast, so the lead changes hands.
        const boost = 1 + 0.6 * Math.sin((f / frames) * Math.PI * 6 + (b.team ? Math.PI : 0) + seed);
        b.x += (b.vx * boost) / SUBSTEPS;
        b.y += (b.vy * boost) / SUBSTEPS;
        if (b.x < BALL_R || b.x > W - BALL_R) b.vx = -b.vx;
        if (b.y < TOP + BALL_R || b.y > TOP + ROWS * CELL - BALL_R) b.vy = -b.vy;
        b.x = Math.min(Math.max(b.x, BALL_R), W - BALL_R);
        b.y = Math.min(Math.max(b.y, TOP + BALL_R), TOP + ROWS * CELL - BALL_R);
      }
    }
    grids.push(grid.slice());
    positions.push(balls.map((b) => ({ x: b.x, y: b.y, team: b.team })));
  }
  return { grids, balls: positions, flips };
};

// One soft blip at most every 3 frames, pitched by team.
export const territorySounds = (frames: number, seed: number) => {
  const out: { frame: number; rate: number }[] = [];
  let last = -10;
  for (const f of simulateTerritory(frames, seed).flips) {
    if (f.frame - last >= 3) {
      out.push({ frame: f.frame, rate: f.team ? 1.25 : 0.9 });
      last = f.frame;
    }
  }
  return out;
};

export const Territory: React.FC<{ seed: number }> = ({ seed }) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const sim = useMemo(() => simulateTerritory(durationInFrames, seed), [durationInFrames, seed]);
  const f = Math.min(frame, durationInFrames - 1);
  const grid = sim.grids[f];
  const colors = territoryColors(seed);
  let a = 0;
  for (const v of grid) if (v === 0) a++;
  const b = grid.length - a;

  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{ display: "block", background: "#0b0b12" }}>
      {Array.from(grid).map((v, i) => (
        <rect key={i} x={(i % COLS) * CELL} y={TOP + Math.floor(i / COLS) * CELL} width={CELL} height={CELL} fill={colors[v]} stroke="#0b0b12" strokeWidth={2} />
      ))}
      {sim.balls[f].map((p, i) => (
        // Each ball wears the other team's color so it pops against its own turf.
        <circle key={i} cx={p.x} cy={p.y} r={BALL_R} fill={colors[1 - p.team]} stroke="#fff" strokeWidth={4} />
      ))}
      <rect x={0} y={115} width={(a / grid.length) * W} height={70} fill={colors[0]} />
      <rect x={(a / grid.length) * W} y={115} width={(b / grid.length) * W} height={70} fill={colors[1]} />
      <text x={40} y={165} fontSize={44} fontWeight={900} fill="#fff" fontFamily="Montserrat" stroke="#000" strokeWidth={6} paintOrder="stroke">
        {a}
      </text>
      <text x={W - 40} y={165} textAnchor="end" fontSize={44} fontWeight={900} fill="#fff" fontFamily="Montserrat" stroke="#000" strokeWidth={6} paintOrder="stroke">
        {b}
      </text>
      <text x={W / 2} y={165} textAnchor="middle" fontSize={40} fontWeight={900} fill="#fff" fontFamily="Montserrat" stroke="#000" strokeWidth={6} paintOrder="stroke">
        WHICH COLOR WINS?
      </text>
    </svg>
  );
};
