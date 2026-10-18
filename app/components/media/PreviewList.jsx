import { lazy, Suspense, useRef, useState } from "react";

const loadPreview = () => import("./HoverPreview.jsx");
const HoverPreview = lazy(loadPreview);

/**
 * Wraps a list of links whose items carry `data-preview-index`. The
 * cursor-follow preview (Motion) is loaded only when a mouse first enters
 * the list or a row gets keyboard focus, so it costs nothing on first load
 * and nothing at all on touch screens.
 *
 * @param {object} props
 * @param {import("../../lib/photo-url.js").PhotoRecord[]} props.photos  One per row, in order
 * @param {import("react").ReactNode} props.children
 */
export function PreviewList({ photos, children }) {
  /** @type {import("react").RefObject<HTMLDivElement | null>} */
  const ref = useRef(null);
  const [armed, setArmed] = useState(false);

  return (
    <div
      ref={ref}
      onPointerEnter={(e) => {
        if (e.pointerType === "mouse" && matchMedia("(pointer: fine)").matches) setArmed(true);
      }}
      onFocus={() => setArmed(true)}
    >
      {children}
      {armed && (
        <Suspense fallback={null}>
          <HoverPreview containerRef={ref} photos={photos} />
        </Suspense>
      )}
    </div>
  );
}
