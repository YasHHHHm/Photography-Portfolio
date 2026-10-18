#!/usr/bin/env node
/**
 * npm run a11y — the accessibility pass (PRD section 9, WCAG 2.2 AA) on the
 * production build. Run after `npm run build`.
 *
 * 1. axe on every pre-rendered page, in the dark and light themes, at
 *    desktop and phone widths. WCAG failures fail the run; best-practice
 *    findings are listed as suggestions.
 * 2. Keyboard only: Tab through each page; the skip link must come first and
 *    every focused element must show a visible focus ring.
 * 3. Reduced motion: no carousel autoplay, no marquee, no reveal animations.
 *
 * Chrome is found automatically; set CHROME_PATH to use another browser.
 */
import { spawn } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { styleText } from "node:util";

import puppeteer from "puppeteer-core";

const PORT = 4174;
const ORIGIN = `http://localhost:${PORT}`;
const AXE = createRequire(import.meta.url).resolve("axe-core/axe.min.js");
const WCAG = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"];
const MAX_TABS = 80;

const CHROME_CANDIDATES = [
  process.env.CHROME_PATH,
  "C:/Program Files/Google/Chrome/Application/chrome.exe",
  "C:/Program Files (x86)/Google/Chrome/Application/chrome.exe",
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/usr/bin/google-chrome",
  "/usr/bin/google-chrome-stable",
  "/usr/bin/chromium",
  "/usr/bin/chromium-browser",
];

const chrome = CHROME_CANDIDATES.find((p) => p && existsSync(p));
if (!chrome) {
  console.error("✖ Chrome was not found. Install it, or set CHROME_PATH.");
  process.exit(1);
}
if (!existsSync("build/client/index.html")) {
  console.error("✖ No build found. Run npm run build first.");
  process.exit(1);
}

/** @type {string[]} */
const pages = JSON.parse(readFileSync(".generated/routes.json", "utf8"));

// The preview server, like Cloudflare Pages.
const server = spawn(process.execPath, ["scripts/serve.mjs"], {
  env: { ...process.env, PORT: String(PORT) },
});
await new Promise((resolve, reject) => {
  server.stdout.on("data", (chunk) => String(chunk).includes("Serving") && resolve(undefined));
  server.on("exit", () => reject(new Error("The preview server stopped")));
});

const browser = await puppeteer.launch({
  executablePath: chrome,
  headless: true,
  args: ["--no-sandbox"],
});
const wait = (/** @type {number} */ ms) => new Promise((r) => setTimeout(r, ms));

/** @type {string[]} */
const failures = [];
/** @type {Map<string, Set<string>>} rule → pages */
const suggestions = new Map();

/**
 * Opens a page in a fresh tab and scrolls through it, so in-view reveals run
 * and everything is checked as a visitor would see it.
 * @param {string} path
 * @param {{ width: number, height: number, scheme: "dark" | "light", reduce?: boolean }} view
 */
async function open(path, { width, height, scheme, reduce = false }) {
  const page = await browser.newPage();
  await page.setViewport({ width, height, isMobile: width < 768, hasTouch: width < 768 });
  await page.emulateMediaFeatures([
    { name: "prefers-color-scheme", value: scheme },
    { name: "prefers-reduced-motion", value: reduce ? "reduce" : "no-preference" },
  ]);
  await page.goto(ORIGIN + path, { waitUntil: "networkidle0" });
  return page;
}

/** @param {import("puppeteer-core").Page} page */
async function scrollThrough(page) {
  await page.evaluate(async () => {
    for (let y = 0; y < document.body.scrollHeight; y += 500) {
      window.scrollTo(0, y);
      await new Promise((r) => setTimeout(r, 60));
    }
    window.scrollTo(0, 0);
  });
  await wait(500);
}

// 1. axe ──────────────────────────────────────────────────────────────────
const views = [
  { width: 1280, height: 800, scheme: /** @type {const} */ ("dark") },
  { width: 1280, height: 800, scheme: /** @type {const} */ ("light") },
  { width: 390, height: 844, scheme: /** @type {const} */ ("dark") },
];
for (const path of pages) {
  for (const view of views) {
    const page = await open(path, view);
    await scrollThrough(page);
    await page.addScriptTag({ path: AXE });
    const results = await page.evaluate(
      (wcag) =>
        // @ts-expect-error axe is injected above
        window.axe.run(document, { runOnly: { type: "tag", values: [...wcag, "best-practice"] } }),
      WCAG,
    );
    for (const v of results.violations) {
      const where = `${path} (${view.scheme}, ${view.width}px)`;
      const isWcag = v.tags.some((/** @type {string} */ t) => WCAG.includes(t));
      if (isWcag) {
        const target = v.nodes[0]?.target?.join(" ") ?? "";
        failures.push(`${where}: ${v.id} — ${v.help} (${v.nodes.length}×, e.g. ${target})`);
      } else {
        const key = `${v.id} — ${v.help}`;
        suggestions.set(key, (suggestions.get(key) ?? new Set()).add(path));
      }
    }
    await page.close();
  }
}
console.log(`axe: ${pages.length} pages × ${views.length} views checked`);

