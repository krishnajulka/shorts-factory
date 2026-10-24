// ElevenLabs voiceover: one MP3 per scene plus exact word timings from the
// API's character alignment. Writes src/generated/<id>.json in the same shape
// as voiceover.ps1. Unchanged scenes are cached so reruns cost no credits.
// Usage: node scripts/voiceover-elevenlabs.mjs stories/<id>.json
// Key: ELEVENLABS_API_KEY or the file ~/.elevenlabs. Exit code 2 = quota/auth
// problem (caller may fall back to the Windows voice).
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

// Premade voices usable on the free API tier.
export const NARRATORS = {
  brian: "nPczCjzI2devNBz1zQrb", // deep, classic storyteller (default)
  george: "JBFqnCBsd6RMkjVDRZzb", // warm British, wholesome/legend stories
  jessica: "cgSgspJ2msm6clMCkdW9", // expressive female, playful
  liam: "TX3LPaxmHKxFdv7VOQHJ", // energetic young male, chaotic/comedy
  callum: "N2lVS1w4EtoT3dr4eOWO", // intense, raspy: spooky/mystery
};
// shorts.config.json "elevenlabsModel": "eleven_multilingual_v2" (best quality) or
// "eleven_flash_v2_5" (roughly half the credits per character, slightly flatter).
const configPath = join(dirname(fileURLToPath(import.meta.url)), "..", "shorts.config.json");
const MODEL = (existsSync(configPath) && JSON.parse(readFileSync(configPath, "utf8")).elevenlabsModel) || "eleven_multilingual_v2";
const VOICE_SETTINGS = { stability: 0.4, similarity_boost: 0.8, style: 0.35, use_speaker_boost: true, speed: 1.05 };

export const elevenLabsKey = () => {
  if (process.env.ELEVENLABS_API_KEY) return process.env.ELEVENLABS_API_KEY.trim();
  const file = join(homedir(), ".elevenlabs");
  return existsSync(file) ? readFileSync(file, "utf8").trim() : null;
};

// Words and their start times from per-character alignment.
const wordsFromAlignment = ({ characters, character_start_times_seconds: starts }) => {
  const words = [];
  let current = null;
  characters.forEach((ch, i) => {
    if (/\s/.test(ch)) {
      current = null;
      return;
    }
    if (!current) {
      current = { word: "", start: starts[i] };
      words.push(current);
    }
    current.word += ch;
  });
  return words.map((w) => ({ word: w.word, start: Math.round(w.start * 1000) / 1000 }));
};

const main = async () => {
  const root = join(dirname(fileURLToPath(import.meta.url)), "..");
  const story = JSON.parse(readFileSync(join(root, process.argv[2]), "utf8"));
  const key = elevenLabsKey();
  if (!key) {
    console.error("No ElevenLabs key (set ELEVENLABS_API_KEY or create ~/.elevenlabs)");
    process.exit(2);
  }
  const narrator = story.narrator ?? "brian";
  const voiceId = NARRATORS[narrator];
  if (!voiceId) {
    console.error(`Unknown narrator "${narrator}". Use one of: ${Object.keys(NARRATORS).join(", ")}`);
    process.exit(1);
  }

  const outDir = join(root, "public/voice", story.id);
  mkdirSync(outDir, { recursive: true });
  const cachePath = join(outDir, "elevenlabs-cache.json");
  const cache = existsSync(cachePath) ? JSON.parse(readFileSync(cachePath, "utf8")) : {};
  const texts = story.scenes.map((s) => s.text);
  let spent = 0;

  const scenes = [];
  for (const [i, scene] of story.scenes.entries()) {
    // Neighbouring lines keep the delivery continuous across scene cuts.
    const request = {
      text: scene.text,
      model_id: MODEL,
      voice_settings: VOICE_SETTINGS,
      previous_text: texts.slice(Math.max(0, i - 2), i).join(" ") || undefined,
      next_text: texts[i + 1],
    };
    const hash = createHash("sha1").update(JSON.stringify({ voiceId, ...request })).digest("hex");
    const file = `voice/${story.id}/${scene.id}.mp3`;
    let entry = cache[scene.id];

    if (!entry || entry.hash !== hash || !existsSync(join(root, "public", file))) {
      const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}/with-timestamps?output_format=mp3_44100_128`, {
        method: "POST",
        headers: { "xi-api-key": key, "Content-Type": "application/json" },
        body: JSON.stringify(request),
      });
      if (!res.ok) {
        const body = await res.text();
        console.error(`ElevenLabs ${res.status} on scene "${scene.id}": ${body.slice(0, 300)}`);
        process.exit(res.status === 401 || res.status === 402 || res.status === 429 ? 2 : 1);
      }
      const data = await res.json();
      writeFileSync(join(root, "public", file), Buffer.from(data.audio_base64, "base64"));
      const words = wordsFromAlignment(data.alignment);
      const end = data.alignment.character_end_times_seconds.at(-1);
      entry = { hash, words, duration: Math.round((end + 0.35) * 1000) / 1000 };
      cache[scene.id] = entry;
      writeFileSync(cachePath, JSON.stringify(cache, null, 2));
      spent += scene.text.length;
    }
    scenes.push({ id: scene.id, text: scene.text, file, duration: entry.duration, words: entry.words });
  }

  writeFileSync(join(root, "src/generated", `${story.id}.json`), JSON.stringify({ id: story.id, title: story.title, scenes }, null, 2));
  console.log(`ElevenLabs voice "${narrator}" (${MODEL}): ${scenes.length} scenes, ${spent} new characters voiced${spent ? "" : " (all cached)"}`);
};

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  main();
}
