// One command from story file to finished Short:
//   node scripts/make.mjs stories/<id>.json [--stills-only] [--free-voice] [--windows-voice]
// 1. validates the story  2. voiceover + caption alignment  3. renders the MP4,
// preview stills and upload text into out/shorts/<id>/.
import { execFileSync, spawnSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { NARRATORS, elevenLabsKey } from "./voiceover-elevenlabs.mjs";

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
const SETTINGS = ["city", "forest", "space", "room", "beach"];
const LIGHTS = ["day", "dusk", "night", "danger", "gold"];
const MOODS = ["happy", "sad", "angry", "shock", "smug"];
const ACTIONS = ["idle", "run", "jump", "bow", "shake", "spin", "grow", "enter", "exit", "float", "faint"];
const EFFECTS = ["rays", "rain", "speed", "vignette", "confetti", "shake", "snow"];
// New stories use the clean pastel loops (older neon ones still render for old stories).
const BOTTOMS = ["soap", "stack", "dominoes"];
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
  need(!story.racers || (Array.isArray(story.racers) && story.racers.length >= 2 && story.racers.length <= 8), "racers must be 2-8 emoji (race uses up to 5, wheel 3-8)");
  for (const [key, c] of Object.entries(story.cast ?? {})) {
    need(c.emoji || SPECIES.includes(c.species), `cast.${key}: needs "emoji" or species in ${SPECIES.join("|")}`);
  }
  need((story.scenes?.length ?? 0) >= 5, "need at least 5 scenes");
  need(typeof story.logline === "string" && story.logline.length >= 40 && story.logline.length <= 280, "logline (who wants what, what goes wrong, the twist — in plain words) is required, 40-280 characters");
  // Retention: an on-screen hook from frame 0, a short first line, a short Short.
  need(typeof story.hook === "string" && story.hook.length >= 8 && story.hook.length <= 40, "hook (on-screen text for the first 3s) is required, 8-40 characters");
  const firstLine = (story.scenes?.[0]?.text ?? "").split(/[.!?]/)[0].split(/\s+/).filter(Boolean).length;
  need(firstLine <= 10, `the first sentence of scene 1 must be 10 words or fewer (has ${firstLine}) — the hook has to land in under 2 seconds`);
  const totalWords = (story.scenes ?? []).reduce((n, s) => n + (s.text ?? "").split(/\s+/).filter(Boolean).length, 0);
  need(totalWords <= 135, `narration is ${totalWords} words; keep it at 135 or fewer (about 45 seconds)`);
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
// it has credits) → Piper, a free offline voice (Windows and the cloud) → the
// Windows voice as a last resort on a PC. Exit 4 = no voice at all.
const storyArgPath = relative(root, storyPath);
const windowsVoice = () => {
  if (process.platform !== "win32") {
    console.error("✗ No voice available: ElevenLabs and Piper both failed. Skipping this Short.");
    process.exit(4);
  }
  run("powershell", ["-ExecutionPolicy", "Bypass", "-File", "scripts/voiceover.ps1", "-StoryPath", storyArgPath]);
};
const freeVoice = () => {
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
    console.warn("⚠ ElevenLabs unavailable (out of credits or key problem) — using the free Piper voice");
    freeVoice();
  } else if (eleven.status !== 0) {
    process.exit(eleven.status ?? 1);
  }
}
const timing = JSON.parse(readFileSync(join(root, "src/generated", `${spec.id}.json`), "utf8"));
const byId = Object.fromEntries(timing.scenes.map((s) => [s.id, s]));
const story = {
  ...spec,
  scenes: spec.scenes.map((s) => ({ ...s, file: byId[s.id].file, duration: byId[s.id].duration, words: byId[s.id].words })),
};
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

if (!stillsOnly) {
  run("npx", ["remotion", "render", "StoryShort", relative(root, join(outDir, `${spec.id}.mp4`)), propsArg, "--log=error"]);
}
console.log(`✓ Done: ${relative(root, outDir)}`);
