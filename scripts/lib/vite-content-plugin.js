/**
 * Dev only: rebuilds the content index whenever something in content/ or
 * media/manifests/ changes, prints any problems, and reloads the browser.
 * So editing trip.json or post.md shows up after saving, with no restart.
 *
 * When a page is added or removed (a new trip, post or blog page), the dev
 * server restarts instead: React Router reads the list of pages, and the route
 * table, only when it starts.
 */
import path from "node:path";
import { styleText } from "node:util";

import { buildContent } from "./build-content.js";
import { readRoutePaths } from "./route-shapes.js";

/** @param {string[]} paths */
const signature = (paths) => [...paths].sort().join(" ");

/** @returns {import("vite").Plugin} */
export function contentIndex() {
  return {
    name: "content-index",
    apply: "serve",
    configureServer(server) {
      const folders = ["content", "media/manifests"].map((p) => path.resolve(p));
      server.watcher.add(folders);

      let routes = signature(readRoutePaths());
      /** @type {NodeJS.Timeout | undefined} */
      let timer;
      let running = Promise.resolve();

      const rebuild = () => {
        running = running.then(async () => {
          const { report, files } = await buildContent({ dev: true });
          const time = new Date().toLocaleTimeString();
          console.log(`\n${styleText("dim", time)} ${styleText("cyan", "content updated")}`);
          if (report.errorCount) report.print();

          const next = signature(/** @type {string[]} */ (files.get("routes.json") ?? []));
          if (next !== routes) {
            routes = next;
            await server.restart();
          } else {
            server.environments.client.hot.send({ type: "full-reload" });
          }
        });
      };

      server.watcher.on("all", (_event, file) => {
        if (!folders.some((folder) => path.resolve(file).startsWith(folder))) return;
        clearTimeout(timer);
        timer = setTimeout(rebuild, 200);
      });
    },
  };
}
