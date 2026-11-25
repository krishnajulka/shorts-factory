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
   "and that's why", no call to follow after it (except the in-character like ask
   in the quest montage type below).
7. **Loop.** The last line flows back into the first one so a replay feels seamless
   (the bridge Short ends with its own first sentence).

### The 7 no-skip rules (every Short, every type)

From the owner's two reference Shorts (a 9.5M-view "overpowered job montage" and a
144k-like "too locked in to love" rule-world story). A viewer swipes the moment a
sentence only explains. So:

1. **One extreme trait drives everything.** The hero is too strong, too locked in, too
   honest... The trait wins him everything in the middle and ruins the ending.
2. **A punchline every ~3 seconds.** Every sentence is a joke, a reveal, a number or a
   turn. Lists of proof work: "couples at school, couples at the gym, even the mayor
   is on his fourth marriage." If a line only sets up, merge it into the next one.
3. **Rhythm.** Use lists of three and "while they..., I..." pairs; vary sentence length
   (short punch after a long line).
4. **Jump past the boring part.** "Six months later," "By sunset," "Next," — never
   narrate travel, waiting or how something was done.
5. **Callbacks.** Bring back something from the first 15 seconds at the end (a
   character, an object, the trait itself) so finishing feels rewarding.
6. **Blunder ending, ideally double.** First fail, then an even bigger one caused by
   the same trait ("he couldn't hear her through his noise-cancelling headphones...
   then he replied 'Are you available for a quick call next week?'").
7. **Catchphrase bookends + loop.** The channel catchphrase right after the hook line
   and again just before the last line, and the last line repeats/flows into the first.

Dead air is removed automatically (every pause in the voice is squeezed to a split
second), so a Short now runs about 3.2-3.4 words per second: write 140-185 words
(the validator enforces it; about 160 is the sweet spot).

### The channel catchphrase: "Yap! Yap! YAP!"

A squeaky cartoon voice, recorded once (`public/sfx/catchphrase.wav`), identical in
every Short: it's the channel's sound signature, like a creator's catchphrase people
type in the comments. Use it on exactly two scenes:
- the first scene, `"catchphrase": "after"` (said right after the hook line);
- the last scene, `"catchphrase": "before"` (said right before the final line).
The scene's `focus` character says it: their mouth moves, the captions flash YAP in
the keyword colour and a 🗣️ pops. Don't write "yap" in the narration yourself; the
engine adds it. It works in any story type; for a first-person story it's the
narrator-hero's own signature.

### Story types (rotate; never the same type twice in a row)

- **Overpowered quest montage (the owner's favourite: write this one at least every
  other Short).** Modelled on a 9.5M-view Short (53 s, ~150 words). Its exact skeleton:
  1. **Want + obstacle in the first sentence.** "Bolt wanted the new game everyone's
     waiting for, but he had zero dollars." Something every teen wants right now; a
     reason he can't have it. Nothing else before it.
  2. **Attempts, 4-5, each 2-3 sentences, ~6 seconds:** a real everyday job or
     try → he's absurdly too good at it, with a big exact number ("four hundred
     pizzas in four minutes") → a one-line quoted complaint from someone
     ("It arrived before I ordered it!") → he gets fired or it fails for a ridiculous
     reason that is the logical result of being too good. The irony (too good =
     punished) is the joke; never explain it.
  3. **Escalate the absurdity** with each attempt: bigger numbers, weirder
     reactions; the 4th-5th attempt is the craziest (the robber hands over his own
     gun, wallet and a signed confession).
  4. **Tally line:** "By evening, he'd been fired from eleven jobs and earned zero
     dollars." Use a bigger number than we showed, so it implies more failures.
  5. **The reversal:** the simplest possible task (washing one car, carrying
     groceries for Grandma) is the one that finally takes him ages and pays him. The
     contrast is the payoff.
  6. **The blunder ending (last line, gut punch):** he gets what he wanted and
     instantly realizes the obvious thing he forgot ("Then he realized he didn't
     have a console."). It resets the goal, so it doubles as a sequel hook.
  7. **Optional story-tied like ask after the blunder**, max 8 words, in character:
     "Leave a like so Bolt can buy one." This is the only CTA ever allowed; never
     "subscribe", never generic.
  Rules that make it work: one character, one goal, cause → effect in every
  sentence, plain words, quoted lines under 8 words, no mocker or "You see," needed,
  no setup scenes. Hero is our own original character (never an anime/game
  character). The wanted thing is described generically ("the new game everyone's
  waiting for", "the newest phone") and never shown with a real logo. Each attempt
  is its own scene with a clear visual (a 🍕 drop for pizza, a 🏠 build for
  construction, a 🦹 crowd for the bank); the hero is `focus` in every scene.
- **Second-person dilemma** (1.2M views, 69x the creator's median, Nov 2026): put the
  viewer in an impossible spot in the first line ("You and your best friend are hanging
  from one rope over a canyon."), then escalate what each choice leads to, with the hero
  bean as "you", and end on a twist nobody picked. The `hook` card states the whole
  situation. The comment question asks what they'd choose.
- **Versus: which turns out better?** ("Strict Dad vs Soft Mom: Which Kid Turns Out
  Better?", 2.5M views, 49 s): two characters raised or doing the same thing two opposite
  ways, side by side, 3-4 rounds of escalating consequences, and a reversal at the end
  (the "obvious" winner loses). Easy to show: two beans, same setting, `face` each other.
- **True story with a twist** (weakest performer in the new format so far: use rarely;
  fact-check every claim on Wikipedia or another reliable
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

- **140-185 words total = 45-60 seconds** (pauses are squeezed out automatically). Never shorter, never longer.
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
| `catchphrase` | `"after"` on the first scene, `"before"` on the last scene: the focus character says "Yap! Yap! YAP!" (see The channel catchphrase) |
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
