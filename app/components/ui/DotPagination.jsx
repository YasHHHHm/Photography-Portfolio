import { cx } from "../../lib/format.js";

/**
 * Slide pagination for the carousel and lightbox: a pill of dots where the
 * active dot stretches into a short bar.
 * @param {object} props
 * @param {number} props.count
 * @param {number} props.index  The active slide
 * @param {(index: number) => void} props.onSelect
 * @param {string} [props.label]  What one item is called, e.g. "slide"
 * @param {string} [props.className]
 */
export function DotPagination({ count, index, onSelect, label = "slide", className }) {
  return (
    <div
      role="group"
      aria-label={`Choose a ${label}`}
      className={cx(
        "inline-flex items-center rounded-pill bg-on-photo-glass px-1.5 backdrop-blur-md",
        className,
      )}
    >
      {Array.from({ length: count }, (_, i) => (
        <button
          key={i}
          type="button"
          aria-label={`Show ${label} ${i + 1} of ${count}`}
          aria-current={i === index ? "true" : undefined}
          onClick={() => onSelect(i)}
          className="grid size-7 place-items-center"
        >
          <span
            className={cx(
              "block size-1.5 rounded-pill bg-on-photo transition-[transform,opacity] duration-(--dur-base) ease-out",
              i === index ? "scale-x-[calc(20/6)] opacity-100" : "opacity-50",
            )}
          />
        </button>
      ))}
    </div>
  );
}
