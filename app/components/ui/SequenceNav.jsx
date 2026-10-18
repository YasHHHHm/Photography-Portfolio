import { ArrowLeft, ArrowRight } from "lucide-react";

import { cx } from "../../lib/format.js";
import { Photo } from "../media/Photo.jsx";
import { AppLink } from "./AppLink.jsx";

/**
 * @typedef {object} SequenceItem
 * @property {string} href
 * @property {string} title
 * @property {import("../../lib/photo-url.js").PhotoRecord} photo
 * @property {string} [meta]
 */

/**
 * "Previous" and "Next" cards at the end of a trip or post: thumbnail, mono
 * label and title.
 * @param {object} props
 * @param {SequenceItem | null} props.prev
 * @param {SequenceItem | null} props.next
 * @param {string} props.noun  "trip" or "story"
 * @param {string} [props.className]
 */
export function SequenceNav({ prev, next, noun, className }) {
  if (!prev && !next) return null;
  return (
    <nav aria-label={`More ${noun}s`} className={cx("grid gap-3 sm:grid-cols-2", className)}>
      {prev ? (
        <SequenceCard item={prev} direction="prev" noun={noun} />
      ) : (
        <span className="hidden sm:block" />
      )}
      {next && <SequenceCard item={next} direction="next" noun={noun} />}
    </nav>
  );
}

/**
 * @param {{ item: SequenceItem, direction: "prev" | "next", noun: string }} props
 */
function SequenceCard({ item, direction, noun }) {
  const Icon = direction === "prev" ? ArrowLeft : ArrowRight;
  return (
    <AppLink
      to={item.href}
      className={cx(
        "group flex items-center gap-4 rounded-card bg-surface p-3 transition-colors duration-(--dur-fast) ease-out hover:bg-surface-2",
        direction === "next" && "sm:flex-row-reverse sm:text-right",
      )}
    >
      <Photo
        photo={item.photo}
        alt=""
        sizes="96px"
        className="aspect-square! size-20 shrink-0 rounded-inner object-cover sm:size-24"
      />
      <span className="flex min-w-0 flex-col gap-2">
        <span
          className={cx(
            "mono-label flex items-center gap-1.5 text-ink-muted",
            direction === "next" && "sm:justify-end",
          )}
        >
          <Icon aria-hidden="true" size={14} strokeWidth={1.75} />
          {direction === "prev" ? `Previous ${noun}` : `Next ${noun}`}
        </span>
        <span className="truncate font-subhead text-h2">{item.title}</span>
        {item.meta && <span className="mono-label text-ink-muted">{item.meta}</span>}
      </span>
    </AppLink>
  );
}
