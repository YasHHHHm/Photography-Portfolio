import { reactRouter } from "@react-router/dev/vite";
import tailwindcss from "@tailwindcss/vite";
import { FontaineTransform } from "fontaine";
import { defineConfig } from "vite";

import { contentIndex } from "./scripts/lib/vite-content-plugin.js";

/** Shared app code and UI icons that pages need on first load. */
const SHARED = /[\\/](?:app[\\/](?:components|lib)|node_modules[\\/]lucide-react)[\\/]/;
/** Loaded on first use (most bring Motion), so they must stay in their own chunks. */
const LAZY =
  /(?:MobileMenu|Lightbox|HoverPreview|ContactForm|MotionProvider|VideoDialog)\.jsx$|\.server\.js$/;

export default defineConfig({
  plugins: [
    // Metric-matched fallback faces so the font swap does not move text.
    FontaineTransform.vite({
      fallbacks: {
        Geist: ["Arial", "Roboto", "Helvetica Neue"],
        "Geist Mono": ["Courier New", "Roboto Mono", "Menlo"],
        "Inter Tight": ["Arial", "Roboto", "Helvetica Neue"],
        Newsreader: ["Times New Roman", "Noto Serif", "Georgia"],
      },
      resolvePath: (id) => new URL(`./node_modules/${id}`, import.meta.url),
    }),
    tailwindcss(),
    reactRouter(),
    contentIndex(),
  ],
  // PHOTO_BASE_URL (empty unless photos move to R2) is read by app/lib/photo-url.js.
  envPrefix: ["VITE_", "PHOTO_BASE_URL"],
  build: {
    rolldownOptions: {
      output: {
        // One "ui" file for the shared components instead of a dozen tiny ones:
        // fewer requests on first load. The lazy parts keep their own chunks.
        codeSplitting: {
          groups: [{ name: (id) => (SHARED.test(id) && !LAZY.test(id) ? "ui" : null) }],
        },
      },
    },
  },
});
