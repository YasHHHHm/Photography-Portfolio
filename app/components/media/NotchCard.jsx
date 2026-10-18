import { useViewTransitionState } from "react-router";

import { cx } from "../../lib/format.js";
import { AppLink } from "../ui/AppLink.jsx";
import { Photo } from "./Photo.jsx";

/**
 * A photo card with its title in a tab cut out of the top-left corner (the
 * site's signature shape). On hover or focus the photo eases to 1.03 and a
 * scrim reveals the meta line; touch screens show the meta all the time.
 *
 * With `morph`, the photo becomes the destination page's cover during the
 * page transition (the page's cover uses view-transition-name "trip-cover").
 *
 * @param {object} props
 * @param {import("../../lib/photo-url.js").PhotoRecord} props.photo
 * @param {string} props.title
 * @param {string} props.href
 * @param {string} props.sizes
 * @param {string} [props.meta]  Mono line shown over the photo, e.g. dates
 * @param {string} [props.aspect]  CSS aspect ratio of the card, default 3 / 4
 * @param {boolean} [props.priority]
 * @param {boolean} [props.morph]
 * @param {string} [props.className]
 */
export function NotchCard({
  photo,
  title,
  href,
  sizes,
  meta,
  aspect = "3 / 4",
  priority = false,
  morph = false,
  className,
}) {
  const transitioning = useViewTransitionState(href);

  return (
    <AppLink to={href} className={cx("group relative block", className)}>
      {/* The photo clips to the card's rounded shape; the notch sits above
          it, unclipped, so the cut-out edges stay crisp. */}
      <span className="relative isolate block overflow-hidden rounded-card">
        <Photo
          photo={photo}
          sizes={sizes}
          priority={priority}
          alt=""
          className="h-full w-full object-cover transition-transform duration-(--dur-slow) ease-out group-hover:scale-103 group-focus-visible:scale-103"
          style={{
            aspectRatio: aspect,
            viewTransitionName: morph && transitioning ? "trip-cover" : undefined,
          }}
        />
        {meta && (
          <span className="mono-label absolute inset-x-0 bottom-0 bg-linear-to-t from-scrim to-transparent px-4 pt-12 pb-4 text-on-photo opacity-0 transition-opacity duration-(--dur-base) ease-out group-hover:opacity-100 group-focus-visible:opacity-100 pointer-coarse:opacity-100">
            {meta}
          </span>
        )}
      </span>
      <span className="notch notch-tl max-w-[75%] truncate px-4 pt-3 pb-2.5 text-body-s font-medium">
        {title}
      </span>
    </AppLink>
  );
}
