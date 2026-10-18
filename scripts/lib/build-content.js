/**
 * Reads content/, validates it, and writes the .generated/ index that route
 * loaders read at build time. `npm run check`, `npm run dev`, `npm run build`
 * and `npm run photos` all run through here.
 *
 * Invalid items (a trip whose cover is missing, a post with broken JSON…) are
 * left out of the index and reported. In a production build any error fails
 * the build; in dev the rest of the site keeps working.
 */
import { existsSync, readFileSync } from "node:fs";
import { mkdir, readdir, readFile, rm, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import path from "node:path";

import { z } from "zod";

import {
  aboutSchema,
  bookSchema,
  PLACEHOLDER,
  POST_FOLDER,
  postSchema,
  siteSchema,
  SLUG,
  TRIP_LABEL,
  tripSchema,
  VIDEO_FILE,
} from "./content-schema.js";
import { createMarkdown, readingTime } from "./markdown.js";
import { createReport } from "./report.js";
import { closest, slugify } from "./suggest.js";

/** Blog cards per page. */
export const POSTS_PER_PAGE = 9;
const BOOK_STORIES = 3;
const RELATED_POSTS = 3;
const TRIP_THUMBS = 4;
/** Slugs that would clash with /blog/page/:n and /blog/label/:label. */
const RESERVED_SLUGS = new Set(["page", "label"]);
const PHOTO_EXT = /\.(jpe?g|png|avif)$/i;
const OTHER_IMAGE_EXT = /\.(heic|heif|tiff?|webp|gif|raw|cr2|cr3|nef|arw|dng|raf|orf)$/i;
const OUT_DIR = ".generated";

const require = createRequire(import.meta.url);

/**
 * The SVG path of a brand icon from Simple Icons, copied into the site data
 * so the page ships only the icons it uses. Null when Simple Icons has no
 * such brand (LinkedIn asked to be removed; "website" is generic), in which
 * case the page shows a plain arrow icon.
 * @param {string} slug
 * @returns {string | null}
 */
function brandIconPath(slug) {
  try {
    const svg = readFileSync(require.resolve(`simple-icons/icons/${slug}.svg`), "utf8");
    return /\sd="([^"]+)"/.exec(svg)?.[1] ?? null;
  } catch {
    return null;
  }
}

/**
 * @typedef {import("../../app/lib/photo-url.js").PhotoRecord} PhotoRecord
 *
 * @typedef {object} ManifestRecord  One photo in media/manifests/*.json
 * @property {string} id
 * @property {string} file
 * @property {string} base
 * @property {number} width
 * @property {number} height
 * @property {number} aspect
 * @property {number[]} widths
 * @property {number} fallback
 * @property {string} lqip
 * @property {string} color
 * @property {import("../../app/lib/photo-url.js").PhotoExif} [exif]
 *
 * @typedef {object} PhotoSet  Photos from one folder: a trip, a post's images/, or about/
 * @property {string} key       "kerala-2026", "about" or "blog/<slug>"
 * @property {string} folder    Source folder, repo-relative
 * @property {string} short     How messages name the folder, e.g. "photos/"
 * @property {Map<string, ManifestRecord>} records  Processed photos by file name
 * @property {string[] | null} sources  Files on this machine, or null if the folder is absent
 * @property {Map<string, PhotoRecord>} resolved     Client records (with alt, no EXIF) by file name
 * @property {string} defaultAlt  Alt text for photos without their own, e.g. "Kerala — photo"
 *
 * @typedef {{ root: string, dev: boolean, report: import("./report.js").Report, sets: Map<string, PhotoSet>, videos: Map<string, VideoSet> }} Ctx
 */

// ── File helpers ─────────────────────────────────────────────────────────

/**
 * @param {Ctx} ctx
 * @param {string} rel
 * @returns {Promise<string | null>}
 */
async function readText(ctx, rel) {
  try {
    return await readFile(path.join(ctx.root, rel), "utf8");
  } catch {
    return null;
  }
}

/**
 * Lists a folder, skipping hidden entries. Null if the folder does not exist.
 * @param {Ctx} ctx
 * @param {string} rel
 * @returns {Promise<{ dirs: string[], files: string[] } | null>}
 */
async function listDir(ctx, rel) {
  try {
    const entries = await readdir(path.join(ctx.root, rel), { withFileTypes: true });
    const visible = entries.filter((e) => !e.name.startsWith(".") && !e.name.startsWith("_"));
    return {
      dirs: visible
        .filter((e) => e.isDirectory())
        .map((e) => e.name)
        .sort(),
      files: visible
        .filter((e) => e.isFile())
        .map((e) => e.name)
        .sort(),
    };
  } catch {
    return null;
  }
}

// ── Friendly JSON and schema errors ──────────────────────────────────────

/**
 * Explains a JSON syntax error with a line number and the likely fix.
 * @param {string} raw
 * @param {Error} error
 */
function jsonSyntaxMessage(raw, error) {
  // V8 gives a position for most errors, and a snippet for the rest.
  let pos = Number(/position (\d+)/.exec(error.message)?.[1] ?? -1);
  const trailingComma = /,\s*[}\]]/.exec(raw);
  if (pos < 0 && trailingComma) pos = trailingComma.index + trailingComma[0].length - 1;
  if (pos < 0) {
    const snippet = /"(?:\.\.\.)?([\s\S]{3,}?)(?:\.\.\.)?" is not valid JSON/.exec(
      error.message,
    )?.[1];
    pos = snippet ? raw.indexOf(snippet) : -1;
  }
  if (pos < 0) {
    return "This file has a typo, so it cannot be read. Usually it is a missing comma or quote mark.\nCompare with the matching file in templates/.";
  }
  const before = raw.slice(0, pos);
  const line = before.split("\n").length;
  const column = pos - before.lastIndexOf("\n");
  const prev = before.trimEnd().at(-1);
  const next = raw.slice(pos).trimStart()[0];

  let hint = "Usually this is a missing comma, a missing quote mark, or an extra comma.";
  if (prev === "," && (next === "}" || next === "]")) {
    hint = "There is a comma after the last item in a list. Remove that comma.";
  } else if (next === '"' && prev && !",{[:".includes(prev)) {
    hint = "A comma is probably missing at the end of the line before.";
  }
  return `There is a typo near line ${line}, column ${column}. ${hint}\nCompare with the matching file in templates/.`;
}

