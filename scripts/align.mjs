// Rescales TTS word timings so they line up with the real audio.
// SAPI's reported positions are stretched by an unknown factor at non-zero
// speech rates, so we detect pauses in each WAV, match them to the biggest
// gaps between reported words, and fit one scale factor across the story.
// Usage: node scripts/align.mjs src/generated/<story>.json
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const jsonPath = process.argv[2];
const publicDir = join(dirname(fileURLToPath(import.meta.url)), "..", "public");
const story = JSON.parse(readFileSync(jsonPath, "utf8"));

const WINDOW = 0.02;
const THRESHOLD = 600;
const MIN_PAUSE = 0.12;

// End times of internal silences (= onset of the next spoken phrase).
const phraseOnsets = (wavPath) => {
  const buf = readFileSync(wavPath);
  const rate = buf.readInt32LE(24);
  const data = buf.subarray(46);
  const n = Math.floor(data.length / 2);
  const win = Math.round(rate * WINDOW);
  const onsets = [];
  let silentSince = null;
  let spoke = false;
  for (let i = 0; i < n; i += win) {
    let peak = 0;
    for (let k = i; k < Math.min(i + win, n); k++) peak = Math.max(peak, Math.abs(data.readInt16LE(k * 2)));
    const t = i / rate;
    if (peak < THRESHOLD) {
      if (silentSince === null) silentSince = t;
    } else {
      if (spoke && silentSince !== null && t - silentSince > MIN_PAUSE) onsets.push(t);
      silentSince = null;
      spoke = true;
    }
  }
  return onsets;
};

const pairs = [];
for (const scene of story.scenes) {
  const onsets = phraseOnsets(join(publicDir, scene.file));
  const gaps = scene.words
    .slice(1)
    .map((w, i) => ({ index: i + 1, gap: w.start - scene.words[i].start }))
    .sort((a, b) => b.gap - a.gap)
    .slice(0, onsets.length)
    .sort((a, b) => a.index - b.index);
  if (gaps.length !== onsets.length) continue;
  gaps.forEach((g, k) => pairs.push({ reported: scene.words[g.index].start, actual: onsets[k] }));
}

// Least squares through the origin: actual ≈ scale * reported.
const scale = pairs.length
  ? pairs.reduce((s, p) => s + p.actual * p.reported, 0) / pairs.reduce((s, p) => s + p.reported * p.reported, 0)
  : 1;

for (const scene of story.scenes) {
  for (const w of scene.words) w.start = Math.round(w.start * scale * 1000) / 1000;
}
writeFileSync(jsonPath, JSON.stringify(story, null, 2));
const worst = Math.max(0, ...pairs.map((p) => Math.abs(p.reported * scale - p.actual)));
console.log(`Aligned with scale ${scale.toFixed(3)} from ${pairs.length} pauses (worst error ${worst.toFixed(2)}s)`);
