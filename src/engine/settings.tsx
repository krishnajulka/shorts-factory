import React, { useMemo } from "react";
import { random } from "remotion";
import { Light, Setting } from "./types";

export const STAGE_W = 1080;
export const STAGE_H = 960;
export const GROUND_Y = 830;

type Palette = { skyTop: string; skyBottom: string; dark: string; glow: string; tint?: string };

export const LIGHTS: Record<Light, Palette> = {
  day: { skyTop: "#5ec2ff", skyBottom: "#c9ecff", dark: "#3b4a6b", glow: "#ffe9a3" },
  dusk: { skyTop: "#3b1d6e", skyBottom: "#ff7a59", dark: "#24183f", glow: "#ffd166" },
  night: { skyTop: "#05061a", skyBottom: "#2b1450", dark: "#11122b", glow: "#ffcf5c", tint: "rgba(10,10,40,0.25)" },
  danger: { skyTop: "#2a0006", skyBottom: "#a3121f", dark: "#1a0508", glow: "#ff6b6b", tint: "rgba(120,0,0,0.22)" },
  gold: { skyTop: "#ff9f1c", skyBottom: "#ffe8a3", dark: "#7a4a00", glow: "#fff3b0" },
};

const Sky: React.FC<{ p: Palette; id: string }> = ({ p, id }) => (
  <>
    <defs>
      <linearGradient id={`sky-${id}`} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor={p.skyTop} />
        <stop offset="1" stopColor={p.skyBottom} />
      </linearGradient>
    </defs>
    <rect width={STAGE_W} height={STAGE_H} fill={`url(#sky-${id})`} />
  </>
);

// Repeating strip that scrolls left by `scroll` px (wraps at `width`).
const Scrolling: React.FC<{ scroll: number; width: number; children: React.ReactNode }> = ({ scroll, width, children }) => {
  const offset = ((scroll % width) + width) % width;
  return (
    <>
      {[0, width].map((base) => (
        <g key={base} transform={`translate(${base - offset} 0)`}>
          {children}
        </g>
      ))}
    </>
  );
};

const City: React.FC<{ p: Palette; scroll: number }> = ({ p, scroll }) => {
  const { buildings, width } = useMemo(() => {
    const out: { x: number; w: number; h: number; windows: { x: number; y: number }[] }[] = [];
    let x = 0;
    for (let i = 0; x < STAGE_W * 1.5; i++) {
      const w = 110 + random(`w${i}`) * 120;
      const h = 260 + random(`h${i}`) * 420;
      const windows = [];
      for (let wy = GROUND_Y - h + 30; wy < GROUND_Y - 40; wy += 46) {
        for (let wx = 18; wx < w - 30; wx += 36) {
          if (random(`win${i}-${wx}-${wy}`) > 0.45) windows.push({ x: wx, y: wy });
        }
      }
      out.push({ x, w, h, windows });
      x += w + 8;
    }
    return { buildings: out, width: x };
  }, []);
  return (
    <>
      <Scrolling scroll={scroll} width={width}>
        {buildings.map((b, i) => (
          <g key={i} transform={`translate(${b.x} 0)`}>
            <rect y={GROUND_Y - b.h} width={b.w} height={b.h} fill={p.dark} />
            {b.windows.map((w, j) => (
              <rect key={j} x={w.x} y={w.y} width={20} height={26} fill={p.glow} opacity={0.85} />
            ))}
          </g>
        ))}
      </Scrolling>
      <rect y={GROUND_Y} width={STAGE_W} height={STAGE_H - GROUND_Y} fill="#5d616d" />
      <rect y={GROUND_Y} width={STAGE_W} height={10} fill="#8a8f9c" />
    </>
  );
};

const Forest: React.FC<{ p: Palette; scroll: number }> = ({ p, scroll }) => (
  <>
    <Scrolling scroll={scroll * 0.5} width={1400}>
      {new Array(9).fill(0).map((_, i) => (
        <polygon key={i} points={`${i * 160},${GROUND_Y} ${i * 160 + 110},${GROUND_Y - 420 - random(`fb${i}`) * 160} ${i * 160 + 220},${GROUND_Y}`} fill={p.dark} opacity={0.55} />
      ))}
    </Scrolling>
    <Scrolling scroll={scroll} width={1300}>
      {new Array(8).fill(0).map((_, i) => {
        const h = 330 + random(`ft${i}`) * 200;
        const x = i * 165 + 40;
        return (
          <g key={i}>
            <rect x={x + 50} y={GROUND_Y - 90} width={26} height={90} fill="#6b3f1f" />
            <polygon points={`${x},${GROUND_Y - 70} ${x + 63},${GROUND_Y - h} ${x + 126},${GROUND_Y - 70}`} fill="#2f8f46" />
            <polygon points={`${x + 12},${GROUND_Y - 170} ${x + 63},${GROUND_Y - h - 50} ${x + 114},${GROUND_Y - 170}`} fill="#3aa856" />
          </g>
        );
      })}
    </Scrolling>
    <rect y={GROUND_Y} width={STAGE_W} height={STAGE_H - GROUND_Y} fill="#4f8a2f" />
    <rect y={GROUND_Y} width={STAGE_W} height={12} fill="#6fbf43" />
  </>
);

