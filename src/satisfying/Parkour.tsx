import { useThree } from "@react-three/fiber";
import { ThreeCanvas } from "@remotion/three";
import React, { useMemo } from "react";
import { random, useCurrentFrame, useVideoConfig } from "remotion";
import * as THREE from "three";

// First-person block parkour over lava: the camera sprints across floating
// block platforms, jumping gaps, side-steps and height changes, speeding up as
// it goes. Our own procedural 3D (no game footage), deterministic per seed.

const W = 1080;
const H = 960;
const FPS = 30;
const EYE = 1.6;
const LAVA_Y = -4.5;

// Vertical sunset gradient for the sky dome (v=0 bottom .. 1 top).
let skyTex: THREE.DataTexture | null = null;
const skyTexture = () => {
  if (skyTex) return skyTex;
  const n = 64;
  const data = new Uint8Array(n * 4);
  const stops: [number, number[]][] = [
    [0, [255, 140, 70]],
    [0.5, [255, 150, 90]],
    [0.56, [255, 105, 120]],
    [0.7, [150, 70, 160]],
    [1, [40, 25, 90]],
  ];
  for (let i = 0; i < n; i++) {
    const v = i / (n - 1);
    let k = 0;
    while (k < stops.length - 2 && v > stops[k + 1][0]) k++;
    const [v0, c0] = stops[k];
    const [v1, c1] = stops[k + 1];
    const u = Math.min(1, Math.max(0, (v - v0) / (v1 - v0)));
    data.set([0, 1, 2].map((j) => Math.round(c0[j] + (c1[j] - c0[j]) * u)).concat(255), i * 4);
  }
  skyTex = new THREE.DataTexture(data, 1, n);
  skyTex.colorSpace = THREE.SRGBColorSpace;
  skyTex.magFilter = THREE.LinearFilter;
  skyTex.needsUpdate = true;
  return skyTex;
};

// 16x16 pixel-noise texture (voxel look), shared by every block.
let pixelTex: THREE.DataTexture | null = null;
const pixelTexture = () => {
  if (pixelTex) return pixelTex;
  const n = 16;
  const data = new Uint8Array(n * n * 4);
  for (let i = 0; i < n * n; i++) {
    const v = 200 + Math.floor(random(`px${i}`) * 55);
    const edge = i % n === 0 || i % n === n - 1 || i < n || i >= n * (n - 1);
    data.set([edge ? v - 70 : v, edge ? v - 70 : v, edge ? v - 70 : v, 255], i * 4);
  }
  pixelTex = new THREE.DataTexture(data, n, n);
  pixelTex.magFilter = THREE.NearestFilter;
  pixelTex.minFilter = THREE.NearestFilter;
  pixelTex.colorSpace = THREE.SRGBColorSpace;
  pixelTex.needsUpdate = true;
  return pixelTex;
};

type Platform = { z0: number; z1: number; x: number; y: number; width: number; color: number; special: boolean };

const PALETTE = [0x5fbf4a, 0x4fb8e8, 0xf2c14e, 0xe86fb0, 0x9b7bea, 0x6fe3c4];

const buildCourse = (seed: number, length: number) => {
  const plats: Platform[] = [];
  let z = 0;
  let x = 0;
  let y = 0;
  for (let i = 0; z < length; i++) {
    const r = (k: string) => random(`pk${seed}-${i}-${k}`);
    const len = i === 0 ? 8 : 1 + Math.floor(r("len") * 4);
    const width = r("w") < 0.55 ? 1 : r("w") < 0.85 ? 2 : 3;
    const special = i > 0 && r("sp") < 0.18;
    plats.push({ z0: z, z1: z + len, x, y, width, color: special ? 0xffd23f : PALETTE[Math.floor(r("c") * PALETTE.length)], special });
    const gap = 1.5 + r("gap") * 2.2;
    z += len + gap;
    // Side-steps and height changes make every jump feel different.
    x = Math.max(-3, Math.min(3, x + Math.round((r("dx") - 0.5) * 3)));
    y = Math.max(-2, Math.min(3, y + (r("dy") < 0.25 ? 1 : r("dy") > 0.8 ? -1 : 0)));
  }
  return plats;
};

// Distance run by a given frame: starts brisk and keeps speeding up.
const distanceAt = (frame: number) => {
  const t = frame / FPS;
  return 6.5 * t + 0.06 * t * t;
};

