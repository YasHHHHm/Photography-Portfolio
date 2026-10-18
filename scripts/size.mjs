#!/usr/bin/env node
/**
 * npm run size — first-load JavaScript and CSS per page of the production
 * build, compressed with brotli as Cloudflare serves it, against the PRD
 * section 9 budgets (JS under 120 KB, CSS under 25 KB, and the two preloaded
 * fonts under 120 KB together). Run after a build.
 *
 * Usage: node scripts/size.mjs [page.html …]   (default: every page)
 */
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { styleText } from "node:util";
import { brotliCompressSync } from "node:zlib";

const CLIENT = "build/client";
const BUDGET = { js: 120 * 1024, css: 25 * 1024, fonts: 120 * 1024 };

/** @type {Map<string, number>} */
const sizes = new Map();
/** @param {string} url */
async function brotliSize(url) {
  if (!sizes.has(url))
    sizes.set(url, brotliCompressSync(await readFile(path.join(CLIENT, url))).length);
  return /** @type {number} */ (sizes.get(url));
}

/** @param {string} dir @returns {Promise<string[]>} */
async function htmlFiles(dir) {
  const out = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...(await htmlFiles(full)));
    else if (entry.name.endsWith(".html") && !entry.name.startsWith("__")) out.push(full);
  }
  return out;
}

const pages = process.argv.slice(2).length
  ? process.argv.slice(2).map((p) => path.join(CLIENT, p))
  : (await htmlFiles(CLIENT)).sort();

const kb = (/** @type {number} */ n) => `${(n / 1024).toFixed(1)} KB`;
let over = 0;
for (const page of pages) {
  const html = await readFile(page, "utf8");
  const js = [
    ...new Set([...html.matchAll(/(?:src|href)="(\/assets\/[^"]+\.js)"/g)].map((m) => m[1])),
  ];
  const css = [...new Set([...html.matchAll(/href="(\/assets\/[^"]+\.css)"/g)].map((m) => m[1]))];
  const jsTotal = (await Promise.all(js.map(brotliSize))).reduce((a, b) => a + b, 0);
  const cssTotal = (await Promise.all(css.map(brotliSize))).reduce((a, b) => a + b, 0);
  const bad = jsTotal > BUDGET.js || cssTotal > BUDGET.css;
  if (bad) over++;
  const name = path.relative(CLIENT, page).replace(/\\/g, "/");
  const line = `${name.padEnd(46)} JS ${kb(jsTotal).padStart(9)} (${js.length} files)   CSS ${kb(cssTotal).padStart(8)}`;
  console.log(bad ? styleText("red", line) : line);
}
// Preloaded fonts (the same on every page): already compressed, so measured as is.
const home = await readFile(path.join(CLIENT, "index.html"), "utf8");
const fonts = [
  ...home.matchAll(/<link rel="preload" href="(\/assets\/[^"]+\.woff2)"[^>]*as="font"/g),
].map((m) => m[1]);
const fontBytes = (await Promise.all(fonts.map((f) => readFile(path.join(CLIENT, f))))).reduce(
  (n, b) => n + b.length,
  0,
);
const fontLine = `Preloaded fonts: ${fonts.length} files, ${kb(fontBytes)}`;
if (fonts.length > 2 || fontBytes > BUDGET.fonts) {
  over++;
  console.log(styleText("red", `${fontLine} (budget: 2 files, ${kb(BUDGET.fonts)})`));
} else {
  console.log(fontLine);
}

console.log(
  over
    ? styleText(
        "red",
        `\n✖ ${over} page${over === 1 ? "" : "s"} over budget (JS ${kb(BUDGET.js)}, CSS ${kb(BUDGET.css)})`,
      )
    : styleText(
        "green",
        `\n✔ Every page within budget (JS ${kb(BUDGET.js)}, CSS ${kb(BUDGET.css)})`,
      ),
);
process.exitCode = over ? 1 : 0;
