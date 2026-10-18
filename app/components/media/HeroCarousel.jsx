import { ChevronLeft, ChevronRight, Pause, Play } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { HERO_SLIDE_MS } from "../../lib/motion.js";
import { useMediaQuery } from "../../lib/use-media-query.js";
import { Navbar } from "../layout/Navbar.jsx";
import { AppLink } from "../ui/AppLink.jsx";
import { DotPagination } from "../ui/DotPagination.jsx";
import { IconButton } from "../ui/IconButton.jsx";
import { LabelChip } from "../ui/LabelChip.jsx";
import { Photo } from "./Photo.jsx";

const SIZES = "(min-width: 1024px) 50vw, 100vw";
const SWIPE_PX = 40;

/**
 * @typedef {object} HeroSlide
 * @property {import("../../lib/photo-url.js").PhotoRecord} photo
 * @property {{ title: string, label: string, href: string }} trip
 */

/**
 * The Home hero: featured photos crossfading every 6 seconds, with the
 * navbar in a notch at the top-left and the slide's trip in a notch at the
 * bottom-left. CSS does the motion (crossfade and slow zoom); this component
 * only decides which slide is showing.
 *
 * - Slide 1 is the page's priority image. Slide 2 loads once the browser is
 *   idle after load; each later slide loads while the one before it shows.
 * - Autoplay pauses on hover, on keyboard focus inside, when the tab is
 *   hidden and when the hero is off screen, and is off for reduced motion.
 *   A visible pause button stops it for good.
 * - Prev/next buttons, a dot pill, swipe, and arrow keys when focused.
 *   Changes the visitor makes are announced politely; autoplay is silent.
 *
 * @param {object} props
 * @param {HeroSlide[]} props.slides
 * @param {{ name: string, email: string, socials: { label: string, url: string }[] }} props.site
 */
