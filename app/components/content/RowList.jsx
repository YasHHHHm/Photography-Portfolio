import { ArrowRight } from "lucide-react";

import { pad2 } from "../../lib/format.js";
import { Photo } from "../media/Photo.jsx";
import { PreviewList } from "../media/PreviewList.jsx";
import { AppLink } from "../ui/AppLink.jsx";

/**
 * @typedef {object} RowItem
 * @property {string} href
 * @property {string} title
 * @property {string} [sub]  A muted line under the title, e.g. the places
 * @property {string} meta  Mono text on the right, e.g. "2 trips · 2025–2026"
 * @property {import("../../lib/photo-url.js").PhotoRecord} photo  For the preview
 */

/**
 * Full-width rows separated by thin rules (Travel and Book pages): a mono
 * index, the title in display type, mono meta and an arrow. The whole row is
 * one link.
 *
 * With a mouse, the row's photo follows the cursor and the other rows dim;
 * with the keyboard, it is pinned at the focused row's right edge; on touch
 * screens each row shows a small thumbnail instead.
 *
 * @param {object} props
 * @param {RowItem[]} props.items
 * @param {string} [props.label]  Accessible name for the list
 */
export function RowList({ items, label }) {
  return (
    <PreviewList photos={items.map((item) => item.photo)}>
      <ul aria-label={label} className="row-list border-t border-line">
        {items.map((item, i) => (
          <li key={item.href}>
            <AppLink
              to={item.href}
              data-preview-index={i}
              className="row group flex items-center gap-4 border-b border-line py-5 transition-opacity duration-(--dur-base) ease-out md:gap-8 md:py-7"
            >
              <Photo
                photo={item.photo}
                alt=""
                sizes="72px"
                pictureClassName="hidden shrink-0 pointer-coarse:block"
                className="aspect-square! size-18 rounded-inner object-cover"
              />
              <span className="mono-label w-6 shrink-0 text-ink-muted pointer-coarse:hidden">
                {pad2(i + 1)}
              </span>
              <span className="flex min-w-0 flex-1 flex-col gap-1">
                <span className="truncate font-display text-display-l">{item.title}</span>
                {item.sub && (
                  <span className="truncate text-body-s text-ink-muted">{item.sub}</span>
                )}
                <span className="mono-label text-ink-muted sm:hidden">{item.meta}</span>
              </span>
              <span className="mono-label hidden shrink-0 text-ink-muted sm:block">
                {item.meta}
              </span>
              <ArrowRight
                aria-hidden="true"
                size={20}
                strokeWidth={1.5}
                className="shrink-0 transition-transform duration-(--dur-base) ease-out group-hover:translate-x-1"
              />
            </AppLink>
          </li>
        ))}
      </ul>
    </PreviewList>
  );
}
