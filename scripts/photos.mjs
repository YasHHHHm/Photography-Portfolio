#!/usr/bin/env node
/**
 * npm run photos — turns original photos into small web files.
 *
 * For every photo in a trip's photos/, a post's images/ or content/about/:
 *  - AVIF at 480, 960, 1600 and 2400 px wide (never larger than the original)
 *  - one progressive JPEG at 1600 px for browsers without AVIF
 *  - a tiny blurred placeholder and the dominant colour
 *  - camera settings from EXIF (GPS is never read; outputs carry no metadata)
 * plus a 1200 × 630 social image for each trip cover and post cover (and one
 * for the whole site from the About portrait), and
 * web-ready versions of every clip in a trip's videos/ folder (see
 * scripts/lib/videos.js).
 *
 * Outputs go to public/photos/, public/videos/ and public/og/, records to
 * media/manifests/.
 * Unchanged photos are skipped. Outputs of photos deleted from a folder are
 * removed, but only when that folder exists on this machine.
 */
import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { mkdir, readdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { styleText } from "node:util";

import exifr from "exifr";
import sharp from "sharp";

import { buildContent } from "./lib/build-content.js";
import { encodePhoto } from "./lib/photo-encode.js";
import { processVideos } from "./lib/videos.js";
import { POST_FOLDER, TRIP_LABEL } from "./lib/content-schema.js";
import { slugify } from "./lib/suggest.js";

/** Bump when output settings change, so every photo is processed again. */
const PIPELINE_VERSION = 1;
const OG = { width: 1200, height: 630 };
const PHOTO_EXT = /\.(jpe?g|png|avif)$/i;
const CACHE_FILE = ".cache/photos.json";
const CONCURRENCY = Math.min(4, Math.max(2, Math.floor(os.availableParallelism() / 2)));

/**
 * One folder of originals and where its outputs go.
 * @typedef {object} Group
 * @property {string} key       "kerala-2026", "blog/<slug>" or "about"
 * @property {string} source    Folder of originals
 * @property {string} manifest  media/manifests/<key>.json
 * @property {string} out       public/photos/<key>
 * @property {Record<string, string>} [meta]  Extra fields for each record (label, book)
 */

/** @typedef {import("./lib/build-content.js").ManifestRecord & { label?: string, book?: string }} Record_ */

// ── Discovery ────────────────────────────────────────────────────────────

/** @param {string} dir */
async function dirs(dir) {
  try {
    return (await readdir(dir, { withFileTypes: true }))
      .filter((e) => e.isDirectory() && !e.name.startsWith("."))
      .map((e) => e.name)
      .sort();
  } catch {
    return [];
  }
}

/** @returns {Promise<Group[]>} */
async function findGroups() {
  /** @type {Group[]} */
  const groups = [];
  for (const book of await dirs("content/travel")) {
    for (const label of await dirs(`content/travel/${book}`)) {
      if (!TRIP_LABEL.test(label)) continue; // the validator explains the naming rule
      groups.push({
        key: label,
        source: `content/travel/${book}/${label}/photos`,
        manifest: `media/manifests/${label}.json`,
        out: `public/photos/${label}`,
        meta: { label, book },
      });
    }
  }
  for (const folder of await dirs("content/blog")) {
    const match = POST_FOLDER.exec(folder);
    if (!match) continue;
    groups.push({
      key: `blog/${match[2]}`,
      source: `content/blog/${folder}/images`,
      manifest: `media/manifests/blog/${match[2]}.json`,
      out: `public/photos/blog/${match[2]}`,
    });
  }
  groups.push({
    key: "about",
    source: "content/about",
    manifest: "media/manifests/about.json",
    out: "public/photos/about",
  });
  return groups;
}

// ── Small helpers ────────────────────────────────────────────────────────

/** @param {string} file @returns {Promise<any>} */
async function readJson(file) {
  try {
    return JSON.parse(await readFile(file, "utf8"));
  } catch {
    return null;
  }
}

/** Writes JSON only when it changed, so git shows no noise. */
async function writeJson(/** @type {string} */ file, /** @type {unknown} */ data) {
  const text = `${JSON.stringify(data, null, 2)}\n`;
  if (existsSync(file) && (await readFile(file, "utf8")) === text) return;
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, text);
}

