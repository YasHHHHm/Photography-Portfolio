import { Link, NavLink } from "react-router";

/**
 * Internal link. Starts loading the next page's code and data on hover or
 * focus, and animates the change with a view transition where supported.
 * @param {import("react-router").LinkProps} props
 */
export function AppLink(props) {
  return <Link prefetch="intent" viewTransition {...props} />;
}

/**
 * Internal link that knows whether it points at the current section.
 * @param {import("react-router").NavLinkProps} props
 */
export function AppNavLink(props) {
  return <NavLink prefetch="intent" viewTransition {...props} />;
}
