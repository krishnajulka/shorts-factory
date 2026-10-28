# Lessons

What we've learned about what gets views, likes and full watches on this channel.
**Read this before pitching. Apply every lesson.** After checking `stories/STATS.md`
each run, update this file: add new evidence-backed lessons, sharpen or remove ones
the numbers contradict, and merge duplicates. Keep it under 25 bullets; newest
evidence wins. Cite the stories a lesson comes from.

## From the numbers

- **Most viewers decide in the first 1-2 seconds.** Studio showed only 39% "stayed to
  watch" on the first Shorts. Since then: no white flash on frame 0, an on-screen
  `hook`, and a first sentence of 10 words or fewer. Check whether "stayed to watch"
  improved for stories made after 2026-10-25 (closet-knock onward).
- **Funny, simple, relatable premises win so far.** As of 2026-10-25: sneeze-loop
  (time-loop comedy, everyday problem, liam, corner bottom) is #1 with 1,186 views and
  the best like rate (18 likes, 1.5%). Next: lighthouse 840, ghost-sings 839, duck 614.
  (Day one looked the opposite — duck 93 vs sneeze 12 — so judge after 24h, not 1h.)
- **Abstract or complicated premises do worse**: vending-machine-knows 238, last-moth 175.
- **Two Shorts uploaded in the same minute both flopped** (closet-knock 5 views and
  sock-escape 2, both uploaded 2026-10-24 18:56 UTC). Hypothesis: never upload
  back-to-back; keep at least 2 hours between uploads. Needs more evidence.
- **Stats access is broken (since 2026-10-26, 10+ runs; still failing 2026-10-28):** the YouTube token lacks Analytics
  scope, so `stats` exits 3 and no numbers newer than 2026-10-25 exist. No lesson changes
  from numbers until fixed: run `node scripts/youtube.mjs auth` on the PC with the YouTube
  Analytics API enabled and update YOUTUBE_REFRESH_TOKEN. ElevenLabs is out of credits
  (Piper voice in use), so narrator choice has no effect right now.
- Hypothesis (untested): relatable family/everyday premises with a visual-gag twist (grandma-chair, sneeze-loop) may fit the winners; check grandma-chair's views once stats work.
- Hypothesis (1 data point): lunch-thief was never uploaded, so it has no data.
- Likes are low everywhere (≤1.5% of views). Try an ending that invites a reaction:
  a joke punchline, or a question viewers want to answer in the comments.
- 95% of views come from the Shorts feed, not search — titles matter less than the
  first frame and first line.

## From the creator's feedback

- **"The story feels confusing at some points."** Fix: write the `logline` first, one
  hero / one goal / one problem, every scene visibly shows what the narration says, and
  a twist that fits in one short sentence. Too complicated: vending-machine-knows
  (sleepwalking + gas leak), pell-vanishes (town on a giant turtle that dives to eat).
- **Don't reuse the same ending shape.** 5 of 6 stories on 2026-10-25 ended in a
  "wholesome twist" (lighthouse, closet, moth, ghost, Pell). Rotate endings: funny
  reveal, creepy reveal, karma/revenge, clever trick, cliffhanger, bittersweet.
- **No progress bar at the top** (removed from the engine).

## Craft that's working (keep doing)

- Concrete numbers and times in the hook ("four hundred days", "three thirty three").
- Planting a detail early that pays off (crooked wings → fits through the crooked gap).
