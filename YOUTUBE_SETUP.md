# YouTube auto-upload setup (one time, ~15 minutes)

The twice-daily task uploads each finished Short with `scripts/youtube.mjs` through
the official YouTube Data API. Google requires you to create your own API access.

## 1. Create a Google Cloud project

1. Go to https://console.cloud.google.com/ and sign in with the Google account that owns
   your YouTube channel.
2. Create a new project, e.g. `shorts-factory`.
3. **APIs & Services → Library** → search **YouTube Data API v3** → **Enable**.

## 2. Configure the consent screen

1. **APIs & Services → OAuth consent screen** (may be called "Google Auth Platform").
2. User type **External**, app name e.g. `Shorts Uploader`, your email as support and
   developer contact.
3. Scopes: you can skip; the script asks only for `youtube.upload`.
4. **Test users / Audience → add your own Google account.**
5. Then **publish the app** (switch from "Testing" to "In production"). In Testing mode
   Google expires the sign-in after 7 days and daily uploads would stop. You'll see an
   "unverified app" warning when you sign in — that's expected for your own app.

## 3. Create the OAuth client

1. **APIs & Services → Credentials → Create credentials → OAuth client ID**.
2. Application type **Desktop app**.
3. **Download JSON** and save it as `C:\Users\Victus\.youtube-client.json`.

## 4. Sign in once

```bash
node scripts/youtube.mjs auth
```

A browser opens; pick your channel's account and allow upload access. The refresh token
is saved to `C:\Users\Victus\.youtube-token.json` (outside the project, never commit it).

## 5. Test

```bash
node scripts/youtube.mjs upload stories/duck-doorstep.json
```

It prints the video link. Uploads are recorded in `out/shorts/<id>/youtube.json`, so the
same story is never uploaded twice.

## Settings (`shorts.config.json` → `youtube`)

| key | default | meaning |
|---|---|---|
| `privacy` | `private` | `private` (you review, then publish in YouTube Studio), `unlisted`, or `public` (goes live immediately) |
| `categoryId` | `24` | Entertainment. `1` = Film & Animation |
| `madeForKids` | `false` | Must be honest. `true` disables comments and limits ads |

## Things Google enforces

- **Unaudited API projects upload as private only.** Until your project passes Google's
  YouTube API compliance audit, videos uploaded through it are locked to private even if
  `privacy` is `public`. Apply via the "YouTube API Services – Audit and Quota Extension"
  form in Google's YouTube API documentation. Until then: the task uploads, and you
  click **Publish** (or schedule) in YouTube Studio — about 10 seconds per video.
- **Daily quota:** 10,000 units by default; one upload costs about 1,600, so ~6 uploads a
  day. Two a day is fine.
