import { Fragment } from "react";

import { cx } from "../../lib/format.js";
import { AppLink } from "../ui/AppLink.jsx";

/**
 * @typedef {object} Crumb
 * @property {string} label
 * @property {string} [href]
 */

/**
 * A page's opening: a mono breadcrumb or label, the huge display title, and
 * an optional mono meta line and extra content (chips, intro).
 * @param {object} props
 * @param {string} props.title
 * @param {Crumb[]} [props.crumbs]  Shown as TRAVEL / INDIA / KERALA
 * @param {string} [props.label]  A plain mono label instead of crumbs
 * @param {import("react").ReactNode} [props.meta]
 * @param {"xl" | "l"} [props.size]
 * @param {import("react").ReactNode} [props.children]
 * @param {string} [props.className]
 */
export function PageHeader({ title, crumbs, label, meta, size = "xl", children, className }) {
  return (
    <header className={cx("flex flex-col gap-5", className)}>
      {crumbs && (
        <nav aria-label="Breadcrumb">
          <ol className="mono-label flex flex-wrap items-center gap-2 text-ink-muted">
            {crumbs.map((crumb, i) => (
              <Fragment key={crumb.label}>
                {i > 0 && (
                  <li aria-hidden="true" className="opacity-60">
                    /
                  </li>
                )}
                <li>
                  {crumb.href ? (
                    <AppLink to={crumb.href} className="ghost-link hover:text-ink">
                      {crumb.label}
                    </AppLink>
                  ) : (
                    <span aria-current="page" className="text-ink">
                      {crumb.label}
                    </span>
                  )}
                </li>
              </Fragment>
            ))}
          </ol>
        </nav>
      )}
      {label && <p className="mono-label text-ink-muted">{label}</p>}
      <h1 className={cx("font-display", size === "xl" ? "text-display-xl" : "text-display-l")}>
        {title}
      </h1>
      {meta && (
        <div className="mono-label flex flex-wrap items-center gap-x-3 gap-y-2 text-ink-muted">
          {meta}
        </div>
      )}
      {children}
    </header>
  );
}
