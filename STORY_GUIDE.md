# Writing a story Short

Each Short is one JSON file in `stories/<id>.json`. `node scripts/make.mjs stories/<id>.json`
turns it into `out/shorts/<id>/<id>.mp4` (plus preview stills and `upload.txt`).
**Model story:** `stories/2026-11-24-bridge-break.json`, the first Short in the new
format. Read it before writing.

## Why the format changed (2026-11-24)

For 80 Shorts the channel stalled at about 1,000 views each: YouTube's first test
audience. Our old template was a counter (Monday, Tuesday...), a calm payoff and "Ben
never learns", in 25-second kid stories, and it never made people rewatch, share or
argue. The channels breaking out in our exact style (bean-body cartoon characters,
narration, captions) post 45-75 second stories with one recipe. Ricks Clips got 167M
views on 15 Shorts with it; GreenBroRants got a 6.35M median with first-person
"rule world" stories. Use this recipe for every Short.

## The recipe (every Short)

1. **Impossible hook, reason hidden (first sentence, 10 words or fewer).** Something that
   sounds like it can't be true: "Seventy-four soldiers destroyed a bridge without
   firing a shot." "In my town, your shadow does what you secretly want." No setup, no
   date first, no names first.
2. **Setup in one breath.** Who, where, one exact number, and what's at stake.
3. **The mocker.** Someone laughs at the hero or the situation, ideally in a short
   line in quotes: "An army, against giant chickens?" The hero stays calm.
4. **Escalate three times.** It gets weirder or bigger in visible steps, and the
   mocker gets cockier. Every scene is the next step; never two scenes with the
   same beat.
5. **"You see," (exactly once).** One plain line that explains the trick through
   something the viewer has done themselves: pushing a swing, blowing on soup,
   catching a phone as it slides off a table.
6. **Payoff, shown not explained.** The biggest reveal is the last line. No moral, no
   "and that's why", no call to follow after it.
7. **Loop.** The last line flows back into the first one so a replay feels seamless
   (the bridge Short ends with its own first sentence).

### Story types (rotate; never the same type twice in a row)

- **True story with a twist** (fact-check every claim on Wikipedia or another reliable
  source and keep the numbers right): weird history, science explained, real
  inventions or rules with surprising reasons.
- **Rule world, first person:** "In my town, every lie makes your shadow lighter..." One
  strange rule, a problem it causes, and a twist that uses the rule. Set `"speaker"`
  on the narrator's character so their mouth moves.
- **Creepy-then-wholesome / creepy reveal:** escalating dread that flips at the end.

