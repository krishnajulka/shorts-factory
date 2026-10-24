import React from "react";
import { Easing, interpolate, random, useCurrentFrame, useVideoConfig } from "remotion";
import { CharacterView, Item, characterHeight } from "./characters";
import { Backdrop, GROUND_Y, LIGHTS, STAGE_H, STAGE_W } from "./settings";
import { ActorSpec, Character, Mood, RenderScene, TimedWord } from "./types";

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const pop = Easing.bezier(0.34, 1.56, 0.64, 1);
const FEET_Y = GROUND_Y + 30;

export const cleanWord = (w: string) => w.toLowerCase().replace(/[^a-z0-9]/g, "");

// Seconds into the scene when `word` is first spoken, or null.
export const cue = (words: TimedWord[], word?: string) => {
  if (!word) return null;
  const hit = words.find((w) => cleanWord(w.word) === cleanWord(word));
  return hit ? hit.start : null;
};

type ActorState = {
  spec: ActorSpec;
  character: Character;
  x: number;
  y: number;
  s: number;
  rot: number;
  flip: boolean;
  mood: Mood;
  hold: string | null;
  hat: string | null;
  step?: number;
};

const actorState = (spec: ActorSpec, character: Character, t: number, end: number, words: TimedWord[]): ActorState => {
  const c = cue(words, spec.at);
  const trigger = c ?? 0;
  const since = t - trigger;
  let mood: Mood = spec.mood ?? "happy";
  let hold: string | null = spec.hold ?? null;
  let hat: string | null = spec.hat ?? null;
  for (const ch of spec.changes ?? []) {
    const at = cue(words, ch.at);
    if (at === null || t < at) continue;
    if (ch.mood) mood = ch.mood;
    if (ch.hold !== undefined) hold = ch.hold;
    if (ch.hat !== undefined) hat = ch.hat;
  }

  const moveEnd = c ?? end;
  let x = spec.toX === undefined ? spec.x : interpolate(t, [0, Math.max(moveEnd, 0.3)], [spec.x, spec.toX], { ...clamp, easing: Easing.inOut(Easing.quad) });
  const moving = spec.toX !== undefined && t < moveEnd;
  let y = FEET_Y - (spec.lift ?? 0);
  let s = spec.size ?? 1;
  let rot = Math.sin(t * 4 + spec.x) * 2;
  let step: number | undefined = moving ? t * 3.5 : undefined;
  const dir = spec.face === "left" ? -1 : 1;

  switch (spec.action) {
    case "run":
      step = t * 4.5;
      y -= Math.abs(Math.sin(t * 13)) * 26;
      break;
    case "jump":
      y -= c === null ? Math.abs(Math.sin(t * 5)) * 120 : interpolate(since, [0, 0.22, 0.5], [0, 170, 0], clamp);
      break;
    case "bow":
      rot = interpolate(since, [0, 0.3], [0, 35], { ...clamp, easing: pop });
      break;
    case "shake":
      x += Math.sin(t * 60) * 7;
      rot = Math.sin(t * 45) * 5;
      break;
    case "spin":
      rot = interpolate(since, [0, 0.5], [0, 360], clamp);
      break;
    case "grow":
      s *= interpolate(since, [0, 0.3], [1, 1.6], { ...clamp, easing: pop });
      break;
    case "enter": {
      const from = dir > 0 ? -300 : STAGE_W + 300;
      const arrive = c ?? 0.5;
      x = interpolate(t, [Math.max(0, arrive - 0.5), arrive], [from, x], { ...clamp, easing: Easing.out(Easing.quad) });
      if (t < arrive) step = t * 4.5;
      break;
    }
    case "exit":
      x = interpolate(since, [0, 0.5], [x, x + dir * 1400], { ...clamp, easing: Easing.in(Easing.quad) });
      if (since > 0) step = t * 4.5;
      break;
    case "float":
      y -= 60 + Math.sin(t * 3) * 30;
      break;
    case "faint":
      rot = interpolate(since, [0, 0.3], [0, -90], { ...clamp, easing: Easing.in(Easing.quad) });
      if (since > 0) mood = "shock";
      break;
    default:
      break;
  }
  if (spec.action === "spin" && since < 0) rot = 0;

  return { spec, character, x, y, s, rot, flip: spec.face === "left", mood, hold, hat, step };
};

