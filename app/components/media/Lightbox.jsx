import { ChevronLeft, ChevronRight, Info, X } from "lucide-react";
import { AnimatePresence, m } from "motion/react";
import { useEffect, useRef, useState } from "react";

import { cx, formatDate, pad2 } from "../../lib/format.js";
import { dur, ease } from "../../lib/motion.js";
import { avifSrcSet } from "../../lib/photo-url.js";
import { MotionProvider } from "../motion/MotionProvider.jsx";
import { DotPagination } from "../ui/DotPagination.jsx";
import { IconButton } from "../ui/IconButton.jsx";
import { LabelChip } from "../ui/LabelChip.jsx";
import { Photo } from "./Photo.jsx";

const SIZES = "100vw";
const SWIPE_PX = 40;
/** Show the dot pill only when it stays short; the counter is always there. */
const MAX_DOTS = 12;

/** "kerala-2026/backwaters-01" → "backwaters-01" */
const nameOf = (/** @type {string} */ id) => id.slice(id.lastIndexOf("/") + 1);

/**
 * Camera settings as short mono facts: SONY ILCE-7M4 · 35 MM · F/2.8 …
 * @param {import("../../lib/photo-url.js").PhotoExif | undefined} exif
 */
function exifFacts(exif) {
  if (!exif) return [];
  return [
    exif.camera,
    exif.lens,
    exif.focal && `${exif.focal} mm`,
    exif.aperture && `f/${exif.aperture}`,
    exif.shutter,
    exif.iso && `ISO ${exif.iso}`,
    exif.takenAt && formatDate(exif.takenAt.slice(0, 10)),
  ].filter(Boolean);
}

/**
 * Full-screen photo viewer for a trip (loaded the first time a photo is
 * opened). Built on a modal <dialog>: focus stays inside, Escape closes, and
 * focus returns to the photo that opened it. Arrow keys and swipes move
 * between photos; the URL hash follows along (#p=backwaters-01) so a photo
 * can be shared. The neighbours on each side are fetched ahead of time.
 *
 * @param {object} props
 * @param {import("../../lib/photo-url.js").PhotoRecord[]} props.photos
 * @param {number | null} props.index  The open photo; null while closing
 * @param {{ title: string, label: string, href: string }} props.trip
 * @param {(index: number) => void} props.onIndex
 * @param {() => void} props.onClose
 */
