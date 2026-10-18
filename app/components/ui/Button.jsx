import { ArrowRight } from "lucide-react";

import { cx } from "../../lib/format.js";
import { AppLink } from "./AppLink.jsx";
import { Roll } from "./Roll.jsx";

/**
 * Pill button. Primary is the one high-contrast action per view; secondary
 * sits on the surface colour. The label rolls on hover; the arrow nudges.
 *
 * Renders a link when `href` is set (internal paths start with "/"),
 * otherwise a <button>.
 *
 * @param {object} props
 * @param {string} props.children  The label (plain text, so it can roll)
 * @param {"primary" | "secondary"} [props.variant]
 * @param {string} [props.href]
 * @param {string} [props.altLabel]  Text that rolls in, e.g. "Sending…"
 * @param {boolean} [props.rolled]  Keep showing altLabel
 * @param {boolean} [props.arrow]  Show a trailing arrow
 * @param {import("react").ReactNode} [props.icon]  A leading icon
 * @param {string} [props.className]
 * @param {"button" | "submit"} [props.type]
 * @param {boolean} [props.disabled]
 * @param {() => void} [props.onClick]
 * @param {string} [props.rel]
 */
export function Button({
  children,
  variant = "primary",
  href,
  altLabel,
  rolled = false,
  arrow = false,
  icon,
  className,
  type = "button",
  ...rest
}) {
  const classes = cx(
    "btn roll-host",
    variant === "primary" ? "btn-primary" : "btn-secondary",
    className,
  );
  const body = (
    <>
      {icon}
      <Roll label={children} alt={altLabel} rolled={rolled} />
      {arrow && (
        <ArrowRight aria-hidden="true" size={16} strokeWidth={1.75} className="btn-arrow" />
      )}
    </>
  );

  if (href?.startsWith("/")) {
    return (
      <AppLink to={href} className={classes} {...rest}>
        {body}
      </AppLink>
    );
  }
  if (href) {
    return (
      <a href={href} className={classes} {...rest}>
        {body}
      </a>
    );
  }
  return (
    <button type={type} className={classes} {...rest}>
      {body}
    </button>
  );
}
