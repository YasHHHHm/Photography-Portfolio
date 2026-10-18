import { useEffect, useRef } from "react";

/**
 * A slow, endless line of display type (the footer's top). Pure CSS motion;
 * it pauses while off screen and does not move for reduced-motion visitors.
 * Screen readers get the text once.
 * @param {{ text: string }} props
 */
export function Marquee({ text }) {
  /** @type {import("react").RefObject<HTMLDivElement | null>} */
  const ref = useRef(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || !("IntersectionObserver" in window)) return;
    const observer = new IntersectionObserver(([entry]) => {
      el.toggleAttribute("data-paused", !entry.isIntersecting);
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const half = Array.from({ length: 4 }, (_, i) => (
    <span key={i} className="flex shrink-0 items-center gap-10 pr-10">
      <span className="font-display text-display-l whitespace-nowrap">{text}</span>
      <span className="size-2 rounded-pill bg-ink-muted" />
    </span>
  ));

  return (
    <div ref={ref} className="marquee overflow-hidden py-4" data-paused="">
      <p className="sr-only">{text}</p>
      <div aria-hidden="true" className="marquee-track">
        {half}
        {half}
      </div>
    </div>
  );
}
