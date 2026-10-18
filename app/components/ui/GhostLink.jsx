import { cx } from "../../lib/format.js";
import { AppLink } from "./AppLink.jsx";

/**
 * A text-only link whose underline draws from left to right on hover.
 * @param {object} props
 * @param {string} props.href  Internal paths start with "/"
 * @param {import("react").ReactNode} props.children
 * @param {string} [props.className]
 */
export function GhostLink({ href, children, className, ...rest }) {
  const classes = cx("ghost-link", className);
  if (href.startsWith("/")) {
    return (
      <AppLink to={href} className={classes} {...rest}>
        {children}
      </AppLink>
    );
  }
  return (
    <a target="_blank" rel="noopener noreferrer" href={href} className={classes} {...rest}>
      {children}
    </a>
  );
}
