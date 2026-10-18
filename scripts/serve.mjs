#!/usr/bin/env node
/**
 * Serves the production build the way Cloudflare Pages does, so
 * `npm run preview` and Lighthouse CI measure what visitors will get:
 *
 * - `/x` serves `x.html`; `/x/` and `/x.html` redirect to `/x`
 * - unknown URLs get `404.html` with status 404
 * - headers come from `_headers` (values of repeated headers are joined)
 * - text responses are compressed with brotli or gzip, like the CDN
 * - other files answer byte-range requests (Safari needs them for video)
 *
 * Usage: node scripts/serve.mjs [dir]   (default build/client, port 4173)
 */
import { readFile, stat } from "node:fs/promises";
import { createServer } from "node:http";
import path from "node:path";
import zlib from "node:zlib";

const ROOT = path.resolve(process.argv[2] ?? "build/client");
const PORT = Number(process.env.PORT ?? 4173);
const DEFAULT_CACHE = "public, max-age=0, must-revalidate";

/** @type {Record<string, string>} */
const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json",
  ".data": "text/x-script",
  ".svg": "image/svg+xml",
  ".xml": "application/xml",
  ".txt": "text/plain; charset=utf-8",
  ".webmanifest": "application/manifest+json",
  ".woff2": "font/woff2",
  ".avif": "image/avif",
  ".webp": "image/webp",
  ".jpg": "image/jpeg",
  ".png": "image/png",
  ".ico": "image/x-icon",
  ".mp4": "video/mp4",
};
const COMPRESSIBLE = new Set([".html", ".js", ".css", ".json", ".data", ".svg", ".xml", ".txt"]);

/**
 * Parses Cloudflare's `_headers` format into ordered rules.
 * @returns {Promise<{ pattern: RegExp, headers: [string, string][] }[]>}
 */
async function loadHeaderRules() {
  let text;
  try {
    text = await readFile(path.join(ROOT, "_headers"), "utf8");
  } catch {
    return [];
  }
  /** @type {{ pattern: RegExp, headers: [string, string][] }[]} */
  const rules = [];
  for (const raw of text.split(/\r?\n/)) {
    if (!raw.trim() || raw.trim().startsWith("#")) continue;
    if (!/^\s/.test(raw)) {
      const source = raw
        .trim()
        .replace(/[.+?^${}()|[\]\\]/g, "\\$&")
        .replace(/\*/g, ".*")
        .replace(/:\w+/g, "[^/]+");
      rules.push({ pattern: new RegExp(`^${source}$`), headers: [] });
    } else if (rules.length) {
      const [name, ...value] = raw.trim().split(":");
      rules.at(-1)?.headers.push([name.trim(), value.join(":").trim()]);
    }
  }
  return rules;
}

const headerRules = await loadHeaderRules();

/**
 * @param {string} urlPath
 * @returns {Record<string, string>}
 */
function headersFor(urlPath) {
  /** @type {Record<string, string>} */
  const out = {};
  for (const rule of headerRules) {
    if (!rule.pattern.test(urlPath)) continue;
    for (const [name, value] of rule.headers) {
      const key = name.toLowerCase();
      out[key] = out[key] ? `${out[key]}, ${value}` : value;
    }
  }
  out["cache-control"] ??= DEFAULT_CACHE;
  return out;
}

/**
 * @param {string} file
 * @returns {Promise<boolean>}
 */
async function isFile(file) {
  try {
    return (await stat(file)).isFile();
  } catch {
    return false;
  }
}

/** @type {Map<string, Buffer>} */
const compressed = new Map();

/**
 * @param {import("node:http").IncomingMessage} req
 * @param {import("node:http").ServerResponse} res
 * @param {string} file
 * @param {number} status
 * @param {string} urlPath
 */
async function send(req, res, file, status, urlPath) {
  const ext = path.extname(file);
  /** @type {Record<string, string>} */
  const headers = {
    ...headersFor(urlPath),
    "content-type": TYPES[ext] ?? "application/octet-stream",
  };
  let body = await readFile(file);

  const accept = String(req.headers["accept-encoding"] ?? "");
  const encoding = accept.includes("br") ? "br" : accept.includes("gzip") ? "gzip" : null;
  if (encoding && COMPRESSIBLE.has(ext)) {
    // Keyed by modification time, so a rebuild while serving is picked up.
    const key = `${encoding}:${file}:${(await stat(file)).mtimeMs}`;
    if (!compressed.has(key)) {
      compressed.set(
        key,
        encoding === "br" ? zlib.brotliCompressSync(body) : zlib.gzipSync(body, { level: 9 }),
      );
    }
    body = /** @type {Buffer} */ (compressed.get(key));
    headers["content-encoding"] = encoding;
    headers.vary = "accept-encoding";
  } else if (status === 200) {
    // Byte ranges, as Safari requires before it plays a video.
    headers["accept-ranges"] = "bytes";
    const range = /^bytes=(\d*)-(\d*)$/.exec(String(req.headers.range ?? ""));
    if (range && (range[1] || range[2])) {
      const size = body.length;
      const start = range[1] ? Number(range[1]) : Math.max(0, size - Number(range[2]));
      const end = range[1] && range[2] ? Math.min(Number(range[2]), size - 1) : size - 1;
      if (start > end || start >= size) {
        res.writeHead(416, { "content-range": `bytes */${size}` }).end();
        return;
      }
      body = body.subarray(start, end + 1);
      status = 206;
      headers["content-range"] = `bytes ${start}-${end}/${size}`;
    }
  }

  res.writeHead(status, { ...headers, "content-length": String(body.length) });
  res.end(req.method === "HEAD" ? undefined : body);
}

const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url ?? "/", "http://localhost");
    const urlPath = decodeURIComponent(url.pathname);

    if (urlPath.includes("..")) {
      res.writeHead(400).end();
      return;
    }
    if (urlPath.length > 1 && urlPath.endsWith("/")) {
      res.writeHead(308, { location: urlPath.slice(0, -1) + url.search }).end();
      return;
    }
    if (urlPath.endsWith(".html")) {
      const clean = urlPath.replace(/(index)?\.html$/, "") || "/";
      res.writeHead(308, { location: clean + url.search }).end();
      return;
    }

    const base = path.join(ROOT, urlPath);
    const candidates = urlPath === "/" ? [path.join(ROOT, "index.html")] : [base, `${base}.html`];
    for (const file of candidates) {
      if (await isFile(file)) return await send(req, res, file, 200, urlPath);
    }

    const notFound = path.join(ROOT, "404.html");
    if (await isFile(notFound)) return await send(req, res, notFound, 404, urlPath);
    res.writeHead(404, { "content-type": "text/plain" }).end("Not found");
  } catch (error) {
    console.error(error);
    res.writeHead(500).end();
  }
});

server.listen(PORT, () => {
  console.log(`Serving ${path.relative(process.cwd(), ROOT) || "."} at http://localhost:${PORT}`);
});
