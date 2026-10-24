import React, { useMemo } from "react";
import { random, useCurrentFrame, useVideoConfig } from "remotion";

// Self-playing brick breaker: three balls, a paddle that always gets there,
// and a fresh wall of bricks whenever one is cleared.

const W = 1080;
const H = 960;
const LEFT = 40;
const RIGHT = W - 40;
const TOP = 60;
const COLS = 10;
const ROWS = 9;
const BRICK_W = (RIGHT - LEFT) / COLS;
const BRICK_H = 38;
const BRICKS_TOP = 110;
const PADDLE_Y = 880;
const PADDLE_W = 210;
const BALL_R = 13;
const SPEED = 17;
const SUBSTEPS = 4;
const BALLS = 3;
const RESET_FRAMES = 25;

type Frame = { balls: { x: number; y: number }[]; paddle: number; level: number };
type Kill = { level: number; index: number; frame: number };

export const simulateBreakout = (frames: number, seed: number) => {
  const balls = new Array(BALLS).fill(0).map((_, i) => {
    const a = -Math.PI / 2 + (random(`ba${seed}-${i}`) - 0.5) * 1.6;
    return { x: W / 2 + (i - 1) * 120, y: PADDLE_Y - 60, vx: Math.cos(a) * SPEED, vy: Math.sin(a) * SPEED };
  });
  let alive = new Array(COLS * ROWS).fill(true);
  let level = 0;
  let clearedAt = -1;
  let paddle = W / 2;
  const states: Frame[] = [];
  const kills: Kill[] = [];

  for (let f = 0; f < frames; f++) {
    if (clearedAt >= 0 && f - clearedAt > RESET_FRAMES) {
      alive = new Array(COLS * ROWS).fill(true);
      level++;
      clearedAt = -1;
    }
    for (let s = 0; s < SUBSTEPS; s++) {
      for (const b of balls) {
        b.x += b.vx / SUBSTEPS;
        b.y += b.vy / SUBSTEPS;
        if (b.x < LEFT + BALL_R || b.x > RIGHT - BALL_R) {
          b.vx = -b.vx;
          b.x = Math.min(Math.max(b.x, LEFT + BALL_R), RIGHT - BALL_R);
        }
        if (b.y < TOP + BALL_R) {
          b.vy = Math.abs(b.vy);
        }
        if (b.vy > 0 && b.y + BALL_R >= PADDLE_Y && b.y < PADDLE_Y + 20 && Math.abs(b.x - paddle) < PADDLE_W / 2 + BALL_R) {
          const off = (b.x - paddle) / (PADDLE_W / 2);
          const a = -Math.PI / 2 + off * 1.0;
          b.vx = Math.cos(a) * SPEED;
          b.vy = Math.sin(a) * SPEED;
        }
        if (b.y > H + 40) {
          b.x = paddle;
          b.y = PADDLE_Y - 40;
          b.vy = -Math.abs(b.vy);
        }
        const col = Math.floor((b.x - LEFT) / BRICK_W);
        const row = Math.floor((b.y - BRICKS_TOP) / BRICK_H);
        if (col >= 0 && col < COLS && row >= 0 && row < ROWS && alive[row * COLS + col]) {
          alive[row * COLS + col] = false;
          kills.push({ level, index: row * COLS + col, frame: f });
          b.vy = -b.vy;
          if (clearedAt < 0 && alive.every((a) => !a)) clearedAt = f;
        }
      }
    }
    // Paddle chases the lowest falling ball.
    const target = balls.filter((b) => b.vy > 0).sort((a, b) => b.y - a.y)[0] ?? balls[0];
    paddle += Math.max(-45, Math.min(45, target.x - paddle));
    paddle = Math.min(Math.max(paddle, LEFT + PADDLE_W / 2), RIGHT - PADDLE_W / 2);
    states.push({ balls: balls.map((b) => ({ x: b.x, y: b.y })), paddle, level });
  }
  return { states, kills };
};

export const breakoutSounds = (frames: number, seed: number) =>
  simulateBreakout(frames, seed).kills.map((k) => ({ frame: k.frame, rate: 1.4 - Math.floor(k.index / COLS) * 0.06 }));

export const Breakout: React.FC<{ seed: number }> = ({ seed }) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const sim = useMemo(() => simulateBreakout(durationInFrames, seed), [durationInFrames, seed]);
  const s = sim.states[Math.min(frame, sim.states.length - 1)];
  const killFrame = new Map(sim.kills.filter((k) => k.level === s.level).map((k) => [k.index, k.frame]));
  const broken = sim.kills.filter((k) => k.frame <= frame).length;

  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{ display: "block", background: "#08080f" }}>
      <rect x={LEFT - 6} y={TOP - 6} width={RIGHT - LEFT + 12} height={H} fill="none" stroke="#2a2a44" strokeWidth={6} />
      {new Array(COLS * ROWS).fill(0).map((_, i) => {
        const k = killFrame.get(i);
        const age = k === undefined ? -1 : frame - k;
        if (age > 10) return null;
        const row = Math.floor(i / COLS);
        const col = i % COLS;
        const shrink = age >= 0 ? 1 - age / 10 : 1;
        const hue = (row * 38 + seed * 11 + s.level * 90) % 360;
        return (
          <rect
            key={`${s.level}-${i}`}
            x={LEFT + col * BRICK_W + 4 + ((1 - shrink) * BRICK_W) / 2}
            y={BRICKS_TOP + row * BRICK_H + 4 + ((1 - shrink) * BRICK_H) / 2}
            width={(BRICK_W - 8) * shrink}
            height={(BRICK_H - 8) * shrink}
            rx={6}
            fill={age >= 0 ? "#fff" : `hsl(${hue} 90% 60%)`}
          />
        );
      })}
      <rect x={s.paddle - PADDLE_W / 2} y={PADDLE_Y} width={PADDLE_W} height={20} rx={10} fill="#fff" />
      {s.balls.map((b, i) => (
        <circle key={i} cx={b.x} cy={b.y} r={BALL_R} fill="#fff" />
      ))}
      <text x={W - 70} y={H - 20} textAnchor="end" fontSize={40} fontWeight={900} fill="#fff" opacity={0.85} fontFamily="Montserrat">
        {broken} BRICKS
      </text>
    </svg>
  );
};
