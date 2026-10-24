// "Escape the rings": a ball bounces inside nested rotating rings, each with a
// gap. Slipping through a gap shatters that ring. Pure + deterministic so any
// frame renders identically.

export const W = 1080;
export const H = 960;
export const CX = W / 2;
export const CY = H / 2 - 10;
export const OUTER = 440;
export const BALL_R = 15;
export const RING_COUNT = 12;
export const ringRadius = (i: number) => 110 + i * 27;
export const GAP_DEG = 60;

const SUBSTEPS = 8;
const GRAVITY = 0.8;
const MIN_SPEED = 15;
const RESET_FRAMES = 40;

export const ringSpeed = (i: number, level: number) =>
  (i % 2 ? -1 : 1) * (1.1 + i * 0.07 + level * 0.15);
export const ringOffset = (i: number, level: number, seed: number) => (i * 137 + level * 61 + seed * 97) % 360;
// The wall's gap widens the longer the ball goes without escaping, so the
// bottom half never stalls for more than a couple of seconds.
export const gapFor = (sinceBreak: number) => GAP_DEG + Math.min(80, Math.max(0, sinceBreak - 15) * 2.5);
export const gapCenter = (i: number, level: number, frame: number, seed = 0) =>
  ringOffset(i, level, seed) + ringSpeed(i, level) * frame;

export type BreakEvent = { ring: number; level: number; frame: number; angle: number };
export type FrameState = {
  x: number;
  y: number;
  ring: number; // innermost intact ring
  level: number;
  levelStart: number;
  lastHit: number;
  escapes: number;
  gap: number; // current wall's gap, degrees
};

const norm = (deg: number) => ((((deg + 180) % 360) + 360) % 360) - 180;

// `seed` varies the ring layout so each story gets a different run.
export const simulate = (frames: number, seed = 0) => {
  const states: FrameState[] = [];
  const breaks: BreakEvent[] = [];
  let x = CX;
  let y = CY - 40;
  let vx = 6;
  let vy = -4;
  let ring = 0;
  let level = 0;
  let levelStart = 0;
  let lastHit = -100;
  let lastBreak = 0;
  let escapes = 0;
  let clearedAt = -1;
  const dt = 1 / SUBSTEPS;

  for (let f = 0; f < frames; f++) {
    if (clearedAt >= 0 && f - clearedAt > RESET_FRAMES) {
      level++;
      levelStart = f;
      lastBreak = f;
      ring = 0;
      clearedAt = -1;
      x = CX;
      y = CY - 40;
      vx = 6 * (level % 2 ? -1 : 1);
      vy = -4;
    }
    for (let s = 0; s < SUBSTEPS; s++) {
      vy += GRAVITY * dt;
      x += vx * dt;
      y += vy * dt;
      const dx = x - CX;
      const dy = y - CY;
      const d = Math.hypot(dx, dy);
      const wall = ring < RING_COUNT ? ringRadius(ring) : OUTER;
      if (d + BALL_R <= wall) continue;

      if (ring < RING_COUNT) {
        const angle = (Math.atan2(dy, dx) * 180) / Math.PI;
        const slack = (BALL_R / wall) * (180 / Math.PI);
        const diff = norm(angle - gapCenter(ring, level, f + s * dt, seed));
        if (Math.abs(diff) < gapFor(f - lastBreak) / 2 - slack) {
          breaks.push({ ring, level, frame: f, angle });
          lastBreak = f;
          ring++;
          escapes++;
          if (ring === RING_COUNT) clearedAt = f;
          continue;
        }
      }
      const nx = dx / d;
      const ny = dy / d;
      const dot = vx * nx + vy * ny;
      vx -= 2 * dot * nx;
      vy -= 2 * dot * ny;
      const speed = Math.hypot(vx, vy);
      const target = Math.max(speed, MIN_SPEED);
      vx = (vx / speed) * target;
      vy = (vy / speed) * target;
      x = CX + nx * (wall - BALL_R);
      y = CY + ny * (wall - BALL_R);
      lastHit = f;
    }
    states.push({ x, y, ring, level, levelStart, lastHit, escapes, gap: gapFor(f - lastBreak) });
  }
  return { states, breaks };
};
