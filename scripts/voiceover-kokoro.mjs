// Free, natural-sounding fallback voice (Kokoro, runs locally on CPU), used
// when ElevenLabs is out of credits. Works on Windows and the Linux cloud
// machine; the ~90 MB model downloads on first use. Word timings are
// estimated from pauses (scripts/voice-timing.mjs).
// Writes src/generated/<id>.json in the same shape as the other voice scripts.
// Usage: node scripts/voiceover-kokoro.mjs stories/<id>.json
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { KokoroTTS } from "kokoro-js";
import { timeWords, writeWav16 } from "./voice-timing.mjs";

// Story narrators (named after their ElevenLabs voices) → closest Kokoro voice.
const VOICES = {
  brian: "am_michael", // deep storyteller
  george: "bm_george", // warm British
  jessica: "af_heart", // expressive female
  liam: "am_liam", // energetic young male
  callum: "am_fenrir", // intense
};
const SPEED = 1.05;

const main = async () => {
  const root = join(dirname(fileURLToPath(import.meta.url)), "..");
  const story = JSON.parse(readFileSync(join(root, process.argv[2]), "utf8"));
  const voice = VOICES[story.narrator] ?? VOICES.brian;
  const tts = await KokoroTTS.from_pretrained("onnx-community/Kokoro-82M-v1.0-ONNX", { dtype: "q8", device: "cpu" });
  const outDir = join(root, "public/voice", story.id);
  mkdirSync(outDir, { recursive: true });

  const scenes = [];
  for (const scene of story.scenes) {
    const file = `voice/${story.id}/${scene.id}.wav`;
    const audio = await tts.generate(scene.text, { voice, speed: SPEED });
    writeWav16(join(root, "public", file), audio.audio, audio.sampling_rate);
    scenes.push({ id: scene.id, text: scene.text, file, ...timeWords(scene.text, join(root, "public", file)) });
  }

  writeFileSync(join(root, "src/generated", `${story.id}.json`), JSON.stringify({ id: story.id, title: story.title, scenes }, null, 2));
  console.log(`Kokoro voice "${voice}": ${scenes.length} scenes (free fallback)`);
};

main().catch((err) => {
  console.error(`✗ Kokoro voice failed: ${err.message}`);
  process.exit(1);
});
