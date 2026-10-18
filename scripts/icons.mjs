#!/usr/bin/env node
/**
 * npm run icons — draws the favicon set from the brand monogram (initials in
 * Inter Tight 500 inside a thin circle), the same drawing as <Monogram>.
 * Run it again after changing the name in content/site.json.
 *
 * Writes to public/: favicon.svg (follows the system theme),
 * apple-touch-icon.png (180 px), icon-192.png, icon-512.png and
 * site.webmanifest. Colours come from the tokens in app/styles/app.css.
 */
import { readFile, writeFile } from "node:fs/promises";

import opentype from "opentype.js";
import sharp from "sharp";

import { initials } from "../app/lib/format.js";

// The static package's WOFF: opentype.js cannot read the site's WOFF2 files.
const FONT = "node_modules/@fontsource/inter-tight/files/inter-tight-latin-500-normal.woff";

/** Reads one colour token from a theme block of app.css. */
function token(
  /** @type {string} */ css,
  /** @type {string} */ selector,
  /** @type {string} */ name,
) {
  const block = css.slice(css.indexOf(selector));
  const value = new RegExp(`--${name}:\\s*(#[0-9a-f]{3,8})`, "i").exec(block)?.[1];
  if (!value) throw new Error(`Could not find --${name} after ${selector} in app/styles/app.css`);
  return value;
}

const css = await readFile("app/styles/app.css", "utf8");
const dark = {
  bg: token(css, '[data-theme="dark"]', "bg"),
  ink: token(css, '[data-theme="dark"]', "ink"),
};
const light = { ink: token(css, '[data-theme="light"]', "ink") };

const site = JSON.parse(await readFile("content/site.json", "utf8"));
const letters = initials(String(site.name ?? "")) || "P";

// Glyph outlines for the initials, centred in a 64 × 64 box.
const buffer = await readFile(FONT);
const font = opentype.parse(
  buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength),
);
const size = letters.length > 1 ? 26 : 31;
const scale = size / font.unitsPerEm;
let x = 0;
const paths = [...letters].map((char) => {
  const glyph = font.charToGlyph(char);
  const path = glyph.getPath(x, 0, size);
  x += glyph.advanceWidth * scale;
  return path;
});
const boxes = paths.map((p) => p.getBoundingBox());
const minX = Math.min(...boxes.map((b) => b.x1));
const maxX = Math.max(...boxes.map((b) => b.x2));
const minY = Math.min(...boxes.map((b) => b.y1));
const maxY = Math.max(...boxes.map((b) => b.y2));
const dx = 32 - (minX + maxX) / 2;
const dy = 32 - (minY + maxY) / 2;
const glyphs = paths.map((p) => p.toPathData(2)).join(" ");

/**
 * @param {{ fg: string, bg?: string, pad?: number }} colours
 * @param {string} [style]  Optional <style> for theme-aware SVGs
 */
function svg({ fg, bg, pad = 0 }, style = "") {
  const r = 30 - pad;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">${style}${
    bg ? `<rect width="64" height="64" fill="${bg}"/>` : ""
  }<circle class="fg" cx="32" cy="32" r="${r}" fill="none" stroke="${fg}" stroke-width="${pad ? 1.5 : 2.5}"/><g class="fg-fill" fill="${fg}" transform="translate(32 32) scale(${r / 30}) translate(${dx - 32} ${dy - 32})"><path d="${glyphs}"/></g></svg>`;
}

const favicon = svg(
  { fg: light.ink },
  `<style>@media (prefers-color-scheme: dark){.fg{stroke:${dark.ink}}.fg-fill{fill:${dark.ink}}}</style>`,
);
await writeFile("public/favicon.svg", `${favicon}\n`);

const square = Buffer.from(svg({ fg: dark.ink, bg: dark.bg, pad: 9 }));
for (const [file, px] of [
  ["public/apple-touch-icon.png", 180],
  ["public/icon-192.png", 192],
  ["public/icon-512.png", 512],
]) {
  await sharp(square, { density: (72 * px) / 64 })
    .resize(px, px)
    .png({ compressionLevel: 9 })
    .toFile(/** @type {string} */ (file));
}

const manifest = {
  name: site.name,
  short_name: site.name,
  icons: [
    { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any maskable" },
    { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any maskable" },
  ],
  theme_color: dark.bg,
  background_color: dark.bg,
  display: "browser",
};
await writeFile("public/site.webmanifest", `${JSON.stringify(manifest, null, 2)}\n`);

console.log(
  `✔ Icons for "${letters}": favicon.svg, apple-touch-icon.png, icon-192.png, icon-512.png, site.webmanifest`,
);
