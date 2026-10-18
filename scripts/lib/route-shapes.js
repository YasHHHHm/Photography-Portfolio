/**
 * Routes that exist only when the content has a page for them, and the
 * pre-rendered paths each one serves.
 *
 * With `ssr: false`, React Router refuses to start or build when a route that
 * has a loader has no pre-rendered page (for example /blog/page/:n while all
 * posts fit on page 1). So app/routes.js registers a dynamic route only when
 * the content index lists a page for it, and the dev server restarts when
 * that set changes.
 */
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

/** Route path → the pre-rendered paths it serves. */
export const DYNAMIC_ROUTES = {
  "travel/:book": /^\/travel\/[^/]+$/,
  "travel/:book/:trip": /^\/travel\/[^/]+\/[^/]+$/,
  "blog/page/:n": /^\/blog\/page\/\d+$/,
  "blog/label/:label": /^\/blog\/label\/[^/]+$/,
  "blog/:slug": /^\/blog\/(?!page\/|label\/)[^/]+$/,
  privacy: /^\/privacy$/,
};

/**
 * Dynamic route paths that have at least one page.
 * @param {string[]} paths  Pre-rendered paths from .generated/routes.json
 * @returns {Set<string>}
 */
export function activeRoutes(paths) {
  return new Set(
    Object.entries(DYNAMIC_ROUTES)
      .filter(([, pattern]) => paths.some((p) => pattern.test(p)))
      .map(([route]) => route),
  );
}

/**
 * The pre-rendered paths listed by the last content build ([] if none yet).
 * @param {string} [root]
 * @returns {string[]}
 */
export function readRoutePaths(root = process.cwd()) {
  const file = path.join(root, ".generated/routes.json");
  return existsSync(file) ? JSON.parse(readFileSync(file, "utf8")) : [];
}
