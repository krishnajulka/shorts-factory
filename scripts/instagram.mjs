// Cross-posts finished Shorts to Instagram as Reels with the official
// Instagram Graph API (Instagram API with Facebook Login, resumable upload:
// the mp4 goes straight from this machine, no public hosting needed).
//   node scripts/instagram.mjs check                       verify the token, print the linked account
//   node scripts/instagram.mjs upload stories/<id>.json    post out/shorts/<id>/<id>.mp4 as a Reel
//   node scripts/instagram.mjs stats                       write every Reel's numbers to stories/IG_STATS.md
// Credentials live outside the repo:
//   ~/.instagram.json  { "token": "...", "userId": "..." }  (userId optional: found from the token)
// In the cloud, the env vars IG_ACCESS_TOKEN and IG_USER_ID take precedence.
// Use a Meta *system user* token (Business settings → System users): it never
// expires, unlike normal user tokens (60 days).
// Exit code 3 = not set up yet (caller should skip, not fail).
import { existsSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const CRED_PATH = join(homedir(), ".instagram.json");
const API = "v24.0";
const GRAPH = `https://graph.facebook.com/${API}`;
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

const creds = () => {
  const file = existsSync(CRED_PATH) ? JSON.parse(readFileSync(CRED_PATH, "utf8")) : {};
  const token = (process.env.IG_ACCESS_TOKEN ?? file.token ?? "").trim();
  const userId = (process.env.IG_USER_ID ?? file.userId ?? "").trim();
  if (!token) {
    console.error(`Instagram not set up: no IG_ACCESS_TOKEN env var and no ${CRED_PATH}. Skipping.`);
    process.exit(3);
  }
  return { token, userId };
};

const graph = async (path, token, { method = "GET", params = {} } = {}) => {
  const url = new URL(`${GRAPH}/${path}`);
  for (const [k, v] of Object.entries(params)) if (v !== undefined) url.searchParams.set(k, String(v));
  const res = await fetch(url, { method, headers: { Authorization: `Bearer ${token}` } });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || json.error) {
    const e = json.error ?? {};
    throw new Error(`Instagram API ${method} ${path} failed (${res.status}): ${e.message ?? JSON.stringify(json).slice(0, 300)}`);
  }
  return json;
};

// Finds the Instagram professional account linked to a Page the token can see.
const resolveUser = async ({ token, userId }) => {
  if (userId) return userId;
  const pages = await graph("me/accounts", token, { params: { fields: "name,instagram_business_account{id,username}" } });
  const linked = (pages.data ?? []).find((p) => p.instagram_business_account);
  if (!linked) throw new Error("The token sees no Facebook Page with a linked Instagram professional account. Link Instagram to the Page and give the system user access to that Page.");
  return linked.instagram_business_account.id;
};

