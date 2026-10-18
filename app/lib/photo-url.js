/**
 * Every image URL on the site comes from this file.
 *
 * Photos are served from public/photos/ by default. When the library outgrows
 * the repository, copy public/photos/ to Cloudflare R2 and set PHOTO_BASE_URL
 * (e.g. https://photos.example.com). No component changes are needed.
 *
 * Used both in the browser bundle and by the Node build scripts, so it must
 * stay free of React and Node imports.
 */

/**
 * A processed photo, as written by `npm run photos` and passed to pages.
 * @typedef {object} PhotoRecord
 * @property {string} id         Stable id, e.g. "kerala-2026/backwaters-01"
 * @property {string} base       URL path without width and extension
 * @property {number} width      Source width in pixels
 * @property {number} height     Source height in pixels
 * @property {number} aspect     width / height
 * @property {number[]} widths   AVIF widths available, ascending
 * @property {number} fallback   Width of the JPEG fallback
 * @property {string} lqip       Tiny blurred placeholder (data URI)
 * @property {string} color      Dominant colour, e.g. "#3b5560"
 * @property {string} [alt]      Alt text
 * @property {string} [caption]  Caption
 * @property {PhotoExif} [exif]  Camera settings (trip galleries only)
 */

/**
 * @typedef {object} PhotoExif
 * @property {string} [camera]
 * @property {string} [lens]
 * @property {number} [focal]
 * @property {number} [aperture]
 * @property {string} [shutter]
 * @property {number} [iso]
 * @property {string} [takenAt]
 */

const BASE_URL = String(
  import.meta.env?.PHOTO_BASE_URL ?? globalThis.process?.env?.PHOTO_BASE_URL ?? "",
).replace(/\/$/, "");

/**
 * URL of one rendition of a photo.
 * @param {Pick<PhotoRecord, "base">} photo
 * @param {number} width
 * @param {"avif" | "jpg"} [format]
 * @returns {string}
 */
export function photoUrl(photo, width, format = "avif") {
  return `${BASE_URL}${photo.base}-${width}.${format}`;
}

/**
 * `srcset` value listing every AVIF width.
 * @param {Pick<PhotoRecord, "base" | "widths">} photo
 * @returns {string}
 */
export function avifSrcSet(photo) {
  return photo.widths.map((w) => `${photoUrl(photo, w, "avif")} ${w}w`).join(", ");
}

/**
 * The JPEG for browsers without AVIF support.
 * @param {Pick<PhotoRecord, "base" | "fallback">} photo
 * @returns {string}
 */
export function fallbackUrl(photo) {
  return photoUrl(photo, photo.fallback, "jpg");
}

/**
 * The AVIF closest to a target width, never smaller unless it is the largest.
 * @param {Pick<PhotoRecord, "base" | "widths">} photo
 * @param {number} target
 * @returns {string}
 */
export function photoUrlAtLeast(photo, target) {
  const width = photo.widths.find((w) => w >= target) ?? photo.widths.at(-1) ?? 0;
  return photoUrl(photo, width, "avif");
}

/**
 * A processed clip, as written by `npm run photos` and passed to pages.
 * @typedef {object} VideoRecord
 * @property {string} id
 * @property {string} base     URL path without size and extension
 * @property {number} width
 * @property {number} height
 * @property {number} aspect
 * @property {number} duration  Seconds
 * @property {{ size: number, codec: "h264" | "av1", type: string }[]} renditions
 * @property {PhotoRecord} poster  The first frame, shown until the clip plays
 */

/**
 * URL of one rendition of a clip (720p or 1080p, H.264 or AV1).
 * @param {Pick<VideoRecord, "base">} video
 * @param {{ size: number, codec: "h264" | "av1" }} rendition
 * @returns {string}
 */
export function videoUrl(video, rendition) {
  return `${BASE_URL}${video.base}-${rendition.size}${rendition.codec === "av1" ? ".av1" : ""}.mp4`;
}
