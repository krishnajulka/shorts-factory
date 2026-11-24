// Pre-renders the 3D parkour runs into public/clips/ (run on a PC with a GPU;
// the cloud machine plays these clips instead of rendering 3D itself).
// Usage: node scripts/render-parkour-clips.mjs
import { execFileSync } from "node:child_process";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const SEEDS = [11, 23, 37]; // keep in sync with PARKOUR_CLIP_SEEDS in src/satisfying/ParkourClip.tsx
mkdirSync(join(root, "public/clips"), { recursive: true });
for (const seed of SEEDS) {
  const out = `public/clips/parkour-${seed}.mp4`;
  // Props go through a file: inline JSON gets mangled by the Windows shell.
  const props = join(root, "out", `parkour-${seed}.props.json`);
  mkdirSync(dirname(props), { recursive: true });
  writeFileSync(props, JSON.stringify({ seed }));
  execFileSync("npx", ["remotion", "render", "ParkourClip", out, `--props=${props}`, "--crf=26", "--muted", "--log=error"], {
    cwd: root,
    stdio: "inherit",
    shell: process.platform === "win32",
  });
  rmSync(props);
  console.log(`✓ ${out}`);
}
