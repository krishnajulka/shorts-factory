import React from "react";
import { useCurrentFrame } from "remotion";

// Morphing phyllotaxis: dots placed at a slowly drifting angle keep folding
// into new spiral patterns. Pure function of the frame, no simulation.

const W = 1080;
const H = 960;
const DOTS = 420;

export const Spiral: React.FC<{ seed: number }> = ({ seed }) => {
  const frame = useCurrentFrame();
  const t = frame / 30;
  const angle = 137.5 + Math.sin(t * 0.12 + seed) * 3.5;
  const hueShift = seed * 37 + t * 40;
  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{ display: "block", background: "#05040b" }}>
      <g transform={`translate(${W / 2} ${H / 2}) rotate(${t * 12})`}>
        {new Array(DOTS).fill(0).map((_, i) => {
          const a = (i * angle * Math.PI) / 180;
          const r = Math.sqrt(i) * 21;
          const pulse = 1 + 0.5 * Math.sin(t * 4 - i * 0.05);
          return <circle key={i} cx={Math.cos(a) * r} cy={Math.sin(a) * r} r={(3 + i / 70) * pulse} fill={`hsl(${(i * 0.9 + hueShift) % 360} 95% 60%)`} />;
        })}
      </g>
    </svg>
  );
};
