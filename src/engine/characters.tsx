import React from "react";
import { useCurrentFrame } from "remotion";
import { Character, Mood, Species } from "./types";

// Every character is drawn facing right with feet at (0,0), ~220px tall at
// scale 1. Each species reports where hats and held items attach.
type Anchor = { x: number; y: number };
type Drawn = { body: React.ReactNode; hatAt: Anchor; holdAt: Anchor; height: number };
type DrawArgs = { mood: Mood; color?: string; legSwing: number; blink?: boolean };

// SVG filter ids, defined once per stage by <ToonDefs/>: a dark cartoon
// outline around any shape (drawn characters and emoji alike) plus a soft shadow.
export const TOON_FILTER = "toon-outline";

export const ToonDefs: React.FC = () => (
  <defs>
    <filter id={TOON_FILTER} x="-20%" y="-20%" width="140%" height="140%">
      <feMorphology in="SourceAlpha" operator="dilate" radius={5} result="thick" />
      <feFlood floodColor="#15121c" result="ink" />
      <feComposite in="ink" in2="thick" operator="in" result="outline" />
      <feGaussianBlur in="thick" stdDeviation={6} result="blurred" />
      <feOffset in="blurred" dx={0} dy={10} result="dropped" />
      <feFlood floodColor="#000" floodOpacity={0.28} />
      <feComposite in2="dropped" operator="in" result="shadow" />
      <feMerge>
        <feMergeNode in="shadow" />
        <feMergeNode in="outline" />
        <feMergeNode in="SourceGraphic" />
      </feMerge>
    </filter>
    <filter id="toon-dof" x="0" y="0" width="100%" height="100%">
      <feGaussianBlur stdDeviation={1.8} />
    </filter>
    <radialGradient id="toon-ground-shadow">
      <stop offset="0" stopColor="#000" stopOpacity={0.35} />
      <stop offset="1" stopColor="#000" stopOpacity={0} />
    </radialGradient>
  </defs>
);

const Eye: React.FC<{ x: number; y: number; r: number; mood: Mood; ring?: string; blink?: boolean }> = ({ x, y, r, mood, ring, blink }) =>
  blink ? (
    // Closed eye: lid in the body colour with a lash line.
    <g>
      <circle cx={x} cy={y} r={r} fill="currentColor" stroke={ring ?? "#222"} strokeWidth={ring ? 5 : 3} />
      <path d={`M${x - r * 0.8},${y + 2} Q${x},${y + r * 0.6} ${x + r * 0.8},${y + 2}`} stroke="#111" strokeWidth={4} fill="none" strokeLinecap="round" />
    </g>
  ) : (
    <g>
      <circle cx={x} cy={y} r={r} fill="#fff" stroke={ring ?? "#222"} strokeWidth={ring ? 5 : 3} />
      <circle cx={x + r * 0.2} cy={y + (mood === "smug" ? r * 0.25 : 0)} r={mood === "shock" ? r * 0.28 : r * 0.52} fill="#111" />
      <circle cx={x + r * 0.35} cy={y - r * 0.2} r={r * 0.16} fill="#fff" />
      {mood === "smug" ? <rect x={x - r - 2} y={y - r - 2} width={r * 2 + 4} height={r * 0.9} fill="currentColor" /> : null}
    </g>
  );

const Brow: React.FC<{ x: number; y: number; w: number; mood: Mood }> = ({ x, y, w, mood }) => {
  if (mood === "angry") return <line x1={x - w / 2} y1={y - 10} x2={x + w / 2} y2={y + 6} stroke="#111" strokeWidth={8} strokeLinecap="round" />;
  if (mood === "sad") return <line x1={x - w / 2} y1={y + 4} x2={x + w / 2} y2={y - 10} stroke="#111" strokeWidth={7} strokeLinecap="round" />;
  return null;
};

const Mouth: React.FC<{ x: number; y: number; w: number; mood: Mood }> = ({ x, y, w, mood }) => {
  if (mood === "shock") return <ellipse cx={x} cy={y + 4} rx={w * 0.22} ry={w * 0.3} fill="#3a0d12" />;
  const curve = mood === "happy" || mood === "smug" ? 14 : mood === "sad" ? -12 : 0;
  return <path d={`M${x - w / 2},${y} Q${x},${y + curve} ${x + w / 2},${y}`} stroke="#111" strokeWidth={6} fill="none" strokeLinecap="round" />;
};

const Legs: React.FC<{ xs: number[]; top: number; swing: number; color: string }> = ({ xs, top, swing, color }) => (
  <g stroke={color} strokeWidth={9} strokeLinecap="round">
    {xs.map((x, i) => (
      <line key={i} x1={x} y1={top} x2={x + (i % 2 ? -swing : swing)} y2={0} />
    ))}
  </g>
);

