/**
 * Markdown for stories, posts and the About bio.
 *
 * Photos are written as `![Alt text](kerala-2026/fort-kochi-03.jpg)` or
 * `![Alt text](images/map.jpg)`, with `"wide"` as the title for a full-width
 * photo. Each one is swapped for responsive <picture> markup.
 */
import MarkdownIt from "markdown-it";

import { figureHtml } from "./photo-html.js";

/**
 * @typedef {object} MarkdownEnv
 * @property {string} file  Repo-relative path, for messages
 * @property {(ref: string) => import("../../app/lib/photo-url.js").PhotoRecord | null} resolvePhoto
 * @property {(message: string) => void} warn
 */

/** @param {import("markdown-it").Token | undefined} inline */
function isLoneImage(inline) {
  const children = inline?.children?.filter((t) => !(t.type === "text" && !t.content.trim()));
  return children?.length === 1 && children[0].type === "image";
}

/** @returns {MarkdownIt} */
export function createMarkdown() {
  const md = new MarkdownIt({ html: false, linkify: true, typographer: true });

  // A paragraph holding only a photo becomes a <figure>, not <p><figure>.
  md.renderer.rules.paragraph_open = (tokens, idx, options, env, self) =>
    isLoneImage(tokens[idx + 1]) ? "" : self.renderToken(tokens, idx, options);
  md.renderer.rules.paragraph_close = (tokens, idx, options, env, self) =>
    isLoneImage(tokens[idx - 1]) ? "" : self.renderToken(tokens, idx, options);

  // The page title is the only <h1>, so "# Heading" in Markdown becomes <h2>.
  md.renderer.rules.heading_open = (tokens, idx, options, /** @type {MarkdownEnv} */ env, self) => {
    const token = tokens[idx];
    if (token.tag === "h1") {
      env.warn(
        `Use "## " for headings. The title is already the page's main heading, so "# " is shown as "## ".`,
      );
      token.tag = "h2";
      const close = tokens.slice(idx).find((t) => t.type === "heading_close");
      if (close) close.tag = "h2";
    }
    return self.renderToken(tokens, idx, options);
  };

  md.renderer.rules.image = (tokens, idx, options, /** @type {MarkdownEnv} */ env, self) => {
    const token = tokens[idx];
    const src = token.attrGet("src") ?? "";
    const alt = self.renderInlineAsText(token.children ?? [], options, env).trim();

    if (/^[a-z]+:\/\//i.test(src)) {
      env.warn(
        `The photo "${src}" is a web address. Use a photo from a trip ("kerala-2026/backwaters-01.jpg") or from this post's images/ folder ("images/map.jpg").`,
      );
      return "";
    }
    const photo = env.resolvePhoto(src);
    if (!photo) return "";
    if (!alt)
      env.warn(
        `The photo "${src}" has no alt text. Write it between the square brackets: ![A short description](${src})`,
      );
    return figureHtml(photo, {
      alt: alt || photo.alt || "",
      wide: token.attrGet("title") === "wide",
    });
  };

  // Links to other sites get rel="noopener".
  md.renderer.rules.link_open = (tokens, idx, options, env, self) => {
    const href = tokens[idx].attrGet("href") ?? "";
    if (/^https?:\/\//.test(href)) tokens[idx].attrSet("rel", "noopener");
    return self.renderToken(tokens, idx, options);
  };

  return md;
}

/**
 * Estimated reading time in minutes (220 words a minute, at least 1).
 * @param {string} markdown
 * @returns {number}
 */
export function readingTime(markdown) {
  const words = markdown
    .replace(/!\[[^\]]*\]\([^)]*\)/g, "")
    .split(/\s+/)
    .filter(Boolean).length;
  return Math.max(1, Math.round(words / 220));
}
