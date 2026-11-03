# Series

Recurring characters give viewers a reason to subscribe ("I want the next one") and
let YouTube recommend each new part to people who watched the last. **Every other
Short is a series episode**: if the previous story in `LOG.md` was not a series
episode, the next one must be. Alternate between the series below, and add a new
series only when a standalone Short clearly outperforms (top 3 in STATS.md by views
and % watched) — then turn its characters into a series here.

Rules for every episode:
- Same characters, same names, same colors and same narrator as the bible below.
- Stands alone: someone who never saw part 1 understands it in the first line.
- Same winning formula (a counter that escalates, a payoff that uses the counter).
- `youtube.title` ends with "(Part N)"; `hook` and the first line still work cold.
- Set `"series": { "name": "<series name>", "part": N }` in the story file and add the
  episode to the list below in the same commit.

## Ben vs Mia: the prank war

From `2026-10-27-spider-prank` (1,266 views, 61% watched, 19 likes).
- **Premise:** big brother Ben keeps pranking little sister Mia. She never reacts, never
  screams — and always wins in the end with a calm, perfectly planned payback that
  uses his own counter against him.
- **Cast (copy exactly):** `"ben": { "species": "bean", "color": "#ff9f1c", "name": "Ben" }`,
  `"mia": { "species": "bean", "color": "#c77dff", "name": "Mia" }`.
- **Narrator:** `jessica`. **Tone:** funny karma. **Settings:** room, city, beach.
- **Running gag:** Mia just smiles and says "thanks". Ben never learns.
- **Episodes:**
  - Part 1 — `2026-10-27-spider-prank`: 30 fake spiders, she drops all 29 on him.
  - Part 2 — `2026-10-31-candy-tax`: Halloween; Ben taxes one candy per house, Mia always hands him a red one: five chili candies.
  - Part 3 — `2026-11-02-toll-booth`: Ben's hallway toll doubles daily (1,2,4,8,16 = 31 coins); Mia paid with coins from his own piggy bank, then builds her own toll booth.
  - Part 4 — `2026-11-03-alarm-clock`: Ben hides an alarm under Mia's bed ringing 5,4,3,2,1 AM; Mia carries it into his room each night, so Ben is the exhausted one.

## Turbo the snail

From `2026-10-29-snail-race` (1,063 views, 77% watched — best % watched of any Short).
- **Premise:** Turbo, the slowest snail alive, keeps challenging much faster animals —
  and wins every time by reading the rules more carefully than they do.
- **Cast (copy exactly):** `"turbo": { "emoji": "🐌", "name": "Turbo" }`; opponents are
  any fast emoji animal (🐆 🐇 🦅 🐎 🐬).
- **Narrator:** `liam`. **Tone:** underdog / clever trick. **Settings:** forest, city, beach.
- **Running gag:** everyone laughs at the challenge; Turbo just says "deal".
- **Episodes:**
  - Part 1 — `2026-10-29-snail-race`: beat the cheetah by leaving on Monday.
  - Part 2 — `2026-11-02-eagle-mountain`: race an eagle up a mountain; Turbo hides on the eagle's tail and slides off at the top (the rule never said who had to climb).
  - Part 3 — `2026-11-03-rabbit-tower`: race a rabbit up 100 floors (counter: floor 20/40/60/80/100); Turbo takes the elevator because the rule never said stairs.
