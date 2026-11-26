// One command from story file to finished Short:
//   node scripts/make.mjs stories/<id>.json [--stills-only] [--free-voice] [--windows-voice]
// 1. validates the story  2. voiceover + caption alignment  3. renders the MP4,
// preview stills and upload text into out/shorts/<id>/.
import { execFileSync, spawnSync } from "node:child_process";
import { mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { NARRATORS, elevenLabsKey } from "./voiceover-elevenlabs.mjs";
import { catchphrase, tightenScene } from "./tighten.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const storyArg = process.argv[2];
const stillsOnly = process.argv.includes("--stills-only");
if (!storyArg) {
  console.error("Usage: node scripts/make.mjs stories/<id>.json [--stills-only]");
  process.exit(1);
}

const run = (cmd, args) => execFileSync(cmd, args, { cwd: root, stdio: "inherit", shell: process.platform === "win32" });
const clean = (w) => w.toLowerCase().replace(/[^a-z0-9]/g, "");

const SPECIES = ["pigeon", "cat", "frog", "bean"];
const SETTINGS = ["city", "forest", "space", "room", "beach", "bridge", "collapse"];
const LIGHTS = ["day", "dusk", "night", "danger", "gold"];
const MOODS = ["happy", "sad", "angry", "shock", "smug"];
const ACTIONS = ["idle", "run", "jump", "bow", "shake", "spin", "grow", "enter", "exit", "float", "faint", "fall", "swing"];
const EFFECTS = ["rays", "rain", "speed", "vignette", "confetti", "shake", "snow", "bounce"];
// New stories use the clean pastel loops (older neon ones still render for old stories).
const BOTTOMS = ["parkour", "growball", "sandcut", "jarfill"]; // parkour = default (gameplay look of viral split-screens); stack/dominoes/obby retired 2026-11-24 (overused)
const SFX = ["vineBoom", "recordScratch", "animeWow", "yippee", "bruh", "omgHellNah", "dramaticBoomer", "illuminatiConfirmed", "wilhelmScream", "spongebobFail", "loadingLag", "ohMyGodVine"];

// Returns a list of human-readable problems; empty means the story is valid.
const validate = (story) => {
  const errors = [];
  const need = (cond, msg) => cond || errors.push(msg);
  need(/^[a-z0-9-]+$/.test(story.id ?? ""), `id must be kebab-case, got "${story.id}"`);
  need(story.youtube?.title && story.youtube?.description && Array.isArray(story.youtube?.tags), "youtube.title/description/tags are required");
  need(Array.isArray(story.keywords), "keywords must be an array");
  need(!story.narrator || NARRATORS[story.narrator], `narrator must be ${Object.keys(NARRATORS).join("|")}`);
  need(!story.bottom || BOTTOMS.includes(story.bottom), `bottom must be ${BOTTOMS.join("|")}`);
  need(!story.music || ["playful", "mystery", "tense", "none"].includes(story.music), "music must be playful|mystery|tense|none");
  need(!story.racers || (Array.isArray(story.racers) && story.racers.length >= 2 && story.racers.length <= 8), "racers must be 2-8 emoji (race uses up to 5, wheel 3-8)");
  for (const [key, c] of Object.entries(story.cast ?? {})) {
    need(c.emoji || SPECIES.includes(c.species), `cast.${key}: needs "emoji" or species in ${SPECIES.join("|")}`);
  }
  need((story.scenes?.length ?? 0) >= 5, "need at least 5 scenes");
  need(typeof story.logline === "string" && story.logline.length >= 40 && story.logline.length <= 280, "logline (who wants what, what goes wrong, the twist — in plain words) is required, 40-280 characters");
  need(typeof story.comment === "string" && story.comment.length >= 15 && story.comment.length <= 150 && story.comment.includes("?"), "comment (a question posted under the Short to get replies, 15-150 characters, must contain a ?) is required");
  if (story.series) {
    need(typeof story.series.name === "string" && Number.isInteger(story.series.part) && story.series.part >= 2, "series needs { name, part } with part 2 or higher");
    need(story.youtube?.title?.trim().endsWith(`(Part ${story.series.part})`), `series episodes need a YouTube title ending with "(Part ${story.series?.part})"`);
  }
  // Retention: an on-screen hook from frame 0, a short first line, a short Short.
  need(typeof story.hook === "string" && story.hook.length >= 8 && story.hook.length <= 40, "hook (on-screen text for the first 3s) is required, 8-40 characters");
  const firstLine = (story.scenes?.[0]?.text ?? "").split(/[.!?]/)[0].split(/\s+/).filter(Boolean).length;
  need(firstLine <= 12, `the first sentence of scene 1 must be 12 words or fewer (has ${firstLine}) — the hook has to land in under 2.5 seconds`);
  const firstScene = (story.scenes?.[0]?.text ?? "").split(/\s+/).filter(Boolean).length;
  need(firstScene <= 16, `scene 1 must be 16 words or fewer (has ${firstScene}) — cut to scene 2 within ~3 s so the opening never sits still`);
  need(story.hookCard === undefined || typeof story.hookCard === "boolean", "hookCard must be true or false");
  const totalWords = (story.scenes ?? []).reduce((n, s) => n + (s.text ?? "").split(/\s+/).filter(Boolean).length, 0);
  need(totalWords >= 140 && totalWords <= 185, `narration is ${totalWords} words; keep it 140-185 (about 45-60 seconds once pauses are squeezed)`);
  const phraseScenes = (story.scenes ?? []).filter((s) => s.catchphrase !== undefined);
  for (const s of phraseScenes) need([true, "before", "after"].includes(s.catchphrase), `scene "${s.id}": catchphrase must be true, "before" or "after"`);
  need(phraseScenes.length <= 2, `catchphrase is on ${phraseScenes.length} scenes; use it at most twice (the first scene and the last)`);
  const ids = new Set();
  for (const s of story.scenes ?? []) {
    const where = `scene "${s.id}"`;
    need(!ids.has(s.id), `${where}: duplicate id`);
    ids.add(s.id);
    const spoken = new Set((s.text ?? "").split(/\s+/).map(clean));
    const words = (s.text ?? "").split(/\s+/).length;
    need(words >= 5 && words <= 22, `${where}: text should be 5-22 words, has ${words}`);
    need(SETTINGS.includes(s.setting), `${where}: setting must be ${SETTINGS.join("|")}`);
    need(LIGHTS.includes(s.light), `${where}: light must be ${LIGHTS.join("|")}`);
    const word = (w, label) => w === undefined || need(spoken.has(clean(w)), `${where}: ${label} "${w}" is not a word in the text`);
    const castKey = (k, label) => need(story.cast?.[k], `${where}: ${label} "${k}" is not in cast`);
    for (const a of s.actors ?? []) {
      castKey(a.who, "actor");
      need(typeof a.x === "number", `${where}: actor ${a.who} needs numeric x`);
      need(!a.mood || MOODS.includes(a.mood), `${where}: mood must be ${MOODS.join("|")}`);
      need(!a.action || ACTIONS.includes(a.action), `${where}: action must be ${ACTIONS.join("|")}`);
      word(a.at, "at");
      for (const ch of a.changes ?? []) {
        word(ch.at, "changes.at");
        need(!ch.mood || MOODS.includes(ch.mood), `${where}: change mood must be ${MOODS.join("|")}`);
      }
    }
    if (s.focus) castKey(s.focus, "focus");
    if (s.speaker) castKey(s.speaker, "speaker");
    if (s.crowd) {
      castKey(s.crowd.who, "crowd.who");
      word(s.crowd.until, "crowd.until");
    }
    if (s.drop) {
      word(s.drop.at, "drop.at");
      need((s.actors ?? []).some((a) => a.who === s.drop.to), `${where}: drop.to "${s.drop.to}" is not an actor in this scene`);
    }
    if (s.burst) word(s.burst.at, "burst.at");
    word(s.flash, "flash");
    for (const st of s.stickers ?? []) word(st.word, "sticker");
    for (const e of s.effects ?? []) need(EFFECTS.includes(e), `${where}: effect "${e}" must be ${EFFECTS.join("|")}`);
    need(!s.sfx || SFX.includes(s.sfx), `${where}: sfx must be ${SFX.join("|")}`);
  }
  return errors;
};

const storyPath = join(root, storyArg);
const spec = JSON.parse(readFileSync(storyPath, "utf8"));
const errors = validate(spec);
if (errors.length) {
  console.error(`Story has ${errors.length} problem(s):\n- ${errors.join("\n- ")}`);
  process.exit(1);
}
console.log(`✓ ${spec.id} is valid`);

// Voice chain so a Short always gets made: ElevenLabs (when a key is set and
// it has credits) → Kokoro, a free natural-sounding voice → Piper, a free
// robotic one → the Windows voice as a last resort on a PC. Exit 4 = no voice.
const storyArgPath = relative(root, storyPath);
const windowsVoice = () => {
  if (process.platform !== "win32") {
    console.error("✗ No voice available: ElevenLabs, Kokoro and Piper all failed. Skipping this Short.");
    process.exit(4);
  }
  run("powershell", ["-ExecutionPolicy", "Bypass", "-File", "scripts/voiceover.ps1", "-StoryPath", storyArgPath]);
};
const freeVoice = () => {
  const kokoro = spawnSync("node", ["scripts/voiceover-kokoro.mjs", storyArgPath], { cwd: root, stdio: "inherit" });
  if (kokoro.status === 0) return;
  console.warn("⚠ Kokoro voice failed — trying the Piper voice");
  const piper = spawnSync("node", ["scripts/voiceover-piper.mjs", storyArgPath], { cwd: root, stdio: "inherit" });
  if (piper.status !== 0) {
    console.warn("⚠ Piper voice failed — trying the Windows voice");
    windowsVoice();
  }
};
if (process.argv.includes("--windows-voice")) {
  windowsVoice();
} else if (process.argv.includes("--free-voice") || !elevenLabsKey()) {
  freeVoice();
} else {
  const eleven = spawnSync("node", ["scripts/voiceover-elevenlabs.mjs", storyArgPath], { cwd: root, stdio: "inherit" });
  if (eleven.status === 2) {
    console.warn("⚠ ElevenLabs unavailable (out of credits or key problem) — using the free Kokoro voice");
    freeVoice();
  } else if (eleven.status !== 0) {
    process.exit(eleven.status ?? 1);
  }
}
const timing = JSON.parse(readFileSync(join(root, "src/generated", `${spec.id}.json`), "utf8"));
const byId = Object.fromEntries(timing.scenes.map((s) => [s.id, s]));
// Squeeze the voice's dead air out of every scene and add the catchphrase.
const phrase = catchphrase(root);
const usesPhrase = phrase && spec.scenes.some((s) => s.catchphrase !== undefined);
const story = {
  ...spec,
  keywords: usesPhrase ? [...new Set([...spec.keywords, ...phrase.words.map((w) => clean(w.word))])] : spec.keywords,
  scenes: spec.scenes.map((s) => {
    const voiced = { ...s, file: byId[s.id].file, duration: byId[s.id].duration, words: byId[s.id].words };
    try {
      const tight = tightenScene(root, voiced, phrase);
      if (phrase && s.catchphrase !== undefined) tight.stickers = [...(s.stickers ?? []), { word: phrase.words[0].word, emoji: phrase.emoji }];
      return tight;
    } catch (err) {
      console.warn(`⚠ Couldn't tighten scene "${s.id}" (${err.message}); keeping its pauses`);
      return voiced;
    }
  }),
};
const voiceSeconds = story.scenes.reduce((n, s) => n + s.duration, 0);
console.log(`✓ Tightened voice: ${voiceSeconds.toFixed(1)} s of narration${usesPhrase ? " (with catchphrase)" : ""}`);
if (voiceSeconds < 44 || voiceSeconds > 61) console.warn(`⚠ Narration is ${voiceSeconds.toFixed(1)} s; aim for 45-60 s (add or cut a beat)`);
const props = JSON.stringify({ story }, null, 2);
const propsPath = join(root, "src/generated", `${spec.id}.props.json`);
writeFileSync(propsPath, props);
writeFileSync(join(root, "src/generated/preview.props.json"), props);

const outDir = join(root, "out/shorts", spec.id);
mkdirSync(join(outDir, "stills"), { recursive: true });
const propsArg = `--props=${relative(root, propsPath)}`;

// Stills spread across the video for a quick visual review.
const seconds = story.scenes.reduce((sum, s) => sum + Math.min(s.duration, (s.words.at(-1)?.start ?? s.duration) + 0.7), 0);
const stills = [0.05, 0.2, 0.35, 0.5, 0.65, 0.8, 0.95].map((p) => Math.floor(seconds * 30 * p));
for (const f of stills) {
  run("npx", ["remotion", "still", "StoryShort", relative(root, join(outDir, "stills", `f${f}.png`)), `--frame=${f}`, "--scale=0.4", propsArg, "--log=error"]);
}

const yt = spec.youtube;
writeFileSync(join(outDir, "upload.txt"), `${yt.title}\n\n${yt.description}\n\n${yt.tags.map((t) => `#${t.replace(/\s+/g, "")}`).join(" ")}\n`);

// Renders one composition, then normalizes loudness to YouTube's reference
// (-14 LUFS) so it is never quieter than the videos around it in the feed.
const renderVideo = (composition, name) => {
  const mp4 = relative(root, join(outDir, `${name}.mp4`));
  const raw = relative(root, join(outDir, `${name}.raw.mp4`));
  run("npx", ["remotion", "render", composition, raw, propsArg, "--log=error"]);
  try {
    run("npx", ["remotion", "ffmpeg", "-y", "-loglevel", "error", "-i", raw, "-c:v", "copy", "-af", "loudnorm=I=-14:TP=-1.5:LRA=11", "-c:a", "aac", "-b:a", "192k", mp4]);
    rmSync(join(root, raw));
  } catch {
    console.warn("⚠ Loudness step failed; keeping the unnormalized render");
    renameSync(join(root, raw), join(root, mp4));
  }
};

if (!stillsOnly) {
  // YouTube: the story on top, gameplay below.
  renderVideo("StoryShort", spec.id);
  // Instagram: the story alone, full screen (owner's choice, 2026-11-26).
  renderVideo("StoryFull", `${spec.id}.ig`);
}
console.log(`✓ Done: ${relative(root, outDir)}`);
