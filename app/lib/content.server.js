/**
 * Reads the content index (.generated/, written by scripts/content-build.mjs)
 * inside route loaders. Loaders run at build time only, so nothing here is
 * shipped to the browser; the `.server.js` suffix makes Vite enforce that.
 *
 * Each page reads only its own slice of the index. Files are read on every
 * call, so `npm run dev` shows content changes after a reload.
 */
import { readFile } from "node:fs/promises";
import path from "node:path";

import { data } from "react-router";

const ROOT = path.resolve(".generated");

/**
 * @param {string} rel  Path inside .generated/
 * @returns {Promise<any>}
 * @throws {Response} 404 when the slice does not exist (unknown book, trip…)
 */
async function read(rel) {
  try {
    return JSON.parse(await readFile(path.join(ROOT, rel), "utf8"));
  } catch (error) {
    if (/** @type {NodeJS.ErrnoException} */ (error).code === "ENOENT") {
      throw data(null, { status: 404, statusText: "Not found" });
    }
    throw error;
  }
}

/** Only lowercase slugs can reach the index; anything else is a 404. */
function slug(/** @type {string | undefined} */ value) {
  if (!value || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value)) {
    throw data(null, { status: 404, statusText: "Not found" });
  }
  return value;
}

/** Name, links and settings used on every page (root loader). */
export const getSite = () => read("site.json");

/** Content problems found by the last content build (shown in dev only). */
export const getProblems = () => read("problems.json").catch(() => []);

/** Home page: profile, hero slides, latest trips, books, latest post. */
export const getHome = () => read("home.json");

/** Travel page: every book with totals. */
export const getTravel = () => read("travel.json");

/** @param {string | undefined} book */
export const getBook = (book) => read(`books/${slug(book)}.json`);

/**
 * A trip, checked against the book in the URL.
 * @param {string | undefined} book
 * @param {string | undefined} trip
 */
export async function getTrip(book, trip) {
  const result = await read(`trips/${slug(trip)}.json`);
  if (result.trip.book !== book) throw data(null, { status: 404, statusText: "Not found" });
  return result;
}

/** @param {number} page */
export function getBlogPage(page) {
  if (!Number.isInteger(page) || page < 1)
    throw data(null, { status: 404, statusText: "Not found" });
  return read(`blog/page-${page}.json`);
}

/** @param {string | undefined} label */
export const getBlogLabel = (label) => read(`blog/label-${slug(label)}.json`);

/** @param {string | undefined} post */
export const getPost = (post) => read(`posts/${slug(post)}.json`);

/** Privacy page text. */
export const getPrivacy = () => read("privacy.json");

/** About page: portrait, bio and sections. */
export const getAbout = () => read("about.json");