const Rays: React.FC<{ color: string; spin: number; opacity: number }> = ({ color, spin, opacity }) => (
  <g transform={`translate(${STAGE_W / 2} ${GROUND_Y - 220}) rotate(${spin})`} opacity={opacity}>
    {new Array(16).fill(0).map((_, i) => (
      <polygon key={i} points="0,0 -70,-1400 70,-1400" fill={color} transform={`rotate(${i * 22.5})`} />
    ))}
  </g>
);

const Particles: React.FC<{ kind: "rain" | "snow" | "confetti"; frame: number }> = ({ kind, frame }) => (
  <g>
    {new Array(kind === "confetti" ? 50 : 40).fill(0).map((_, i) => {
      const speed = kind === "rain" ? 22 : kind === "snow" ? 3 : 7;
      const x = random(`px${i}`) * STAGE_W + (kind === "snow" ? Math.sin(frame / 20 + i) * 20 : 0);
      const y = (random(`py${i}`) * STAGE_H + frame * speed * (0.7 + random(`ps${i}`) * 0.6)) % STAGE_H;
      if (kind === "rain") return <line key={i} x1={x} y1={y} x2={x - 6} y2={y + 34} stroke="#9ad0ff" strokeWidth={5} strokeLinecap="round" opacity={0.8} />;
      if (kind === "snow") return <circle key={i} cx={x} cy={y} r={5 + random(`pr${i}`) * 5} fill="#fff" opacity={0.9} />;
      return (
        <rect key={i} x={x} y={y} width={16} height={26} fill={`hsl(${random(`ph${i}`) * 360} 90% 60%)`} transform={`rotate(${frame * 8 + i * 40} ${x + 8} ${y + 13})`} />
      );
    })}
  </g>
);

