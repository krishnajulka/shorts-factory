// Free offline fallback voice (Piper neural TTS), used when ElevenLabs is out
// of credits — works on Windows and on the Linux cloud machine. Piper gives no
// word timings, so they're estimated from the pauses found in the audio.
// Writes src/generated/<id>.json in the same shape as the other voice scripts.
// Usage: node scripts/voiceover-piper.mjs stories/<id>.json
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const RELEASE = "https://github.com/rhasspy/piper/releases/download/2023.11.14-2";
const VOICE = "en_US-ryan-high";
const VOICE_URL = "https://huggingface.co/rhasspy/piper-voices/resolve/v1.0.0/en/en_US/ryan/high";
const CACHE = join(homedir(), ".cache", "shorts-piper");

const download = async (url, file) => {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Download failed ${res.status}: ${url}`);
  writeFileSync(file, Buffer.from(await res.arrayBuffer()));
};

// Downloads the Piper binary and voice model once, then reuses them.
const ensurePiper = async () => {
  mkdirSync(CACHE, { recursive: true });
  const win = process.platform === "win32";
  const exe = join(CACHE, "piper", win ? "piper.exe" : "piper");
  if (!existsSync(exe)) {
    const archive = join(CACHE, win ? "piper.zip" : "piper.tar.gz");
    console.log("Downloading Piper voice engine (one time)...");
    await download(`${RELEASE}/${win ? "piper_windows_amd64.zip" : "piper_linux_x86_64.tar.gz"}`, archive);
    // Windows' own tar reads zip files and C:\ paths (Git's GNU tar does neither).
    execFileSync(win ? join(process.env.SystemRoot ?? "C:\\Windows", "System32", "tar.exe") : "tar", ["-xf", archive, "-C", CACHE]);
  }
  const model = join(CACHE, `${VOICE}.onnx`);
  if (!existsSync(model)) {
    console.log(`Downloading voice model ${VOICE} (one time)...`);
    await download(`${VOICE_URL}/${VOICE}.onnx`, model);
    await download(`${VOICE_URL}/${VOICE}.onnx.json`, `${model}.json`);
  }
  return { exe, model };
};

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

const timeWords = (text, wavPath) => {
  const { segments, duration } = speechSegments(wavPath);
  const phrases = text.split(/(?<=[.,!?;:])\s+/).map((p) => p.split(/\s+/).filter(Boolean)).filter((p) => p.length);
  // Phrases usually line up 1:1 with pauses; if not, spread over the whole line.
  const words =
    segments.length === phrases.length
      ? phrases.flatMap((p, i) => spread(p, segments[i][0], segments[i][1]))
      : spread(phrases.flat(), segments[0]?.[0] ?? 0, segments.at(-1)?.[1] ?? duration);
  return { words, duration: Math.round((Math.min(duration, (segments.at(-1)?.[1] ?? duration) + 0.35)) * 1000) / 1000 };
};

const main = async () => {
  const root = join(dirname(fileURLToPath(import.meta.url)), "..");
  const story = JSON.parse(readFileSync(join(root, process.argv[2]), "utf8"));
  const { exe, model } = await ensurePiper();
  const outDir = join(root, "public/voice", story.id);
  mkdirSync(outDir, { recursive: true });

  const scenes = story.scenes.map((scene) => {
    const file = `voice/${story.id}/${scene.id}.wav`;
    execFileSync(exe, ["--model", model, "--output_file", join(root, "public", file), "--length_scale", "0.92", "--sentence_silence", "0.25"], {
      input: scene.text,
      cwd: dirname(exe),
      stdio: ["pipe", "ignore", "pipe"],
    });
    return { id: scene.id, text: scene.text, file, ...timeWords(scene.text, join(root, "public", file)) };
  });

  writeFileSync(join(root, "src/generated", `${story.id}.json`), JSON.stringify({ id: story.id, title: story.title, scenes }, null, 2));
  console.log(`Piper voice "${VOICE}": ${scenes.length} scenes (free fallback)`);
};

main().catch((err) => {
  console.error(`✗ Piper voice failed: ${err.message}`);
  process.exit(1);
});
