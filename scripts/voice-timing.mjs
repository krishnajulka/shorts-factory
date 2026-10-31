// Word timings for TTS engines that don't report them (Piper, Kokoro): find
// the pauses in a 16-bit PCM WAV and spread each phrase's words across the
// stretch of speech it lines up with.
import { readFileSync, writeFileSync } from "node:fs";

// [start, end] seconds of each stretch of speech between pauses.
const speechSegments = (wavPath) => {
  const buf = readFileSync(wavPath);
  const dataAt = buf.indexOf("data") + 8;
  const rate = buf.readInt32LE(24);
  const n = Math.floor((buf.length - dataAt) / 2);
  const win = Math.round(rate * 0.02);
  const segments = [];
  let start = null;
  let silentSince = null;
  for (let i = 0; i < n; i += win) {
    let peak = 0;
    for (let k = i; k < Math.min(i + win, n); k++) peak = Math.max(peak, Math.abs(buf.readInt16LE(dataAt + k * 2)));
    const t = i / rate;
    if (peak >= 600) {
      if (start === null) start = t;
      silentSince = null;
    } else if (start !== null) {
      if (silentSince === null) silentSince = t;
      if (t - silentSince > 0.15) {
        segments.push([start, silentSince]);
        start = null;
        silentSince = null;
      }
    }
  }
  if (start !== null) segments.push([start, silentSince ?? n / rate]);
  return { segments, duration: n / rate };
};

// Spread words across a time span in proportion to their length.
const spread = (words, from, to) => {
  const weights = words.map((w) => w.replace(/[^\w']/g, "").length + 2);
  const total = weights.reduce((a, b) => a + b, 0);
  let t = from;
  return words.map((word, i) => {
    const out = { word, start: Math.round(t * 1000) / 1000 };
    t += ((to - from) * weights[i]) / total;
    return out;
  });
};

export const timeWords = (text, wavPath) => {
  const { segments, duration } = speechSegments(wavPath);
  const phrases = text.split(/(?<=[.,!?;:])\s+/).map((p) => p.split(/\s+/).filter(Boolean)).filter((p) => p.length);
  // Phrases usually line up 1:1 with pauses; if not, spread over the whole line.
  const words =
    segments.length === phrases.length
      ? phrases.flatMap((p, i) => spread(p, segments[i][0], segments[i][1]))
      : spread(phrases.flat(), segments[0]?.[0] ?? 0, segments.at(-1)?.[1] ?? duration);
  return { words, duration: Math.round(Math.min(duration, (segments.at(-1)?.[1] ?? duration) + 0.35) * 1000) / 1000 };
};

// Writes float samples (-1..1) as a mono 16-bit PCM WAV.
export const writeWav16 = (path, samples, rate) => {
  const buf = Buffer.alloc(44 + samples.length * 2);
  buf.write("RIFF", 0);
  buf.writeUInt32LE(36 + samples.length * 2, 4);
  buf.write("WAVEfmt ", 8);
  buf.writeUInt32LE(16, 16);
  buf.writeUInt16LE(1, 20);
  buf.writeUInt16LE(1, 22);
  buf.writeUInt32LE(rate, 24);
  buf.writeUInt32LE(rate * 2, 28);
  buf.writeUInt16LE(2, 32);
  buf.writeUInt16LE(16, 34);
  buf.write("data", 36);
  buf.writeUInt32LE(samples.length * 2, 40);
  for (let i = 0; i < samples.length; i++) buf.writeInt16LE(Math.round(Math.max(-1, Math.min(1, samples[i])) * 32767), 44 + i * 2);
  writeFileSync(path, buf);
};
