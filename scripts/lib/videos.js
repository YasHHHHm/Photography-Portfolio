/**
 * Video clips (PRD section 6, "Video"). Every clip in a trip's videos/ folder
 * becomes short, silent, web-ready files for background use:
 *
 *  - H.264 MP4 at 720p and 1080p (plays everywhere), plus AV1 at the same
 *    sizes when this ffmpeg has an AV1 encoder (about a third of the bytes,
 *    used by browsers that support it)
 *  - at most 30 seconds, no audio, no metadata (phone clips can carry GPS)
 *  - "faststart", so playback begins before the download finishes
 *  - the first frame as a poster image, encoded like a photo: the page shows
 *    it until the video plays, and the two match exactly
 *
 * Outputs go to public/videos/<trip>/, records to media/manifests/videos/.
 * Unchanged clips are skipped; outputs of clips deleted from a videos/
 * folder are removed, but only when that folder exists on this machine.
 */
import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { createReadStream, existsSync } from "node:fs";
import { mkdir, mkdtemp, readdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { styleText } from "node:util";

import ffmpegPath from "ffmpeg-static";

import { TRIP_LABEL } from "./content-schema.js";
import { encodePhoto } from "./photo-encode.js";
import { slugify } from "./suggest.js";

/** Bump when encoding settings change, so every clip is encoded again. */
export const VIDEO_PIPELINE_VERSION = 2;
export const VIDEO_EXT = /\.(mp4|mov|m4v)$/i;
const MAX_SECONDS = 30;
/** Renditions by their short side: 720p for phones and laptops, 1080p for large screens. */
const SIZES = [720, 1080];
/**
 * Quality. Measured on 4K camera footage (fleece, foliage): the version 1
 * values (H.264 28/26, AV1 38/36) smeared fine texture, SSIM 0.94; these
 * keep it, SSIM 0.95 to 0.955.
 */
const CRF = { h264: { 720: 24, 1080: 23 }, av1: { 720: 32, 1080: 30 } };
/**
 * H.264 peak bitrate in Mbit/s. Busy footage stays light to stream, and 30 s
 * at 6 Mbit/s (about 22 MB) is safely under the 25 MiB per-file limit of
 * Cloudflare Pages. AV1 files are far smaller; the size check catches the rest.
 */
const H264_MAXRATE = { 720: 4, 1080: 6 };
const MAX_FILE_BYTES = 25 * 1024 * 1024;

/** An encoded file over MAX_FILE_BYTES; its message is shown as written. */
class TooLarge extends Error {}
/** Codec strings for <source type> and canPlayType(), by codec and size. */
const CODECS = {
  h264: { 720: "avc1.64001f", 1080: "avc1.640028" },
  av1: { 720: "av01.0.05M.08", 1080: "av01.0.08M.08" },
};
/**
 * H.264 level, matching CODECS. Without it, x264's "slow" preset uses 5
 * reference frames, which pushes 1080p to level 5.0: beyond what some older
 * phones and TVs decode in hardware, and not the level CODECS promises.
 */
const H264_LEVEL = { 720: "3.1", 1080: "4.0" };

/**
 * @typedef {object} Rendition
 * @property {number} size   Short side in pixels (720 or 1080)
 * @property {"h264" | "av1"} codec
 * @property {string} type   e.g. 'video/mp4; codecs="av01.0.05M.08"'
 * @property {number} bytes
 *
 * @typedef {object} VideoRecord  One clip in media/manifests/videos/<trip>.json
 * @property {string} id      e.g. "kerala-2026/backwaters-loop"
 * @property {string} file    Source file name in videos/
 * @property {string} label
 * @property {string} book
 * @property {string} hash
 * @property {string} base    URL path without size and extension
 * @property {number} width
 * @property {number} height
 * @property {number} aspect
 * @property {number} duration  Seconds, after trimming
 * @property {Rendition[]} renditions
 * @property {Omit<import("./photo-encode.js").EncodedImage, "luminance">} poster
 * @property {boolean} darkStart  The first frame is almost black
 */

/**
 * Runs ffmpeg and collects everything it prints.
 * @param {string[]} args
 * @returns {Promise<{ code: number | null, log: string }>}
 */
function ffmpeg(args) {
  return new Promise((resolve, reject) => {
    const child = spawn(/** @type {string} */ (ffmpegPath), ["-hide_banner", ...args], {
      windowsHide: true,
    });
    let log = "";
    const collect = (/** @type {Buffer} */ chunk) => {
      log += chunk;
    };
    child.stdout.on("data", collect);
    child.stderr.on("data", collect);
    child.on("error", reject);
    child.on("close", (code) => resolve({ code, log }));
  });
}

/**
 * Duration, displayed size (rotation applied) and frame rate of a clip.
 * @param {string} file
 */
async function probe(file) {
  const { log } = await ffmpeg(["-i", file]);
  const duration = /Duration: (\d+):(\d+):(\d+(?:\.\d+)?)/.exec(log);
  const stream = /Stream #[^\n]*Video:([^\n]*)/.exec(log)?.[1] ?? "";
  const size = /,\s*(\d{2,5})x(\d{2,5})[\s,[]/.exec(stream);
  if (!duration || !size) throw new Error("no video stream found");
  const rotation = Math.abs(Number(/rotation of (-?[\d.]+) degrees/.exec(log)?.[1] ?? 0));
  const sideways = Math.round(rotation) % 180 === 90;
  const [w, h] = [Number(size[1]), Number(size[2])];
  return {
    duration: Number(duration[1]) * 3600 + Number(duration[2]) * 60 + Number(duration[3]),
    width: sideways ? h : w,
    height: sideways ? w : h,
    fps: Number(/([\d.]+) fps/.exec(stream)?.[1] ?? 30),
  };
}

/** The AV1 encoder this ffmpeg build offers, if any (checked once). */
let av1Encoder = /** @type {Promise<string | null> | null} */ (null);
function findAv1Encoder() {
  av1Encoder ??= ffmpeg(["-encoders"]).then(
    ({ log }) =>
      /libsvtav1/.test(log) ? "libsvtav1" : /libaom-av1/.test(log) ? "libaom-av1" : null,
    () => null,
  );
  return av1Encoder;
}

/** @param {string} file 8-character content hash, streamed (clips can be large) */
function hashFile(file) {
  return new Promise((resolve, reject) => {
    const hash = createHash("sha256");
    createReadStream(file)
      .on("data", (chunk) => hash.update(chunk))
      .on("error", reject)
      .on("end", () =>
        resolve(hash.update(`v${VIDEO_PIPELINE_VERSION}`).digest("hex").slice(0, 8)),
      );
  });
}

/**
 * Encodes one clip. Returns its manifest record (without id, file, label…).
 * @param {string} source
 * @param {{ outDir: string, stem: string }} target
 */
async function encodeVideo(source, { outDir, stem }) {
  const info = await probe(source);
  const short = Math.min(info.width, info.height);
  const landscape = info.width >= info.height;
  const sizes = SIZES.filter((s) => s <= short || s === SIZES[0]).map((s) =>
    Math.min(s, short - (short % 2)),
  );
  const fps = info.fps > 30 ? ",fps=30" : "";
  const av1 = await findAv1Encoder();
  await mkdir(outDir, { recursive: true });

  /** @type {Rendition[]} */
  const renditions = [];
  for (const size of [...new Set(sizes)]) {
    const scale = landscape ? `scale=-2:${size}` : `scale=${size}:-2`;
    const label = size >= 1000 ? 1080 : 720;
    for (const codec of /** @type {const} */ (["h264", "av1"])) {
      if (codec === "av1" && !av1) continue;
      const out = path.join(outDir, `${stem}-${label}${codec === "av1" ? ".av1" : ""}.mp4`);
      const encoder =
        codec === "h264"
          ? [
              "-c:v",
              "libx264",
              "-preset",
              "slow",
              "-crf",
              String(CRF.h264[label]),
              "-maxrate",
              `${H264_MAXRATE[label]}M`,
              "-bufsize",
              `${H264_MAXRATE[label] * 2}M`,
              "-profile:v",
              "high",
              "-level:v",
              H264_LEVEL[label],
            ]
          : av1 === "libsvtav1"
            ? ["-c:v", "libsvtav1", "-preset", "7", "-crf", String(CRF.av1[label])]
            : [
                "-c:v",
                "libaom-av1",
                "-cpu-used",
                "6",
                "-row-mt",
                "1",
                "-tiles",
                "2x2",
                "-crf",
                String(CRF.av1[label]),
                "-b:v",
                "0",
              ];
      const { code, log } = await ffmpeg([
        "-y",
        "-i",
        source,
        "-t",
        String(MAX_SECONDS),
        "-an",
        "-sn",
        "-dn",
        "-map_metadata",
        "-1",
        "-vf",
        `${scale}${fps}`,
        ...encoder,
        "-pix_fmt",
        "yuv420p",
        "-movflags",
        "+faststart",
        out,
      ]);
      if (code !== 0) throw new Error(log.trim().split("\n").at(-1) ?? "ffmpeg failed");
      const bytes = (await stat(out)).size;
      if (bytes > MAX_FILE_BYTES) {
        await rm(out, { force: true });
        throw new TooLarge(
          `This clip is too heavy for the website: its ${label}p version is ` +
            `${Math.round(bytes / 1024 / 1024)} MB, over the 25 MB limit per file. Trim it ` +
            "shorter or export it with less fine detail, then run npm run photos again.",
        );
      }
      renditions.push({
        size: label,
        codec,
        type: `video/mp4; codecs="${CODECS[codec][label]}"`,
        bytes,
      });
    }
  }

  // The first frame, at the largest size, becomes the poster image.
  const temp = await mkdtemp(path.join(os.tmpdir(), "poster-"));
  try {
    const frame = path.join(temp, "poster.png");
    const largest = Math.max(...sizes);
    const { code } = await ffmpeg([
      "-y",
      "-i",
      source,
      "-frames:v",
      "1",
      "-vf",
      landscape ? `scale=-2:${largest}` : `scale=${largest}:-2`,
      frame,
    ]);
    if (code !== 0) throw new Error("could not read the first frame");
    const { luminance, ...poster } = await encodePhoto(frame, { outDir, stem: `${stem}-poster` });
    return {
      width: poster.width,
      height: poster.height,
      aspect: poster.aspect,
      duration: Math.round(Math.min(info.duration, MAX_SECONDS) * 10) / 10,
      renditions,
      poster,
      darkStart: luminance < 0.06,
    };
  } finally {
    await rm(temp, { recursive: true, force: true });
  }
}

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

/** Writes JSON only when it changed. */
async function writeJson(/** @type {string} */ file, /** @type {unknown} */ data) {
  const text = `${JSON.stringify(data, null, 2)}\n`;
  if (existsSync(file) && (await readFile(file, "utf8")) === text) return;
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, text);
}

/**
 * Encodes new or changed clips in every trip's videos/ folder.
 * @param {Record<string, any>} cache  The pipeline cache (hashes by file)
 * @returns {Promise<{ processed: number, removed: number, failed: number }>}
 */
export async function processVideos(cache) {
  const result = { processed: 0, removed: 0, failed: 0 };
  /** @type {{ label: string, book: string, source: string, manifest: string, out: string }[]} */
  const groups = [];
  for (const book of await dirs("content/travel")) {
    for (const label of await dirs(`content/travel/${book}`)) {
      if (!TRIP_LABEL.test(label)) continue;
      groups.push({
        label,
        book,
        source: `content/travel/${book}/${label}/videos`,
        manifest: `media/manifests/videos/${label}.json`,
        out: `public/videos/${label}`,
      });
    }
  }

  for (const group of groups) {
    /** @type {Map<string, VideoRecord>} */
    const current = new Map(
      (
        JSON.parse((await readFile(group.manifest, "utf8").catch(() => "{}")) || "{}").videos ?? []
      ).map((/** @type {VideoRecord} */ v) => [v.file, v]),
    );
    if (!existsSync(group.source)) continue; // not on this machine: keep what was processed

    const files = (await readdir(group.source)).filter((f) => VIDEO_EXT.test(f)).sort();
    if (files.length && !ffmpegPath) {
      console.error(
        styleText(
          "red",
          "✖ ffmpeg is not available on this computer, so videos cannot be processed.",
        ),
      );
      result.failed += files.length;
      continue;
    }

    for (const file of files) {
      const source = `${group.source}/${file}`;
      const info = await stat(source);
      const cached = cache.files?.[source];
      let hash =
        cached?.size === info.size && cached?.mtimeMs === info.mtimeMs ? cached.hash : null;
      if (!hash) {
        hash = await hashFile(source);
        cache.files = {
          ...cache.files,
          [source]: { size: info.size, mtimeMs: info.mtimeMs, hash },
        };
      }
      const previous = current.get(file);
      const name = slugify(path.parse(file).name) || "video";
      const stem = `${name}-${hash}`;
      if (previous?.hash === hash && existsSync(path.join(group.out, `${stem}-720.mp4`))) continue;

      const started = Date.now();
      console.log(`  Encoding ${group.label}/${file} (about a minute or two)…`);
      try {
        const encoded = await encodeVideo(source, { outDir: group.out, stem });
        current.set(file, {
          id: `${group.label}/${name}`,
          file,
          label: group.label,
          book: group.book,
          hash,
          base: `/videos/${group.label}/${stem}`,
          ...encoded,
        });
        if (previous && previous.hash !== hash)
          await removeVideoOutputs(group.out, path.basename(previous.base));
        const bytes = encoded.renditions.reduce((n, r) => n + r.bytes, 0);
        console.log(
          `  ${styleText("green", "✔")} ${group.label}/${file}: ${encoded.renditions.length} files, ` +
            `${(bytes / 1024 / 1024).toFixed(1)} MB, ${Math.round((Date.now() - started) / 1000)}s`,
        );
        result.processed++;
      } catch (error) {
        result.failed++;
        const { message } = /** @type {Error} */ (error);
        console.error(
          styleText("red", `✖ ${source}`) +
            (error instanceof TooLarge
              ? `\n  ${message}`
              : `\n  This video could not be converted (${message}). ` +
                "Export it again as MP4 (H.264 or HEVC) and try again."),
        );
      }
    }

    // Clips deleted from the folder: remove their outputs and records.
    for (const [file, record] of current) {
      if (files.includes(file)) continue;
      await removeVideoOutputs(group.out, path.basename(record.base));
      current.delete(file);
      result.removed++;
    }

    const videos = [...current.values()].sort((a, b) => a.file.localeCompare(b.file));
    if (videos.length || existsSync(group.manifest)) {
      await writeJson(group.manifest, { pipeline: VIDEO_PIPELINE_VERSION, videos });
    }
    // Stray files from interrupted runs.
    if (existsSync(group.out)) {
      const keep = videos.map((v) => `${path.basename(v.base)}-`);
      for (const entry of await readdir(group.out)) {
        if (!keep.some((prefix) => entry.startsWith(prefix))) await rm(path.join(group.out, entry));
      }
    }
  }
  return result;
}

/**
 * Deletes every output of one clip version (renditions and poster).
 * @param {string} outDir
 * @param {string} stem  "<name>-<hash>"
 */
async function removeVideoOutputs(outDir, stem) {
  for (const entry of await readdir(outDir).catch(() => [])) {
    if (entry.startsWith(`${stem}-`)) await rm(path.join(outDir, entry));
  }
}