export function HeroCarousel({ slides, site }) {
  const count = slides.length;
  const [index, setIndex] = useState(0);
  const [zoomed, setZoomed] = useState(-1);
  const [visited, setVisited] = useState(() => new Set([0]));
  const [idle, setIdle] = useState(false);
  const [paused, setPaused] = useState(false);
  const [held, setHeld] = useState(false);
  const [inView, setInView] = useState(true);
  const [tabVisible, setTabVisible] = useState(true);
  const [announcement, setAnnouncement] = useState("");
  const reduceMotion = useMediaQuery("(prefers-reduced-motion: reduce)", true);
  /** @type {import("react").RefObject<HTMLElement | null>} */
  const rootRef = useRef(null);
  /** @type {import("react").RefObject<{ x: number, y: number } | null>} */
  const press = useRef(null);

  const playing = count > 1 && !reduceMotion && !paused && !held && inView && tabVisible;
  const current = slides[index];

  /** @param {number} next @param {boolean} byVisitor */
  const go = (next, byVisitor) => {
    const i = (next + count) % count;
    setIndex(i);
    setVisited((prev) => (prev.has(i) ? prev : new Set(prev).add(i)));
    if (byVisitor) setAnnouncement(`Photo ${i + 1} of ${count}: ${slides[i].trip.title}`);
  };

  // Slide 2 starts loading only when the browser is idle after load.
  useEffect(() => {
    let handle = 0;
    const schedule = () => {
      handle = window.requestIdleCallback
        ? window.requestIdleCallback(() => setIdle(true))
        : window.setTimeout(() => setIdle(true), 200);
    };
    if (document.readyState === "complete") schedule();
    else window.addEventListener("load", schedule, { once: true });
    return () => {
      window.removeEventListener("load", schedule);
      if (window.cancelIdleCallback) window.cancelIdleCallback(handle);
      else window.clearTimeout(handle);
    };
  }, []);

  // Pause when the hero leaves the screen or the tab is hidden.
  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting));
    observer.observe(el);
    const onVisibility = () => setTabVisible(document.visibilityState === "visible");
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      observer.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  // Start the slow zoom one frame after a slide becomes active.
  useEffect(() => {
    if (reduceMotion) return;
    const frame = requestAnimationFrame(() => requestAnimationFrame(() => setZoomed(index)));
    return () => cancelAnimationFrame(frame);
  }, [index, reduceMotion]);

  // Autoplay.
  useEffect(() => {
    if (!playing) return;
    const timer = setTimeout(() => go(index + 1, false), HERO_SLIDE_MS);
    return () => clearTimeout(timer);
  });

  /** @param {number} i */
  const loads = (i) => visited.has(i) || (idle && i === (index + 1) % count);

  return (
    <section
      ref={rootRef}
      aria-roledescription="carousel"
      aria-label="Featured photographs"
      className="relative h-full"
      onPointerEnter={(e) => e.pointerType === "mouse" && setHeld(true)}
      onPointerLeave={(e) => e.pointerType === "mouse" && setHeld(false)}
      onFocus={() => setHeld(true)}
      onBlur={(e) => {
        if (!e.currentTarget.contains(/** @type {Node | null} */ (e.relatedTarget))) setHeld(false);
      }}
      onKeyDown={(e) => {
        if (e.key === "ArrowLeft") go(index - 1, true);
        if (e.key === "ArrowRight") go(index + 1, true);
      }}
    >
      <div
        className="absolute inset-0 touch-pan-y overflow-hidden rounded-card bg-surface-2"
        style={{ "--hero-slide-ms": HERO_SLIDE_MS }}
        onPointerDown={(e) => {
          press.current = { x: e.clientX, y: e.clientY };
        }}
        onPointerUp={(e) => {
          const start = press.current;
          press.current = null;
          if (!start || e.pointerType === "mouse") return;
          const dx = e.clientX - start.x;
          if (Math.abs(dx) > SWIPE_PX && Math.abs(dx) > Math.abs(e.clientY - start.y)) {
            go(index + (dx < 0 ? 1 : -1), true);
          }
        }}
      >
        {slides.map((slide, i) => (
          <div
            key={slide.photo.id}
            role="group"
            aria-roledescription="slide"
            aria-label={`${i + 1} of ${count}`}
            aria-hidden={i !== index}
            className="hero-slide absolute inset-0"
            data-active={i === index ? "" : undefined}
            data-zoom={i === zoomed ? "" : undefined}
          >
            {i === 0 || loads(i) ? (
              <Photo
                photo={slide.photo}
                sizes={SIZES}
                priority={i === 0}
                className="h-full w-full object-cover"
              />
            ) : (
              <div
                className="h-full w-full"
                style={{ background: `${slide.photo.color} url(${slide.photo.lqip}) center / cover` }}
              />
            )}
          </div>
        ))}
      </div>

      <Navbar variant="notch" name={site.name} site={site} />

      {count > 1 && (
        <>
          <div className="pointer-events-none absolute inset-x-3 top-1/2 flex -translate-y-1/2 justify-between">
            <IconButton label="Previous photo" className="pointer-events-auto" onClick={() => go(index - 1, true)}>
              <ChevronLeft aria-hidden="true" size={20} strokeWidth={1.75} />
            </IconButton>
            <IconButton label="Next photo" className="pointer-events-auto" onClick={() => go(index + 1, true)}>
              <ChevronRight aria-hidden="true" size={20} strokeWidth={1.75} />
            </IconButton>
          </div>
          {/* Bottom-right, clear of the trip notch at every width. Phones keep
              swipe, the arrows and pause; the dots would be under a thumb. */}
          <div className="absolute right-3 bottom-3 flex items-center gap-2">
            <div className="hidden sm:block">
              <DotPagination count={count} index={index} onSelect={(i) => go(i, true)} label="photo" />
            </div>
            <IconButton
              label={paused ? "Play slideshow" : "Pause slideshow"}
              onClick={() => setPaused((p) => !p)}
              className="motion-reduce:hidden"
            >
              {paused ? (
                <Play aria-hidden="true" size={16} strokeWidth={1.75} />
              ) : (
                <Pause aria-hidden="true" size={16} strokeWidth={1.75} />
              )}
            </IconButton>
          </div>
        </>
      )}

      {current && (
        <div className="notch notch-bl flex max-w-1/2 items-center gap-3 pt-3 pr-4">
          <AppLink to={current.trip.href} className="ghost-link truncate text-body-s font-medium">
            {current.trip.title}
          </AppLink>
          <LabelChip label={current.trip.label} href={current.trip.href} className="hidden sm:inline-flex" />
        </div>
      )}

      <p aria-live="polite" className="sr-only">
        {announcement}
      </p>
    </section>
  );
}
