import React, { useMemo } from "react";
import { Easing, interpolate, random, useCurrentFrame, useVideoConfig } from "remotion";
import { defaultRacers } from "./Race";

// Elimination wheel: it spins, lands on one emoji, that one is out. The last
// one left wins just before the video ends.

const W = 1080;
const H = 960;
const CX = W / 2;
const CY = 590;
const R = 330;
const SPIN_SHARE = 0.75; // share of each round spent spinning
const EXTRA = [
  ["🍕", "🍔", "🌮", "🍩", "🌭", "🍟", "🧁", "🍪"],
  ["🦖", "🦈", "🐙", "🦄", "🐸", "🦉", "🐝", "🦀"],
  ["⚽", "🏀", "🎾", "🏈", "🎱", "🏐", "🥎", "🏓"],
];

export const wheelLineup = (seed: number, racers?: string[]) =>
  racers && racers.length >= 3 ? racers.slice(0, 8) : [...new Set([...EXTRA[seed % EXTRA.length], ...defaultRacers(seed)])].slice(0, 8);

type Round = { start: number; land: number; end: number; from: number; to: number; out: number; alive: number[] };

// Wheel angle (degrees) over time and which slot each round eliminates.
export const simulateWheel = (frames: number, seed: number, count: number) => {
  const rounds: Round[] = [];
  const roundLen = (frames * 0.93) / (count - 1);
  let alive = new Array(count).fill(0).map((_, i) => i);
  let angle = 0;
  for (let k = 0; k < count - 1; k++) {
    const pick = Math.floor(random(`wp${seed}-${k}`) * alive.length);
    const slice = 360 / alive.length;
    // Land so the chosen slice's middle sits under the top pointer.
    const target = -(pick * slice + slice / 2);
    const spins = 3 + Math.floor(random(`ws${seed}-${k}`) * 3);
    const to = angle + spins * 360 + ((((target - angle) % 360) + 360) % 360);
    const start = Math.round(k * roundLen);
    rounds.push({ start, land: Math.round(start + roundLen * SPIN_SHARE), end: Math.round(start + roundLen), from: angle, to, out: alive[pick], alive: [...alive] });
    alive = alive.filter((_, i) => i !== pick);
    angle = to;
  }
  return { rounds, winner: alive[0] };
};

const angleAt = (r: Round, frame: number) =>
  interpolate(frame, [r.start, r.land], [r.from, r.to], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.bezier(0.15, 0.6, 0.2, 1) });

// A tick every time a slice boundary passes the pointer (throttled).
export const wheelSounds = (frames: number, seed: number, count: number) => {
  const { rounds } = simulateWheel(frames, seed, count);
  const out: { frame: number; rate: number }[] = [];
  for (const r of rounds) {
    const slice = 360 / r.alive.length;
    let last = -10;
    for (let f = r.start + 1; f <= r.land; f++) {
      if (Math.floor(angleAt(r, f) / slice) !== Math.floor(angleAt(r, f - 1) / slice) && f - last >= 2) {
        out.push({ frame: f, rate: 1.3 });
        last = f;
      }
    }
    out.push({ frame: r.land, rate: 0.7 });
  }
  return out;
};

const slicePath = (a0: number, a1: number) => {
  const p = (a: number) => `${CX + Math.cos(((a - 90) * Math.PI) / 180) * R} ${CY + Math.sin(((a - 90) * Math.PI) / 180) * R}`;
  return `M ${CX} ${CY} L ${p(a0)} A ${R} ${R} 0 ${a1 - a0 > 180 ? 1 : 0} 1 ${p(a1)} Z`;
};

export const Wheel: React.FC<{ seed: number; racers?: string[] }> = ({ seed, racers }) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const lineup = wheelLineup(seed, racers);
  const sim = useMemo(() => simulateWheel(durationInFrames, seed, lineup.length), [durationInFrames, seed, lineup.length]);
  const round = sim.rounds.find((r) => frame < r.end) ;
  const done = !round;
  const alive = round ? round.alive : [sim.winner];
  const angle = round ? angleAt(round, frame) : sim.rounds[sim.rounds.length - 1].to;
  const landed = round && frame >= round.land;
  const slice = 360 / alive.length;
  const out = sim.rounds.filter((r) => frame >= r.end).map((r) => r.out);

  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{ display: "block", background: "#120a1f" }}>
      <text x={W / 2} y={175} textAnchor="middle" fontSize={64} fontWeight={900} fill="#fff" fontFamily="Montserrat" stroke="#000" strokeWidth={10} paintOrder="stroke">
        {done ? "WINNER! 🏆" : landed ? "ELIMINATED! ❌" : "LAST ONE WINS 👇"}
      </text>
      <g transform={`rotate(${angle} ${CX} ${CY})`}>
        {alive.map((id, i) => {
          const a0 = i * slice;
          const mid = a0 + slice / 2;
          const isOut = landed && id === round?.out;
          return (
            <g key={id}>
              {alive.length > 1 ? (
                <path d={slicePath(a0, a0 + slice)} fill={isOut ? "#ff2d55" : `hsl(${(id * 45 + seed * 13) % 360} 80% 55%)`} stroke="#120a1f" strokeWidth={6} />
              ) : (
                <circle cx={CX} cy={CY} r={R} fill="#ffd23f" />
              )}
              <text
                x={CX + Math.cos(((mid - 90) * Math.PI) / 180) * R * 0.66}
                y={CY + Math.sin(((mid - 90) * Math.PI) / 180) * R * 0.66 + 30}
                fontSize={alive.length > 1 ? 84 : 220}
                textAnchor="middle"
                transform={alive.length > 1 ? undefined : `translate(0 ${-R * 0.66 + 40})`}
              >
                {lineup[id]}
              </text>
            </g>
          );
        })}
      </g>
      <circle cx={CX} cy={CY} r={R + 10} fill="none" stroke="#fff" strokeWidth={10} />
      <circle cx={CX} cy={CY} r={36} fill="#fff" />
      <polygon points={`${CX - 30},${CY - R - 50} ${CX + 30},${CY - R - 50} ${CX},${CY - R + 10}`} fill="#fff" stroke="#000" strokeWidth={4} />
      <g transform={`translate(40 ${H - 40})`}>
        {out.map((id, i) => (
          <text key={id} x={i * 64} y={0} fontSize={52} opacity={0.5}>
            {lineup[id]}
          </text>
        ))}
      </g>
    </svg>
  );
};
