/**
 * Turns one image into the site's web files (PRD section 6): AVIF at up to
 * four widths, a JPEG fallback, a tiny blurred placeholder and the dominant
 * colour. Used for photos and for video poster frames, so both load the
 * same way through <Photo>.
 */
import { mkdir } from "node:fs/promises";
import path from "node:path";

import sharp from "sharp";

export const WIDTHS = [480, 960, 1600, 2400];
const FALLBACK_WIDTH = 1600;
const AVIF = { quality: 50, effort: 4, chromaSubsampling: "4:2:0" };
const JPEG = { quality: 78, mozjpeg: true, progressive: true };

/** @param {number} n */
const hex2 = (n) => Math.round(n).toString(16).padStart(2, "0");

/**
 * @typedef {object} EncodedImage
 * @property {number} width   Upright width of the source
 * @property {number} height
 * @property {number} aspect
 * @property {string} base    URL path without width and extension
 * @property {number[]} widths
 * @property {number} fallback
 * @property {string} lqip
 * @property {string} color
 * @property {number} luminance  Average brightness, 0 (black) to 1 (white)
 */

/**
 * Writes every rendition of one image into `outDir` as `<stem>-<width>.avif`
 * and `<stem>-<width>.jpg`. Metadata (EXIF, GPS) is never copied.
 * @param {string} sourcePath
 * @param {{ outDir: string, stem: string }} target  outDir is inside public/
 * @returns {Promise<EncodedImage>}
 */
export async function encodePhoto(sourcePath, { outDir, stem }) {
  await mkdir(outDir, { recursive: true });

  // Upright, sRGB, at most 2400 px wide: every rendition is made from this.
  const meta = await sharp(sourcePath).metadata();
  const upright = (meta.orientation ?? 1) >= 5;
  const width = /** @type {number} */ (upright ? meta.height : meta.width);
  const height = /** @type {number} */ (upright ? meta.width : meta.height);
  const { data, info } = await sharp(sourcePath, { failOn: "none" })
    .rotate()
    .resize({ width: WIDTHS.at(-1), withoutEnlargement: true })
    .toColourspace("srgb")
    .raw()
    .toBuffer({ resolveWithObject: true });
  const master = () =>
    sharp(data, { raw: { width: info.width, height: info.height, channels: info.channels } });

  const widths = WIDTHS.filter((w) => w <= width);
  if (
    width < WIDTHS[WIDTHS.length - 1] &&
    (!widths.length || width - widths[widths.length - 1] > 120)
  ) {
    widths.push(width);
  }
  const fallback = Math.min(FALLBACK_WIDTH, width);

  await Promise.all([
    ...widths.map((w) =>
      master()
        .resize({ width: w })
        .avif(AVIF)
        .toFile(path.join(outDir, `${stem}-${w}.avif`)),
    ),
    master()
      .resize({ width: fallback })
      .flatten({ background: "#ffffff" })
      .jpeg(JPEG)
      .toFile(path.join(outDir, `${stem}-${fallback}.jpg`)),
  ]);

  const [lqip, stats] = await Promise.all([
    master().resize({ width: 16 }).webp({ quality: 40 }).toBuffer(),
    master().stats(),
  ]);
  const { r, g, b } = stats.dominant;
  const [mr, mg, mb] = stats.channels.map((c) => c.mean / 255);

  return {
    width,
    height,
    aspect: Math.round((width / height) * 10000) / 10000,
    base: `/${outDir.replace(/\\/g, "/").replace(/^public\//, "")}/${stem}`,
    widths,
    fallback,
    lqip: `data:image/webp;base64,${lqip.toString("base64")}`,
    color: `#${hex2(r)}${hex2(g)}${hex2(b)}`,
    luminance: Math.round((0.2126 * mr + 0.7152 * mg + 0.0722 * mb) * 1000) / 1000,
  };
}
