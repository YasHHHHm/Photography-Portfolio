import { ArrowLeft, ArrowRight } from "lucide-react";

import { cx, pad2 } from "../../lib/format.js";
import { AppLink } from "./AppLink.jsx";

/**
 * Page numbers to show, with "…" for gaps: 1 … 4 5 6 … 12.
 * @param {number} page
 * @param {number} total
 * @returns {(number | "gap")[]}
 */
export function pageItems(page, total) {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const keep = new Set([1, total, page - 1, page, page + 1]);
  if (page <= 3) [2, 3, 4].forEach((n) => keep.add(n));
  if (page >= total - 2) [total - 3, total - 2, total - 1].forEach((n) => keep.add(n));
  const pages = [...keep].filter((n) => n >= 1 && n <= total).sort((a, b) => a - b);
  /** @type {(number | "gap")[]} */
  const items = [];
  pages.forEach((n, i) => {
    if (i > 0 && n - pages[i - 1] > 1) items.push("gap");
    items.push(n);
  });
  return items;
}

const CHIP =
  "mono-label inline-flex size-10 items-center justify-center rounded-chip border transition-colors duration-(--dur-fast) ease-out";

/**
 * Page pagination for lists: ← 01 02 03 … 12 →. Zero-padded mono numerals
 * in square chips; the current page is filled.
 * @param {object} props
 * @param {number} props.page
 * @param {number} props.totalPages
 * @param {(page: number) => string} props.hrefFor
 * @param {string} [props.className]
 */
export function Pagination({ page, totalPages, hrefFor, className }) {
  if (totalPages <= 1) return null;

  return (
    <nav aria-label="Pagination" className={cx("flex items-center gap-2", className)}>
      <Arrow href={page > 1 ? hrefFor(page - 1) : null} label="Previous page">
        <ArrowLeft aria-hidden="true" size={16} strokeWidth={1.75} />
      </Arrow>
      <ol className="flex items-center gap-2">
        {pageItems(page, totalPages).map((item, i) =>
          item === "gap" ? (
            <li
              key={`gap-${i}`}
              aria-hidden="true"
              className="mono-label w-6 text-center text-ink-muted"
            >
              …
            </li>
          ) : (
            <li key={item}>
              <AppLink
                to={hrefFor(item)}
                aria-label={`Page ${item}`}
                aria-current={item === page ? "page" : undefined}
                className={cx(
                  CHIP,
                  item === page
                    ? "border-ink bg-ink text-bg"
                    : "border-line-strong hover:bg-surface-2",
                )}
              >
                {pad2(item)}
              </AppLink>
            </li>
          ),
        )}
      </ol>
      <Arrow href={page < totalPages ? hrefFor(page + 1) : null} label="Next page">
        <ArrowRight aria-hidden="true" size={16} strokeWidth={1.75} />
      </Arrow>
    </nav>
  );
}

/**
 * Previous or next arrow; drawn at 30% opacity when there is nowhere to go.
 * @param {{ href: string | null, label: string, children: import("react").ReactNode }} props
 */
function Arrow({ href, label, children }) {
  return href ? (
    <AppLink
      to={href}
      aria-label={label}
      className={cx(CHIP, "border-line-strong hover:bg-surface-2")}
    >
      {children}
    </AppLink>
  ) : (
    <span aria-hidden="true" className={cx(CHIP, "border-line-strong opacity-30")}>
      {children}
    </span>
  );
}
