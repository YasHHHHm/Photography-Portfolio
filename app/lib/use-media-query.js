import { useCallback, useSyncExternalStore } from "react";

/**
 * Whether a CSS media query matches, kept up to date. Pre-rendered HTML uses
 * `serverValue`, then the real value takes over after hydration.
 * @param {string} query  e.g. "(prefers-reduced-motion: reduce)"
 * @param {boolean} [serverValue]
 * @returns {boolean}
 */
export function useMediaQuery(query, serverValue = false) {
  const subscribe = useCallback(
    (/** @type {() => void} */ onChange) => {
      const list = matchMedia(query);
      list.addEventListener("change", onChange);
      return () => list.removeEventListener("change", onChange);
    },
    [query],
  );
  return useSyncExternalStore(
    subscribe,
    () => matchMedia(query).matches,
    () => serverValue,
  );
}
