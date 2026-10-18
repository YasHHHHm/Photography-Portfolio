import { cx } from "../../lib/format.js";
import { GhostLink } from "./GhostLink.jsx";

/**
 * A mono section label with an optional "View all" link, over a thin rule.
 * @param {object} props
 * @param {string} props.title
 * @param {string} [props.href]  Adds the link on the right
 * @param {string} [props.linkLabel]
 * @param {"h2" | "h3"} [props.as]
 * @param {string} [props.id]  For aria-labelledby on the section
 * @param {string} [props.className]
 */
export function SectionHeader({
  title,
  href,
  linkLabel = "View all",
  as: Heading = "h2",
  id,
  className,
}) {
  return (
    <div
      className={cx("flex items-end justify-between gap-4 border-b border-line pb-3", className)}
    >
      <Heading id={id} className="mono-label text-ink-muted">
        {title}
      </Heading>
      {href && (
        <GhostLink href={href} className="mono-label">
          {linkLabel}
        </GhostLink>
      )}
    </div>
  );
}
