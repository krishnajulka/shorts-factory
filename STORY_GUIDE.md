# Writing a story Short

Each Short is one JSON file in `stories/<id>.json`. `node scripts/make.mjs stories/<id>.json`
turns it into `out/shorts/<id>/<id>.mp4` (plus preview stills and `upload.txt`).
**Model stories:** `stories/2026-10-26-photo-stranger.json`, `stories/2026-10-27-snowman-spring.json` and `stories/2026-10-27-spider-prank.json` are our proven winners (see "The winning formula"); `stories/2026-10-25-lunch-thief.json` shows the newest rules. Read them first and notice how they
uses every technique below. The other stories in `stories/` show more engine features
but are weaker stories.

## The first 2 seconds decide everything

YouTube Studio shows most viewers swipe away before the story starts ("Stayed to watch"
was 39% on the first Shorts). The validator enforces the first three rules:

1. **`hook` text on screen from frame 0** — 3-6 words, ALL CAPS energy, one emoji, a
   question or a warning: "WHO IS KNOCKING? 🚪", "DON'T OPEN THE CLOSET 😨",
   "WHERE DO YOUR SOCKS GO? 🧦". It must create tension, not summarize.
2. **First sentence ≤ 10 words, starting inside the conflict.** No setup, no "Once
   upon a time", no names first. "Every night at three thirty three, someone knocks."
3. **Short: ≤ 100 words of narration total** (about 25-35 s), 6-9 scenes. Our best holders are the short ones (snail-race 77% watched at ~25 s; grandma-chair 114%, i.e. rewatched).
4. **First scene is visually loud:** hero big and moving, a drop/burst/crowd, danger
   light or a dramatic effect. Never a calm establishing shot.
5. **Re-hook every ~10 seconds** with a turn: "Then the dog wouldn't go near it.",
   "And heard breathing." Each scene must raise a new question or answer one and
   raise a bigger one.
6. **Don't answer the main question until the last 2 scenes.**

## The winning formula (from this channel's best Shorts)

Our top Shorts by views and by % watched — `2026-10-26-photo-stranger` (86% watched),
`2026-10-27-snowman-spring` (most views), `2026-10-27-spider-prank` (61% watched,
high likes) — all share one shape. **Read those three files before writing.**

1. **A counter or a deadline the viewer can track.** Days of the week, "day thirty",
   "one day left", "photo six". The viewer always knows where we are and feels the
   next step coming.
2. **One simple rule that escalates in visible steps.** "One step closer each night."
   "Shoe → backpack → cereal → pillow." Each scene is the next step, so the story is
   impossible to get lost in, and each step raises the stakes.
3. **A turn just before the end** where the pattern breaks ("Mia just yawned",
   "her phone took a photo by itself").
4. **A payoff that uses the counter itself** — the punchline *is* the number: "Thirty
   days, thirty spiders." "A flower grew exactly where he stood." "Follow to see photo
   six." Endings like this get likes, comments and replays.
5. **Emotion lands harder than cleverness.** Funny (prank karma), creepy (closer each
   time) or bittersweet (snowman) — pick one feeling and commit.

