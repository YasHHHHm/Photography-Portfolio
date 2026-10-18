/**
 * Motion tokens for Motion (motion/react) components. These mirror the CSS
 * tokens in app/styles/app.css so CSS and JS animations feel identical.
 * Change both together.
 */

/** Cubic-bezier easing curves. */
export const ease = {
  /** Default for everything entering or hovering (--ease-out). */
  out: /** @type {[number, number, number, number]} */ ([0.22, 1, 0.36, 1]),
  /** Hero crossfades, theme change (--ease-in-out). */
  inOut: /** @type {[number, number, number, number]} */ ([0.65, 0, 0.35, 1]),
};

/** Durations in seconds (Motion's unit). */
export const dur = {
  fast: 0.16,
  base: 0.28,
  slow: 0.6,
  hero: 1.2,
};

/** Spring for the cursor-follow hover preview only. */
export const previewSpring = { type: "spring", stiffness: 300, damping: 30, mass: 0.6 };

/** Hero carousel: how long each slide stays on screen, in milliseconds. */
export const HERO_SLIDE_MS = 6000;