/** "SONY" → "Sony"; "NIKON CORPORATION" → "Nikon". */
function cameraName(
  /** @type {string | undefined} */ make,
  /** @type {string | undefined} */ model,
) {
  const cleanMake = (make ?? "")
    .replace(/\b(corporation|corp\.?|imaging|co\.,? ?ltd\.?|company)\b/gi, "")
    .trim()
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
  const cleanModel = (model ?? "").trim();
  if (!cleanModel) return cleanMake || undefined;
  if (cleanModel.toLowerCase().startsWith(cleanMake.toLowerCase())) return cleanModel;
  return `${cleanMake} ${cleanModel}`.trim();
}

/** 0.004 → "1/250"; 2 → "2s". */
function shutterText(/** @type {number | undefined} */ seconds) {
  if (!seconds) return undefined;
  if (seconds >= 1) return `${Math.round(seconds * 10) / 10}s`;
  return `1/${Math.round(1 / seconds)}`;
}

/**
 * Camera settings for the lightbox and trip page. GPS is never read.
 * @param {string} file
 */
async function readExif(file) {
  try {
    const tags = await exifr.parse(file, {
      tiff: true,
      exif: true,
      gps: false,
      ifd1: false,
      interop: false,
      xmp: false,
      iptc: false,
      icc: false,
      reviveValues: false,
      pick: [
        "Make",
        "Model",
        "LensModel",
        "FocalLength",
        "FNumber",
        "ExposureTime",
        "ISO",
        "DateTimeOriginal",
      ],
    });
    if (!tags) return undefined;
    const taken = typeof tags.DateTimeOriginal === "string" ? tags.DateTimeOriginal : undefined;
    /** @type {import("../app/lib/photo-url.js").PhotoExif} */
    const exif = {
      camera: cameraName(tags.Make, tags.Model),
      lens: tags.LensModel?.trim() || undefined,
      focal: tags.FocalLength ? Math.round(tags.FocalLength) : undefined,
      aperture: tags.FNumber ? Math.round(tags.FNumber * 10) / 10 : undefined,
      shutter: shutterText(tags.ExposureTime),
      iso:
        typeof tags.ISO === "number" ? tags.ISO : Array.isArray(tags.ISO) ? tags.ISO[0] : undefined,
      // "2026:10:03 06:12:00" → "2026-10-03T06:12:00" (local time where the photo was taken)
      takenAt: taken?.replace(/^(\d{4}):(\d{2}):(\d{2}) /, "$1-$2-$3T"),
    };
    const clean = Object.fromEntries(Object.entries(exif).filter(([, v]) => v !== undefined));
    return Object.keys(clean).length ? clean : undefined;
  } catch {
    return undefined;
  }
}

// ── Processing one photo ─────────────────────────────────────────────────

/**
 * Every output for one photo. Returns its manifest record.
 * @param {Group} group
 * @param {string} file   File name in the source folder
 * @param {string} hash   8-character content hash
 * @returns {Promise<Record_>}
 */
async function processPhoto(group, file, hash) {
  const sourcePath = path.join(group.source, file);
  const name = slugify(path.parse(file).name) || "photo";
  const [image, exif] = await Promise.all([
    encodePhoto(sourcePath, { outDir: group.out, stem: `${name}-${hash}` }),
    readExif(sourcePath),
  ]);
  const { luminance: _luminance, ...encoded } = image;
  return {
    id: `${group.key}/${name}`,
    file,
    ...group.meta,
    ...encoded,
    hash,
    ...(exif ? { exif } : {}),
  };
}

/**
 * Deletes every output of one photo version.
 * @param {Group} group
 * @param {string} stem  "<name>-<hash>"
 */
async function removeOutputs(group, stem) {
  for (const entry of await readdir(group.out).catch(() => [])) {
    if (entry.startsWith(`${stem}-`)) await rm(path.join(group.out, entry));
  }
}

// ── Social images ────────────────────────────────────────────────────────

