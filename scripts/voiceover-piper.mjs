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
import { timeWords } from "./voice-timing.mjs";

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
