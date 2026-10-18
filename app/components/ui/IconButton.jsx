import { cx } from "../../lib/format.js";

/**
 * 44 × 44 square button holding one icon. "photo" is translucent, for use
 * on top of photographs; "surface" sits on the page.
 * @param {object} props
 * @param {string} props.label  Accessible name (the icon is decorative)
 * @param {import("react").ReactNode} props.children  The icon
 * @param {"photo" | "surface"} [props.tone]
 * @param {string} [props.className]
 * @param {() => void} [props.onClick]
 */
export function IconButton({ label, children, tone = "photo", className, ...rest }) {
  return (
    <button
      type="button"
      aria-label={label}
      className={cx(
        "grid size-11 shrink-0 place-items-center rounded-inner transition-[background-color,transform] duration-(--dur-fast) ease-out active:scale-96",
        tone === "photo"
          ? "bg-on-photo-glass text-on-photo backdrop-blur-md hover:bg-on-photo-glass-strong"
          : "border border-line-strong bg-surface text-ink hover:bg-surface-2",
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  );
}