const pigeon = ({ mood, color = "#8d93a6", legSwing, blink }: DrawArgs): Drawn => ({
  height: 220,
  hatAt: { x: 62, y: -208 },
  holdAt: { x: 140, y: -160 },
  body: (
    <g color={color}>
      <Legs xs={[-25, 10]} top={-30} swing={legSwing} color="#e07a8a" />
      <polygon points="-90,-75 -165,-45 -150,-28 -80,-48" fill="#4c5163" />
      <ellipse cx={-10} cy={-85} rx={92} ry={66} fill={color} />
      <ellipse cx={25} cy={-68} rx={52} ry={42} fill="#c3c7d4" opacity={0.75} />
      <ellipse cx={-30} cy={-88} rx={62} ry={38} fill="#6b7186" />
      <path d="M-70,-82 Q-40,-70 -5,-80" stroke="#3a3e4c" strokeWidth={6} fill="none" />
      <path d="M-74,-64 Q-44,-52 -10,-62" stroke="#3a3e4c" strokeWidth={6} fill="none" />
      <ellipse cx={48} cy={-128} rx={40} ry={42} fill="#5f8f7a" />
      <ellipse cx={42} cy={-112} rx={30} ry={22} fill="#8a64a8" opacity={0.8} />
      <circle cx={62} cy={-168} r={44} fill={color} />
      <Eye x={78} y={-176} r={19} mood={mood} ring="#e8862a" blink={blink} />
      <Brow x={78} y={-200} w={40} mood={mood} />
      <polygon points="100,-166 140,-156 100,-148" fill="#2d2d33" />
      <ellipse cx={100} cy={-166} rx={9} ry={5} fill="#e9e6df" />
    </g>
  ),
});

const cat = ({ mood, color = "#f2a65a", legSwing, blink }: DrawArgs): Drawn => ({
  height: 240,
  hatAt: { x: 40, y: -228 },
  holdAt: { x: 112, y: -128 },
  body: (
    <g color={color}>
      <path d="M-90,-70 C-170,-90 -150,-210 -110,-190" stroke={color} strokeWidth={22} fill="none" strokeLinecap="round" />
      <Legs xs={[-60, -25, 20, 50]} top={-40} swing={legSwing} color={color} />
      <ellipse cx={-15} cy={-80} rx={95} ry={55} fill={color} />
      <ellipse cx={10} cy={-62} rx={50} ry={30} fill="#fff" opacity={0.5} />
      <polygon points="0,-200 12,-260 50,-215" fill={color} />
      <polygon points="70,-215 100,-262 108,-198" fill={color} />
      <polygon points="12,-212 18,-244 40,-216" fill="#ffb3c1" />
      <circle cx={55} cy={-160} r={60} fill={color} />
      <Eye x={42} y={-172} r={14} mood={mood} blink={blink} />
      <Eye x={84} y={-172} r={14} mood={mood} blink={blink} />
      <Brow x={42} y={-194} w={26} mood={mood} />
      <Brow x={84} y={-194} w={26} mood={mood} />
      <polygon points="58,-150 70,-150 64,-142" fill="#ff7096" />
      <Mouth x={64} y={-132} w={30} mood={mood} />
      <g stroke="#333" strokeWidth={3}>
        <line x1={92} y1={-145} x2={135} y2={-152} />
        <line x1={92} y1={-138} x2={135} y2={-134} />
        <line x1={36} y1={-145} x2={-5} y2={-152} />
      </g>
    </g>
  ),
});

const frog = ({ mood, color = "#5cc95f", legSwing, blink }: DrawArgs): Drawn => ({
  height: 200,
  hatAt: { x: 0, y: -205 },
  holdAt: { x: 105, y: -95 },
  body: (
    <g color={color}>
      <ellipse cx={-70} cy={-20} rx={45 + legSwing} ry={22} fill="#3f9e43" />
      <ellipse cx={70} cy={-20} rx={45 - legSwing} ry={22} fill="#3f9e43" />
      <ellipse cx={0} cy={-80} rx={110} ry={80} fill={color} />
      <ellipse cx={0} cy={-55} rx={70} ry={42} fill="#d9f2c4" />
      <circle cx={-48} cy={-150} r={36} fill={color} />
      <circle cx={48} cy={-150} r={36} fill={color} />
      <Eye x={-48} y={-152} r={24} mood={mood} blink={blink} />
      <Eye x={48} y={-152} r={24} mood={mood} blink={blink} />
      <Brow x={-48} y={-186} w={36} mood={mood} />
      <Brow x={48} y={-186} w={36} mood={mood} />
      <Mouth x={0} y={-98} w={110} mood={mood} />
    </g>
  ),
});

