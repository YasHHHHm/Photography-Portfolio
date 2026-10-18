import { cx, plural } from "../../lib/format.js";
import { Photo } from "../media/Photo.jsx";
import { AppLink } from "../ui/AppLink.jsx";

/**
 * @typedef {object} BookSummary
 * @property {string} slug
 * @property {string} title
 * @property {string} href
 * @property {import("../../lib/photo-url.js").PhotoRecord} cover
 * @property {number} tripCount
 * @property {number} photoCount
 * @property {[number, number]} years
 */

/**
 * A book on the Home page: cover photo, a scrim, the title in the display
 * serif and mono counts. The title shrinks until a word of `wordChars`
 * letters fits the card's width.
 * @param {{ book: BookSummary, sizes: string, wordChars: number, className?: string }} props
 */
export function BookCard({ book, sizes, wordChars, className }) {
  return (
    <AppLink
      to={book.href}
      className={cx("group relative isolate block overflow-hidden rounded-card", className)}
    >
      <Photo
        photo={book.cover}
        alt=""
        sizes={sizes}
        className="aspect-4/3! w-full object-cover transition-transform duration-(--dur-slow) ease-out group-hover:scale-103 group-focus-visible:scale-103"
      />
      <span className="@container absolute inset-0 flex flex-col justify-end gap-2 bg-linear-to-t from-scrim via-transparent to-transparent p-5 text-on-photo">
        <span
          className="word-fit font-display text-display-l"
          style={/** @type {any} */ ({ "--word-chars": wordChars })}
        >
          {book.title}
        </span>
        <span className="mono-label">
          {plural(book.tripCount, "trip")} · {plural(book.photoCount, "photo")}
        </span>
      </span>
    </AppLink>
  );
}