const smooth = (u: number) => u * u * (3 - 2 * u);

// Eye position at distance z along the course.
const eyeAt = (plats: Platform[], z: number) => {
  for (let i = 0; i < plats.length; i++) {
    const p = plats[i];
    if (z >= p.z0 && z <= p.z1) {
      const bob = Math.sin(z * Math.PI * 1.6) * 0.07;
      // Small dip right after landing.
      const dip = i > 0 ? Math.max(0, 1 - (z - p.z0) / 0.8) * 0.35 : 0;
      return { x: p.x, y: p.y + EYE + bob - dip, onGround: true, i };
    }
    const next = plats[i + 1];
    if (next && z > p.z1 && z < next.z0) {
      const u = (z - p.z1) / (next.z0 - p.z1);
      const gap = next.z0 - p.z1;
      const arc = Math.sin(Math.PI * u) * (1.1 + gap * 0.3);
      return { x: p.x + (next.x - p.x) * smooth(u), y: p.y + (next.y - p.y) * u + EYE + arc, onGround: false, i };
    }
  }
  const last = plats[plats.length - 1];
  return { x: last.x, y: last.y + EYE, onGround: true, i: plats.length - 1 };
};

export const parkourSounds = (frames: number, seed: number) => {
  const plats = buildCourse(seed, distanceAt(frames) + 60);
  const out: { frame: number; rate: number }[] = [];
  let f = 0;
  for (let i = 1; i < plats.length; i++) {
    while (f < frames && distanceAt(f) < plats[i].z0) f++;
    if (f >= frames) break;
    out.push({ frame: f, rate: plats[i].special ? 1.5 : 0.9 + random(`pks${seed}-${i}`) * 0.25 });
  }
  return out;
};

const Block: React.FC<{ x: number; y: number; z: number; color: number }> = ({ x, y, z, color }) => {
  const top = useMemo(() => new THREE.Color(color), [color]);
  const side = useMemo(() => new THREE.Color(color).multiplyScalar(0.55), [color]);
  return (
    <group position={[x, y - 0.5, -z - 0.5]}>
      <mesh>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color={side} roughness={0.9} map={pixelTexture()} />
      </mesh>
      {/* bright top cap, slightly raised, reads like a grass/colour layer */}
      <mesh position={[0, 0.46, 0]}>
        <boxGeometry args={[1.02, 0.12, 1.02]} />
        <meshStandardMaterial color={top} roughness={0.7} emissive={top} emissiveIntensity={0.12} map={pixelTexture()} />
      </mesh>
    </group>
  );
};

