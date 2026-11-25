import { loadFont } from "@remotion/fonts";
import React from "react";
import { AbsoluteFill, staticFile } from "remotion";
import { CharacterView, ToonDefs } from "./engine/characters";

// Channel avatar (Instagram / YouTube profile picture): Rocky shouting the
// catchphrase. Render: npx remotion still Avatar out/avatar.png
loadFont({ family: "Luckiest Guy", url: staticFile("fonts/LuckiestGuy-Regular.ttf"), weight: "400" });

export const Avatar: React.FC<{ x?: number; y?: number; s?: number }> = ({ x = 470, y = 1010, s = 2.7 }) => (
  <AbsoluteFill style={{ backgroundColor: "#ffd23f" }}>
    <svg width={1080} height={1080} viewBox="0 0 1080 1080">
      <ToonDefs />
      <circle cx={540} cy={540} r={470} fill="#ffe27a" />
      <CharacterView character={{ species: "bean", color: "#7b2ff7", name: "Rocky" }} x={x} y={y} s={s} mood="happy" talk={1} plain />
      <g transform="translate(700 300) rotate(10) scale(0.85)">
        <path d="M-170,-90 Q-170,-140 -120,-140 L150,-140 Q200,-140 200,-90 L200,40 Q200,90 150,90 L-40,90 L-120,160 L-95,90 L-120,90 Q-170,90 -170,40 Z" fill="#fff" stroke="#1d1d2b" strokeWidth={14} strokeLinejoin="round" />
        <text x={15} y={45} textAnchor="middle" fontFamily="Luckiest Guy" fontSize={150} fill="#7b2ff7" stroke="#1d1d2b" strokeWidth={6} paintOrder="stroke">
          YAP!
        </text>
      </g>
    </svg>
  </AbsoluteFill>
);
