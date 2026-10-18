import { useLayoutEffect, useRef } from "react";
import { preload } from "react-dom";

import { avifSrcSet, fallbackUrl, photoUrl } from "../../lib/photo-url.js";

/**
 * Every image on the site renders through this component.
 *
 * - The box is reserved from the photo's known size, so nothing jumps.
 * - A blurred preview in the photo's own colours sits underneath, so no frame
 *   is ever black or empty.
 * - Lazy images fade in once decoded. The priority image never fades, because
 *   an invisible image delays Largest Contentful Paint, and it is preloaded
 *   from the pre-rendered <head> so it starts downloading immediately.
 *
 * @param {object} props
 * @param {import("../../lib/photo-url.js").PhotoRecord} props.photo
 * @param {string} props.sizes  Required: the image's rendered width per layout,
 *   e.g. "(min-width: 1024px) 50vw, 100vw".
 * @param {string} [props.alt]  Overrides the photo's alt text ("" for decorative)
 * @param {boolean} [props.priority]  The one image per page that is the LCP
 * @param {boolean} [props.eager]  Load right away but without high priority
 *   (images above the fold that are not the LCP)
 * @param {string} [props.className]  Classes for the <img>
 * @param {string} [props.pictureClassName]  Classes for the <picture>
 * @param {import("react").CSSProperties} [props.style]  Extra styles for the <img>
 */
export function Photo({
  photo,
  sizes,
  alt,
  priority = false,
  eager = false,
  className,
  pictureClassName,
  style,
}) {
  /** @type {import("react").RefObject<HTMLImageElement | null>} */
  const ref = useRef(null);

  if (import.meta.env.DEV && !sizes) {
    console.error(`<Photo> for "${photo.id}" needs a sizes prop.`);
  }
  if (priority) {
    preload(photoUrl(photo, photo.widths[0]), {
      as: "image",
      type: "image/avif",
      imageSrcSet: avifSrcSet(photo),
      imageSizes: sizes,
      fetchPriority: "high",
    });
  }

  useLayoutEffect(() => {
    const img = ref.current;
    if (!img || priority || img.complete) return;
    img.dataset.state = "loading";
    const reveal = () => {
      img
        .decode()
        .catch(() => {})
        .finally(() => {
          img.dataset.state = "loaded";
        });
    };
    img.addEventListener("load", reveal, { once: true });
    img.addEventListener("error", reveal, { once: true });
    return () => {
      img.removeEventListener("load", reveal);
      img.removeEventListener("error", reveal);
    };
  }, [photo.id, priority]);

  return (
    <picture className={pictureClassName}>
      <source type="image/avif" srcSet={avifSrcSet(photo)} sizes={sizes} />
      <img
        ref={ref}
        src={fallbackUrl(photo)}
        width={photo.width}
        height={photo.height}
        alt={alt ?? photo.alt ?? ""}
        loading={priority || eager ? "eager" : "lazy"}
        fetchPriority={priority ? "high" : undefined}
        decoding={priority ? "sync" : "async"}
        className={className}
        style={{
          aspectRatio: photo.aspect,
          background: `${photo.color} url(${photo.lqip}) center / cover`,
          ...style,
        }}
      />
    </picture>
  );
}
