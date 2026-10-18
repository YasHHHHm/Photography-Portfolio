import { Pause, Play } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { cx } from "../../lib/format.js";
import { videoUrl } from "../../lib/photo-url.js";
import { IconButton } from "../ui/IconButton.jsx";
import { Photo } from "./Photo.jsx";

/** localStorage key: "paused" once the visitor has paused a background video. */
const PAUSED_KEY = "background-video";
/** Share of the box that must be on screen for the clip to play. */
const HALF = 0.5;

/**
 * Whether this visit should autoplay video at all. Visitors who asked for
 * less motion or less data, slow connections, and anyone who paused a
 * background video before, see the still frame (with a play button).
 */
function autoplayAllowed() {
  if (matchMedia("(prefers-reduced-motion: reduce)").matches) return false;
  const connection = /** @type {any} */ (navigator).connection;
  if (connection?.saveData || /2g$/.test(connection?.effectiveType ?? "")) return false;
  try {
    if (localStorage.getItem(PAUSED_KEY) === "paused") return false;
  } catch {
    // Storage blocked: autoplay as usual.
  }
  return true;
}

/**
 * The smallest rendition that still looks sharp in this box (the clip
 * covers it, like object-fit: cover), in AV1 when the browser plays it.
 * @param {import("../../lib/photo-url.js").VideoRecord} video
 * @param {HTMLVideoElement} el
 */
function pickRendition(video, el) {
  const box = el.getBoundingClientRect();
  // Moving pictures hide softness, so a density above 1.5 buys nothing visible.
  const density = Math.min(window.devicePixelRatio || 1, 1.5);
  const shortSide =
    video.aspect >= 1
      ? Math.max(box.height, box.width / video.aspect)
      : Math.max(box.width, box.height * video.aspect);
  const sizes = [...new Set(video.renditions.map((r) => r.size))].sort((a, b) => a - b);
  const slow = /** @type {any} */ (navigator).connection?.effectiveType === "3g";
  const size = slow ? sizes[0] : (sizes.find((s) => s >= shortSide * density * 0.9) ?? sizes.at(-1));
  const candidates = video.renditions.filter((r) => r.size === size);
  return (
    candidates.find((r) => r.codec === "av1" && el.canPlayType(r.type) === "probably") ??
    candidates.find((r) => r.codec === "h264")
  );
}

/**
 * Runs `callback` once the page has loaded and the browser is idle, so the
 * video never competes with the page's own files.
 * @param {() => void} callback
 * @returns {() => void} cancel
 */
function afterLoadAndIdle(callback) {
  let handle = 0;
  const idle = () => {
    handle = window.requestIdleCallback
      ? window.requestIdleCallback(callback, { timeout: 2000 })
      : window.setTimeout(callback, 300);
  };
  if (document.readyState === "complete") idle();
  else window.addEventListener("load", idle, { once: true });
  return () => {
    window.removeEventListener("load", idle);
    if (window.cancelIdleCallback) window.cancelIdleCallback(handle);
    else window.clearTimeout(handle);
  };
}

/**
 * A silent, looping background clip over its own first frame.
 *
 * The first frame is an ordinary <Photo> (the page's priority image when
 * `priority` is set), so pre-rendered HTML carries no video at all and the
 * page paints as fast as a photo page. After the page has loaded and once
 * the box is on screen, the smallest suitable rendition (AV1 or H.264, 720p
 * or 1080p) loads, and fades in once it is really playing, over an
 * identical frame. It plays only while at least half visible, and pauses in
 * hidden tabs.
 *
 * Reduced motion, Save-Data, 2G connections, or a previous pause: the still
 * frame stays, with a play button. The pause button meets WCAG 2.2.2 for
 * moving content.
 *
 * @param {object} props
 * @param {import("../../lib/photo-url.js").VideoRecord} props.video
 * @param {string} props.sizes  `sizes` for the poster image
 * @param {boolean} [props.priority]  The poster is the page's LCP image
 * @param {string} [props.className]  Size and shape of the box
 * @param {string} [props.controlClassName]  Position of the play/pause button
 * @param {import("react").CSSProperties} [props.posterStyle]
 * @param {boolean} [props.suspended]  Pause while something covers the clip
 * @param {import("react").ReactNode} [props.children]  Overlays (scrim, text)
 */
