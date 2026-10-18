import { AnimatePresence, m, useSpring } from "motion/react";
import { useEffect, useRef, useState } from "react";

import { dur, ease, previewSpring } from "../../lib/motion.js";
import { avifSrcSet } from "../../lib/photo-url.js";
import { MotionProvider } from "../motion/MotionProvider.jsx";
import { Photo } from "./Photo.jsx";

const WIDTH = 320;
const HEIGHT = 400;
const SIZES = `${WIDTH}px`;
const OFFSET = 32;
const EDGE = 16;

/** @type {Map<string, Promise<void>>} */
const decoded = new Map();

/**
 * Fetches and decodes a photo at the preview's size, once. The <Photo> that
 * shows it afterwards picks the same file from the same srcset and sizes.
 * @param {import("../../lib/photo-url.js").PhotoRecord} photo
 */
function decodePhoto(photo) {
  let ready = decoded.get(photo.id);
  if (!ready) {
    const img = new Image();
    img.sizes = SIZES;
    img.srcset = avifSrcSet(photo);
    ready = img.decode().catch(() => undefined);
    decoded.set(photo.id, ready);
  }
  return ready;
}

/**
 * The cursor-follow preview for a row list (loaded on first use). A 320 × 400
 * card trails the pointer on a spring (transform only), opens with a
 * clip-path reveal once its photo has decoded, and crossfades between rows.
 * On keyboard focus it sits pinned at the row's right edge.
 *
 * @param {object} props
 * @param {import("react").RefObject<HTMLElement | null>} props.containerRef
 * @param {import("../../lib/photo-url.js").PhotoRecord[]} props.photos
 */
export default function HoverPreview({ containerRef, photos }) {
  const [shown, setShown] = useState(/** @type {number | null} */ (null));
  const wanted = useRef(/** @type {number | null} */ (null));
  const placed = useRef(false);
  const x = useSpring(0, previewSpring);
  const y = useSpring(0, previewSpring);

  useEffect(() => {
    const root = containerRef.current;
    if (!root) return;

    /** @param {EventTarget | null} target */
    const rowOf = (target) =>
      target instanceof Element ? /** @type {HTMLElement | null} */ (target.closest("[data-preview-index]")) : null;

    /** @param {number} index */
    const show = (index) => {
      if (wanted.current === index) return;
      wanted.current = index;
      decodePhoto(photos[index]).then(() => {
        if (wanted.current === index) setShown(index);
      });
    };
    const hide = () => {
      wanted.current = null;
      placed.current = false;
      setShown(null);
    };

    /** @param {number} left @param {number} top @param {boolean} jump */
    const place = (left, top, jump) => {
      const tx = Math.max(EDGE, Math.min(left, window.innerWidth - WIDTH - EDGE));
      const ty = Math.max(EDGE, Math.min(top, window.innerHeight - HEIGHT - EDGE));
      if (jump || !placed.current) {
        x.jump(tx);
        y.jump(ty);
        placed.current = true;
      } else {
        x.set(tx);
        y.set(ty);
      }
    };

    /** @param {PointerEvent} e */
    const onMove = (e) => {
      if (e.pointerType !== "mouse") return;
      const row = rowOf(e.target);
      if (!row) return hide();
      place(e.clientX + OFFSET, e.clientY - HEIGHT / 2, false);
      show(Number(row.dataset.previewIndex));
    };

    /** @param {FocusEvent} e */
    const onFocusIn = (e) => {
      const row = rowOf(e.target);
      if (!row || !row.matches(":focus-visible")) return;
      const box = row.getBoundingClientRect();
      place(box.right - WIDTH - 64, box.top + box.height / 2 - HEIGHT / 2, true);
      show(Number(row.dataset.previewIndex));
    };

    /** @param {FocusEvent} e */
    const onFocusOut = (e) => {
      if (!root.contains(/** @type {Node | null} */ (e.relatedTarget))) hide();
    };

    root.addEventListener("pointermove", onMove);
    root.addEventListener("pointerleave", hide);
    root.addEventListener("focusin", onFocusIn);
    root.addEventListener("focusout", onFocusOut);
    window.addEventListener("scroll", hide, { passive: true });
    return () => {
      root.removeEventListener("pointermove", onMove);
      root.removeEventListener("pointerleave", hide);
      root.removeEventListener("focusin", onFocusIn);
      root.removeEventListener("focusout", onFocusOut);
      window.removeEventListener("scroll", hide);
    };
  }, [containerRef, photos, x, y]);

  return (
    <MotionProvider>
      <m.div
        aria-hidden="true"
        className="pointer-events-none fixed top-0 left-0 z-30 overflow-hidden rounded-inner bg-surface-2"
        style={{ x, y, width: WIDTH, height: HEIGHT }}
        initial={false}
        animate={{ clipPath: shown === null ? "inset(100% 0% 0% 0%)" : "inset(0% 0% 0% 0%)" }}
        transition={{ duration: shown === null ? dur.base : dur.slow, ease: ease.out }}
      >
        <AnimatePresence initial={false}>
          {shown !== null && (
            <m.div
              key={shown}
              className="absolute inset-0"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: dur.base, ease: ease.out }}
            >
              <Photo photo={photos[shown]} alt="" sizes={SIZES} eager className="h-full w-full object-cover" />
            </m.div>
          )}
        </AnimatePresence>
      </m.div>
    </MotionProvider>
  );
}