/**
 * 1200 × 630 crops for trip covers, post covers and the home page. The home
 * page (and every page without its own cover) shows the photographer: the
 * About portrait, or the newest trip's cover when there is no portrait.
 * @param {Map<string, string>} sourceHashes  "<source path>" → hash
 * @param {Record<string, any>} cache
 */
async function makeSocialImages(sourceHashes, cache) {
  /** @type {{ target: string, source: string }[]} */
  const jobs = [];
  /** @type {{ from: string, source: string }[]} */
  const trips = [];
  /** @param {string} label */
  const tripFolder = (label) =>
    trips.find((t) => t.source.includes(`/${label}/photos/`))?.source.replace(/[^/]+$/, "");

  for (const book of await dirs("content/travel")) {
    for (const label of await dirs(`content/travel/${book}`)) {
      const trip = await readJson(`content/travel/${book}/${label}/trip.json`);
      const source = `content/travel/${book}/${label}/photos/${trip?.cover}`;
      if (!trip?.cover || !existsSync(source)) continue;
      jobs.push({ target: `public/og/trips/${label}.jpg`, source });
      trips.push({ from: String(trip.dates?.from ?? ""), source });
    }
  }
  for (const folder of await dirs("content/blog")) {
    const match = POST_FOLDER.exec(folder);
    const post = match && (await readJson(`content/blog/${folder}/post.json`));
    if (!post?.cover || typeof post.cover !== "string") continue;
    const [prefix, file] = post.cover.split("/");
    const source =
      prefix === "images"
        ? `content/blog/${folder}/images/${file}`
        : `${tripFolder(prefix) ?? "-"}${file}`;
    if (existsSync(source)) jobs.push({ target: `public/og/posts/${match[2]}.jpg`, source });
  }
  const about = await readJson("content/about/about.json");
  const portrait = typeof about?.portrait === "string" && `content/about/${about.portrait}`;
  const newest = trips.sort((a, b) => b.from.localeCompare(a.from))[0];
  const siteSource = portrait && existsSync(portrait) ? portrait : newest?.source;
  if (siteSource) jobs.push({ target: "public/og/site.jpg", source: siteSource });

  let made = 0;
  for (const { target, source } of jobs) {
    const key = `${sourceHashes.get(source) ?? "?"}:${PIPELINE_VERSION}`;
    if (cache.og?.[target] === key && existsSync(target)) continue;
    await mkdir(path.dirname(target), { recursive: true });
    await sharp(source)
      .rotate()
      .resize({ ...OG, fit: "cover", position: sharp.strategy.attention })
      .jpeg({ quality: 80, mozjpeg: true })
      .toFile(target);
    cache.og = { ...cache.og, [target]: key };
    made++;
  }
  return made;
}

// ── Main ─────────────────────────────────────────────────────────────────

const started = Date.now();
const cache = (await readJson(CACHE_FILE)) ?? {};
cache.files ??= {};

const groups = await findGroups();
/** @type {{ group: Group, file: string, hash: string, previous?: Record_ }[]} */
const queue = [];
/** @type {Map<Group, Map<string, Record_>>} */
const records = new Map();
/** @type {Map<string, string>} */
const sourceHashes = new Map();
let removed = 0;

for (const group of groups) {
  const manifest = await readJson(group.manifest);
  /** @type {Map<string, Record_>} */
  const current = new Map((manifest?.photos ?? []).map((/** @type {Record_} */ r) => [r.file, r]));
  records.set(group, current);
  if (!existsSync(group.source)) continue; // not on this machine: keep what was processed

  const files = (await readdir(group.source)).filter((f) => PHOTO_EXT.test(f)).sort();
  for (const file of files) {
    const sourcePath = path.join(group.source, file).replace(/\\/g, "/");
    const info = await stat(sourcePath);
    const cached = cache.files[sourcePath];
    let hash = cached?.size === info.size && cached?.mtimeMs === info.mtimeMs ? cached.hash : null;
    if (!hash) {
      const digest = createHash("sha256")
        .update(await readFile(sourcePath))
        .update(`v${PIPELINE_VERSION}`);
      hash = digest.digest("hex").slice(0, 8);
      cache.files[sourcePath] = { size: info.size, mtimeMs: info.mtimeMs, hash };
    }
    sourceHashes.set(sourcePath, hash);

    const previous = current.get(file);
    const fallbackFile =
      previous && path.join(group.out, `${path.basename(previous.base)}-${previous.fallback}.jpg`);
    if (previous?.hash === hash && fallbackFile && existsSync(fallbackFile)) continue;
    queue.push({ group, file, hash, previous });
  }

  // Photos deleted from the folder: remove their outputs and records.
  for (const [file, record] of current) {
    if (files.includes(file)) continue;
    await removeOutputs(group, path.basename(record.base));
    current.delete(file);
    removed++;
  }
}