/** @type {Map<z.ZodType, any>} */
const jsonSchemaCache = new Map();

/** @param {z.ZodType} schema */
function jsonSchemaFor(schema) {
  if (!jsonSchemaCache.has(schema)) {
    jsonSchemaCache.set(schema, z.toJSONSchema(schema, { io: "input", unrepresentable: "any" }));
  }
  return jsonSchemaCache.get(schema);
}

/**
 * Field names allowed at a path, for "did you mean" suggestions.
 * @param {any} schema JSON Schema
 * @param {PropertyKey[]} at
 * @returns {string[]}
 */
function keysAt(schema, at) {
  let node = schema;
  for (const segment of at) {
    if (!node) return [];
    node =
      typeof segment === "number"
        ? node.items
        : (node.properties?.[segment] ?? node.additionalProperties);
  }
  return Object.keys(node?.properties ?? {}).filter((k) => k !== "$schema");
}

/** @param {PropertyKey[]} at */
function fieldName(at) {
  return at.map((s) => (typeof s === "number" ? `#${s + 1}` : String(s))).join(" → ");
}

/** @param {unknown} value */
function describeValue(value) {
  if (value === null) return "empty (null)";
  if (Array.isArray(value)) return "a list";
  if (typeof value === "string") return `the text "${value}"`;
  if (typeof value === "number") return `the number ${value}`;
  if (typeof value === "boolean") return `${value}`;
  return "a group of fields";
}

/** @type {Record<string, string>} */
const TYPE_WORDS = {
  string: 'text in "quote marks"',
  number: "a number",
  int: "a whole number",
  boolean: "true or false",
  array: "a list in [square brackets]",
  object: "a group of fields in {curly brackets}",
};

/**
 * Turns one Zod issue into a plain-English sentence.
 * @param {import("zod").core.$ZodIssue} issue
 * @param {any} jsonSchema
 * @returns {string}
 */
function formatIssue(issue, jsonSchema) {
  const field = fieldName(issue.path);
  const quoted = field ? `"${field}"` : "This file";

  switch (issue.code) {
    case "invalid_type": {
      const input = /** @type {any} */ (issue).input;
      if (input === undefined)
        return `${quoted} is missing. Add it (see the matching file in templates/).`;
      return `${quoted} should be ${TYPE_WORDS[issue.expected] ?? issue.expected}, but it is ${describeValue(input)}.`;
    }
    case "unrecognized_keys":
      return issue.keys
        .map((key) => {
          const where = field ? ` inside "${field}"` : "";
          const guess = closest(key, keysAt(jsonSchema, issue.path));
          return (
            `"${key}"${where} is not a field this file understands.` +
            (guess
              ? ` Did you mean "${guess}"?`
              : " Remove it, or check its spelling against templates/.")
          );
        })
        .join("\n");
    case "too_small":
    case "too_big":
      if (!/^Too (small|big)/.test(issue.message)) return `${quoted}: ${issue.message}`;
      if (issue.code === "too_small") return `${quoted} should be at least ${issue.minimum}.`;
      return `${quoted} should be at most ${issue.maximum}.`;
    case "invalid_key":
      return `${quoted}: ${issue.issues[0]?.message ?? issue.message}`;
    default:
      return field ? `${quoted}: ${issue.message}` : issue.message;
  }
}

/**
 * Warns about `{{PLACEHOLDER}}` values left in a file.
 * @param {Ctx} ctx
 * @param {string} rel
 * @param {unknown} data
 */
function warnPlaceholders(ctx, rel, data) {
  /** @type {string[]} */
  const found = [];
  /** @param {unknown} value @param {string} at */
  const walk = (value, at) => {
    if (typeof value === "string") {
      for (const m of value.matchAll(new RegExp(PLACEHOLDER, "g")))
        found.push(`${m[0]} in "${at}"`);
    } else if (Array.isArray(value)) {
      value.forEach((v, i) => walk(v, `${at} → #${i + 1}`));
    } else if (value && typeof value === "object") {
      for (const [k, v] of Object.entries(value)) walk(v, at ? `${at} → ${k}` : k);
    }
  };
  walk(data, "");
  if (found.length) {
    ctx.report.warn(
      rel,
      `Placeholder text to replace before launch:\n${found.map((f) => `  ${f}`).join("\n")}`,
    );
  }
}

/**
 * Reads, parses and validates one JSON content file.
 * @template T
 * @param {Ctx} ctx
 * @param {string} rel
 * @param {z.ZodType<T>} schema
 * @returns {Promise<T | null>}
 */
async function loadJson(ctx, rel, schema) {
  const raw = await readText(ctx, rel);
  if (raw === null) {
    ctx.report.error(
      rel,
      "This file is missing. Copy the matching starter from templates/, or run npm run new.",
    );
    return null;
  }
  let data;
  try {
    data = JSON.parse(raw.replace(/^\uFEFF/, ""));
  } catch (error) {
    ctx.report.error(rel, jsonSyntaxMessage(raw, /** @type {Error} */ (error)));
    return null;
  }
  warnPlaceholders(ctx, rel, data);
  const result = schema.safeParse(data, { reportInput: true });
  if (!result.success) {
    for (const issue of result.error.issues)
      ctx.report.error(rel, formatIssue(issue, jsonSchemaFor(schema)));
    return null;
  }
  return result.data;
}

// ── Photos ───────────────────────────────────────────────────────────────

/**
 * Loads a folder's processed photos (manifest) and, if present, its originals.
 * @param {Ctx} ctx
 * @param {{ key: string, manifest: string, folder: string, short: string }} options
 * @returns {Promise<PhotoSet>}
 */