const Space: React.FC<{ scroll: number }> = ({ scroll }) => (
  <>
    <rect width={STAGE_W} height={STAGE_H} fill="#03030c" />
    <Scrolling scroll={scroll * 0.3} width={STAGE_W}>
      {new Array(90).fill(0).map((_, i) => (
        <circle key={i} cx={random(`sx${i}`) * STAGE_W} cy={random(`sy${i}`) * GROUND_Y} r={1 + random(`sr${i}`) * 3} fill="#fff" opacity={0.4 + random(`so${i}`) * 0.6} />
      ))}
    </Scrolling>
    <circle cx={820} cy={210} r={130} fill="#ff7b54" />
    <ellipse cx={820} cy={210} rx={210} ry={34} fill="none" stroke="#ffd166" strokeWidth={12} transform="rotate(-18 820 210)" />
    <rect y={GROUND_Y} width={STAGE_W} height={STAGE_H - GROUND_Y} fill="#8b8b9a" />
    {new Array(7).fill(0).map((_, i) => (
      <ellipse key={i} cx={80 + i * 160} cy={GROUND_Y + 50 + (i % 2) * 30} rx={44} ry={12} fill="#6d6d7c" />
    ))}
  </>
);

const Room: React.FC<{ p: Palette }> = ({ p }) => (
  <>
    <rect width={STAGE_W} height={STAGE_H} fill="#e8d5b7" />
    <rect width={STAGE_W} height={STAGE_H} fill={p.skyTop} opacity={0.12} />
    {new Array(14).fill(0).map((_, i) => (
      <rect key={i} x={i * 80} y={0} width={40} height={GROUND_Y} fill="#dcc6a3" />
    ))}
    <rect x={620} y={150} width={300} height={260} fill={`${p.skyBottom}`} stroke="#fff" strokeWidth={18} />
    <line x1={770} y1={150} x2={770} y2={410} stroke="#fff" strokeWidth={10} />
    <rect x={140} y={200} width={200} height={150} fill="#9b5de5" stroke="#5a3e1b" strokeWidth={12} />
    <rect y={GROUND_Y} width={STAGE_W} height={STAGE_H - GROUND_Y} fill="#9c6b3f" />
    {new Array(8).fill(0).map((_, i) => (
      <line key={i} x1={i * 150} y1={GROUND_Y} x2={i * 150 - 40} y2={STAGE_H} stroke="#7d5330" strokeWidth={5} />
    ))}
  </>
);

const Beach: React.FC<{ p: Palette; scroll: number }> = ({ p, scroll }) => (
  <>
    <circle cx={800} cy={230} r={100} fill={p.glow} />
    <rect y={560} width={STAGE_W} height={GROUND_Y - 560} fill="#1f9fd6" />
    <Scrolling scroll={scroll * 0.6 + 0} width={STAGE_W}>
      {new Array(8).fill(0).map((_, i) => (
        <path key={i} d={`M${i * 140},620 q35,-22 70,0 t70,0`} stroke="#bfefff" strokeWidth={6} fill="none" />
      ))}
    </Scrolling>
    <rect y={GROUND_Y - 20} width={STAGE_W} height={STAGE_H - GROUND_Y + 20} fill="#f4d58d" />
    <g transform="translate(140 0)">
      <path d={`M0,${GROUND_Y} Q30,${GROUND_Y - 200} 10,${GROUND_Y - 380}`} stroke="#8a5a2b" strokeWidth={26} fill="none" />
      {[-60, -20, 25, 70].map((a) => (
        <ellipse key={a} cx={10} cy={GROUND_Y - 380} rx={110} ry={26} fill="#2f8f46" transform={`rotate(${a} 10 ${GROUND_Y - 380}) translate(80 0)`} />
      ))}
    </g>
  </>
);

export const Backdrop: React.FC<{ setting: Setting; light: Light; scroll?: number; id: string }> = ({ setting, light, scroll = 0, id }) => {
  const p = LIGHTS[light];
  return (
    <g>
      <Sky p={p} id={id} />
      {setting === "city" ? <City p={p} scroll={scroll} /> : null}
      {setting === "forest" ? <Forest p={p} scroll={scroll} /> : null}
      {setting === "space" ? <Space scroll={scroll} /> : null}
      {setting === "room" ? <Room p={p} /> : null}
      {setting === "beach" ? <Beach p={p} scroll={scroll} /> : null}
      {p.tint && setting !== "space" ? <rect width={STAGE_W} height={STAGE_H} fill={p.tint} /> : null}
    </g>
  );
};