// Two files whose names differ only in case, spaces or extension would get
// the same web name, so one would overwrite the other.
for (const group of groups) {
  if (!existsSync(group.source)) continue;
  const seen = new Map();
  for (const file of (await readdir(group.source)).filter((f) => PHOTO_EXT.test(f))) {
    const name = slugify(path.parse(file).name);
    if (seen.has(name)) {
      console.error(
        styleText("red", `✖ ${group.source}`) +
          `\n  "${seen.get(name)}" and "${file}" would get the same web name. Rename one of them.`,
      );
      process.exitCode = 1;
    }
    seen.set(name, file);
  }
}

const total = queue.length;
let done = 0;
let failed = 0;
const tty = process.stdout.isTTY;

/** @param {string} label */
function progress(label) {
  if (!tty) return console.log(`  ${done}/${total} ${label}`);
  const width = 24;
  const filled = Math.round((done / total) * width);
  process.stdout.write(
    `\r  ${"█".repeat(filled)}${"░".repeat(width - filled)} ${done}/${total} ${label.padEnd(48).slice(0, 48)}`,
  );
}

if (total)
  console.log(`Processing ${total} photo${total === 1 ? "" : "s"} (${CONCURRENCY} at a time)…`);

/** Runs the queue with a fixed number of workers. */
async function worker() {
  for (let job = queue.shift(); job; job = queue.shift()) {
    const { group, file, hash, previous } = job;
    try {
      const record = await processPhoto(group, file, hash);
      if (previous && previous.hash !== hash)
        await removeOutputs(group, path.basename(previous.base));
      /** @type {Map<string, Record_>} */ (records.get(group)).set(file, record);
    } catch (error) {
      failed++;
      if (tty) process.stdout.write("\n");
      console.error(
        styleText("red", `✖ ${group.source}/${file}`) +
          `\n  This photo could not be read (${/** @type {Error} */ (error).message}). Re-export it as JPEG and try again.`,
      );
    }
    done++;
    progress(`${group.key}/${file}`);
  }
}
await Promise.all(Array.from({ length: CONCURRENCY }, worker));
if (total && tty) process.stdout.write("\n");

// Write manifests, and remove stray outputs left by interrupted runs.
for (const [group, current] of records) {
  if (!current.size && !existsSync(group.manifest)) continue;
  const photos = [...current.values()].sort((a, b) => a.file.localeCompare(b.file));
  await writeJson(group.manifest, { pipeline: PIPELINE_VERSION, photos });
  if (existsSync(group.source) && existsSync(group.out)) {
    const keep = photos.map((p) => `${path.basename(p.base)}-`);
    for (const entry of await readdir(group.out)) {
      if (!keep.some((prefix) => entry.startsWith(prefix))) await rm(path.join(group.out, entry));
    }
  }
}

const social = await makeSocialImages(sourceHashes, cache);
const videos = await processVideos(cache);
await writeJson(CACHE_FILE, cache);

const seconds = ((Date.now() - started) / 1000).toFixed(1);
console.log(
  styleText("green", "✔ Photos: ") +
    `${total - failed} processed, ${removed} removed, ${social} social image${social === 1 ? "" : "s"} updated; ` +
    `videos: ${videos.processed} encoded, ${videos.removed} removed (${seconds}s)\n`,
);

// Check all content now that the photos are in place.
const { report } = await buildContent({ dev: true });
report.print();
if (failed || videos.failed || report.errorCount) process.exitCode = 1;
