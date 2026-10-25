// Uploads finished Shorts to YouTube with the official Data API v3.
//   node scripts/youtube.mjs auth                    one-time: sign in, store refresh token
//   node scripts/youtube.mjs upload stories/<id>.json  upload out/shorts/<id>/<id>.mp4
//   node scripts/youtube.mjs stats                   write every upload's numbers to stories/STATS.md
// Credentials live outside the repo:
//   ~/.youtube-client.json  OAuth client (Desktop app) downloaded from Google Cloud
//   ~/.youtube-token.json   refresh token written by `auth`
// In the cloud, the env vars YOUTUBE_CLIENT_ID, YOUTUBE_CLIENT_SECRET and
// YOUTUBE_REFRESH_TOKEN take precedence over those files.
// Exit code 3 = not set up yet (caller should skip, not fail).
import { createServer } from "node:http";
import { exec } from "node:child_process";
import { existsSync, readFileSync, readdirSync, statSync, writeFileSync, createReadStream } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const CLIENT_PATH = join(homedir(), ".youtube-client.json");
const TOKEN_PATH = join(homedir(), ".youtube-token.json");
// Upload, plus read access so `stats` can learn from each Short's performance.
const SCOPE = [
  "https://www.googleapis.com/auth/youtube.upload",
  "https://www.googleapis.com/auth/youtube.readonly",
  "https://www.googleapis.com/auth/yt-analytics.readonly",
].join(" ");

const config = () => {
  const path = join(root, "shorts.config.json");
  const yt = existsSync(path) ? (JSON.parse(readFileSync(path, "utf8")).youtube ?? {}) : {};
  return { privacy: "private", categoryId: "24", madeForKids: false, ...yt };
};

const client = () => {
  if (process.env.YOUTUBE_CLIENT_ID && process.env.YOUTUBE_CLIENT_SECRET) {
    return { id: process.env.YOUTUBE_CLIENT_ID.trim(), secret: process.env.YOUTUBE_CLIENT_SECRET.trim() };
  }
  if (!existsSync(CLIENT_PATH)) {
    console.error(`Missing ${CLIENT_PATH}. Download your OAuth client (Desktop app) JSON from Google Cloud and save it there.`);
    process.exit(3);
  }
  const json = JSON.parse(readFileSync(CLIENT_PATH, "utf8"));
  const c = json.installed ?? json.web;
  return { id: c.client_id, secret: c.client_secret };
};

const tokenRequest = async (params) => {
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams(params),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(`Token request failed: ${json.error} ${json.error_description ?? ""}`);
  return json;
};

// Loopback OAuth: open the consent page, catch the redirect on 127.0.0.1.
const auth = async () => {
  const { id, secret } = client();
  const server = createServer();
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const redirect = `http://127.0.0.1:${server.address().port}`;
  const url =
    "https://accounts.google.com/o/oauth2/v2/auth?" +
    new URLSearchParams({ client_id: id, redirect_uri: redirect, response_type: "code", scope: SCOPE, access_type: "offline", prompt: "consent" });
  console.log(`Opening your browser to sign in. If it doesn't open, visit:\n${url}\n`);
  exec(process.platform === "win32" ? `start "" "${url}"` : `open "${url}"`);

  const code = await new Promise((resolve, reject) => {
    server.on("request", (req, res) => {
      const params = new URL(req.url, redirect).searchParams;
      res.end(params.get("code") ? "Signed in. You can close this tab." : `Sign-in failed: ${params.get("error")}`);
      server.close();
      params.get("code") ? resolve(params.get("code")) : reject(new Error(params.get("error") ?? "no code"));
    });
  });
  const tokens = await tokenRequest({ code, client_id: id, client_secret: secret, redirect_uri: redirect, grant_type: "authorization_code" });
  if (!tokens.refresh_token) throw new Error("Google returned no refresh token; remove the app's access at myaccount.google.com/permissions and run auth again.");
  writeFileSync(TOKEN_PATH, JSON.stringify({ refresh_token: tokens.refresh_token }, null, 2));
  console.log(`✓ Authorized. Refresh token saved to ${TOKEN_PATH}`);
};

