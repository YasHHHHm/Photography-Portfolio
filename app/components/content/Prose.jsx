import { cx } from "../../lib/format.js";

/**
 * Long text rendered from Markdown at build time (stories, posts, the About
 * bio). Photos inside it are already responsive <picture> elements.
 * @param {{ html: string, className?: string }} props
 */
export function Prose({ html, className }) {
  if (!html) return null;
  return (
    <div className={cx("prose prose-site", className)} dangerouslySetInnerHTML={{ __html: html }} />
  );
}
