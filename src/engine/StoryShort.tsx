import { loadFont } from "@remotion/fonts";
import { Audio } from "@remotion/media";
import React, { useMemo } from "react";
import { AbsoluteFill, CalculateMetadataFunction, Easing, Sequence, interpolate, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { BOTTOM_KINDS, Bottom, BottomKind, bottomSounds } from "../satisfying";
import { Captions, chunkStarts } from "./Captions";
import { ToonDefs } from "./characters";
import { SceneView, focusPoint } from "./SceneView";
import { STAGE_H, STAGE_W } from "./settings";
import { Stickers, stickerTimes } from "./Stickers";
import { Character, RenderScene, RenderStory } from "./types";

// Font and sound effects ship in public/ so rendering never fetches from the
// internet (the cloud machine's proxy blocks downloads made by the renderer).
const fontFamily = "Montserrat";
loadFont({ family: fontFamily, url: staticFile("fonts/montserrat-latin.woff2"), weight: "100 900" });
const sfx = (name: string) => staticFile(`sfx/${name}.wav`);

export const FPS = 30;
// Cut each scene this long after its last word starts, dropping TTS dead air.
const TAIL = 0.7;
const END_PAD = 15;

export const layout = (story: RenderStory) => {
  let from = 0;
  return story.scenes.map((scene, index) => {
    const last = scene.words[scene.words.length - 1]?.start ?? scene.duration;
    const frames = Math.ceil(Math.min(scene.duration, last + TAIL) * FPS);
    const item = { scene, from, frames, index };
    from += frames;
    return item;
  });
};

export const calculateMetadata: CalculateMetadataFunction<{ story: RenderStory }> = ({ props }) => {
  const items = layout(props.story);
  const last = items[items.length - 1];
  return { durationInFrames: last.from + last.frames + END_PAD };
};

const seedOf = (id: string) => [...id].reduce((h, c) => (h * 31 + c.charCodeAt(0)) % 997, 7);

// A hard cut to a new framing on every caption chunk.
const SHOTS = [
  { z: 1.0, f: 0, rot: 0 },
  { z: 1.55, f: 1, rot: 0 },
  { z: 1.2, f: 0.6, rot: -3 },
  { z: 1.8, f: 1, rot: 3 },
];

const StoryStage: React.FC<{ scene: RenderScene; cast: Record<string, Character>; index: number; seconds: number }> = ({
  scene,
  cast,
  index,
  seconds,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { words } = scene;
  const t = frame / fps;

  const starts = chunkStarts(words);
  const chunk = Math.max(0, starts.filter((s) => (words[s]?.start ?? Infinity) <= t).length - 1);
  const shot = SHOTS[(index + chunk) % SHOTS.length];
  const shotStart = words[starts[chunk]]?.start ?? 0;

  const lastWord = [...words].reverse().find((w) => w.start <= t);
  const punch = lastWord ? interpolate(t - lastWord.start, [0, 0.12], [1.05, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }) : 1;
  const whip = interpolate(frame, [0, 6], [1.3, 1], { extrapolateRight: "clamp" });
  const drift = 1 + Math.max(0, t - shotStart) * 0.04;
  const z = shot.z * punch * whip * drift * (shot.rot ? 1.06 : 1);

  const [fx, fy] = focusPoint(scene, cast);
  const halfW = STAGE_W / (2 * z);
  const halfH = STAGE_H / (2 * z);
  const cx = Math.min(Math.max(STAGE_W / 2 + (fx - STAGE_W / 2) * shot.f, halfW), STAGE_W - halfW);
  const cy = Math.min(Math.max(STAGE_H / 2 + (fy - STAGE_H / 2) * shot.f, halfH), STAGE_H - halfH);
  const shake = scene.effects?.includes("shake") || scene.effects?.includes("speed") ? Math.sin(frame * 2.1) * 6 : 0;

  // Scene cuts whip-pan in from the right with horizontal motion blur. Never on
  // the very first scene: frame 0 is what viewers judge before swiping.
  const cut = index > 0 ? interpolate(frame, [0, WHIP_FRAMES], [1, 0], { extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) }) : 0;
  const blurId = `whip-${scene.id}`;

  return (
    <svg width={STAGE_W} height={STAGE_H} viewBox={`0 0 ${STAGE_W} ${STAGE_H}`} style={{ display: "block", overflow: "hidden" }}>
      <ToonDefs />
      <defs>
        <filter id={blurId} x="-10%" y="0" width="120%" height="100%">
          <feGaussianBlur stdDeviation={`${cut * 38} 0`} />
        </filter>
        <radialGradient id="cine-vignette" cx="0.5" cy="0.45" r="0.8">
          <stop offset="0.55" stopColor="#000" stopOpacity={0} />
          <stop offset="1" stopColor="#000" stopOpacity={0.5} />
        </radialGradient>
      </defs>
      <g transform={`translate(${cut * 380} 0)`} filter={cut > 0.01 ? `url(#${blurId})` : undefined}>
        <g transform={`translate(${STAGE_W / 2 + shake} ${STAGE_H / 2}) rotate(${shot.rot}) scale(${z}) translate(${-cx} ${-cy})`}>
          <SceneView scene={scene} cast={cast} endSeconds={seconds} />
        </g>
      </g>
      <rect width={STAGE_W} height={STAGE_H} fill="url(#cine-vignette)" />
    </svg>
  );
};

const WHIP_FRAMES = 7;

const HOOK_SECONDS = 2.8;

// Big suspense line on screen from frame 0, readable before the narrator speaks.
const HookCard: React.FC<{ text: string }> = ({ text }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;
  if (t > HOOK_SECONDS) return null;
  return (
    <div
      style={{
        position: "absolute",
        top: 130,
        left: 50,
        right: 50,
        textAlign: "center",
        fontFamily,
        fontWeight: 900,
        fontSize: 92,
        lineHeight: 1.05,
        color: "#fff",
        textTransform: "uppercase",
        WebkitTextStroke: "16px #000",
        paintOrder: "stroke fill",
        textShadow: "0 10px 0 rgba(0,0,0,0.6)",
        // Fully visible on frame 0, then a slow pulse; fades out at the end.
        scale: 1 + Math.sin(t * 6) * 0.03,
        opacity: interpolate(t, [HOOK_SECONDS - 0.3, HOOK_SECONDS], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
      }}
    >
      <span style={{ background: "#ff2d55", padding: "4px 22px", borderRadius: 18, WebkitTextStroke: "10px #000" }}>{text}</span>
    </div>
  );
};

// Quiet pitched blips for the bottom loop's events (ring breaks, landings...).
const BottomSounds: React.FC<{ kind: BottomKind; seed: number; racers?: string[] }> = ({ kind, seed, racers }) => {
  const { durationInFrames } = useVideoConfig();
  const sounds = useMemo(() => bottomSounds(kind, durationInFrames, seed, racers), [kind, durationInFrames, seed, racers]);
  const src = sfx(kind === "race" ? "whip" : kind === "plinko" || kind === "wheel" || kind === "territory" ? "mouseClick" : "ding");
  const volume = kind === "plinko" ? 0.25 : 0.18;
  return (
    <>
      {sounds.map((s, i) => (
        <Sequence key={i} from={s.frame} durationInFrames={FPS} name={`bottom ${i}`} layout="none">
          <Audio src={src} volume={volume} playbackRate={s.rate} />
        </Sequence>
      ))}
    </>
  );
};

export const StoryShort: React.FC<{ story: RenderStory }> = ({ story }) => {
  const items = layout(story);
  const seed = seedOf(story.id);
  const bottom = story.bottom ?? BOTTOM_KINDS[seed % BOTTOM_KINDS.length];
  return (
    <AbsoluteFill style={{ backgroundColor: "#000" }}>
      <AbsoluteFill style={{ top: 0, height: STAGE_H, overflow: "hidden" }}>
        {items.map(({ scene, from, frames, index }) => (
          <Sequence key={scene.id} from={from} durationInFrames={frames} name={scene.id}>
            <StoryStage scene={scene} cast={story.cast} index={index} seconds={frames / FPS} />
            <Stickers stickers={scene.stickers} words={scene.words} seed={scene.id} />
          </Sequence>
        ))}
      </AbsoluteFill>
      <AbsoluteFill style={{ top: STAGE_H, height: STAGE_H }}>
        <Bottom kind={bottom} seed={seed} racers={story.racers} />
      </AbsoluteFill>
      <BottomSounds kind={bottom} seed={seed} racers={story.racers} />
      {items.map(({ scene, from, frames, index }) => (
        <Sequence key={`a-${scene.id}`} from={from} durationInFrames={frames} name={`voice ${scene.id}`}>
          <Audio src={staticFile(scene.file)} />
          {index > 0 ? <Audio src={sfx("whoosh")} volume={0.3} /> : null}
          {scene.sfx ? <Audio src={sfx(scene.sfx)} volume={0.35} /> : null}
          {stickerTimes(scene.stickers, scene.words).map((s) => (
            <Sequence key={s.word} from={Math.round(s.at * FPS)} durationInFrames={FPS} layout="none">
              <Audio src={sfx("uiSwitch")} volume={0.4} />
            </Sequence>
          ))}
          <Captions words={scene.words} fontFamily={fontFamily} keywords={story.keywords} />
        </Sequence>
      ))}
      {story.hook ? <HookCard text={story.hook} /> : null}
    </AbsoluteFill>
  );
};
