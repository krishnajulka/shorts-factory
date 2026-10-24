import React, { useMemo } from "react";
import { Easing, interpolate, random, useCurrentFrame, useVideoConfig } from "remotion";

// Emoji race across five lanes. Speeds wobble so the lead changes several
// times; the winner crosses the line just before the video ends.

const W = 1080;
const H = 960;
const START_X = 110;
const FINISH_X = 960;
const LANE_TOP = 205;
const LANE_H = 145;

const RACER_SETS = [
  ["🐌", "🐢", "🦆", "🐇", "🦖"],
  ["🚗", "🚲", "🛴", "🚀", "🐎"],
  ["🍕", "🍔", "🌮", "🍩", "🌭"],
  ["⚽", "🏀", "🎾", "🏈", "🎱"],
  ["👻", "🤖", "👽", "🤡", "💩"],
];

export const defaultRacers = (seed: number) => RACER_SETS[seed % RACER_SETS.length];

// progress[racer][frame] in 0..1 (winner reaches 1 at 93% of the video).
export const simulateRace = (frames: number, seed: number, racers: number) => {
  const raw = new Array(racers).fill(0).map((_, r) => {
    // Similar base speeds + big wobble = a close race with many lead changes.
    const base = 0.95 + random(`rb${seed}-${r}`) * 0.1;
    const phases = [0, 1, 2].map((k) => random(`rp${seed}-${r}-${k}`) * Math.PI * 2);
    let total = 0;
    return new Array(frames).fill(0).map((__, f) => {
      const t = f / frames;
      const wobble = Math.sin(t * 9 + phases[0]) * 0.6 + Math.sin(t * 17 + phases[1]) * 0.4 + Math.sin(t * 31 + phases[2]) * 0.25;
      total += Math.max(0.05, base + wobble);
      return total;
    });
  });
  const finish = Math.floor(frames * 0.93);
  const best = Math.max(...raw.map((r) => r[finish]));
  return raw.map((r) => r.map((v) => Math.min(1, v / best)));
};

const leaderAt = (progress: number[][], f: number) => progress.reduce((best, r, i) => (r[f] > progress[best][f] ? i : best), 0);

// Frames where the lead changes (held at least 12 frames apart).
export const raceSounds = (frames: number, seed: number, racers: number) => {
  const progress = simulateRace(frames, seed, racers);
  const out: { frame: number; rate: number }[] = [];
  let leader = leaderAt(progress, 0);
  let last = -100;
  for (let f = 1; f < frames; f++) {
    const now = leaderAt(progress, f);
    if (now !== leader && f - last > 12) {
      out.push({ frame: f, rate: 1 + out.length * 0.05 });
      last = f;
    }
    leader = now;
  }
  return out;
};

export const Race: React.FC<{ seed: number; racers?: string[] }> = ({ seed, racers }) => {
  const frame = useCurrentFrame();
  const { durationInFrames, fps } = useVideoConfig();
  const lineup = racers && racers.length >= 2 ? racers.slice(0, 5) : defaultRacers(seed);
  const progress = useMemo(() => simulateRace(durationInFrames, seed, lineup.length), [durationInFrames, seed, lineup.length]);
  const f = Math.min(frame, durationInFrames - 1);
  const leader = leaderAt(progress, f);
  const winner = progress.findIndex((r) => r[f] >= 1);

  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{ display: "block", background: "#14301a" }}>
      {lineup.map((_, i) => (
        <rect key={i} x={0} y={LANE_TOP + i * LANE_H} width={W} height={LANE_H} fill={i % 2 ? "#1d4425" : "#18391f"} />
      ))}
      {new Array(lineup.length + 1).fill(0).map((_, i) => (
        <line key={i} x1={0} x2={W} y1={LANE_TOP + i * LANE_H} y2={LANE_TOP + i * LANE_H} stroke="#fff" strokeWidth={4} strokeDasharray="30 20" opacity={0.5} />
      ))}
      <line x1={START_X} x2={START_X} y1={LANE_TOP} y2={LANE_TOP + lineup.length * LANE_H} stroke="#fff" strokeWidth={6} opacity={0.6} />
      {new Array(Math.ceil((lineup.length * LANE_H) / 30)).fill(0).map((_, k) => (
        <g key={k}>
          <rect x={FINISH_X} y={LANE_TOP + k * 30} width={15} height={15} fill="#fff" />
          <rect x={FINISH_X + 15} y={LANE_TOP + k * 30 + 15} width={15} height={15} fill="#fff" />
          <rect x={FINISH_X} y={LANE_TOP + k * 30 + 15} width={15} height={15} fill="#111" />
          <rect x={FINISH_X + 15} y={LANE_TOP + k * 30} width={15} height={15} fill="#111" />
        </g>
      ))}
      {lineup.map((emoji, i) => {
        const p = progress[i][f];
        const x = START_X + p * (FINISH_X - START_X);
        const y = LANE_TOP + i * LANE_H + LANE_H / 2;
        const bob = Math.abs(Math.sin((frame + i * 7) * 0.5)) * 10;
        return (
          <g key={i} transform={`translate(${x} ${y - bob})`}>
            {i === leader ? <text y={-58} fontSize={50} textAnchor="middle">👑</text> : null}
            <text y={40} fontSize={110} textAnchor="middle" transform="scale(-1 1)">
              {emoji}
            </text>
          </g>
        );
      })}
      <text x={W / 2} y={175} textAnchor="middle" fontSize={70} fontWeight={900} fill="#fff" fontFamily="Montserrat" stroke="#000" strokeWidth={10} paintOrder="stroke">
        {winner >= 0 ? "WINNER! 🏆" : "WHO WINS? 👇"}
      </text>
      {winner >= 0 ? (
        <g
          transform={`translate(${W / 2} ${H / 2}) scale(${interpolate(frame - Math.floor(durationInFrames * 0.93), [0, 0.3 * fps], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
            easing: Easing.bezier(0.34, 1.56, 0.64, 1),
          })})`}
        >
          <circle r={190} fill="#ffd23f" opacity={0.9} />
          <text y={80} fontSize={230} textAnchor="middle">
            {lineup[winner]}
          </text>
        </g>
      ) : null}
    </svg>
  );
};
