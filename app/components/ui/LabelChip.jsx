import { cx, labelText } from "../../lib/format.js";
import { AppLink } from "./AppLink.jsx";

/**
 * The universal trip label (`KERALA 2026`): a mono chip that is always a
 * link, at least 32 px tall. It never grows wider than its container: a long
 * label ends in an ellipsis.
 * @param {object} props
 * @param {string} props.label  The trip folder name, e.g. "kerala-2026"
 * @param {string} props.href  Where it leads (the trip, or the blog filter)
 * @param {boolean} [props.active]  The current filter
 * @param {"page" | "photo"} [props.tone]  "photo" when it sits on an image
 * @param {string} [props.children]  Text to show instead of the label
 * @param {string} [props.className]
 * @param {() => void} [props.onClick]  Runs before the link is followed
 */
export function LabelChip({
  label,
  href,
  active = false,
  tone = "page",
  children,
  className,
  onClick,
}) {
  return (
    <AppLink
      to={href}
      onClick={onClick}
      aria-current={active ? "page" : undefined}
      className={cx(
        "mono-label inline-flex min-h-8 max-w-full items-center rounded-chip border px-2.5 whitespace-nowrap transition-colors duration-(--dur-fast) ease-out",
        tone === "photo" && "border-on-photo-glass-strong text-on-photo hover:bg-on-photo-glass",
        tone === "page" && active && "border-ink bg-ink text-bg",
        tone === "page" && !active && "border-line-strong hover:bg-surface-2",
        className,
      )}
    >
      <span className="truncate">{children ?? labelText(label)}</span>
    </AppLink>
  );
}