async function loadPhotoSet(ctx, { key, manifest, folder, short }) {
  /** @type {Map<string, ManifestRecord>} */
  const records = new Map();
  const raw = await readText(ctx, manifest);
  if (raw) {
    try {
      for (const record of JSON.parse(raw).photos ?? []) records.set(record.file, record);
    } catch {
      ctx.report.error(
        manifest,
        "This file was changed by hand and can no longer be read. Delete it and run npm run photos to rebuild it.",
      );
    }
  }

  /** @type {string[] | null} */
  let sources = null;
  const listing = await listDir(ctx, folder);
  if (listing) {
    sources = [];
    for (const name of listing.files) {
      if (PHOTO_EXT.test(name)) {
        sources.push(name);
      } else if (/\.(heic|heif)$/i.test(name)) {
        ctx.report.error(
          `${folder}/${name}`,
          "HEIC files are not supported. Re-export this photo as JPEG (sRGB, long edge about 3000 px, quality 90) or AVIF.",
        );
      } else if (OTHER_IMAGE_EXT.test(name)) {
        ctx.report.error(
          `${folder}/${name}`,
          `${path.extname(name).slice(1).toUpperCase()} files are not supported. Export this photo as JPEG (sRGB, long edge about 3000 px, quality 90) or AVIF.`,
        );
      }
    }

    const fresh = sources.filter((f) => !records.has(f));
    if (fresh.length) {
      ctx.report.warn(
        folder,
        `${fresh.length} photo${fresh.length === 1 ? " has" : "s have"} not been processed yet, so ${fresh.length === 1 ? "it is" : "they are"} not on the site: ` +
          `${fresh.slice(0, 4).join(", ")}${fresh.length > 4 ? ", …" : ""}\nRun npm run photos.`,
      );
    }
    const gone = [...records.keys()].filter((f) => !sources?.includes(f));
    if (gone.length) {
      ctx.report.warn(
        folder,
        `${gone.length} photo${gone.length === 1 ? " was" : "s were"} removed from this folder but ${gone.length === 1 ? "is" : "are"} still on the site: ` +
          `${gone.slice(0, 4).join(", ")}${gone.length > 4 ? ", …" : ""}\nRun npm run photos to remove ${gone.length === 1 ? "it" : "them"}.`,
      );
    }
  }

  return { key, folder, short, records, sources, resolved: new Map(), defaultAlt: "" };
}

/**
 * The fields of a manifest record that pages need.
 * @param {ManifestRecord} record
 * @param {{ alt?: string, caption?: string, exif?: boolean }} extra
 * @returns {PhotoRecord}
 */
function clientPhoto(record, { alt, caption, exif = false }) {
  /** @type {PhotoRecord} */
  const photo = {
    id: record.id,
    base: record.base,
    width: record.width,
    height: record.height,
    aspect: record.aspect,
    widths: record.widths,
    fallback: record.fallback,
    lqip: record.lqip,
    color: record.color,
    alt: alt ?? "",
  };
  if (caption) photo.caption = caption;
  if (exif && record.exif) photo.exif = record.exif;
  return photo;
}

/**
 * A photo record without EXIF, for cards and summaries.
 * @param {PhotoRecord} photo
 * @returns {PhotoRecord}
 */
function lean({ exif: _exif, ...photo }) {
  return photo;
}

/**
 * Where a photo reference was written, for messages.
 * @typedef {object} RefSite
 * @property {string} rel   The file the reference is in
 * @property {string} say   Start of the sentence, e.g. '"cover" is' or '"featured" includes'
 * @property {string} [prefix]  Shown before the file name, e.g. "kerala-2026/"
 * @property {boolean} [far]    The reference is in another folder, so name the folder in full
 */

/**
 * Finds a photo by file name in a set, or reports why it cannot be used.
 * Photos that exist but are not processed yet are reported once per file.
 * @param {Ctx} ctx
 * @param {PhotoSet} set
 * @param {string} file
 * @param {RefSite} site
 * @returns {PhotoRecord | null}
 */
function resolveFile(ctx, set, file, { rel, say, prefix = "", far = false }) {
  const resolved = set.resolved.get(file);
  if (resolved) return resolved;
  const record = set.records.get(file);
  if (record) return clientPhoto(record, { alt: set.defaultAlt });

  if (set.sources?.includes(file)) {
    ctx.report.error(
      rel,
      `"${prefix}${file}" has not been processed yet, so it cannot be shown. Run npm run photos.`,
    );
    return null;
  }
  const guess = closest(file, new Set([...set.records.keys(), ...(set.sources ?? [])]));
  ctx.report.error(
    rel,
    `${say} "${prefix}${file}", but there is no photo with that name in ${far ? `${set.folder}/` : set.short}.` +
      (guess ? `\nDid you mean "${prefix}${guess}"?` : ""),
  );
  return null;
}

/**
 * Resolves "kerala-2026/x.jpg", "images/x.jpg" or "about/x.jpg".
 * @param {Ctx} ctx
 * @param {string} ref
 * @param {{ rel: string, say: string, postSet?: PhotoSet }} site
 * @returns {PhotoRecord | null}
 */
function resolveRef(ctx, ref, { rel, say, postSet }) {
  const slash = ref.indexOf("/");
  const prefix = ref.slice(0, slash);
  const file = ref.slice(slash + 1);

  if (slash < 0 || !file) {
    ctx.report.error(
      rel,
      `${say} "${ref}". Write it as "trip-folder/file.jpg", e.g. "kerala-2026/backwaters-01.jpg".`,
    );
    return null;
  }
  if (prefix === "images") {
    if (postSet) return resolveFile(ctx, postSet, file, { rel, say, prefix: "images/" });
    ctx.report.error(
      rel,
      `${say} "${ref}", but images/ only works inside a blog post. Use a trip photo instead.`,
    );
    return null;
  }
  const set = ctx.sets.get(prefix);
  if (!set || prefix.startsWith("blog/")) {
    const trips = [...ctx.sets.keys()].filter((k) => TRIP_LABEL.test(k));
    const guess = closest(prefix, trips);
    ctx.report.error(
      rel,
      `${say} "${ref}", but there is no trip folder called "${prefix}".` +
        (guess ? `\nDid you mean "${guess}/${file}"?` : ""),
    );
    return null;
  }
  return resolveFile(ctx, set, file, { rel, say, prefix: `${prefix}/`, far: true });
}

// ── Videos ───────────────────────────────────────────────────────────────

/**
 * @typedef {import("./videos.js").VideoRecord} VideoRecord
 *
 * @typedef {object} VideoSet  A trip's clips: processed ones and, if present, the originals
 * @property {string} label
 * @property {string} folder  e.g. content/travel/india/kerala-2026/videos
 * @property {Map<string, VideoRecord>} records
 * @property {string[] | null} sources
 *
 * @typedef {object} ClientVideo  What pages receive
 * @property {string} id
 * @property {string} base
 * @property {number} width
 * @property {number} height
 * @property {number} aspect
 * @property {number} duration
 * @property {{ size: number, codec: "h264" | "av1", type: string }[]} renditions
 * @property {PhotoRecord} poster  The first frame, shown until the clip plays
 */

