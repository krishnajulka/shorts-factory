// Records the channel catchphrase once. ElevenLabs says the word a single
// time; it is pitched up into a squeaky cartoon voice (never mistaken for the
// narrator) and repeated three times in a fixed rhythm, each a little higher
// and the last one loudest: "Yap! Yap! YAP!". Same every Short, exact timing.
// Writes public/sfx/catchphrase.wav + catchphrase.json (committed, so the
// cloud never has to regenerate it).
// Usage: node scripts/gen-catchphrase.mjs [word] [voice] [pitch]
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { NARRATORS, elevenLabsKey } from "./voiceover-elevenlabs.mjs";
import { decode } from "./tighten.mjs";
import { writeWav16 } from "./voice-timing.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const WORD = process.argv[2] ?? "Yap!";
const VOICE = process.argv[3] ?? "liam";
const PITCH = Number(process.argv[4] ?? 1.25);
const RATE = 44100;
const BEAT = 0.16; // silence between yaps
const STEPS = [
  { pitch: 1.0, gain: 0.8 },
  { pitch: 1.07, gain: 0.85 },
  { pitch: 1.16, gain: 1.0 },
];

const key = elevenLabsKey();
if (!key) throw new Error("Needs an ElevenLabs key");
const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${NARRATORS[VOICE]}?output_format=mp3_44100_128`, {
  method: "POST",
  headers: { "xi-api-key": key, "Content-Type": "application/json" },
  body: JSON.stringify({ text: WORD, model_id: "eleven_multilingual_v2", voice_settings: { stability: 0.3, similarity_boost: 0.7, style: 0.7, use_speaker_boost: true, speed: 1.0 } }),
});
if (!res.ok) throw new Error(`ElevenLabs ${res.status}: ${(await res.text()).slice(0, 200)}`);
mkdirSync(join(root, "public/sfx"), { recursive: true });
const rawPath = join(root, "public/sfx/.catchphrase-raw.mp3");
writeFileSync(rawPath, Buffer.from(await res.arrayBuffer()));
const src = decode(rawPath, join(root, "public/sfx"));
rmSync(rawPath);

// Trim to the spoken word.
const amp = src.reduce((m, v) => Math.max(m, Math.abs(v)), 0);
let a = 0;
let b = src.length - 1;
while (a < b && Math.abs(src[a]) < amp * 0.03) a++;
while (b > a && Math.abs(src[b]) < amp * 0.03) b--;
const word = src.slice(Math.max(0, a - 200), Math.min(src.length, b + 800));

// Sped-up-tape pitch shift by linear resampling.
const shift = (s, p) => {
  const out = new Float32Array(Math.floor(s.length / p));
  for (let i = 0; i < out.length; i++) {
    const x = i * p;
    const k = Math.floor(x);
    out[i] = s[k] + (s[Math.min(k + 1, s.length - 1)] - s[k]) * (x - k);
  }
  return out;
};

const parts = [];
const words = [];
let t = 0;
STEPS.forEach((step, i) => {
  const yap = shift(word, PITCH * step.pitch).map((v) => (v / amp) * 0.9 * step.gain);
  words.push({ word: i === STEPS.length - 1 ? WORD.toUpperCase() : WORD, start: Math.round(t * 1000) / 1000 });
  parts.push(yap);
  t += yap.length / RATE;
  if (i < STEPS.length - 1) {
    parts.push(new Float32Array(Math.round(BEAT * RATE)));
    t += BEAT;
  }
});
const samples = new Float32Array(parts.reduce((n, p) => n + p.length, 0));
let o = 0;
for (const p of parts) {
  samples.set(p, o);
  o += p.length;
}
writeWav16(join(root, "public/sfx/catchphrase.wav"), samples, RATE);
const meta = { text: words.map((w) => w.word).join(" "), voice: VOICE, pitch: PITCH, file: "sfx/catchphrase.wav", emoji: "🗣️", duration: Math.round((samples.length / RATE) * 1000) / 1000, words };
writeFileSync(join(root, "public/sfx/catchphrase.json"), JSON.stringify(meta, null, 2));
console.log(`✓ Catchphrase "${meta.text}" (${VOICE} ×${PITCH}): ${meta.duration}s`, words);
