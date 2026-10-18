import { cx, labelText } from "../../lib/format.js";
import { AppLink } from "./AppLink.jsx";

/**
 * The universal trip label (`KERALA 2026`): a mono chip that is always a
 * link, at least 32 px tall.
 * @param {object} props
 * @param {string} props.label  The trip folder name, e.g. "kerala-2026"
 * @param {string} props.href  Where it leads (the trip, or the blog filter)
 * @param {boolean} [props.active]  The current filter
 * @param {"page" | "photo"} [props.tone]  "photo" when it sits on an image
 * @param {string} [props.children]  Text to show instead of the label
 * @param {string} [props.className]
 */
export function LabelChip({ label, href, active = false, tone = "page", children, className }) {
  return (
    <AppLink
      to={href}
      aria-current={active ? "page" : undefined}
      className={cx(
        "mono-label inline-flex min-h-8 items-center rounded-chip border px-2.5 whitespace-nowrap transition-colors duration-(--dur-fast) ease-out",
        tone === "photo" && "border-on-photo-glass-strong text-on-photo hover:bg-on-photo-glass",
        tone === "page" && active && "border-ink bg-ink text-bg",
        tone === "page" && !active && "border-line-strong hover:bg-surface-2",
        className,
      )}
    >
      {children ?? labelText(label)}
    </AppLink>
  );
}