**Comments: every story has a `comment` question** that's posted under the Short right
after upload. Comments and replies push a Short to more people. A good one:
- asks something viewers *want* to answer about **this** story: a choice ("Would you
  open photo six? 👇"), a guess ("What was in the 30th box? 🤔"), or a confession
  ("Who's the Mia in your family? 😂");
- is short, one emoji, and never spoils the ending for people reading comments first;
- is never "like and subscribe", never begs for engagement, never asks for personal info.

**Endings: aim for a reaction.** A punchline people want to share, a creepy last image,
a lump in the throat, or a question viewers will answer in the comments ("Would you
open photo six?"). Never end on an explanation.

## Clarity — viewers must never think "wait, what's going on?"

Viewers said earlier Shorts felt confusing. A confused viewer swipes. Rules:

1. **Write the `logline` first** (required): one or two sentences that a 10-year-old
   understands — *who* wants *what*, *what goes wrong*, and the *twist*. If you can't
   write it simply, the story is too complicated: pick another premise.
2. **One hero, one goal, one problem.** At most two named characters. No side plots.
3. **Every scene follows from the one before** with an obvious "so" / "but" / "then".
   No jumps in time or place without saying so ("The next morning…").
4. **The visuals must literally show what the narration says.** If the line is about a
   jar, there is a jar on screen. If you can't show it with the available characters,
   settings and emoji, rewrite the line.
5. **The twist must be explainable in one short sentence and must be set up earlier.**
   Bad: "he was sleepwalking and stocking the machine because his brain noticed a gas
   leak." Good: "the knocking was the lonely kid next door."
6. **Plain words.** No invented terms, no lore. Say exactly what happens.
7. **Before rendering, read only the captions out loud with no visuals.** If the story
   doesn't make sense that way, fix the words.

## Story craft — what makes people watch to the end

A Short lives or dies on whether the viewer *needs to know what happens next*. Random
events in a row are not a story. Use all of these:

1. **Curiosity-gap hook.** Scene 1 is a strange, specific situation that raises a
   question the viewer can't answer: "For 400 days, someone left one rubber duck on
   Rosa's doorstep. Always at six fourteen." (Who? Why? Why that time?) Avoid hooks that
   give away the ending ("...and became king").
2. **Specific details.** Exact numbers, times, objects: "six fourteen", "400 days",
   "her grandpa's old bathtub". Specific = believable = interesting. Vague = boring.
3. **Escalate, then rehook at the midpoint.** Around scene 4-5 something makes it
   weirder or raises the stakes: "Then the camera turned off." Never let two scenes in a
   row feel like the same beat.
4. **Plant and pay off.** Mention a detail early that turns out to matter later (the
   time 6:14 → the countdown machine; the 400 days → he died 401 days ago).
5. **A real twist.** The ending should reframe what came before, not just be "and then
   it got bigger". Good twists: the threat was actually love; the hero was the cause all
   along; the victim was the villain; it was happening to the viewer too.
6. **One genuine feeling.** Funny, sad, wholesome, creepy — pick one and land it. A
   story that makes you *feel* something gets shared.
7. **Loop ending (required).** Make the final line flow back into the first line so a replay feels
   seamless ("...someone else gets the first duck." → "For 400 days, someone left one
   rubber duck..."). Replays boost the algorithm.
8. **Earned call-to-action.** Fold "follow" into the last line in a way that fits the
   story. Don't repeat the "Follow, or X takes yours next" joke every day.

**Banned (overused):** "accidentally became king", stealing/eating food as the main plot,
"and that's how...", endings where the hero just wins with no twist.

### Pitch, score, then write

Before writing JSON, brainstorm **5 one-line premises** from different categories. Score
each 1–5 on: **Hook** (would you stop scrolling?), **Twist** (does the ending reframe
it?), **Specificity**, **Freshness** (nothing like LOG.md). Write the highest total.
After drafting, reread scene by scene and ask "would a bored 15-year-old swipe here?" —
rewrite the weakest scene before rendering.

### Writing for the narrator

- **Short sentences, concrete nouns.** Read it out loud. The narrator is a realistic
  ElevenLabs voice, so rhythm matters: short punchy fragments ("No note. No
  footprints.") land hard; a longer sentence before a reveal builds tension. No
  dialogue in quotes; write numbers and times as words ("six fourteen", not "6:14").
- **Pick the narrator to fit the mood** with `"narrator"`:
  `brian` deep classic storyteller (default, mystery/drama) · `george` warm British
  (wholesome, legends, fake history) · `jessica` expressive female (playful, comedy) ·
  `liam` energetic young male (chaotic, sports, heists) · `callum` intense and raspy
  (spooky, villain origins). Vary it day to day.
- **Credits:** ElevenLabs bills per character of narration (~800 per story). The
  model is set in `shorts.config.json` (`eleven_multilingual_v2` best quality,
  `eleven_flash_v2_5` about half the credits) — don't change it from a story run. Only
  changed scenes are re-voiced on reruns. If the quota runs out the pipeline falls back
  to Piper, a free offline voice (then the Windows voice on a PC), and prints a warning —
  mention it in your report. The Short is still made and uploaded.
- **Original only.** No real people, brands, celebrities, copyrighted characters,
  or trending meme characters.
- Keep it **family-friendly**: cartoon slapstick at most, no gore.

## Premise variety — don't fall into a formula

Gerald (pigeon + food) and Frank (frog + food) already exist. **Do not write another
"small animal eats/steals food" story.** Rotate through very different kinds:

- **Absurd what-if:** a man's shadow quits; gravity turns off for one minute; the moon
  files a noise complaint.
- **Object with a secret life:** the office vending machine judges people; a lost sock's
  journey; a traffic cone that wants to be a wizard hat.
- **Mini mystery:** who keeps leaving one banana on the roof every morning?
- **Heist / scheme:** a cat plans the perfect laser-pointer heist; kids trade one
  paperclip up to a house.
- **Villain origin / revenge:** the alarm clock that finally snaps.
- **Underdog sports/competition:** the slowest snail enters a rocket race.
- **Spooky-but-funny:** the ghost who is scared of people.
- **Fake history / legend:** how the first pizza was invented by accident in space.
- **Time loop / glitch:** a guy relives the same Monday until he gets it right.
- **Wholesome twist:** the robot built to destroy the city just wants a friend.

Each day pick a category that isn't in the last 3 entries of `stories/LOG.md`, and
log the category with the story.

## Series (every other Short)

Recurring characters turn viewers into subscribers. **If the previous story in LOG.md
was not a series episode, this one must be.** Read `stories/SERIES.md` for the
series, their character bible and the rules (same cast and narrator, stands alone,
title ends with "(Part N)", set the `series` field, add the episode to SERIES.md).

## Seasonal calendar

Holidays bring a surge of people looking for that feeling. **In the 3 days before a
holiday and on the day itself, one Short per day is themed to it** (still following
every other rule — the holiday is the setting, not the whole idea). Upcoming:

- Oct 31 — Halloween (spooky-but-funny, costumes, trick-or-treat)
- Nov 8 (2026; check the date) — Diwali (lights, sweets, family, firecrackers)
- Nov 14 — Children's Day in India (kids outsmarting grown-ups)
- Nov 26 — US Thanksgiving; Nov 27 — Black Friday (family dinner chaos, deals)
- Dec 24-25 — Christmas (gifts, snow, Santa logistics)
- Dec 31 / Jan 1 — New Year (countdowns, resolutions)
Add the next ones (look them up) when this list runs short.

## Shape

- 6–9 scenes, each `text` 6–14 words (validator allows 5–22). Total ≈ 25–35 s, ≤ 100 words.
- Every scene should have something moving: an action, a drop, a burst, a crowd,
  or the `speed` effect. Static scenes are where people swipe away.
- 2 stickers per scene on punchy words. 8–12 story `keywords` (lowercase words
  that appear in the narration — they get colored green in captions).

## Fields

```jsonc
{
  "id": "kebab-case-unique-id",
  "title": "Internal title",
  "youtube": { "title": "≤60 chars with 1-2 emoji", "description": "1-2 lines + #shorts", "tags": ["shorts", "..."] },
  "logline": "Maya hears knocking inside her closet every night; it turns out to be the lonely new kid next door.",  // write this FIRST (40-280 chars)
  "comment": "Would you knock back at 3:33? 👇",  // posted under the Short right after upload (see Comments)
  "hook": "WHO IS KNOCKING? 🚪",          // on-screen text for the first 3 seconds (8-40 chars)
  "narrator": "brian",                  // brian | george | jessica | liam | callum (ElevenLabs)
  "voice": "Microsoft David Desktop",   // Windows fallback voice (or "Microsoft Zira Desktop")
  "rate": 1,                            // Windows fallback speed; keep 1
  "keywords": ["..."],
  "bottom": "soap" | "stack" | "dominoes",   // clean split-screen loop, see below
  "cast": {                             // key -> character, reused across scenes
    "hero": { "species": "pigeon" | "cat" | "frog" | "bean", "color": "#hex (optional)" },
    "rocket": { "emoji": "🚀" }         // ANY emoji can be a character or prop
  },
  "scenes": [ /* see below */ ]
}
```

Scene:

| field | values |
|---|---|
| `id` | unique, short |
| `text` | narration for this scene |
| `setting` | `city` `forest` `space` `room` `beach` |
| `light` | `day` `dusk` `night` `danger` (red, tense) `gold` (triumph) |
| `focus` | cast key the close-up shots frame (usually the hero) |
| `actors` | list, see below (may be empty if `crowd` is used) |
| `crowd` | `{ "who", "count" (≤63), "mood", "until": word }` grid that pops in until `until` is spoken |
| `effects` | any of `rays` `rain` `snow` `confetti` `speed` (scrolling chase) `vignette` `shake` |
| `drop` | `{ "at": word, "emoji": "fry"\|emoji, "to": cast key }` falls from the sky and lands in that actor's hands on the word |
| `burst` | `{ "at": word, "emoji" }` explodes into 40 copies |
| `flash` | word → white flash |
| `stickers` | `[{ "word", "emoji" }]` big emoji pop on that word |
| `sfx` | one of `vineBoom` `recordScratch` `animeWow` `yippee` `bruh` `omgHellNah` `dramaticBoomer` `illuminatiConfirmed` `wilhelmScream` `spongebobFail` `loadingLag` `ohMyGodVine` — use on ~4 scenes, always `vineBoom` on the hook |

Actor:

| field | meaning |
|---|---|
| `who` | cast key |
| `x` | 0–1080 horizontal position (540 = center). Off-screen (<0 or >1080) works with `toX` |
| `toX` | walks to this x by the time of `at` (or scene end) |
| `size` | 1 normal; hero 0.7 (tiny/sad) to 1.9 (hook hero shot) |
| `lift` | px above ground (stand on a car: ~300 with a size 2.2 emoji car) |
| `face` | `right` (default) or `left` |
| `mood` | `happy` `sad` `angry` `shock` `smug` |
| `hold` | `"fry"` or an emoji held in mouth/hand |
| `hat` | `"crown"` or an emoji worn on the head |
| `action` | `idle` `run` `jump` `bow` `shake` `spin` `grow` `enter` `exit` `float` `faint` |
| `at` | word that triggers the action (without `at`: jump repeats, enter happens at start) |
| `changes` | `[{ "at": word, "mood"?, "hold"? (null = drop it), "hat"? }]` |

## Bottom half (split screen)

The bottom half is a clean, satisfying loop that keeps eyes on screen without
competing with the story: light pastel backgrounds, soft shadows, almost no text.
New stories must use one of these (the validator enforces it):

- `soap` — a blade slices colorful layered soap bars; slices tip over and fall
- `stack` — pastel 3D blocks slide in and stack into a rising tower, with "PERFECT!" pops
- `dominoes` — hundreds of pastel dominoes fall in a winding wave, with a live counter
- `obby` — a blocky avatar runs and jumps across floating platforms over lava (a Roblox-style obstacle course), with a STAGE counter, checkpoint flags and the odd fall and respawn

**Never reuse the previous story's bottom.** Rotate through all four in order of least
recently used in `stories/LOG.md`. (Older stories used neon loops — rings, plinko, race,
breakout, spiral, territory, wheel, corner — which still render but are retired.)

**Every word used in `at`, `until`, `flash`, `stickers`, `drop`, `burst`, `changes` must
appear in that scene's `text`** (case and punctuation ignored). The validator in
`make.mjs` lists every problem — fix them all and rerun.

## Review before publishing

After a run, look at the PNGs in `out/shorts/<id>/stills/`. Check: hero visible and
not cut off, captions readable, nothing obviously broken. Fix the JSON and rerun.

Add the story to `stories/LOG.md` (date, id, one-line premise) so future stories
don't repeat the hero, setting combo, or premise.
