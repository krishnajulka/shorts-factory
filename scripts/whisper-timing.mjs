// Exact word timings: Whisper (via transformers.js, already installed with
// Kokoro) listens to a narration WAV and reports when each word starts. The
// script's own words are then mapped onto what Whisper heard, so captions,
// mouths and sound effects land on the right frame. Falls back to the
// pause-based estimate (voice-timing.mjs) when Whisper can't be loaded.
import { readFileSync } from "node:fs";
import { timeWords } from "./voice-timing.mjs";

const MODEL = "onnx-community/whisper-base.en_timestamped";
let asr = null;

const loadAsr = async () => {
  if (asr === null) {
    const { pipeline } = await import("@huggingface/transformers");
    asr = await pipeline("automatic-speech-recognition", MODEL, { dtype: "q8", device: "cpu" });
  }
  return asr;
};

// 16-bit PCM WAV → mono Float32 at 16 kHz (what Whisper expects).
const readWav16k = (path) => {
  const buf = readFileSync(path);
  const rate = buf.readInt32LE(24);
  const dataAt = buf.indexOf("data") + 8;
  const n = Math.floor((buf.length - dataAt) / 2);
  const out = new Float32Array(Math.floor((n * 16000) / rate));
  for (let i = 0; i < out.length; i++) {
    const src = (i * rate) / 16000;
    const k = Math.floor(src);
    const a = buf.readInt16LE(dataAt + Math.min(k, n - 1) * 2) / 32768;
    const b = buf.readInt16LE(dataAt + Math.min(k + 1, n - 1) * 2) / 32768;
    out[i] = a + (b - a) * (src - k);
  }
  return out;
};

const norm = (w) => w.toLowerCase().replace(/[^a-z0-9]/g, "");

// Map each script word to a heard word: walk both lists, matching equal words
// and spreading any unmatched script words between the neighbouring matches.
const mapWords = (scriptWords, heard, duration) => {
  const starts = new Array(scriptWords.length).fill(null);
  let h = 0;
  for (let i = 0; i < scriptWords.length; i++) {
    const target = norm(scriptWords[i]);
    for (let look = h; look < Math.min(h + 4, heard.length); look++) {
      if (norm(heard[look].text) === target || (target.length > 3 && norm(heard[look].text).startsWith(target.slice(0, 4)))) {
        starts[i] = heard[look].start;
        h = look + 1;
        break;
      }
    }
  }
  // Fill gaps by interpolating between known starts.
  for (let i = 0; i < starts.length; i++) {
    if (starts[i] !== null) continue;
    let j = i;
    while (j < starts.length && starts[j] === null) j++;
    const from = i === 0 ? (heard[0]?.start ?? 0) : starts[i - 1];
    const to = j < starts.length ? starts[j] : (heard.at(-1)?.end ?? duration);
    for (let k = i; k < j; k++) starts[k] = from + ((to - from) * (k - i + (i === 0 ? 0 : 1))) / (j - i + 1);
    i = j - 1;
  }
  return scriptWords.map((word, i) => ({ word, start: Math.round(starts[i] * 1000) / 1000 }));
};

export const timeWordsExact = async (text, wavPath) => {
  const estimate = timeWords(text, wavPath);
  try {
    const run = await loadAsr();
    const audio = readWav16k(wavPath);
    const result = await run(audio, { return_timestamps: "word" });
    const heard = (result.chunks ?? [])
      .map((c) => ({ text: c.text.trim(), start: c.timestamp[0], end: c.timestamp[1] ?? c.timestamp[0] }))
      .filter((c) => c.text && Number.isFinite(c.start));
    const scriptWords = text.split(/\s+/).filter(Boolean);
    const matched = heard.length >= Math.max(2, scriptWords.length * 0.6);
    if (!matched) return { ...estimate, timing: "estimated" };
    const words = mapWords(scriptWords, heard, estimate.duration);
    // Whisper tends to stamp the first word at 0; never start before the voice does.
    if (words.length && estimate.words.length) words[0].start = Math.max(words[0].start, Math.min(estimate.words[0].start, words[1]?.start ?? Infinity) - 0.05);
    return { words, duration: estimate.duration, timing: "whisper" };
  } catch (err) {
    console.warn(`⚠ Whisper timing unavailable (${err.message.split("\n")[0]}); using estimated timing`);
    return { ...estimate, timing: "estimated" };
  }
};