const accessToken = async () => {
  const fromEnv = process.env.YOUTUBE_REFRESH_TOKEN?.trim();
  if (!fromEnv && !existsSync(TOKEN_PATH)) {
    console.error("Not authorized yet. Run: node scripts/youtube.mjs auth");
    process.exit(3);
  }
  const { id, secret } = client();
  const refresh_token = fromEnv || JSON.parse(readFileSync(TOKEN_PATH, "utf8")).refresh_token;
  try {
    return (await tokenRequest({ refresh_token, client_id: id, client_secret: secret, grant_type: "refresh_token" })).access_token;
  } catch (err) {
    // Apps left in "Testing" get their sign-in revoked every 7 days.
    if (String(err.message).includes("invalid_grant")) {
      console.error("YouTube sign-in expired (Google does this weekly for apps in Testing). Run: node scripts/youtube.mjs auth");
      process.exit(3);
    }
    throw err;
  }
};

const upload = async (storyArg) => {
  const story = JSON.parse(readFileSync(join(root, storyArg), "utf8"));
  const outDir = join(root, "out/shorts", story.id);
  const video = join(outDir, `${story.id}.mp4`);
  const record = join(outDir, "youtube.json");
  if (existsSync(record)) {
    console.log(`Already uploaded: https://youtube.com/shorts/${JSON.parse(readFileSync(record, "utf8")).videoId} (delete ${record} to re-upload)`);
    return;
  }
  if (!existsSync(video)) {
    console.error(`No video at ${video}. Render it first.`);
    process.exit(1);
  }

  const cfg = config();
  const token = await accessToken();
  const yt = story.youtube;
  const hashtags = yt.tags.map((t) => `#${t.replace(/\s+/g, "")}`).join(" ");
  const metadata = {
    snippet: {
      title: yt.title.slice(0, 100),
      description: `${yt.description}\n\n${hashtags}`.slice(0, 5000),
      tags: yt.tags,
      categoryId: cfg.categoryId,
    },
    status: { privacyStatus: cfg.privacy, selfDeclaredMadeForKids: cfg.madeForKids },
  };

  // Resumable upload: create the session, then send the bytes.
  const size = statSync(video).size;
  const init = await fetch("https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json; charset=UTF-8",
      "X-Upload-Content-Type": "video/mp4",
      "X-Upload-Content-Length": String(size),
    },
    body: JSON.stringify(metadata),
  });
  if (!init.ok) throw new Error(`Upload session failed (${init.status}): ${(await init.text()).slice(0, 500)}`);
  const res = await fetch(init.headers.get("location"), {
    method: "PUT",
    headers: { "Content-Type": "video/mp4", "Content-Length": String(size) },
    body: createReadStream(video),
    duplex: "half",
  });
  const json = await res.json();
  if (!res.ok) throw new Error(`Upload failed (${res.status}): ${JSON.stringify(json).slice(0, 500)}`);

  writeFileSync(record, JSON.stringify({ videoId: json.id, privacy: cfg.privacy, uploadedAt: new Date().toISOString() }, null, 2));
  console.log(`✓ Uploaded (${cfg.privacy}): https://youtube.com/shorts/${json.id}`);
};

const getJson = async (url, token, { optional = false } = {}) => {
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  const json = await res.json();
  if (optional && !res.ok) {
    console.warn(`⚠ Skipping watch-time metrics: ${json.error?.message?.split(".")[0] ?? res.status}`);
    return null;
  }
  if (res.status === 401 || res.status === 403) {
    console.error(`No read access to YouTube stats (${json.error?.message ?? res.status}). Run: node scripts/youtube.mjs auth (and enable the YouTube Analytics API).`);
    process.exit(3);
  }
  if (!res.ok) throw new Error(`${res.status} ${JSON.stringify(json).slice(0, 300)}`);
  return json;
};