const caption = (story) => {
  const yt = story.youtube;
  const description = yt.description.replace(/#\w+/g, "").replace(/\s+$/g, "").trim();
  const tags = [...new Set(["reels", "animation", "story", ...yt.tags.filter((t) => t !== "shorts")])]
    .map((t) => `#${t.replace(/[^\p{L}\p{N}_]/gu, "")}`)
    .filter((t) => t.length > 1)
    .slice(0, 12);
  return `${yt.title}\n\n${description}\n\n${tags.join(" ")}`.slice(0, 2200);
};

const check = async () => {
  const c = creds();
  const id = await resolveUser(c);
  const me = await graph(id, c.token, { params: { fields: "username,followers_count,media_count" } });
  console.log(`✓ Instagram connected: @${me.username} (id ${id}), ${me.followers_count} followers, ${me.media_count} posts`);
  if (!c.userId) console.log(`  Tip: set IG_USER_ID=${id} too (saves one lookup per run).`);
};

const upload = async (storyArg) => {
  const story = JSON.parse(readFileSync(join(root, storyArg), "utf8"));
  const outDir = join(root, "out/shorts", story.id);
  const video = join(outDir, `${story.id}.mp4`);
  const record = join(outDir, "instagram.json");
  if (existsSync(record)) {
    console.log(`Already on Instagram: ${JSON.parse(readFileSync(record, "utf8")).permalink} (delete ${record} to re-post)`);
    return;
  }
  if (!existsSync(video)) {
    console.error(`No video at ${video}. Render it first.`);
    process.exit(1);
  }
  const c = creds();
  const igId = await resolveUser(c);

  // Never double-post: the record lives in out/ (not in git), so also check
  // the latest Reels for one with this title.
  const recent = await graph(`${igId}/media`, c.token, { params: { fields: "caption,permalink", limit: 50 } });
  const dupe = (recent.data ?? []).find((m) => (m.caption ?? "").startsWith(story.youtube.title));
  if (dupe) {
    writeFileSync(record, JSON.stringify({ mediaId: dupe.id, permalink: dupe.permalink, postedAt: null }, null, 2));
    console.log(`Already on Instagram: ${dupe.permalink}`);
    return;
  }

  // 1. Container for a resumable upload.
  const container = await graph(`${igId}/media`, c.token, {
    method: "POST",
    params: { media_type: "REELS", upload_type: "resumable", caption: caption(story), share_to_feed: true, thumb_offset: 2500 },
  });
  // 2. Send the bytes to rupload.
  const size = statSync(video).size;
  const up = await fetch(container.uri ?? `https://rupload.facebook.com/ig-api-upload/${API}/${container.id}`, {
    method: "POST",
    headers: { Authorization: `OAuth ${c.token}`, offset: "0", file_size: String(size), "Content-Type": "video/mp4" },
    body: readFileSync(video),
  });
  const upJson = await up.json().catch(() => ({}));
  if (!up.ok || upJson.success === false) throw new Error(`Instagram video upload failed (${up.status}): ${JSON.stringify(upJson).slice(0, 400)}`);
  // 3. Wait for Instagram to process it (usually under a minute).
  let status = "";
  for (let i = 0; i < 60; i++) {
    await wait(5000);
    const s = await graph(container.id, c.token, { params: { fields: "status_code,status" } });
    status = s.status_code;
    if (status === "FINISHED") break;
    if (status === "ERROR" || status === "EXPIRED") throw new Error(`Instagram processing failed: ${s.status}`);
  }
  if (status !== "FINISHED") throw new Error(`Instagram still processing after 5 minutes (status ${status})`);
  // 4. Publish.
  const published = await graph(`${igId}/media_publish`, c.token, { method: "POST", params: { creation_id: container.id } });
  const media = await graph(published.id, c.token, { params: { fields: "permalink" } });
  writeFileSync(record, JSON.stringify({ mediaId: published.id, permalink: media.permalink, postedAt: new Date().toISOString() }, null, 2));
  console.log(`✓ Posted to Instagram: ${media.permalink}`);
  // 5. The story's question as the first comment (never fails the caller).
  if (story.comment) {
    try {
      await graph(`${published.id}/comments`, c.token, { method: "POST", params: { message: story.comment } });
      console.log(`✓ Commented on Instagram: "${story.comment}"`);
    } catch (err) {
      console.warn(`⚠ Instagram comment not posted: ${err.message}`);
    }
  }
};

const stats = async () => {
  const c = creds();
  const igId = await resolveUser(c);
  const rows = [];
  let next = `${igId}/media`;
  let params = { fields: "id,caption,permalink,timestamp,media_product_type,like_count,comments_count", limit: 50 };
  while (next && rows.length < 300) {
    const page = await graph(next, c.token, { params });
    for (const m of page.data ?? []) {
      if (m.media_product_type !== "REELS") continue;
      let views = "—";
      let shares = "—";
      let saves = "—";
      try {
        const ins = await graph(`${m.id}/insights`, c.token, { params: { metric: "views,shares,saved" } });
        const v = (name) => ins.data?.find((d) => d.name === name)?.values?.[0]?.value ?? "—";
        [views, shares, saves] = [v("views"), v("shares"), v("saved")];
      } catch {
        // Insights need the instagram_manage_insights permission; numbers stay "—" without it.
      }
      const title = (m.caption ?? "").split("\n")[0].replace(/\|/g, "/");
      rows.push(`| ${views} | ${m.like_count ?? 0} | ${m.comments_count ?? 0} | ${shares} | ${saves} | ${m.timestamp.slice(0, 16).replace("T", " ")} | [${title}](${m.permalink}) |`);
    }
    const after = page.paging?.cursors?.after;
    next = page.paging?.next && after ? `${igId}/media` : null;
    params = { ...params, after };
  }
  const header = "| views | likes | comments | shares | saves | posted (UTC) | title |\n|---|---|---|---|---|---|---|";
  writeFileSync(join(root, "stories/IG_STATS.md"), `# Instagram Reels\n\nWritten by \`node scripts/instagram.mjs stats\`.\n\n${header}\n${rows.join("\n")}\n`);
  console.log(`✓ Wrote stories/IG_STATS.md (${rows.length} Reels)`);
};

const [command, arg] = process.argv.slice(2);
try {
  if (command === "check") await check();
  else if (command === "upload" && arg) await upload(arg);
  else if (command === "stats") await stats();
  else {
    console.error("Usage: node scripts/instagram.mjs check | upload stories/<id>.json | stats");
    process.exit(1);
  }
} catch (err) {
  console.error(`✗ ${err.message}`);
  process.exit(1);
}