const World: React.FC<{ plats: Platform[]; z: number; frame: number }> = ({ plats, z, frame }) => {
  const { camera } = useThree();
  const eye = eyeAt(plats, z);
  const ahead = eyeAt(plats, z + 5);
  camera.position.set(eye.x, eye.y, -z);
  camera.lookAt(ahead.x * 0.8 + eye.x * 0.2, ahead.y - 0.7, -(z + 5));
  // A little roll on side-steps sells the speed.
  camera.rotateZ((ahead.x - eye.x) * -0.04);

  const visible = plats.filter((p) => p.z1 > z - 3 && p.z0 < z + 60);
  // Stone pillars rising out of the lava on both sides rush past for speed.
  const pillars = [];
  for (let k = Math.floor((z - 4) / 6); k < (z + 60) / 6; k++) {
    for (const side of [-1, 1]) {
      const r = (s: string) => random(`pil${k}-${side}-${s}`);
      pillars.push({ key: `${k}${side}`, x: side * (6 + r("x") * 9), z: k * 6 + r("z") * 4, h: 3 + r("h") * 9, w: 1 + Math.floor(r("w") * 2), hue: r("c") });
    }
  }
  return (
    <>
      <color attach="background" args={["#ff9a5c"]} />
      <fog attach="fog" args={["#ff9a5c", 22, 62]} />
      {/* big sky dome: deep purple above, sunset orange at the horizon */}
      <mesh position={[0, 0, -z]}>
        <sphereGeometry args={[90, 24, 16]} />
        <meshBasicMaterial side={THREE.BackSide} fog={false} map={skyTexture()} />
      </mesh>
      <ambientLight intensity={0.75} />
      <directionalLight position={[4, 10, 2]} intensity={1.4} />
      {visible.map((p, i) => {
        const blocks: React.ReactNode[] = [];
        const half = (p.width - 1) / 2;
        for (let bz = Math.floor(p.z0); bz < p.z1; bz++) {
          for (let bx = -half; bx <= half; bx++) {
            blocks.push(<Block key={`${i}-${bz}-${bx}`} x={p.x + bx} y={p.y} z={bz} color={p.color} />);
          }
        }
        return (
          <group key={p.z0}>
            {blocks}
            {p.special ? (
              // Glowing checkpoint ring floating over gold platforms.
              <mesh position={[p.x, p.y + 1.6, -(p.z0 + p.z1) / 2]} rotation={[0, frame * 0.05, 0]}>
                <torusGeometry args={[0.9, 0.12, 12, 40]} />
                <meshStandardMaterial color="#fff27a" emissive="#ffb300" emissiveIntensity={1.2} />
              </mesh>
            ) : null}
          </group>
        );
      })}
      {pillars.map((pl) => (
        <mesh key={pl.key} position={[pl.x, LAVA_Y + pl.h / 2, -pl.z]}>
          <boxGeometry args={[pl.w, pl.h, pl.w]} />
          <meshStandardMaterial color={pl.hue < 0.5 ? "#6b5b73" : pl.hue < 0.8 ? "#4a6670" : "#7a4b6b"} roughness={1} map={pixelTexture()} />
        </mesh>
      ))}
      {/* lava sea */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, LAVA_Y, -z - 20]}>
        <planeGeometry args={[120, 120]} />
        <meshStandardMaterial color="#ff5a00" emissive="#ff3d00" emissiveIntensity={1.1 + Math.sin(frame / 7) * 0.2} map={pixelTexture()} />
      </mesh>
      {new Array(30).fill(0).map((_, i) => {
        const rz = z + ((random(`ember-z${i}`) * 50 + frame * 0.05) % 50) - 5;
        const ry = LAVA_Y + ((random(`ember-y${i}`) * 8 + frame * 0.04 * (1 + random(`ember-s${i}`))) % 8);
        return (
          <mesh key={i} position={[(random(`ember-x${i}`) - 0.5) * 24, ry, -rz]}>
            <boxGeometry args={[0.15, 0.15, 0.15]} />
            <meshBasicMaterial color="#ffcf4d" />
          </mesh>
        );
      })}
    </>
  );
};

export const Parkour: React.FC<{ seed: number }> = ({ seed }) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const plats = useMemo(() => buildCourse(seed, distanceAt(durationInFrames) + 60), [seed, durationInFrames]);
  const z = distanceAt(frame);
  const eye = eyeAt(plats, z);
  const jumps = eye.i;
  const landedAt = plats[eye.i] && eye.onGround ? z - plats[eye.i].z0 : 99;
  const perfect = plats[eye.i]?.special && landedAt < 1.4;

  return (
    <div style={{ position: "relative", width: W, height: H }}>
      <ThreeCanvas width={W} height={H} camera={{ fov: 82, near: 0.1, far: 120, position: [0, EYE, 0] }}>
        <World plats={plats} z={z} frame={frame} />
      </ThreeCanvas>
      <div style={{ position: "absolute", left: 40, bottom: 34, fontFamily: "Montserrat", fontWeight: 900, fontSize: 46, color: "#fff", WebkitTextStroke: "8px #000", paintOrder: "stroke fill" }}>
        {`JUMPS: ${jumps}`}
      </div>
      <div style={{ position: "absolute", right: 40, bottom: 34, fontFamily: "Montserrat", fontWeight: 900, fontSize: 46, color: "#fff", WebkitTextStroke: "8px #000", paintOrder: "stroke fill" }}>
        {`${Math.floor(z)}m`}
      </div>
      {perfect ? (
        <div
          style={{
            position: "absolute",
            top: 120,
            width: W,
            textAlign: "center",
            fontFamily: "Montserrat",
            fontWeight: 900,
            fontSize: 84,
            color: "#ffe14d",
            WebkitTextStroke: "12px #000",
            paintOrder: "stroke fill",
            scale: String(1.3 - Math.min(0.3, landedAt * 0.4)),
          }}
        >
          CHECKPOINT!
        </div>
      ) : null}
    </div>
  );
};