const bean = ({ mood, color = "#ff5d73", legSwing, blink }: DrawArgs): Drawn => ({
  height: 250,
  hatAt: { x: 0, y: -250 },
  holdAt: { x: 92, y: -110 },
  body: (
    <g color={color}>
      <Legs xs={[-30, 30]} top={-40} swing={legSwing} color="#333" />
      <rect x={-75} y={-250} width={150} height={220} rx={75} fill={color} />
      <ellipse cx={-30} cy={-200} rx={18} ry={40} fill="#fff" opacity={0.25} />
      <line x1={70} y1={-120} x2={95} y2={-100} stroke={color} strokeWidth={22} strokeLinecap="round" />
      <Eye x={-25} y={-175} r={20} mood={mood} blink={blink} />
      <Eye x={30} y={-175} r={20} mood={mood} blink={blink} />
      <Brow x={-25} y={-205} w={30} mood={mood} />
      <Brow x={30} y={-205} w={30} mood={mood} />
      <Mouth x={2} y={-128} w={50} mood={mood} />
    </g>
  ),
});

const SPECIES: Record<Species, (a: DrawArgs) => Drawn> = { pigeon, cat, frog, bean };

const emojiChar = (emoji: string): Drawn => ({
  height: 230,
  hatAt: { x: 0, y: -225 },
  holdAt: { x: 110, y: -110 },
  body: (
    <text x={0} y={-12} fontSize={220} textAnchor="middle">
      {emoji}
    </text>
  ),
});

export const Fry: React.FC<{ x?: number; y?: number; rot?: number; s?: number }> = ({ x = 0, y = 0, rot = 0, s = 1 }) => (
  <g transform={`translate(${x} ${y}) rotate(${rot}) scale(${s})`}>
    <rect x={-60} y={-12} width={120} height={24} rx={5} fill="#f6c443" stroke="#c98f12" strokeWidth={4} />
    <rect x={-52} y={-8} width={96} height={6} rx={3} fill="#fde59a" />
  </g>
);

// An emoji, or the custom fry, centered on (0,0) at roughly `size` px.
export const Item: React.FC<{ item: string; size?: number }> = ({ item, size = 90 }) =>
  item === "fry" ? (
    <Fry s={size / 120} />
  ) : (
    <text x={0} y={size * 0.35} fontSize={size} textAnchor="middle">
      {item}
    </text>
  );

const Crown: React.FC = () => (
  <g transform="translate(-40 0)">
    <polygon points="0,0 8,-44 26,-16 40,-54 54,-16 72,-44 80,0" fill="#ffd23f" stroke="#b8860b" strokeWidth={4} strokeLinejoin="round" />
    <circle cx={40} cy={-12} r={7} fill="#e63946" />
  </g>
);

export const characterHeight = (c: Character) => ("emoji" in c ? 230 : SPECIES[c.species]({ mood: "happy", legSwing: 0 }).height);

type Props = {
  character: Character;
  x: number;
  y: number;
  s?: number;
  flip?: boolean;
  mood?: Mood;
  hold?: string | null;
  hat?: string | null;
  rot?: number;
  step?: number; // leg cycle; undefined = standing
  groundY?: number; // where the floor is, for the contact shadow (omit = no shadow)
  plain?: boolean; // skip outline/blink/breathing (cheap, for big crowds)
};

const BLINK_EVERY = 104; // frames (~3.5 s)
const BLINK_FRAMES = 5;

export const CharacterView: React.FC<Props> = ({ character, x, y, s = 1, flip = false, mood = "happy", hold, hat, rot = 0, step, groundY, plain }) => {
  const frame = useCurrentFrame();
  // Each character gets its own blink/breath phase so a group never moves in sync.
  const phase = Math.abs(Math.round(x * 7.3)) % BLINK_EVERY;
  const blink = !plain && (frame + phase) % BLINK_EVERY < BLINK_FRAMES;
  const breath = plain ? 0 : Math.sin((frame + phase) / 14);
  const legSwing = step === undefined ? 0 : Math.sin(step * Math.PI * 2) * 14;
  const drawn = "emoji" in character ? emojiChar(character.emoji) : SPECIES[character.species]({ mood, color: character.color, legSwing, blink });
  const airborne = groundY === undefined ? 0 : Math.max(0, groundY - y);
  const sx = s * (1 - breath * 0.012);
  const sy = s * (1 + breath * 0.022);
  return (
    <>
      {groundY !== undefined ? (
        <ellipse
          cx={x}
          cy={groundY + 4}
          rx={95 * s * Math.max(0.35, 1 - airborne / 600)}
          ry={20 * s * Math.max(0.35, 1 - airborne / 600)}
          fill="url(#toon-ground-shadow)"
        />
      ) : null}
      <g transform={`translate(${x} ${y}) scale(${flip ? -sx : sx} ${sy}) rotate(${rot})`} filter={plain ? undefined : `url(#${TOON_FILTER})`}>
        {drawn.body}
        {hold ? (
          <g transform={`translate(${drawn.holdAt.x + 30} ${drawn.holdAt.y}) rotate(-12)`}>
            <Item item={hold} size={hold === "fry" ? 86 : 80} />
          </g>
        ) : null}
        {hat ? (
          <g transform={`translate(${drawn.hatAt.x} ${drawn.hatAt.y + 4})`}>
            {hat === "crown" ? <Crown /> : <g transform="translate(0 -30)"><Item item={hat} size={90} /></g>}
          </g>
        ) : null}
      </g>
    </>
  );
};
