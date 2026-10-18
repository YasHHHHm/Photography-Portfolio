import { useEffect, useRef } from "react";

import { cx } from "../../lib/format.js";

/**
 * Fades a section in and lifts it 12 px when it scrolls into view, once.
 *
 * Plain CSS and an IntersectionObserver (no Motion), and it never hides
 * anything that is already on screen when the page loads, so it cannot delay
 * the first paint. Pre-rendered HTML is fully visible; sections below the
 * fold are hidden only after the page has hydrated, before they are seen.
 * Does nothing for visitors who prefer reduced motion. Revealed sections are
 * also rendered lazily (`defer-render`), as they sit below the fold.
 *
 * @param {object} props
 * @param {import("react").ElementType} [props.as]
 * @param {import("react").ReactNode} props.children
 * @param {string} [props.className]
 * @param {string} [props.id]
 */
export function Reveal({ as: Tag = "div", children, className, ...rest }) {
  /** @type {import("react").RefObject<HTMLElement | null>} */
  const ref = useRef(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || !("IntersectionObserver" in window)) return;
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (el.getBoundingClientRect().top < window.innerHeight) return;

    el.dataset.reveal = "hidden";
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        el.dataset.reveal = "shown";
        observer.disconnect();
      },
      { rootMargin: "0px 0px -15% 0px" },
    );
    observer.observe(el);
    return () => {
      observer.disconnect();
      delete el.dataset.reveal;
    };
  }, []);

  return (
    <Tag ref={ref} className={cx("defer-render", className)} {...rest}>
      {children}
    </Tag>
  );
}
