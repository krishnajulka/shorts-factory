// Synthesizes the channel's own sound effects and background music beds as
// WAV files, so every sound is ours: no licence, no credit, no Content ID.
// Deterministic (seeded), so rerunning produces identical files.
// Usage: node scripts/gen-audio.mjs   → public/sfx/*.wav and public/music/*.wav
import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { writeWav16 } from "./voice-timing.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const RATE = 44100;
const TAU = Math.PI * 2;

let seed = 1234567;
const rand = () => ((seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648) * 2 - 1;

const buffer = (seconds) => new Float32Array(Math.round(seconds * RATE));
const envelope = (t, attack, decay) => (t < attack ? t / attack : Math.exp(-(t - attack) / decay));
const normalize = (s, peak = 0.9) => {
  let max = 0;
  for (const v of s) max = Math.max(max, Math.abs(v));
  if (max > 0) for (let i = 0; i < s.length; i++) s[i] = (s[i] / max) * peak;
  return s;
};
// One-pole low-pass filter, cutoff can change per sample.
const lowpass = (s, cutoffAt) => {
  let y = 0;
  for (let i = 0; i < s.length; i++) {
    const a = 1 - Math.exp((-TAU * cutoffAt(i / RATE)) / RATE);
    y += a * (s[i] - y);
    s[i] = y;
  }
  return s;
};

// ---------- Sound effects ----------
const SFX = {
  // Cartoon pop: fast downward sine chirp.
  pop: () => {
    const s = buffer(0.14);
    let ph = 0;
    for (let i = 0; i < s.length; i++) {
      const t = i / RATE;
      ph += (TAU * (900 * Math.exp(-t * 30) + 180)) / RATE;
      s[i] = Math.sin(ph) * envelope(t, 0.002, 0.04);
    }
    return normalize(s, 0.8);
  },
  // Spring boing: wobbling pitch that rises then settles.
  boing: () => {
    const s = buffer(0.55);
    let ph = 0;
    for (let i = 0; i < s.length; i++) {
      const t = i / RATE;
      const f = 220 + 160 * Math.sin(TAU * 14 * t) * Math.exp(-t * 5) + 120 * Math.min(1, t * 8);
      ph += (TAU * f) / RATE;
      s[i] = (Math.sin(ph) + 0.3 * Math.sin(ph * 2)) * envelope(t, 0.004, 0.18);
    }
    return normalize(s, 0.75);
  },
  // Heavy landing: low thump plus a short burst of filtered noise.
  thud: () => {
    const s = buffer(0.4);
    let ph = 0;
    for (let i = 0; i < s.length; i++) {
      const t = i / RATE;
      ph += (TAU * (95 * Math.exp(-t * 6) + 40)) / RATE;
      s[i] = Math.sin(ph) * envelope(t, 0.002, 0.11) + rand() * 0.5 * envelope(t, 0.001, 0.02);
    }
    return normalize(lowpass(s, () => 1400), 0.9);
  },
  // Air whoosh for cuts: noise swept through a rising then falling filter.
  swish: () => {
    const s = buffer(0.45);
    for (let i = 0; i < s.length; i++) s[i] = rand() * Math.sin((Math.PI * i) / s.length) ** 2;
    return normalize(lowpass(s, (t) => 400 + 5000 * Math.sin((Math.PI * t) / 0.45)), 0.6);
  },
  // Tension riser before a reveal: rising noise and pitch, cut off sharply.
  riser: () => {
    const s = buffer(1.6);
    let ph = 0;
    for (let i = 0; i < s.length; i++) {
      const t = i / RATE;
      const amt = (t / 1.6) ** 2;
      ph += (TAU * (120 + 700 * amt)) / RATE;
      s[i] = (rand() * 0.6 + Math.sin(ph) * 0.4) * amt;
    }
    return normalize(lowpass(s, (t) => 300 + 6000 * (t / 1.6) ** 2), 0.6);
  },
  // Magic sparkle: quick rising bell notes.
  sparkle: () => {
    const s = buffer(0.9);
    const notes = [1318, 1568, 1976, 2637, 3136];
    notes.forEach((f, n) => {
      const start = Math.round(n * 0.06 * RATE);
      for (let i = start; i < s.length; i++) {
        const t = (i - start) / RATE;
        s[i] += (Math.sin(TAU * f * t) + 0.4 * Math.sin(TAU * f * 2.01 * t)) * envelope(t, 0.002, 0.18);
      }
    });
    return normalize(s, 0.5);
  },
  // Comedic slide-whistle down, for fails.
  slideDown: () => {
    const s = buffer(0.7);
    let ph = 0;
    for (let i = 0; i < s.length; i++) {
      const t = i / RATE;
      ph += (TAU * (1400 * Math.exp(-t * 2.6) + 150)) / RATE;
      s[i] = Math.sin(ph + 0.4 * Math.sin(TAU * 6 * t)) * envelope(t, 0.02, 0.4);
    }
    return normalize(s, 0.6);
  },
  // Soft tick for counters (day 1, day 2...).
  tick: () => {
    const s = buffer(0.08);
    for (let i = 0; i < s.length; i++) {
      const t = i / RATE;
      s[i] = (Math.sin(TAU * 2400 * t) * 0.6 + rand() * 0.4) * envelope(t, 0.0005, 0.012);
    }
    return normalize(s, 0.7);
  },
};

// ---------- Music beds ----------
// Simple loops: bass, plucked chords and soft percussion in one of three moods.
const midi = (n) => 440 * 2 ** ((n - 69) / 12);
const MOODS = {
  playful: { bpm: 112, chords: [[60, 64, 67], [57, 60, 64], [53, 57, 60], [55, 59, 62]], bass: [36, 33, 29, 31], swing: 0.08, bright: 3200 },
  mystery: { bpm: 84, chords: [[57, 60, 64], [53, 57, 60], [50, 53, 57], [52, 56, 59]], bass: [33, 29, 26, 28], swing: 0, bright: 1800 },
  tense: { bpm: 100, chords: [[52, 55, 59], [52, 55, 58], [53, 56, 60], [51, 54, 58]], bass: [28, 28, 29, 27], swing: 0, bright: 1400 },
};

const pluck = (s, start, f, len, vol) => {
  const a = Math.round(start * RATE);
  for (let i = 0; i < Math.round(len * RATE) && a + i < s.length; i++) {
    const t = i / RATE;
    s[a + i] += (Math.sin(TAU * f * t) + 0.5 * Math.sin(TAU * f * 2 * t) * Math.exp(-t * 8) + 0.25 * Math.sin(TAU * f * 3 * t) * Math.exp(-t * 14)) * envelope(t, 0.004, 0.22) * vol;
  }
};
const bassNote = (s, start, f, len, vol) => {
  const a = Math.round(start * RATE);
  for (let i = 0; i < Math.round(len * RATE) && a + i < s.length; i++) {
    const t = i / RATE;
    s[a + i] += Math.sin(TAU * f * t + 0.6 * Math.sin(TAU * f * t)) * envelope(t, 0.01, len * 0.6) * vol;
  }
};
const hat = (s, start, vol) => {
  const a = Math.round(start * RATE);
  let prev = 0;
  for (let i = 0; i < Math.round(0.05 * RATE) && a + i < s.length; i++) {
    const n = rand();
    s[a + i] += (n - prev) * envelope(i / RATE, 0.0005, 0.012) * vol;
    prev = n;
  }
};
const kick = (s, start, vol) => {
  const a = Math.round(start * RATE);
  let ph = 0;
  for (let i = 0; i < Math.round(0.25 * RATE) && a + i < s.length; i++) {
    const t = i / RATE;
    ph += (TAU * (110 * Math.exp(-t * 18) + 45)) / RATE;
    s[a + i] += Math.sin(ph) * envelope(t, 0.001, 0.08) * vol;
  }
};

const music = (mood) => {
  const m = MOODS[mood];
  const beat = 60 / m.bpm;
  const bars = 8;
  const s = buffer(bars * 4 * beat);
  for (let bar = 0; bar < bars; bar++) {
    const chord = m.chords[bar % 4];
    const t0 = bar * 4 * beat;
    bassNote(s, t0, midi(m.bass[bar % 4]), beat * 2, 0.5);
    bassNote(s, t0 + 2 * beat, midi(m.bass[bar % 4]), beat * 2, 0.4);
    for (let e = 0; e < 8; e++) {
      const t = t0 + e * (beat / 2) + (e % 2 ? m.swing * beat : 0);
      const note = chord[[0, 1, 2, 1, 0, 2, 1, 2][e]] + (e === 6 && mood === "playful" ? 12 : 0);
      pluck(s, t, midi(note + 12), beat * 0.9, mood === "tense" ? 0.18 : 0.25);
      hat(s, t, mood === "mystery" ? 0.05 : 0.12);
    }
    if (mood !== "mystery") for (const b of [0, 2]) kick(s, t0 + b * beat, 0.5);
  }
  lowpass(s, () => m.bright);
  // Fade the loop's edges a touch so it repeats without a click.
  const fade = Math.round(0.02 * RATE);
  for (let i = 0; i < fade; i++) {
    s[i] *= i / fade;
    s[s.length - 1 - i] *= i / fade;
  }
  return normalize(s, 0.7);
};

mkdirSync(join(root, "public/sfx"), { recursive: true });
mkdirSync(join(root, "public/music"), { recursive: true });
for (const [name, make] of Object.entries(SFX)) writeWav16(join(root, "public/sfx", `${name}.wav`), make(), RATE);
for (const mood of Object.keys(MOODS)) writeWav16(join(root, "public/music", `${mood}.wav`), music(mood), RATE);
console.log(`✓ ${Object.keys(SFX).length} sound effects and ${Object.keys(MOODS).length} music beds written`);
