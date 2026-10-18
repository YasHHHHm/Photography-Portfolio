import { lazy, Suspense, useEffect, useState } from "react";

import { Button } from "../ui/Button.jsx";
import { Photo } from "./Photo.jsx";

const loadLightbox = () => import("./Lightbox.jsx");
const Lightbox = lazy(loadLightbox);

/** Rows wider than this many photos show a "Show all" button. */
const FIRST_BATCH = 36;
/** Off-screen rows skip rendering work until they come near the viewport. */
const RENDER_EAGERLY = 12;

/**
 * `sizes` for a gallery photo: its row height times its aspect ratio, plus
 * room for the row stretching to fill the width.
 * @param {number} aspect
 */
const sizesFor = (aspect) =>
  `(min-width: 1024px) ${Math.round(aspect * 280 * 1.3)}px, ${Math.round(aspect * 180 * 1.3)}px`;

/** The photo name in a `#p=backwaters-01` link, if any. */
function hashPhoto() {
  const match = /^#p=([\w-]+)$/.exec(window.location.hash);
  return match ? match[1] : null;
}

/**
 * The trip gallery: justified rows built with flexbox alone, so it works in
 * the pre-rendered HTML and never shifts. Each photo grows in proportion to
 * its aspect ratio, so every photo in a row ends up the same height; a
 * hidden filler stops the last row stretching. Each photo opens the
 * lightbox; `#p=<photo>` links open it on load.
 *
 * @param {object} props
 * @param {import("../../lib/photo-url.js").PhotoRecord[]} props.photos
 * @param {{ title: string, label: string, href: string }} props.trip
 */
export function JustifiedGallery({ photos, trip }) {
  const [showAll, setShowAll] = useState(false);
  const [lightbox, setLightbox] = useState({ mounted: false, index: /** @type {number | null} */ (null) });
  const visible = showAll ? photos : photos.slice(0, FIRST_BATCH);

  /** @param {number} index */
  const openAt = (index) => {
    if (index >= FIRST_BATCH) setShowAll(true);
    setLightbox({ mounted: true, index });
  };

  // A shared link such as /travel/india/kerala-2026#p=backwaters-01.
  useEffect(() => {
    const name = hashPhoto();
    if (!name) return;
    const index = photos.findIndex((p) => p.id.endsWith(`/${name}`));
    if (index >= 0) queueMicrotask(() => openAt(index));
    // Runs once on arrival; later hash changes come from the lightbox itself.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="flex flex-col items-center gap-8" onPointerEnter={loadLightbox} onFocus={loadLightbox}>
      <ul className="flex w-full flex-wrap gap-2">
        {visible.map((photo, i) => (
          <li
            key={photo.id}
            style={{
              flex: `${photo.aspect} 1 calc(${photo.aspect} * var(--row-h))`,
              ...(i >= RENDER_EAGERLY && {
                contentVisibility: "auto",
                containIntrinsicSize: "auto var(--row-h)",
              }),
            }}
          >
            <button
              type="button"
              onClick={() => openAt(i)}
              aria-label={`Open photo ${i + 1} of ${photos.length}: ${photo.alt}`}
              className="group block w-full overflow-hidden rounded-inner"
            >
              <Photo
                photo={photo}
                alt=""
                sizes={sizesFor(photo.aspect)}
                className="w-full object-cover transition-transform duration-(--dur-slow) ease-out group-hover:scale-103"
              />
            </button>
          </li>
        ))}
        <li aria-hidden="true" className="h-0" style={{ flex: "1000000 1 0px" }} />
      </ul>

      {!showAll && photos.length > FIRST_BATCH && (
        <Button variant="secondary" onClick={() => setShowAll(true)}>
          {`Show all ${photos.length} photos`}
        </Button>
      )}

      {lightbox.mounted && (
        <Suspense fallback={null}>
          <Lightbox
            photos={photos}
            index={lightbox.index}
            trip={trip}
            onIndex={(index) => setLightbox({ mounted: true, index })}
            onClose={() => setLightbox((l) => ({ ...l, index: null }))}
          />
        </Suspense>
      )}
    </div>
  );
}
