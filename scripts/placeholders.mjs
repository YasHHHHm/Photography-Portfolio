#!/usr/bin/env node
/**
 * npm run placeholders — creates a labelled gradient JPEG for the sample
 * About portrait, standing in for the real one until the photographer's
 * arrives.
 *
 * The file gets realistic camera EXIF (so the pipeline reads it like a real
 * photo) and a GPS position (so the photo pipeline can prove it strips
 * location). Existing files are never overwritten.
 */
import { existsSync } from "node:fs";
import { mkdir } from "node:fs/promises";
import path from "node:path";

import sharp from "sharp";

/** @type {Record<string, [number, number]>} */
const SIZES = {
  "3:2": [3000, 2000],
  "2:3": [2000, 3000],
  "4:5": [2400, 3000],
  "16:9": [3000, 1688],
  "1:1": [2400, 2400],
};

const SONY_85 = { make: "SONY", model: "ILCE-7M4", lens: "FE 85mm F1.8", focal: "85/1" };

/**
 * folder → palette, camera, start date and photos [file, aspect].
 * @type {{ folder: string, label: string, palette: string[], camera: typeof SONY_85, alt?: typeof SONY_85, date: string, gps: [string, string], photos: [string, string][] }[]}
 */
const PLAN = [
  {
    folder: "content/about",
    label: "Portrait",
    palette: ["#2d2a26", "#c9a27e", "#4a3f35", "#1a1816"],
    camera: SONY_85,
    date: "2026-01-10",
    gps: ["28/1 36/1 0/1", "77/1 12/1 0/1"],
    photos: [["portrait.jpg", "4:5"]],
  },
];

/** Deterministic random numbers from a string, so reruns look the same. */
function seeded(/** @type {string} */ seed) {
  let h = 1779033703 ^ seed.length;
  for (let i = 0; i < seed.length; i++) h = Math.imul(h ^ seed.charCodeAt(i), 3432918353);
  return () => {
    h = Math.imul(h ^ (h >>> 15), h | 1);
    h ^= h + Math.imul(h ^ (h >>> 7), h | 61);
    return ((h ^ (h >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * A soft landscape: sky gradient, a glowing sun and two layers of hills.
 * @param {number} w @param {number} h @param {string[]} palette @param {string} caption @param {string} seed
 */
function landscapeSvg(w, h, palette, caption, seed) {
  const rand = seeded(seed);
  const [sky, glow, near, far] = palette;
  const horizon = h * (0.45 + rand() * 0.2);
  /** @param {number} base @param {number} amp */
  const hills = (base, amp) => {
    const points = [];
    const phase = rand() * Math.PI * 2;
    const freq = 1 + rand() * 2;
    for (let x = 0; x <= w; x += w / 40) {
      points.push(
        `${x.toFixed(0)},${(base + Math.sin((x / w) * Math.PI * freq + phase) * amp + rand() * amp * 0.15).toFixed(0)}`,
      );
    }
    return `M0,${h} L${points.join(" L")} L${w},${h} Z`;
  };
  const sunX = w * (0.2 + rand() * 0.6);
  const sunY = horizon - h * (0.08 + rand() * 0.15);
  const size = Math.round(Math.min(w, h) * 0.022);

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">
  <defs>
    <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="${sky}"/><stop offset="1" stop-color="${glow}"/>
    </linearGradient>
    <radialGradient id="sun">
      <stop offset="0" stop-color="#fff6e0" stop-opacity="0.95"/>
      <stop offset="0.25" stop-color="#fff6e0" stop-opacity="0.5"/>
      <stop offset="1" stop-color="#fff6e0" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="${w}" height="${h}" fill="url(#sky)"/>
  <circle cx="${sunX}" cy="${sunY}" r="${Math.min(w, h) * 0.3}" fill="url(#sun)"/>
  <path d="${hills(horizon, h * 0.05)}" fill="${far}" opacity="0.7"/>
  <path d="${hills(horizon + h * 0.12, h * 0.07)}" fill="${near}"/>
  <text x="${size * 3}" y="${h - size * 3}" font-family="Consolas, Courier New, monospace" font-size="${size}"
    letter-spacing="${size * 0.15}" fill="#ffffff" fill-opacity="0.85">${caption.toUpperCase()}</text>
</svg>`;
}

let created = 0;
for (const group of PLAN) {
  await mkdir(group.folder, { recursive: true });
  for (const [index, [file, aspect]] of group.photos.entries()) {
    const target = path.join(group.folder, file);
    if (existsSync(target)) continue;

    const [w, h] = SIZES[aspect];
    const camera = group.alt && index % 3 === 2 ? group.alt : group.camera;
    const day = new Date(`${group.date}T00:00:00Z`);
    day.setUTCDate(day.getUTCDate() + Math.floor(index / 3));
    const taken = `${day.toISOString().slice(0, 10).replace(/-/g, ":")} ${String(6 + (index % 3) * 4).padStart(2, "0")}:${String((index * 7) % 60).padStart(2, "0")}:00`;
    const caption = `${group.label} · ${String(index + 1).padStart(2, "0")} · ${file.replace(/\.jpg$/, "")}`;

    await sharp(Buffer.from(landscapeSvg(w, h, group.palette, caption, file)))
      .jpeg({ quality: 90 })
      .withExif({
        IFD0: { Make: camera.make, Model: camera.model, Software: "placeholder" },
        IFD2: {
          DateTimeOriginal: taken,
          ExposureTime: ["1/250", "1/500", "1/60"][index % 3],
          FNumber: ["28/10", "4/1", "56/10"][index % 3],
          ISOSpeedRatings: ["100", "200", "400"][index % 3],
          FocalLength: camera.focal,
          LensModel: camera.lens,
        },
        IFD3: {
          GPSLatitudeRef: "N",
          GPSLatitude: group.gps[0],
          GPSLongitudeRef: "E",
          GPSLongitude: group.gps[1],
        },
      })
      .toFile(target);
    created++;
  }
}
console.log(`✔ ${created} placeholder photo${created === 1 ? "" : "s"} created`);
