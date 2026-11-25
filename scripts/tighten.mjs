// Dead-air remover. TTS voices leave ~1 s pauses after short sentences
// ("Fired.") and at the end of lines; in a 57 s Short that added up to ~12 s
// of silence, exactly where viewers swipe away. This squeezes every pause to a
// split second and shifts the word timings to match, so captions, mouths and
// sound cues stay in sync. Also appends the channel catchphrase to a scene.
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { writeWav16 } from "./voice-timing.mjs";

const RATE = 44100;
const WIN = Math.round(RATE * 0.01); // 10 ms analysis windows
const QUIET = 420; // peak below this (about -38 dBFS) counts as silence
const MIN_PAUSE = 0.16; // shorter pauses are left alone
const KEEP = 0.12; // what is left of each pause between words
const LEAD = 0.02; // silence kept before the first word
const TAIL = 0.1; // silence kept after the last word

const ffmpeg = (args) => {
  const r = spawnSync("npx", ["remotion", "ffmpeg", "-y", "-loglevel", "error", ...args], { stdio: "pipe", shell: process.platform === "win32" });
  if (r.status !== 0) throw new Error(`ffmpeg failed: ${String(r.stderr).slice(0, 300)}`);
};

// Any audio file → mono Float32 samples at 44.1 kHz.
export const decode = (path, tmpDir) => {
  const tmp = join(tmpDir, `.decode-${process.pid}-${Math.random().toString(36).slice(2)}.wav`);
  ffmpeg(["-i", path, "-ac", "1", "-ar", String(RATE), "-c:a", "pcm_s16le", tmp]);
  const buf = readFileSync(tmp);
  rmSync(tmp);
  const dataAt = buf.indexOf("data") + 8;
  const n = Math.floor((buf.length - dataAt) / 2);
  const out = new Float32Array(n);
  for (let i = 0; i < n; i++) out[i] = buf.readInt16LE(dataAt + i * 2) / 32768;
  return out;
};

// Silent stretches [startSample, endSample) at least MIN_PAUSE long.
const pauses = (s) => {
  const out = [];
  let from = null;
  for (let i = 0; i < s.length; i += WIN) {
    let peak = 0;
    for (let k = i; k < Math.min(i + WIN, s.length); k++) peak = Math.max(peak, Math.abs(s[k]) * 32768);
    if (peak < QUIET) {
      if (from === null) from = i;
    } else if (from !== null) {
      if (i - from >= MIN_PAUSE * RATE) out.push([from, i]);
      from = null;
    }
  }
  if (from !== null) out.push([from, s.length]);
  return out;
};

// Returns the tightened samples plus a function mapping old seconds → new seconds.
export const squeeze = (s) => {
  const cuts = []; // [start, end) sample ranges to drop
  for (const [a, b] of pauses(s)) {
    if (a === 0) cuts.push([0, Math.max(0, b - LEAD * RATE)]);
    else if (b >= s.length) cuts.push([Math.min(s.length, a + TAIL * RATE), s.length]);
    else {
      const keep = (KEEP * RATE) / 2;
      if (b - a > 2 * keep) cuts.push([Math.round(a + keep), Math.round(b - keep)]);
    }
  }
  const kept = [];
  let at = 0;
  for (const [a, b] of cuts) {
    if (a > at) kept.push(s.subarray(at, a));
    at = Math.max(at, b);
  }
  if (at < s.length) kept.push(s.subarray(at));
  const total = kept.reduce((n, k) => n + k.length, 0);
  const out = new Float32Array(total);
  let o = 0;
  for (const k of kept) {
    out.set(k, o);
    o += k.length;
  }
  const map = (sec) => {
    const x = sec * RATE;
    let removed = 0;
    for (const [a, b] of cuts) {
      if (x >= b) removed += b - a;
      else if (x > a) removed += x - a;
    }
    return Math.max(0, (x - removed) / RATE);
  };
  return { samples: out, map };
};

// The channel catchphrase: public/sfx/catchphrase.wav plus its word timings.
export const catchphrase = (root) => {
  const meta = join(root, "public/sfx/catchphrase.json");
  if (!existsSync(meta)) return null;
  return JSON.parse(readFileSync(meta, "utf8"));
};

// Tightens one scene's voice file (and adds the catchphrase "before" or
// "after" the narration); writes public/voice/<id>/<scene>.tight.wav and
// returns the scene with new file, duration and word starts.
export const tightenScene = (root, scene, phrase) => {
  const src = join(root, "public", scene.file);
  const { samples, map } = squeeze(decode(src, join(root, "public/voice")));
  let words = scene.words.map((w) => ({ word: w.word, start: Math.round(map(w.start) * 1000) / 1000 }));
  let audio = samples;
  const where = scene.catchphrase === true ? "after" : scene.catchphrase;
  if (phrase && (where === "before" || where === "after")) {
    const cp = decode(join(root, "public", phrase.file), join(root, "public/voice"));
    const gap = new Float32Array(Math.round(0.08 * RATE));
    const cpWords = (offset) => phrase.words.map((w, i, all) => ({
      word: `${i === 0 ? '"' : ""}${w.word}${i === all.length - 1 ? '"' : ""}`,
      start: Math.round((offset + w.start) * 1000) / 1000,
    }));
    if (where === "after") {
      const offset = samples.length / RATE + 0.08;
      audio = concat([samples, gap, cp]);
      words = [...words, ...cpWords(offset)];
    } else {
      const shift = cp.length / RATE + 0.08;
      audio = concat([cp, gap, samples]);
      words = [...cpWords(0), ...words.map((w) => ({ ...w, start: Math.round((w.start + shift) * 1000) / 1000 }))];
    }
  }
  const file = scene.file.replace(/\.(mp3|wav)$/, "") + ".tight.wav";
  writeWav16(join(root, "public", file), audio, RATE);
  return { ...scene, file, words, duration: Math.round((audio.length / RATE) * 1000) / 1000 };
};

const concat = (parts) => {
  const out = new Float32Array(parts.reduce((n, p) => n + p.length, 0));
  let o = 0;
  for (const p of parts) {
    out.set(p, o);
    o += p.length;
  }
  return out;
};