// Pulls every upload's numbers and writes stories/STATS.md, matched to story files
// by title, so each run can learn what works.
const stats = async () => {
  const token = await accessToken();
  const channel = await getJson("https://www.googleapis.com/youtube/v3/channels?part=contentDetails,id&mine=true", token);
  const uploads = channel.items[0].contentDetails.relatedPlaylists.uploads;
  const ids = [];
  for (let page = ""; ; ) {
    const list = await getJson(`https://www.googleapis.com/youtube/v3/playlistItems?part=contentDetails&maxResults=50&playlistId=${uploads}${page}`, token);
    ids.push(...list.items.map((i) => i.contentDetails.videoId));
    if (!list.nextPageToken) break;
    page = `&pageToken=${list.nextPageToken}`;
  }
  const videos = [];
  for (let i = 0; i < ids.length; i += 50) {
    const batch = await getJson(`https://www.googleapis.com/youtube/v3/videos?part=snippet,statistics&id=${ids.slice(i, i + 50).join(",")}`, token);
    videos.push(...batch.items);
  }

  // Watch-time metrics from YouTube Analytics (lags ~1-2 days behind views).
  const today = new Date().toISOString().slice(0, 10);
  const analytics = await getJson(
    `https://youtubeanalytics.googleapis.com/v2/reports?ids=channel==MINE&startDate=2026-01-01&endDate=${today}&metrics=views,averageViewDuration,averageViewPercentage,likes,shares,subscribersGained&dimensions=video&maxResults=200&sort=-views`,
    token,
    { optional: true },
  );
  const byVideo = Object.fromEntries((analytics?.rows ?? []).map((r) => [r[0], { avgSeconds: r[2], avgPercent: r[3], shares: r[5], subs: r[6] }]));

  const stories = readdirSync(join(root, "stories"))
    .filter((f) => f.endsWith(".json"))
    .map((f) => JSON.parse(readFileSync(join(root, "stories", f), "utf8")));
  const storyFor = (title) => stories.find((s) => s.youtube?.title?.slice(0, 100) === title);

  const rows = videos
    .map((v) => {
      const s = storyFor(v.snippet.title);
      const a = byVideo[v.id] ?? {};
      return {
        published: v.snippet.publishedAt.slice(0, 16).replace("T", " "),
        title: v.snippet.title,
        story: s?.id ?? "?",
        views: Number(v.statistics.viewCount ?? 0),
        likes: Number(v.statistics.likeCount ?? 0),
        comments: Number(v.statistics.commentCount ?? 0),
        avgPercent: a.avgPercent === undefined ? "—" : `${Math.round(a.avgPercent)}%`,
        avgSeconds: a.avgSeconds === undefined ? "—" : `${Math.round(a.avgSeconds)}s`,
        subs: a.subs ?? "—",
        narrator: s?.narrator ?? "?",
        bottom: s?.bottom ?? "?",
        url: `https://youtube.com/shorts/${v.id}`,
      };
    })
    .sort((a, b) => b.views - a.views);

  const header = "| views | likes | comments | avg watched | avg seconds | subs gained | story | narrator | bottom | published (UTC) | title |\n|---|---|---|---|---|---|---|---|---|---|---|";
  const lines = rows.map((r) => `| ${r.views} | ${r.likes} | ${r.comments} | ${r.avgPercent} | ${r.avgSeconds} | ${r.subs} | ${r.story} | ${r.narrator} | ${r.bottom} | ${r.published} | [${r.title.replace(/\|/g, "/")}](${r.url}) |`);
  const body = `# Channel stats\n\nUpdated ${new Date().toISOString().slice(0, 16).replace("T", " ")} UTC by \`node scripts/youtube.mjs stats\`. Sorted by views. "avg watched" is the average share of the Short people watched (YouTube Analytics; lags 1-2 days, "—" = not ready yet).\n\n${header}\n${lines.join("\n")}\n`;
  writeFileSync(join(root, "stories/STATS.md"), body);
  console.log(`✓ Wrote stories/STATS.md (${rows.length} videos)`);
};

const [command, arg] = process.argv.slice(2);
try {
  if (command === "auth") await auth();
  else if (command === "upload" && arg) await upload(arg);
  else if (command === "stats") await stats();
  else {
    console.error("Usage: node scripts/youtube.mjs auth | upload stories/<id>.json | stats");
    process.exit(1);
  }
} catch (err) {
  console.error(`✗ ${err.message}`);
  process.exit(1);
}
