import { existsSync, readFileSync } from "node:fs";

/** Paths pre-rendered before the content index exists (the Phase 0 shell). */
const SHELL_PATHS = ["/", "/travel", "/blog", "/about", "/404"];

/** @type {import("@react-router/dev/config").Config} */
export default {
  appDirectory: "app",
  buildDirectory: "build",
  // Static site: no runtime server. Every URL is pre-rendered to HTML at build time.
  ssr: false,
  // Opt in to v8 behaviour now, so moving to React Router 8 is a version bump.
  future: {
    v8_middleware: true,
    v8_splitRouteModules: true,
    v8_viteEnvironmentApi: true,
    v8_passThroughRequests: true,
    v8_trailingSlashAwareDataRequests: true,
  },
  async prerender() {
    const file = new URL("./.generated/routes.json", import.meta.url);
    if (!existsSync(file)) return SHELL_PATHS;
    return JSON.parse(readFileSync(file, "utf8"));
  },
};
