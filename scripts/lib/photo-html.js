/**
 * HTML for photos placed inside Markdown. Produces the same markup as the
 * <Photo> component, so Markdown photos load and behave like every other image.
 */
import { avifSrcSet, fallbackUrl } from "../../app/lib/photo-url.js";

/** @param {unknown} value */
export function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/**
 * @param {import("../../app/lib/photo-url.js").PhotoRecord} photo
 * @param {{ alt: string, sizes: string }} options
 * @returns {string}
 */
export function pictureHtml(photo, { alt, sizes }) {
  const style = `aspect-ratio:${photo.aspect};background:${photo.color} url(${photo.lqip}) center/cover`;
  return (
    `<picture>` +
    `<source type="image/avif" srcset="${escapeHtml(avifSrcSet(photo))}" sizes="${escapeHtml(sizes)}">` +
    `<img src="${escapeHtml(fallbackUrl(photo))}" width="${photo.width}" height="${photo.height}"` +
    ` alt="${escapeHtml(alt)}" loading="lazy" decoding="async" style="${escapeHtml(style)}">` +
    `</picture>`
  );
}

/**
 * A photo with optional caption, as placed in a story or post.
 * @param {import("../../app/lib/photo-url.js").PhotoRecord} photo
 * @param {{ alt: string, wide?: boolean }} options
 * @returns {string}
 */
export function figureHtml(photo, { alt, wide = false }) {
  const sizes = wide ? "100vw" : "(min-width: 768px) 720px, 100vw";
  const caption = photo.caption ? `<figcaption>${escapeHtml(photo.caption)}</figcaption>` : "";
  return `<figure class="prose-photo${wide ? " prose-photo-wide" : ""}">${pictureHtml(photo, { alt, sizes })}${caption}</figure>\n`;
}