// 2. Keyboard only ─────────────────────────────────────────────────────────
for (const path of pages) {
  const page = await open(path, { width: 1280, height: 800, scheme: "dark" });
  /** @type {string[]} */
  const seen = [];
  for (let i = 0; i < MAX_TABS; i++) {
    await page.keyboard.press("Tab");
    const info = await page.evaluate(() => {
      const el = /** @type {HTMLElement | null} */ (document.activeElement);
      if (!el || el === document.body) return null;
      const style = getComputedStyle(el);
      const ring =
        (style.outlineStyle !== "none" && parseFloat(style.outlineWidth) > 0) ||
        style.boxShadow !== "none";
      const box = el.getBoundingClientRect();
      return {
        name: `${el.tagName.toLowerCase()}${el.id ? `#${el.id}` : ""} "${(el.getAttribute("aria-label") ?? el.textContent ?? "").trim().slice(0, 40)}"`,
        ring,
        visible: box.width > 0 && box.height > 0,
        skip: el.classList.contains("skip-link"),
      };
    });
    if (!info) break;
    if (i === 0 && !info.skip)
      failures.push(`${path}: the first Tab stop is ${info.name}, not the skip link`);
    if (!info.ring) failures.push(`${path}: no visible focus ring on ${info.name}`);
    if (!info.visible) failures.push(`${path}: focus went to an invisible element ${info.name}`);
    if (seen.includes(info.name) && seen.length > 3) break; // wrapped around
    seen.push(info.name);
  }
  await page.close();
}
console.log(`keyboard: ${pages.length} pages tabbed through`);

// 3. Reduced motion ────────────────────────────────────────────────────────
{
  const page = await open("/", { width: 1280, height: 800, scheme: "dark", reduce: true });
  const slide = () =>
    page.evaluate(() =>
      [...document.querySelectorAll(".hero-slide")].findIndex((s) => s.hasAttribute("data-active")),
    );
  const before = await slide();
  await wait(7000);
  if ((await slide()) !== before)
    failures.push("reduced motion: the hero carousel still advances by itself");
  const marquee = await page.evaluate(() => {
    const track = document.querySelector(".marquee-track");
    return track ? getComputedStyle(track).animationName : "none";
  });
  if (marquee !== "none")
    failures.push(`reduced motion: the footer marquee still animates (${marquee})`);
  await scrollThrough(page);
  if (await page.$('[data-reveal="hidden"]'))
    failures.push("reduced motion: sections are still hidden for reveal");
  await page.close();
  console.log("reduced motion: checked on Home");
}

// 4. Dialogs: axe while open, Escape closes, focus returns to the trigger ──
/**
 * @param {string} name
 * @param {string} path
 * @param {{ width: number, height: number }} size
 * @param {string} trigger  Selector of the button that opens the dialog
 */
async function checkDialog(name, path, size, trigger) {
  const page = await open(path, { ...size, scheme: "dark" });
  await page.focus(trigger);
  await page.keyboard.press("Enter");
  await wait(1200);
  if (!(await page.$("dialog[open]"))) {
    failures.push(`${name}: did not open from the keyboard`);
    return page.close();
  }
  await page.addScriptTag({ path: AXE });
  const results = await page.evaluate(
    // @ts-expect-error axe is injected above
    (wcag) => window.axe.run("dialog[open]", { runOnly: { type: "tag", values: wcag } }),
    WCAG,
  );
  for (const v of results.violations) failures.push(`${name}: ${v.id} — ${v.help}`);

  // Focus must stay inside while tabbing.
  for (let i = 0; i < 12; i++) {
    await page.keyboard.press("Tab");
    const inside = await page.evaluate(() => {
      const el = document.activeElement;
      return !el || el === document.body || Boolean(el.closest("dialog[open]"));
    });
    if (!inside) {
      failures.push(`${name}: focus left the dialog while tabbing`);
      break;
    }
  }
  await page.keyboard.press("Escape");
  await wait(900);
  if (await page.$("dialog[open]")) failures.push(`${name}: Escape did not close it`);
  const returned = await page.evaluate(
    (selector) => document.activeElement?.matches(selector),
    trigger,
  );
  if (!returned) failures.push(`${name}: focus did not return to the button that opened it`);
  await page.close();
}
await checkDialog("mobile menu", "/", { width: 390, height: 844 }, "button[aria-haspopup=dialog]");
const firstTrip = pages.find((p) => /^\/travel\/[^/]+\/[^/]+$/.test(p));
if (firstTrip) {
  await checkDialog(
    "lightbox",
    firstTrip,
    { width: 1280, height: 800 },
    "#gallery li:first-child button",
  );
}
console.log("dialogs: mobile menu and lightbox checked");

await browser.close();
server.kill();

for (const [rule, where] of suggestions) {
  console.log(styleText("yellow", `⚠ ${rule}`) + `\n  on ${[...where].join(", ")}`);
}
if (failures.length) {
  for (const f of failures) console.log(styleText("red", `✖ ${f}`));
  console.log(
    styleText(
      "red",
      `\n✖ ${failures.length} accessibility problem${failures.length === 1 ? "" : "s"}`,
    ),
  );
  process.exitCode = 1;
} else {
  console.log(
    styleText("green", "\n✔ No WCAG 2.2 AA problems found; keyboard and reduced motion OK"),
  );
}