export const SceneView: React.FC<{ scene: RenderScene; cast: Record<string, Character>; endSeconds: number }> = ({ scene, cast, endSeconds }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;
  const { words } = scene;
  const effects = new Set(scene.effects ?? []);
  const palette = LIGHTS[scene.light];

  const actors = scene.actors.filter((a) => cast[a.who]).map((a) => actorState(a, cast[a.who], t, endSeconds, words));

  // A dropped item ends up held by its target once it lands.
  const dropAt = scene.drop ? cue(words, scene.drop.at) : null;
  const dropTarget = scene.drop ? actors.find((a) => a.spec.who === scene.drop?.to) : undefined;
  if (scene.drop && dropTarget && dropAt !== null && t >= dropAt) dropTarget.hold = scene.drop.emoji;

  const burstAt = scene.burst ? cue(words, scene.burst.at) : null;
  const flashAt = cue(words, scene.flash);
  const crowdUntil = scene.crowd ? (cue(words, scene.crowd.until) ?? 1) : 0;

  return (
    <g>
      <Backdrop setting={scene.setting} light={scene.light} scroll={effects.has("speed") ? frame * 28 : 0} id={scene.id} />
      {effects.has("rays") ? <Rays color={palette.glow} spin={t * 25} opacity={0.35} /> : null}

      {scene.crowd && cast[scene.crowd.who]
        ? (() => {
            const crowd = scene.crowd;
            const cols = 9;
            return new Array(Math.min(crowd.count, 63))
              .fill(0)
              .map((_, i) => {
                const r = Math.floor(i / cols);
                const col = i % cols;
                const appear = (i / Math.min(crowd.count, 63)) * Math.max(crowdUntil, 0.4);
                const sc = interpolate(t, [appear, appear + 0.2], [0, 0.55 - r * 0.04], { ...clamp, easing: pop });
                return (
                  <CharacterView
                    key={i}
                    character={cast[crowd.who]}
                    x={60 + col * 120 + (r % 2) * 60}
                    y={FEET_Y + 30 - r * 95}
                    s={Math.max(sc, 0.001)}
                    mood={crowd.mood ?? "angry"}
                    flip={col > cols / 2}
                  />
                );
              })
              .reverse();
          })()
        : null}

      {effects.has("speed")
        ? new Array(10).fill(0).map((_, i) => (
            <rect key={i} x={STAGE_W - ((frame * 60 + i * 137) % (STAGE_W + 400))} y={120 + random(`sl${i}`) * 600} width={260} height={6} fill="#fff" opacity={0.5} />
          ))
        : null}

      {actors.map((a, i) => (
        <CharacterView key={i} character={a.character} x={a.x} y={a.y} s={a.s} flip={a.flip} mood={a.mood} hold={a.hold} hat={a.hat} rot={a.rot} step={a.step} />
      ))}

      {scene.drop && dropTarget && dropAt !== null && t < dropAt ? (
        <g
          transform={`translate(${dropTarget.x} ${interpolate(t, [Math.max(0, dropAt - 1.2), dropAt], [-120, dropTarget.y - characterHeight(dropTarget.character) * dropTarget.s * 0.7], {
            ...clamp,
            easing: Easing.in(Easing.quad),
          })}) rotate(${t * 220})`}
        >
          <circle r={80} fill={palette.glow} opacity={0.35} />
          <Item item={scene.drop.emoji} size={110} />
        </g>
      ) : null}

      {scene.burst && burstAt !== null && t >= burstAt
        ? new Array(40).fill(0).map((_, i) => {
            const since = t - burstAt;
            const a = random(`ba${i}`) * Math.PI * 2;
            const v = 500 + random(`bv${i}`) * 700;
            return (
              <g key={i} transform={`translate(${STAGE_W / 2 + Math.cos(a) * v * since} ${GROUND_Y - 200 + Math.sin(a) * v * since + 900 * since * since}) rotate(${since * 600 * (random(`br${i}`) - 0.5)})`}>
                <Item item={scene.burst!.emoji} size={56} />
              </g>
            );
          })
        : null}

      {effects.has("rain") ? <Particles kind="rain" frame={frame} /> : null}
      {effects.has("snow") ? <Particles kind="snow" frame={frame} /> : null}
      {effects.has("confetti") ? <Particles kind="confetti" frame={frame} /> : null}
      {effects.has("vignette") ? (
        <>
          <defs>
            <radialGradient id={`vig-${scene.id}`} cx="0.5" cy="0.5" r="0.75">
              <stop offset="0.55" stopColor={scene.light === "danger" ? "#ff0000" : "#000"} stopOpacity={0} />
              <stop offset="1" stopColor={scene.light === "danger" ? "#ff0000" : "#000"} stopOpacity={0.45 + Math.sin(t * 8) * 0.12} />
            </radialGradient>
          </defs>
          <rect width={STAGE_W} height={STAGE_H} fill={`url(#vig-${scene.id})`} />
        </>
      ) : null}
      {flashAt !== null && t >= flashAt ? <rect width={STAGE_W} height={STAGE_H} fill="#fff" opacity={interpolate(t - flashAt, [0, 0.25], [0.9, 0], clamp)} /> : null}
    </g>
  );
};

// Point the camera's close-ups frame: the focus actor's upper body.
export const focusPoint = (scene: RenderScene, cast: Record<string, Character>): [number, number] => {
  const spec = scene.actors.find((a) => a.who === scene.focus) ?? scene.actors[0];
  if (!spec || !cast[spec.who]) return [STAGE_W / 2, STAGE_H / 2];
  const h = characterHeight(cast[spec.who]) * (spec.size ?? 1);
  return [spec.toX ?? spec.x, FEET_Y - (spec.lift ?? 0) - h * 0.6];
};
