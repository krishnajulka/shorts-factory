// Uploads finished Shorts to YouTube with the official Data API v3.
//   node scripts/youtube.mjs auth                    one-time: sign in, store refresh token
//   node scripts/youtube.mjs upload stories/<id>.json  upload out/shorts/<id>/<id>.mp4
// Credentials live outside the repo:
//   ~/.youtube-client.json  OAuth client (Desktop app) downloaded from Google Cloud
//   ~/.youtube-token.json   refresh token written by `auth`
// In the cloud, the env vars YOUTUBE_CLIENT_ID, YOUTUBE_CLIENT_SECRET and
// YOUTUBE_REFRESH_TOKEN take precedence over those files.
// Exit code 3 = not set up yet (caller should skip, not fail).
import { createServer } from "node:http";
import { exec } from "node:child_process";
import { existsSync, readFileSync, statSync, writeFileSync, createReadStream } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const CLIENT_PATH = join(homedir(), ".youtube-client.json");
const TOKEN_PATH = join(homedir(), ".youtube-token.json");
const SCOPE = "https://www.googleapis.com/auth/youtube.upload";

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

const [command, arg] = process.argv.slice(2);
try {
  if (command === "auth") await auth();
  else if (command === "upload" && arg) await upload(arg);
  else {
    console.error("Usage: node scripts/youtube.mjs auth | upload stories/<id>.json");
    process.exit(1);
  }
} catch (err) {
  console.error(`✗ ${err.message}`);
  process.exit(1);
}