**Retired, do not write:** Ben vs Mia, Turbo the snail (see `stories/SERIES.md`), the
Monday/Tuesday counter template, "Thanks, Ben" endings, "X never learns" endings,
toddler-level stakes (chores, cake, Grandma's cookies), "small animal steals food".

**Audience:** teens and young adults. Real stakes (danger, money, losing something,
embarrassment, history), told the way a kid tells a friend: plain words, fast, a bit
of attitude. Still family-friendly: no gore, no real people mocked, no brands or
copyrighted characters.

## Length and shape (the validator enforces these)

- **120-165 words total = 45-60 seconds.** Never shorter, never longer.
- 8-12 scenes, each `text` 8-20 words (validator allows 5-22).
- First sentence of scene 1 ≤ 10 words.
- Every scene has something moving: an action, a drop, a burst, a bouncing or
  collapsing set, a swing, a crowd, or `speed`. Static scenes are where people leave.
- 1-2 stickers per scene on punchy words; 5-10 story `keywords` (lowercase words from
  the narration, coloured green in captions).

## Clarity: viewers must never think "wait, what's going on?"

1. **Write the `logline` first** (required): one or two sentences a 12-year-old
   understands. If you can't write it simply, pick another premise.
2. **One hero, one goal, one problem.** At most two named characters.
3. **The visuals must literally show what the narration says.** If the line is about a
   bridge, there is a bridge on screen. If you can't show it with the available
   characters, settings and emoji, rewrite the line.
4. **The twist is explainable in one short sentence and is set up earlier.**
5. **Before rendering, read only the captions out loud with no visuals.** If it doesn't
   make sense that way, fix the words.

## Pitch, score, then write

Brainstorm **5 one-sentence premises** across the story types. Score each 1-5 on
**Hook** (would a bored 16-year-old stop scrolling?), **Twist** (does the ending
reframe it?), **Shareability** (would you send it to a friend?) and **Freshness**
(nothing like LOG.md). Write the highest total. For a true story, verify the facts
before writing.

## Comments

Every story has a `comment` question, posted under the Short right after upload.
It asks something viewers *want* to answer about this story: a choice ("Would you
have stomped too? Be honest 😂"), a guess, or a hot take. Keep it short with one
emoji, no spoilers, never "like and subscribe".

## Narrator and sound

- `narrator`: `brian` deep storyteller · `george` warm British · `jessica` expressive
  female · `liam` energetic young male · `callum` intense. Pick by mood; vary it.
  ElevenLabs may be out of credits; the pipeline falls back to the free Kokoro voice
  automatically (mention it in the report).
- Word timing comes from Whisper automatically, so captions, mouths and sound effects
  land on the right word.
- `music`: `playful` | `mystery` | `tense` | `none` (omit = picked from the id). It
  ducks under the narrator automatically, and a tension riser plays into the last
  scene by itself.
- Our own sound effects fire automatically from the story: jump = boing, fall =
  slide whistle, drop/flash/collapse = thud, burst/sticker = pop, grow = sparkle. The
  old meme `sfx` field still works; use it on at most 2 scenes.
- Dialogue in "quotes" makes the focus character's mouth move while it's said.
- Write numbers as words ("seventy-four", not "74").

## Seasonal calendar

In the 3 days before a holiday and on the day itself, one Short per day may be themed
to it (the holiday is the setting, not the whole idea). Upcoming:

- Nov 26 — US Thanksgiving; Nov 27 — Black Friday
- Dec 24-25 — Christmas
- Dec 31 / Jan 1 — New Year
Add the next ones (look them up) when this list runs short.

## Fields

```jsonc
{
  "id": "2026-11-24-kebab-case-slug",
  "title": "Internal title",
  "youtube": { "title": "≤60 chars, the hook as a sentence, 1-2 emoji", "description": "1-2 lines + #shorts", "tags": ["shorts", "..."] },
  "logline": "...",            // write FIRST (40-280 chars)
  "comment": "...?",           // posted under the Short (15-150 chars, has a ?)
  "hook": "74 SOLDIERS BROKE A BRIDGE 🌉", // on-screen text, first 3 s (8-40 chars)
  "narrator": "liam",
  "voice": "Microsoft David Desktop", "rate": 0,   // Windows fallback only
  "music": "tense",
  "bottom": "parkour",
  "keywords": ["..."],
  "cast": {
    "hero": { "species": "pigeon" | "cat" | "frog" | "bean", "color": "#hex", "name": "..." },
    "thing": { "emoji": "🐦" }   // any emoji can be a character or prop
  },
  "scenes": [ /* see below */ ]
}
```

Scene:

| field | values |
|---|---|
| `id` | unique, short |
| `text` | narration for this scene |
| `setting` | `city` `forest` `space` `room` `beach` `bridge` (suspension bridge over a river) `collapse` (that bridge breaking: left half drops into the river; river drawn in front of characters) |
| `light` | `day` `dusk` `night` `danger` (red, tense) `gold` (triumph) |
| `focus` | cast key the close-up shots frame |
| `speaker` | cast key whose mouth moves with the whole narration (first-person stories) |
| `actors` | list, see below |
| `crowd` | `{ "who", "count" (≤63), "mood", "until": word }` |
| `effects` | any of `rays` `rain` `snow` `confetti` `speed` `vignette` `shake` `bounce` (bridge deck bounces harder and harder; characters ride it) |
| `drop` | `{ "at": word, "emoji", "to": cast key }` falls into that actor's hands |
| `burst` | `{ "at": word, "emoji" }` explodes into 40 copies |
| `flash` | word → white flash + thud |
| `stickers` | `[{ "word", "emoji" }]` big emoji pop on that word |
| `sfx` | optional meme sound (see Narrator and sound) |

Actor:

| field | meaning |
|---|---|
| `who` | cast key (the same key can appear several times, e.g. a squad) |
| `x` / `toX` | 0-1080 position; walks to `toX` by `at` or scene end |
| `size`, `lift`, `face`, `hold`, `hat` | size 0.7-1.9; px above ground; `left`/`right`; held / worn emoji |
| `mood` | `happy` `sad` `angry` `shock` (sweat drop) `smug` |
| `action` | `idle` `run` `jump` (crouch, stretch, squash) `bow` `shake` `spin` `grow` `enter` `exit` `float` `faint` `fall` (drops off the ground on `at`, e.g. into the river) `swing` (playground swing with ropes) |
| `at` | word that triggers the action |
| `changes` | `[{ "at": word, "mood"?, "hold"?, "hat"? }]`, mood changes make the character jiggle |

Characters blink, breathe, glance around, and talk on their own; you don't set that.

## Bottom half (split screen)

The default is `parkour`: a first-person 3D sprint across pixel-block platforms over
lava, jumping gaps, passing checkpoint rings and speeding up, with a jump counter. It's
the gameplay look viral split-screen Shorts use, rendered by us (no game footage, so
no reused-content risk). Use `parkour` unless the story's top half is already very
busy; the calmer alternatives are `growball` (ball grows on every bounce inside a
circle), `sandcut` (knife slicing rainbow kinetic sand) and `jarfill` (rainbow balls
filling a jar). **Retired:** soap, stack, dominoes, obby and the old neon loops.

**Every word used in `at`, `until`, `flash`, `stickers`, `drop`, `burst`, `changes` must
appear in that scene's `text`** (case and punctuation ignored). The validator in
`make.mjs` lists every problem; fix them all and rerun.

## Review before publishing

Look at every PNG in `out/shorts/<id>/stills/`: hero visible and not cut off, the
visuals match the line, captions readable, nothing broken. Fix the JSON and rerun.
Add the story to `stories/LOG.md` so future stories don't repeat the premise.
