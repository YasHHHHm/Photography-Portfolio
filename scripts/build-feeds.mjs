#!/usr/bin/env node
/**
 * Runs after `react-router build` and shapes build/client for Cloudflare Pages.
 *
 * 1. Clean URLs. React Router writes `travel/india/index.html`, which Pages
 *    serves at `/travel/india/` (trailing slash). Renaming it to
 *    `travel/india.html` makes Pages serve it at `/travel/india`.
 * 2. 404 page. The pre-rendered `/404` route becomes `404.html`, which Pages
 *    serves with status 404 for every unknown URL.
 * 3. Removes Vite's build manifest (`.vite/`), which is not meant to be public.
 * 4. Writes sitemap.xml, robots.txt and rss.xml from the content index.
 *    Preview deployments (any branch but main) ask search engines to stay out.
 */
import {
  access,
  copyFile,
  readdir,
  readFile,
  rename,
  rm,
  rmdir,
  writeFile,
} from "node:fs/promises";
import path from "node:path";

const CLIENT = path.resolve("build/client");
const INDEX = path.resolve(".generated");

/** @param {string} file */
async function exists(file) {
  try {
    await access(file);
    return true;
  } catch {
    return false;
  }
}

/**
 * Moves every nested `index.html` up to `<dir>.html`, deepest first.
 * @param {string} dir
 * @returns {Promise<number>} number of pages moved
 */
async function flatten(dir) {
  let moved = 0;
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) moved += await flatten(path.join(dir, entry.name));
  }
  if (dir === CLIENT) return moved;

  const index = path.join(dir, "index.html");
  if (!(await exists(index))) return moved;

  await rename(index, `${dir}.html`);
  if ((await readdir(dir)).length === 0) await rmdir(dir);
  return moved + 1;
}

/** @param {string} rel  Path inside .generated/ */
async function readIndex(rel) {
  return JSON.parse(await readFile(path.join(INDEX, rel), "utf8"));
}

/** @param {unknown} value */
const xml = (value) =>
  String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

/** "2026-10-12" → "Mon, 12 Oct 2026 00:00:00 GMT" (RFC 822, as RSS wants). */
const rssDate = (/** @type {string} */ iso) => new Date(`${iso}T00:00:00Z`).toUTCString();

if (!(await exists(CLIENT))) {
  console.error("✖ build/client does not exist. Run `react-router build` first.");
  process.exit(1);
}

const moved = await flatten(CLIENT);
console.log(`✔ Clean URLs: ${moved} pages renamed to <path>.html`);

const notFound = path.join(CLIENT, "404.html");
const spaFallback = path.join(CLIENT, "__spa-fallback.html");
if (await exists(notFound)) {
  console.log("✔ 404.html comes from the pre-rendered /404 route");
} else if (await exists(spaFallback)) {
  await copyFile(spaFallback, notFound);
  console.log("✔ 404.html copied from the SPA fallback");
} else {
  console.warn("⚠ No 404.html: unknown URLs will get Cloudflare's default 404 page");
}

await rm(path.join(CLIENT, ".vite"), { recursive: true, force: true });

// ── Sitemap, robots.txt and RSS ──────────────────────────────────────────

const site = await readIndex("site.json");
/** @type {string[]} */
const routes = await readIndex("routes.json");
/**
 * The JSON files in a folder of the index ([] if a new site has none yet).
 * @param {string} folder
 */
async function indexFiles(folder) {
  const dir = path.join(INDEX, folder);
  if (!(await exists(dir))) return [];
  return (await readdir(dir)).filter((f) => f.endsWith(".json")).map((f) => `${folder}/${f}`);
}

/** Every published post, newest first. */
const posts = (
  await Promise.all((await indexFiles("posts")).map(async (f) => (await readIndex(f)).post))
)
  .filter((p) => !p.draft)
  .sort((a, b) => b.date.localeCompare(a.date));

/** @type {Map<string, string>} path → last modified date */
const lastmod = new Map();
for (const post of posts) lastmod.set(post.href, post.date);
for (const file of await indexFiles("trips")) {
  const { trip } = await readIndex(file);
  lastmod.set(trip.href, trip.to ?? trip.from);
}
if (posts[0]) lastmod.set("/blog", posts[0].date);

const urls = routes
  .filter((route) => route !== "/404")
  .map((route) => {
    const date = lastmod.get(route);
    return `  <url><loc>${xml(site.origin + route)}</loc>${date ? `<lastmod>${date}</lastmod>` : ""}</url>`;
  });
await writeFile(
  path.join(CLIENT, "sitemap.xml"),
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join("\n")}\n</urlset>\n`,
);

await writeFile(
  path.join(CLIENT, "robots.txt"),
  site.indexable
    ? `User-agent: *\nAllow: /\n\nSitemap: ${site.origin}/sitemap.xml\n`
    : "# A preview deployment: the live site is on the main branch.\nUser-agent: *\nDisallow: /\n",
);

const items = posts.map((post) =>
  [
    "    <item>",
    `      <title>${xml(post.title)}</title>`,
    `      <link>${xml(site.origin + post.href)}</link>`,
    `      <guid isPermaLink="true">${xml(site.origin + post.href)}</guid>`,
    `      <pubDate>${rssDate(post.date)}</pubDate>`,
    `      <description>${xml(post.excerpt)}</description>`,
    ...post.labels.map(
      (/** @type {{ title: string }} */ l) => `      <category>${xml(l.title)}</category>`,
    ),
    "    </item>",
  ].join("\n"),
);
await writeFile(
  path.join(CLIENT, "rss.xml"),
  [
    `<?xml version="1.0" encoding="UTF-8"?>`,
    `<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">`,
    "  <channel>",
    `    <title>${xml(`${site.name} — Journal`)}</title>`,
    `    <link>${xml(`${site.origin}/blog`)}</link>`,
    `    <description>${xml(site.bio)}</description>`,
    "    <language>en</language>",
    `    <atom:link href="${xml(`${site.origin}/rss.xml`)}" rel="self" type="application/rss+xml"/>`,
    ...(posts[0] ? [`    <lastBuildDate>${rssDate(posts[0].date)}</lastBuildDate>`] : []),
    ...items,
    "  </channel>",
    "</rss>",
    "",
  ].join("\n"),
);

console.log(
  `✔ sitemap.xml (${urls.length} pages), robots.txt (${site.indexable ? "indexable" : "preview: noindex"}), rss.xml (${posts.length} posts) for ${site.origin}`,
);