const OTHER_VIDEO_EXT = /\.(avi|mkv|wmv|webm|mpe?g|3gp|flv|mts|m2ts)$/i;

/**
 * Loads a trip's processed clips and, if the folder is on this machine, its
 * originals (to report clips that still need `npm run photos`).
 * @param {Ctx} ctx
 * @param {{ label: string, tripDir: string }} trip
 * @returns {Promise<VideoSet>}
 */
async function loadVideoSet(ctx, { label, tripDir }) {
  const manifest = `media/manifests/videos/${label}.json`;
  const folder = `${tripDir}/videos`;
  /** @type {Map<string, VideoRecord>} */
  const records = new Map();
  const raw = await readText(ctx, manifest);
  if (raw) {
    try {
      for (const record of JSON.parse(raw).videos ?? []) records.set(record.file, record);
    } catch {
      ctx.report.error(
        manifest,
        "This file was changed by hand and can no longer be read. Delete it and run npm run photos to rebuild it.",
      );
    }
  }

  /** @type {string[] | null} */
  let sources = null;
  const listing = await listDir(ctx, folder);
  if (listing) {
    sources = listing.files.filter((name) => VIDEO_FILE.test(name));
    for (const name of listing.files.filter((n) => OTHER_VIDEO_EXT.test(n))) {
      ctx.report.error(
        `${folder}/${name}`,
        `${path.extname(name).slice(1).toUpperCase()} clips are not supported. Export this clip as MP4 (H.264 or HEVC).`,
      );
    }
    const fresh = sources.filter((f) => !records.has(f));
    if (fresh.length) {
      ctx.report.warn(
        folder,
        `${fresh.length} clip${fresh.length === 1 ? " has" : "s have"} not been processed yet: ` +
          `${fresh.slice(0, 4).join(", ")}${fresh.length > 4 ? ", …" : ""}\nRun npm run photos.`,
      );
    }
    const gone = [...records.keys()].filter((f) => !sources?.includes(f));
    if (gone.length) {
      ctx.report.warn(
        folder,
        `${gone.length} clip${gone.length === 1 ? " was" : "s were"} removed from this folder but ${gone.length === 1 ? "is" : "are"} still on the site: ` +
          `${gone.slice(0, 4).join(", ")}\nRun npm run photos to remove ${gone.length === 1 ? "it" : "them"}.`,
      );
    }
  }
  return { label, folder, records, sources };
}

/**
 * Finds a clip by file name in a trip, or reports why it cannot be used.
 * @param {Ctx} ctx
 * @param {VideoSet} set
 * @param {string} file
 * @param {RefSite} site
 * @returns {ClientVideo | null}
 */
function resolveVideoFile(ctx, set, file, { rel, say, prefix = "", far = false }) {
  const record = set.records.get(file);
  if (record) {
    if (record.darkStart) {
      ctx.report.warn(
        rel,
        `The first frame of "${prefix}${file}" is almost black. The page shows that frame while the clip ` +
          "loads, so trim the fade-in and start the clip on a clear frame.",
      );
    }
    return {
      id: record.id,
      base: record.base,
      width: record.width,
      height: record.height,
      aspect: record.aspect,
      duration: record.duration,
      renditions: record.renditions.map(({ size, codec, type }) => ({ size, codec, type })),
      poster: { id: `${record.id}-poster`, ...record.poster, alt: "" },
    };
  }
  if (set.sources?.includes(file)) {
    ctx.report.error(
      rel,
      `"${prefix}${file}" has not been processed yet, so it cannot be shown. Run npm run photos.`,
    );
    return null;
  }
  const guess = closest(file, new Set([...set.records.keys(), ...(set.sources ?? [])]));
  ctx.report.error(
    rel,
    `${say} "${prefix}${file}", but there is no clip with that name in ${far ? `${set.folder}/` : "videos/"}.` +
      (guess ? `\nDid you mean "${prefix}${guess}"?` : ""),
  );
  return null;
}

/**
 * Resolves "kerala-2026/backwaters-loop.mp4".
 * @param {Ctx} ctx
 * @param {string} ref
 * @param {{ rel: string, say: string }} site
 * @returns {ClientVideo | null}
 */
function resolveVideoRef(ctx, ref, { rel, say }) {
  const slash = ref.indexOf("/");
  const label = ref.slice(0, slash);
  const file = ref.slice(slash + 1);
  const set = ctx.videos.get(label);
  if (!set) {
    const guess = closest(label, ctx.videos.keys());
    ctx.report.error(
      rel,
      `${say} "${ref}", but there is no trip folder called "${label}".` +
        (guess ? `\nDid you mean "${guess}/${file}"?` : ""),
    );
    return null;
  }
  return resolveVideoFile(ctx, set, file, { rel, say, prefix: `${label}/`, far: true });
}

// ── Markdown ─────────────────────────────────────────────────────────────

const md = createMarkdown();

/**
 * Renders an optional Markdown file. Returns "" if the file does not exist.
 * @param {Ctx} ctx
 * @param {string} rel
 * @param {{ postSet?: PhotoSet, required?: boolean }} [options]
 * @returns {Promise<{ html: string, minutes: number }>}
 */
async function renderMarkdown(ctx, rel, { postSet, required = false } = {}) {
  const source = await readText(ctx, rel);
  if (source === null) {
    if (required)
      ctx.report.error(
        rel,
        "This file is missing. Write the text in a file called post.md beside post.json.",
      );
    return { html: "", minutes: 0 };
  }
  /** @type {import("./markdown.js").MarkdownEnv} */
  const env = {
    file: rel,
    resolvePhoto: (ref) =>
      resolveRef(ctx, ref, { rel, say: "This text places the photo", postSet }),
    warn: (message) => ctx.report.warn(rel, message),
  };
  return { html: md.render(source, env), minutes: readingTime(source) };
}

// ── Helpers for the index ────────────────────────────────────────────────

/**
 * Where the site is served, for canonical links, social cards, the sitemap
 * and RSS: the address in site.json, else the Cloudflare Pages deployment
 * address (set during Cloudflare builds), else the local preview server.
 * Only the production branch may be indexed by search engines.
 * @param {string} url  site.json "url"
 * @returns {{ origin: string, indexable: boolean }}
 */