export default function Lightbox({ photos, index, trip, onIndex, onClose }) {
  /** @type {import("react").RefObject<HTMLDialogElement | null>} */
  const dialogRef = useRef(null);
  /** @type {import("react").RefObject<HTMLElement | null>} */
  const returnFocus = useRef(null);
  /** @type {import("react").RefObject<{ x: number, y: number } | null>} */
  const press = useRef(null);
  const [showInfo, setShowInfo] = useState(false);
  const count = photos.length;
  const open = index !== null;
  const photo = open ? photos[index] : null;

  // Open the dialog, and keep the URL hash in step with the photo.
  useEffect(() => {
    const dialog = dialogRef.current;
    if (index === null || !dialog) return;
    if (!dialog.open) {
      returnFocus.current = /** @type {HTMLElement | null} */ (document.activeElement);
      document.documentElement.style.overflow = "hidden";
      dialog.showModal();
    }
    window.history.replaceState(window.history.state, "", `#p=${nameOf(photos[index].id)}`);
  }, [index, photos]);

  // Fetch one neighbour on each side.
  useEffect(() => {
    if (index === null) return;
    for (const step of [-1, 1]) {
      const img = new Image();
      img.sizes = SIZES;
      img.srcset = avifSrcSet(photos[(index + step + count) % count]);
    }
  }, [index, photos, count]);

  // Never leave the page unscrollable if the viewer unmounts while open.
  useEffect(() => () => void (document.documentElement.style.overflow = ""), []);

  const finishClosing = () => {
    dialogRef.current?.close();
    document.documentElement.style.overflow = "";
    window.history.replaceState(window.history.state, "", window.location.pathname + window.location.search);
    if (returnFocus.current?.isConnected) returnFocus.current.focus();
  };

  // Following the trip label (this trip's own page) closes the viewer. The
  // scroll lock is lifted first: WebKit (Safari) crashes the tab when it is
  // lifted during the page transition.
  const follow = () => {
    document.documentElement.style.overflow = "";
    onClose();
  };

  /** @param {number} step */
  const move = (step) => {
    if (index !== null) onIndex((index + step + count) % count);
  };

  const facts = exifFacts(photo?.exif);

  return (
    <MotionProvider>
      <dialog
        ref={dialogRef}
        aria-label={`${trip.title} photos`}
        className="sheet lightbox"
        onCancel={(e) => {
          e.preventDefault();
          onClose();
        }}
        onKeyDown={(e) => {
          if (e.key === "ArrowLeft") move(-1);
          if (e.key === "ArrowRight") move(1);
        }}
      >
        <AnimatePresence onExitComplete={finishClosing}>
          {photo && index !== null && (
            <m.div
              key="viewer"
              className="flex h-full flex-col bg-scrim text-on-photo"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: dur.base, ease: ease.out }}
            >
              <div className="flex items-center justify-between gap-4 p-3 md:p-4">
                <p className="mono-label" aria-live="polite">
                  {pad2(index + 1)} / {pad2(count)}
                </p>
                <div className="flex gap-2">
                  <IconButton
                    label={showInfo ? "Hide photo details" : "Show photo details"}
                    aria-pressed={showInfo}
                    onClick={() => setShowInfo((s) => !s)}
                  >
                    <Info aria-hidden="true" size={18} strokeWidth={1.75} />
                  </IconButton>
                  <IconButton label="Close" onClick={onClose} autoFocus>
                    <X aria-hidden="true" size={20} strokeWidth={1.75} />
                  </IconButton>
                </div>
              </div>

              <div
                className="relative min-h-0 flex-1 touch-pan-y"
                onPointerDown={(e) => {
                  press.current = { x: e.clientX, y: e.clientY };
                }}
                onPointerUp={(e) => {
                  const start = press.current;
                  press.current = null;
                  if (!start || e.pointerType === "mouse") return;
                  const dx = e.clientX - start.x;
                  if (Math.abs(dx) > SWIPE_PX && Math.abs(dx) > Math.abs(e.clientY - start.y)) move(dx < 0 ? 1 : -1);
                }}
              >
                <AnimatePresence initial={false} mode="popLayout">
                  <m.figure
                    key={photo.id}
                    className="absolute inset-0 flex items-center justify-center px-3 md:px-20"
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: dur.base, ease: ease.out }}
                  >
                    <Photo
                      photo={photo}
                      sizes={SIZES}
                      eager
                      pictureClassName="contents"
                      className="h-auto max-h-full w-auto max-w-full rounded-inner object-contain"
                    />
                  </m.figure>
                </AnimatePresence>
                {count > 1 && (
                  <>
                    <IconButton
                      label="Previous photo"
                      className="absolute top-1/2 left-3 hidden -translate-y-1/2 md:grid"
                      onClick={() => move(-1)}
                    >
                      <ChevronLeft aria-hidden="true" size={20} strokeWidth={1.75} />
                    </IconButton>
                    <IconButton
                      label="Next photo"
                      className="absolute top-1/2 right-3 hidden -translate-y-1/2 md:grid"
                      onClick={() => move(1)}
                    >
                      <ChevronRight aria-hidden="true" size={20} strokeWidth={1.75} />
                    </IconButton>
                  </>
                )}
              </div>

              <div className="flex min-h-16 flex-col items-center justify-center gap-3 p-3 text-center md:p-4">
                {photo.caption && !showInfo && <p className="text-body-s">{photo.caption}</p>}
                {showInfo && (
                  <div className="flex max-w-3xl flex-col items-center gap-3">
                    {photo.caption && <p className="text-body-s">{photo.caption}</p>}
                    <LabelChip label={trip.label} href={trip.href} tone="photo" onClick={follow} />
                    {facts.length > 0 && (
                      <ul className="mono-label flex flex-wrap justify-center gap-x-4 gap-y-1">
                        {facts.map((fact) => (
                          <li key={fact}>{fact}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}
                {count > 1 && count <= MAX_DOTS && (
                  <DotPagination count={count} index={index} onSelect={onIndex} label="photo" />
                )}
                {count > MAX_DOTS && (
                  <div className={cx("flex gap-2 md:hidden")}>
                    <IconButton label="Previous photo" onClick={() => move(-1)}>
                      <ChevronLeft aria-hidden="true" size={20} strokeWidth={1.75} />
                    </IconButton>
                    <IconButton label="Next photo" onClick={() => move(1)}>
                      <ChevronRight aria-hidden="true" size={20} strokeWidth={1.75} />
                    </IconButton>
                  </div>
                )}
              </div>
            </m.div>
          )}
        </AnimatePresence>
      </dialog>
    </MotionProvider>
  );
}