export function BackgroundVideo({
  video,
  sizes,
  priority = false,
  className,
  controlClassName = "right-3 bottom-3",
  posterStyle,
  suspended = false,
  children,
}) {
  /** @type {import("react").RefObject<HTMLDivElement | null>} */
  const rootRef = useRef(null);
  /** @type {import("react").RefObject<HTMLVideoElement | null>} */
  const videoRef = useRef(null);
  /** Set by the play/pause button; the observers read it. */
  const heldRef = useRef(false);
  const suspendedRef = useRef(suspended);
  const startRef = useRef(() => {});
  const resumeRef = useRef(() => {});
  const [ready, setReady] = useState(false);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    const el = videoRef.current;
    const root = rootRef.current;
    if (!el || !root) return;
    let started = false;
    let visible = false;

    const resume = () => {
      if (!started || !visible || document.hidden || heldRef.current || suspendedRef.current) {
        return;
      }
      el.play().catch(() => setPlaying(false));
    };
    const start = () => {
      if (started) return;
      const rendition = pickRendition(video, el);
      if (!rendition) return;
      started = true;
      el.preload = "auto";
      el.src = videoUrl(video, rendition);
      resume();
    };
    resumeRef.current = resume;
    startRef.current = () => {
      visible = true;
      start();
      resume();
    };

    const onPlaying = () => {
      setReady(true);
      setPlaying(true);
    };
    const onPause = () => setPlaying(false);
    el.addEventListener("playing", onPlaying);
    el.addEventListener("pause", onPause);

    // Plays only while at least half of the box is on screen (PRD section 6).
    const observer = new IntersectionObserver(
      ([entry]) => {
        visible = entry.isIntersecting && entry.intersectionRatio >= HALF;
        if (visible) resume();
        else el.pause();
      },
      { threshold: HALF },
    );
    // Starts loading as soon as any of it is on screen, to be ready by then.
    const first = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return;
      first.disconnect();
      start();
    });
    const onVisibility = () => (document.hidden ? el.pause() : resume());
    document.addEventListener("visibilitychange", onVisibility);

    heldRef.current = !autoplayAllowed();
    const cancel = afterLoadAndIdle(() => {
      observer.observe(root);
      if (!heldRef.current) first.observe(root);
    });

    return () => {
      cancel();
      observer.disconnect();
      first.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
      el.removeEventListener("playing", onPlaying);
      el.removeEventListener("pause", onPause);
      el.pause();
      if (started) {
        // Stops a download still in progress.
        el.removeAttribute("src");
        el.load();
      }
    };
  }, [video]);

  useEffect(() => {
    suspendedRef.current = suspended;
    if (suspended) videoRef.current?.pause();
    else resumeRef.current();
  }, [suspended]);

  const toggle = () => {
    const el = videoRef.current;
    if (!el) return;
    if (playing) {
      heldRef.current = true;
      el.pause();
      try {
        localStorage.setItem(PAUSED_KEY, "paused");
      } catch {
        // Storage blocked: the pause lasts for this page only.
      }
    } else {
      heldRef.current = false;
      try {
        localStorage.removeItem(PAUSED_KEY);
      } catch {
        // Storage blocked.
      }
      startRef.current();
    }
  };

  return (
    <div ref={rootRef} className={cx("relative overflow-hidden", className)}>
      <Photo
        photo={video.poster}
        alt=""
        sizes={sizes}
        priority={priority}
        className="absolute inset-0 h-full w-full object-cover"
        style={posterStyle}
      />
      {/* 1 px short of the poster (at the bottom, under the scrim): the
          browser then never counts the clip's first frame as a larger,
          later "largest paint", so the poster stays the page's LCP. */}
      <video
        ref={videoRef}
        className="bg-video absolute inset-x-0 top-0 bottom-px h-[calc(100%-1px)] w-full object-cover"
        data-ready={ready ? "" : undefined}
        muted
        loop
        playsInline
        preload="none"
        disablePictureInPicture
        disableRemotePlayback
        aria-hidden="true"
        tabIndex={-1}
      />
      {children}
      <IconButton
        label={playing ? "Pause background video" : "Play background video"}
        onClick={toggle}
        className={cx("absolute z-10", controlClassName)}
      >
        {playing ? (
          <Pause aria-hidden="true" size={16} strokeWidth={1.75} />
        ) : (
          <Play aria-hidden="true" size={16} strokeWidth={1.75} />
        )}
      </IconButton>
    </div>
  );
}