function deployment(url) {
  const branch = process.env.CF_PAGES_BRANCH;
  const origin = !PLACEHOLDER.test(url)
    ? url
    : (process.env.CF_PAGES_URL ?? `http://localhost:${process.env.PORT ?? 4173}`);
  return { origin: origin.replace(/\/+$/, ""), indexable: !branch || branch === "main" };
}

/** @param {string} from @param {string} [to] */
const yearOf = (from, to) => Number((to || from).slice(0, 4));

/**
 * @template T
 * @param {T[]} list
 * @param {number} index
 */
const neighbours = (list, index) => ({
  prev: list[index - 1] ?? null,
  next: list[index + 1] ?? null,
});

// ── Main ─────────────────────────────────────────────────────────────────

/**
 * Validates all content and builds the .generated/ index.
 * @param {{ root?: string, dev?: boolean, write?: boolean }} [options]
 *   dev: include draft posts and never fail; write: write .generated/
 */
export async function buildContent({ root = process.cwd(), dev = false, write = true } = {}) {
  const report = createReport();
  /** @type {Ctx} */
  const ctx = { root, dev, report, sets: new Map(), videos: new Map() };

  // 1. Site and About ────────────────────────────────────────────────────
  const site = await loadJson(ctx, "content/site.json", siteSchema);
  const about = await loadJson(ctx, "content/about/about.json", aboutSchema);
  const aboutSet = await loadPhotoSet(ctx, {
    key: "about",
    manifest: "media/manifests/about.json",
    folder: "content/about",
    short: "content/about/",
  });
  ctx.sets.set("about", aboutSet);
  if (site) aboutSet.defaultAlt = `Portrait of ${site.name}`;

  // 2. Books and trips (JSON + photo sets) ───────────────────────────────
  /** @typedef {{ label: string, book: string, dir: string, data: z.infer<typeof tripSchema>, set: PhotoSet, cover?: PhotoRecord | null, video: ClientVideo | null, gallery: PhotoRecord[], featured: PhotoRecord[], storyHtml: string }} Trip */
  /** @typedef {{ slug: string, dir: string, data: z.infer<typeof bookSchema>, trips: Trip[], tripFolders: number, cover?: PhotoRecord | null, video: ClientVideo | null, storyHtml: string }} Book */
  /** @type {Book[]} */
  const books = [];
  /** @type {Map<string, string>} label → folder where first seen */
  const labelHome = new Map();

  const travel = (await listDir(ctx, "content/travel")) ?? { dirs: [], files: [] };
  for (const bookSlug of travel.dirs) {
    const dir = `content/travel/${bookSlug}`;
    if (!SLUG.test(bookSlug)) {
      report.error(
        dir,
        `Folder names can only use lowercase letters, numbers and hyphens. Rename "${bookSlug}" to "${slugify(bookSlug)}".`,
      );
      continue;
    }
    const data = await loadJson(ctx, `${dir}/book.json`, bookSchema);
    /** @type {Trip[]} */
    const trips = [];

    const tripDirs = (await listDir(ctx, dir))?.dirs ?? [];
    const labelCount = tripDirs.length;
    for (const label of tripDirs) {
      const tripDir = `${dir}/${label}`;
      if (!TRIP_LABEL.test(label)) {
        const base = slugify(label.replace(/-?\d{4}$/, "")) || "trip";
        report.error(
          tripDir,
          `Trip folder names use lowercase letters, numbers and hyphens, and end with the year, e.g. "kerala-2026". ` +
            `Rename "${label}" to something like "${base}-${new Date().getFullYear()}".`,
        );
        continue;
      }
      if (labelHome.has(label)) {
        report.error(
          tripDir,
          `There is already a trip called "${label}" in ${labelHome.get(label)}. Every trip folder name must be unique; ` +
            `for a second visit use a different year or add a word, e.g. "${label.replace(/-(\d{4})$/, "-north-$1")}".`,
        );
        continue;
      }
      labelHome.set(label, tripDir);

      const tripData = await loadJson(ctx, `${tripDir}/trip.json`, tripSchema);
      const set = await loadPhotoSet(ctx, {
        key: label,
        manifest: `media/manifests/${label}.json`,
        folder: `${tripDir}/photos`,
        short: "photos/",
      });
      ctx.sets.set(label, set);
      ctx.videos.set(label, await loadVideoSet(ctx, { label, tripDir }));
      if (tripData) {
        set.defaultAlt = `${tripData.title} — photo`;
        trips.push({
          label,
          book: bookSlug,
          dir: tripDir,
          data: tripData,
          set,
          video: null,
          gallery: [],
          featured: [],
          storyHtml: "",
        });
      }
    }
    if (data)
      books.push({
        slug: bookSlug,
        dir,
        data,
        trips,
        tripFolders: labelCount,
        video: null,
        storyHtml: "",
      });
  }

  // 3. Trip galleries: order, alt text, cover and featured ───────────────
  for (const trip of books.flatMap((b) => b.trips)) {
    const { data, set } = trip;
    const rel = `${trip.dir}/trip.json`;
    /** @param {string} file @param {string} say */
    const known = (file, say) => {
      if (set.records.has(file)) return true;
      resolveFile(ctx, set, file, { rel, say });
      return false;
    };
    for (const file of Object.keys(data.photos)) known(file, '"photos" has notes for');
    const pinned = data.pinned.filter((f) => known(f, '"pinned" includes'));
    const hidden = new Set(data.hidden.filter((f) => known(f, '"hidden" includes')));
    for (const f of pinned) {
      if (hidden.has(f)) report.warn(rel, `"${f}" is both pinned and hidden, so it is hidden.`);
    }

    // Pinned first, in order; then by capture time; then by file name.
    const visible = [...set.records.values()].filter((r) => !hidden.has(r.file));
    const rank = (/** @type {ManifestRecord} */ r) => {
      const i = pinned.indexOf(r.file);
      return i < 0 ? Infinity : i;
    };
    visible.sort(
      (a, b) =>
        rank(a) - rank(b) ||
        (a.exif?.takenAt ?? "\uffff").localeCompare(b.exif?.takenAt ?? "\uffff") ||
        a.file.localeCompare(b.file),
    );

    /** @type {number[]} */
    const missingAlt = [];
    trip.gallery = visible.map((record, i) => {
      const notes = data.photos[record.file] ?? {};
      if (!notes.alt) missingAlt.push(i + 1);
      const photo = clientPhoto(record, {
        alt: notes.alt || `${data.title} — photo ${i + 1}`,
        caption: notes.caption,
        exif: true,
      });
      set.resolved.set(record.file, lean(photo));
      return photo;
    });

    // Cover and featured photos must exist and have real alt text.
    /** @param {string} file @param {string} name */
    const needsAlt = (file, name) => {
      if (set.records.has(file) && !data.photos[file]?.alt) {
        report.error(
          rel,
          `The ${name} photo "${file}" needs alt text. Add it under "photos":\n` +
            `  "${file}": { "alt": "Describe the photo as if telling a friend over the phone" }`,
        );
      }
    };
    trip.cover = resolveFile(ctx, set, data.cover, { rel, say: '"cover" is' });
    needsAlt(data.cover, "cover");
    if (trip.cover && hidden.has(data.cover))
      report.warn(rel, `The cover "${data.cover}" is also listed in "hidden".`);

    for (const file of data.featured) {
      const photo = resolveFile(ctx, set, file, { rel, say: '"featured" includes' });
      needsAlt(file, "featured");
      if (photo) trip.featured.push(photo);
    }

    const alreadyReported = new Set(
      [data.cover, ...data.featured].filter((f) => !data.photos[f]?.alt),
    );
    const plainMissing = missingAlt.filter((n) => !alreadyReported.has(visible[n - 1].file));
    if (plainMissing.length) {
      report.warn(
        rel,
        `${plainMissing.length} photo${plainMissing.length === 1 ? " has" : "s have"} no alt text. ` +
          `${plainMissing.length === 1 ? "It" : "They"} will use "${data.title} — photo ${plainMissing[0]}". ` +
          `Add "alt" under "photos" for better accessibility.`,
      );
    }

    const folderYear = trip.label.slice(-4);
    if (data.dates.from.slice(0, 4) !== folderYear) {
      report.warn(
        rel,
        `The folder ends in ${folderYear}, but the trip starts in ${data.dates.from.slice(0, 4)}. ` +
          `Check the dates, or rename the folder to match the year.`,
      );
    }
    if (!set.records.size && set.sources?.length === 0) {
      report.warn(
        `${trip.dir}/photos`,
        "This trip has no photos yet. Drag your exported JPEGs into this folder.",
      );
    }
  }

  // Trips without a usable cover cannot be shown.
  for (const book of books) book.trips = book.trips.filter((t) => t.cover);

  // 4. Posts (JSON + images/ photo sets) ─────────────────────────────────
  /** @typedef {{ slug: string, dir: string, data: z.infer<typeof postSchema>, set: PhotoSet, cover?: PhotoRecord | null, html: string, minutes: number }} Post */
  /** @type {Post[]} */
  const posts = [];
  const slugHome = new Map();

  for (const folder of (await listDir(ctx, "content/blog"))?.dirs ?? []) {
    const dir = `content/blog/${folder}`;
    const match = POST_FOLDER.exec(folder);
    if (!match) {
      report.error(
        dir,
        `Blog folder names start with the date and then the title in lowercase with hyphens, ` +
          `e.g. "2026-10-12-six-days-on-the-backwaters". Rename "${folder}".`,
      );
      continue;
    }
    const [, folderDate, slug] = match;
    if (RESERVED_SLUGS.has(slug)) {
      report.error(
        dir,
        `"${slug}" cannot be used as a post name because the blog uses it for its own pages. Rename the folder.`,
      );
      continue;
    }
    if (slugHome.has(slug)) {
      report.error(
        dir,
        `Another post already uses the name "${slug}" (${slugHome.get(slug)}). Change the words after the date.`,
      );
      continue;
    }
    slugHome.set(slug, dir);

    const data = await loadJson(ctx, `${dir}/post.json`, postSchema);
    const set = await loadPhotoSet(ctx, {
      key: `blog/${slug}`,
      manifest: `media/manifests/blog/${slug}.json`,
      folder: `${dir}/images`,
      short: "images/",
    });
    ctx.sets.set(`blog/${slug}`, set);
    if (!data) continue;
    if (data.date !== folderDate) {
      report.warn(
        `${dir}/post.json`,
        `"date" is ${data.date}, but the folder name starts with ${folderDate}. Make them match.`,
      );
    }
    set.defaultAlt = `${data.title} — photo`;
    posts.push({ slug, dir, data, set, html: "", minutes: 0 });
  }

  // 5. Markdown and cross-references (all photo sets are known now) ─────
  const allTrips = books.flatMap((b) => b.trips);
  const tripByLabel = new Map(allTrips.map((t) => [t.label, t]));

  for (const trip of allTrips) {
    trip.storyHtml = (await renderMarkdown(ctx, `${trip.dir}/story.md`)).html;
    const videos = /** @type {VideoSet} */ (ctx.videos.get(trip.label));
    if (trip.data.video) {
      trip.video = resolveVideoFile(ctx, videos, trip.data.video, {
        rel: `${trip.dir}/trip.json`,
        say: '"video" is',
      });
    }
  }
  for (const book of books) {
    book.storyHtml = (await renderMarkdown(ctx, `${book.dir}/story.md`)).html;
    if (book.data.cover) {
      book.cover = resolveRef(ctx, book.data.cover, {
        rel: `${book.dir}/book.json`,
        say: '"cover" is',
      });
    }
    if (book.data.video) {
      book.video = resolveVideoRef(ctx, book.data.video, {
        rel: `${book.dir}/book.json`,
        say: '"video" is',
      });
    }
    if (!book.trips.length) {
      report.warn(
        book.dir,
        book.tripFolders
          ? "None of this book's trips can be shown yet (see the problems above), so the book is hidden."
          : "This book has no trips yet, so it is not shown on the site.",
      );
    }
  }
  for (const post of posts) {
    const rel = `${post.dir}/post.json`;
    post.cover = resolveRef(ctx, post.data.cover, { rel, say: '"cover" is', postSet: post.set });
    for (const label of post.data.labels) {
      if (!labelHome.has(label)) {
        const guess = closest(label, labelHome.keys());
        report.error(
          rel,
          `"labels" includes "${label}", but there is no trip folder with that name.` +
            (guess ? `\nDid you mean "${guess}"?` : ""),
        );
      }
    }
    const rendered = await renderMarkdown(ctx, `${post.dir}/post.md`, {
      postSet: post.set,
      required: true,
    });
    post.html = rendered.html;
    post.minutes = rendered.minutes;
  }

  const aboutHtml = (await renderMarkdown(ctx, "content/about/about.md")).html;
  const travelIntroHtml = (await renderMarkdown(ctx, "content/travel/intro.md")).html;
  const privacyHtml = (await renderMarkdown(ctx, "content/privacy.md")).html;
  const portrait = about
    ? resolveFile(ctx, aboutSet, about.portrait, {
        rel: "content/about/about.json",
        say: '"portrait" is',
      })
    : null;
  const avatar = site
    ? resolveRef(ctx, site.avatar, { rel: "content/site.json", say: '"avatar" is' })
    : null;
  const reelVideo = site?.home.reel
    ? resolveVideoRef(ctx, site.home.reel.video, {
        rel: "content/site.json",
        say: '"home → reel → video" is',
      })
    : null;

  // 6. Assemble the index ────────────────────────────────────────────────
  const visibleBooks = books
    .filter((b) => b.trips.length)
    .sort((a, b) => a.data.order - b.data.order || a.data.title.localeCompare(b.data.title));
  const bookTitle = new Map(visibleBooks.map((b) => [b.slug, b.data.title]));
  const trips = visibleBooks
    .flatMap((b) => b.trips)
    .sort(
      (a, b) =>
        b.data.dates.from.localeCompare(a.data.dates.from) || a.label.localeCompare(b.label),
    );

  /** @param {Trip} t */
  const tripSummary = (t) => ({
    label: t.label,
    book: t.book,
    bookTitle: bookTitle.get(t.book) ?? t.book,
    title: t.data.title,
    place: t.data.place || null,
    from: t.data.dates.from,
    to: t.data.dates.to || null,
    summary: t.data.summary,
    href: `/travel/${t.book}/${t.label}`,
    cover: /** @type {PhotoRecord} */ (t.cover),
    photoCount: t.gallery.length,
    tags: t.data.tags,
  });

  /** @param {Book} b */
  const bookSummary = (b) => {
    const newestFirst = [...b.trips].sort((x, y) =>
      y.data.dates.from.localeCompare(x.data.dates.from),
    );
    const years = b.trips.flatMap((t) => [
      yearOf(t.data.dates.from),
      yearOf(t.data.dates.from, t.data.dates.to),
    ]);
    return {
      slug: b.slug,
      title: b.data.title,
      summary: b.data.summary,
      href: `/travel/${b.slug}`,
      cover: b.cover ?? /** @type {PhotoRecord} */ (newestFirst[0].cover),
      tripCount: b.trips.length,
      photoCount: b.trips.reduce((n, t) => n + t.gallery.length, 0),
      years: [Math.min(...years), Math.max(...years)],
    };
  };

  const published = posts
    .filter((p) => p.cover && (dev || !p.data.draft))
    .sort((a, b) => b.data.date.localeCompare(a.data.date) || a.slug.localeCompare(b.slug));

  /** @param {Post} p */
  const postSummary = (p) => ({
    slug: p.slug,
    title: p.data.title,
    date: p.data.date,
    excerpt: p.data.excerpt,
    href: `/blog/${p.slug}`,
    cover: /** @type {PhotoRecord} */ (p.cover),
    labels: p.data.labels
      .filter((l) => tripByLabel.has(l))
      .map((l) => ({ label: l, title: /** @type {Trip} */ (tripByLabel.get(l)).data.title })),
    featured: p.data.featured,
    readingTime: p.minutes,
    draft: p.data.draft,
  });

  const postsByLabel = new Map();
  for (const p of published) {
    for (const l of p.data.labels) postsByLabel.set(l, [...(postsByLabel.get(l) ?? []), p]);
  }

  /** @type {Map<string, unknown>} */
  const files = new Map();
  /** @type {string[]} */
  const routes = ["/", "/travel", "/blog", "/about", "/404"];
  const ogPath = (/** @type {string} */ p) => (existsSync(path.join(root, "public", p)) ? p : null);

  // Home: hero slides alternate between the newest trips' featured photos.
  const heroCount = site?.home.heroCount ?? 6;
  const queues = trips.map((t) =>
    (t.featured.length ? t.featured : [t.cover]).map((photo) => ({ photo, trip: t })),
  );
  /** @type {{ photo: PhotoRecord, trip: { title: string, place: string | null, label: string, href: string } }[]} */
  const hero = [];
  for (let round = 0; hero.length < heroCount && queues.some((q) => q.length > round); round++) {
    for (const queue of queues) {
      const slide = queue[round];
      if (slide && hero.length < heroCount) {
        hero.push({
          photo: /** @type {PhotoRecord} */ (slide.photo),
          trip: {
            title: slide.trip.data.title,
            place: slide.trip.data.place || null,
            label: slide.trip.label,
            href: tripSummary(slide.trip).href,
          },
        });
      }
    }
  }

  if (site) {
    const { origin, indexable } = deployment(site.url);
    if (!dev && PLACEHOLDER.test(site.url) && process.env.CF_PAGES_BRANCH === "main") {
      report.warn(
        "content/site.json",
        `"url" is still a placeholder, so links shared on social media point to ${origin}. Set it to the site's real address.`,
      );
    }
    files.set("site.json", {
      name: site.name,
      role: site.role,
      bio: site.bio,
      location: site.location,
      email: site.email,
      url: site.url,
      avatar,
      origin,
      indexable,
      socials: site.socials.map((s) => ({ ...s, iconPath: brandIconPath(s.icon) })),
      footer: site.footer,
      contact: site.contact,
      notFoundPhoto: hero.at(-1)?.photo ?? null,
      ogImage: ogPath("/og/site.jpg"),
      // npm run photos makes the site's social image from the About portrait.
      ogImageAlt: portrait?.alt ?? null,
      year: new Date().getFullYear(),
    });
  }

  const totals = {
    books: visibleBooks.length,
    trips: trips.length,
    photos: trips.reduce((n, t) => n + t.gallery.length, 0),
  };

  files.set("home.json", {
    profile: site ? { name: site.name, role: site.role, bio: site.bio, avatar } : null,
    hero,
    latestTrips: trips.slice(0, site?.home.latestTrips ?? 6).map(tripSummary),
    books: visibleBooks.slice(0, site?.home.books ?? 4).map(bookSummary),
    latestPost: published[0] ? postSummary(published[0]) : null,
    reel:
      site?.home.reel && reelVideo
        ? {
            video: reelVideo,
            title: site.home.reel.title || null,
            link: site.home.reel.link || null,
          }
        : null,
    totals,
  });

  files.set("travel.json", {
    books: visibleBooks.map(bookSummary),
    totals,
    introHtml: travelIntroHtml,
  });

  if (privacyHtml) {
    files.set("privacy.json", { html: privacyHtml });
    routes.push("/privacy");
  }

  for (const book of visibleBooks) {
    const labels = new Set(book.trips.map((t) => t.label));
    const bookTrips = trips.filter((t) => t.book === book.slug);
    files.set(`books/${book.slug}.json`, {
      book: { ...bookSummary(book), storyHtml: book.storyHtml, video: book.video },
      trips: bookTrips.map(tripSummary),
      ogImage: bookTrips[0] ? ogPath(`/og/trips/${bookTrips[0].label}.jpg`) : null,
      stories: published
        .filter((p) => p.data.labels.some((l) => labels.has(l)))
        .slice(0, BOOK_STORIES)
        .map(postSummary),
    });
    routes.push(`/travel/${book.slug}`);
  }

  const oldestFirst = [...trips].reverse();
  oldestFirst.forEach((trip, i) => {
    const { prev, next } = neighbours(oldestFirst, i);
    const cameras = [...new Set(trip.gallery.map((p) => p.exif?.camera).filter(Boolean))];
    const lenses = [...new Set(trip.gallery.map((p) => p.exif?.lens).filter(Boolean))];
    files.set(`trips/${trip.label}.json`, {
      trip: { ...tripSummary(trip), storyHtml: trip.storyHtml, cameras, lenses, video: trip.video },
      photos: trip.gallery,
      stories: (postsByLabel.get(trip.label) ?? []).map(postSummary),
      prev: prev && tripSummary(prev),
      next: next && tripSummary(next),
      ogImage: ogPath(`/og/trips/${trip.label}.jpg`),
    });
    routes.push(tripSummary(trip).href);
  });

  // Blog: featured post on top of page 1; every other post in the grid.
  const featured = published.find((p) => p.data.featured) ?? published[0] ?? null;
  const gridPosts = published.filter((p) => p !== featured);
  const totalPages = Math.max(1, Math.ceil(gridPosts.length / POSTS_PER_PAGE));
  const labelChips = trips
    .filter((t) => postsByLabel.has(t.label))
    .map((t) => ({ label: t.label, title: t.data.title, count: postsByLabel.get(t.label).length }));

  for (let page = 1; page <= totalPages; page++) {
    files.set(`blog/page-${page}.json`, {
      page,
      totalPages,
      featured: page === 1 && featured ? postSummary(featured) : null,
      posts: gridPosts.slice((page - 1) * POSTS_PER_PAGE, page * POSTS_PER_PAGE).map(postSummary),
      labels: labelChips,
    });
    if (page > 1) routes.push(`/blog/page/${page}`);
  }
  for (const chip of labelChips) {
    const trip = /** @type {Trip} */ (tripByLabel.get(chip.label));
    files.set(`blog/label-${chip.label}.json`, {
      label: { ...chip, href: tripSummary(trip).href },
      posts: postsByLabel.get(chip.label).map(postSummary),
      labels: labelChips,
    });
    routes.push(`/blog/label/${chip.label}`);
  }

  published.forEach((post, i) => {
    // `published` is newest first, so the older post is the next one in the list.
    const older = published[i + 1] ?? null;
    const newer = published[i - 1] ?? null;
    const shared = new Set(post.data.labels);
    files.set(`posts/${post.slug}.json`, {
      post: { ...postSummary(post), html: post.html },
      fromTrips: post.data.labels
        .map((l) => tripByLabel.get(l))
        .filter((t) => t !== undefined)
        .map((t) => ({ ...tripSummary(t), thumbs: t.gallery.slice(0, TRIP_THUMBS).map(lean) })),
      related: published
        .filter((p) => p !== post && p.data.labels.some((l) => shared.has(l)))
        .slice(0, RELATED_POSTS)
        .map(postSummary),
      prev: older && postSummary(older),
      next: newer && postSummary(newer),
      ogImage: ogPath(`/og/posts/${post.slug}.jpg`),
    });
    routes.push(`/blog/${post.slug}`);
  });

  if (about) {
    files.set("about.json", {
      headline: about.headline,
      portrait,
      html: aboutHtml,
      sections: about.sections.map((s) => ({
        title: s.title,
        items: s.items.map((item) => ({
          title: item.title,
          subtitle: item.subtitle || null,
          meta: item.meta || null,
          link: item.link || null,
        })),
      })),
    });
  }

  files.set(
    "labels.json",
    Object.fromEntries(
      trips.map((t) => [
        t.label,
        {
          title: t.data.title,
          book: t.book,
          href: tripSummary(t).href,
          photos: t.gallery.map((p) => p.id),
          posts: (postsByLabel.get(t.label) ?? []).map((p) => p.slug),
        },
      ]),
    ),
  );
  files.set("routes.json", routes);
  files.set("problems.json", report.problems);

  // 7. Write ─────────────────────────────────────────────────────────────
  // Without site.json or about.json no page can render, so keep the old index.
  const writable = Boolean(site && about);
  if (write && writable) await writeIndex(root, files);

  return { report, files, written: write && writable };
}

/**
 * Writes the index, replacing files in place so a running dev server never
 * sees the folder missing, then removes files that are no longer produced.
 * @param {string} root
 * @param {Map<string, unknown>} files
 */
async function writeIndex(root, files) {
  const out = path.join(root, OUT_DIR);
  for (const [rel, data] of files) {
    const target = path.join(out, rel);
    await mkdir(path.dirname(target), { recursive: true });
    await writeFile(target, JSON.stringify(data));
  }
  const keep = new Set([...files.keys()].map((rel) => path.join(out, rel)));
  /** @param {string} dir */
  const prune = async (dir) => {
    for (const entry of await readdir(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) await prune(full);
      else if (!keep.has(full)) await rm(full);
    }
  };
  await prune(out);
}
