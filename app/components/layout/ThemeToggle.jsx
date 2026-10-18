import { Moon, Sun } from "lucide-react";
import { useEffect, useSyncExternalStore } from "react";

import { cx } from "../../lib/format.js";

/** @typedef {"light" | "dark"} Theme */

/** @param {() => void} onChange */
function subscribe(onChange) {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
  return () => observer.disconnect();
}

/** @returns {Theme | null} */
const currentTheme = () => /** @type {Theme} */ (document.documentElement.dataset.theme ?? "dark");

/**
 * Applies a theme, with a 400 ms crossfade where the browser supports view
 * transitions and the visitor has not asked for reduced motion.
 * @param {Theme} theme
 * @param {{ save: boolean }} options
 */
function applyTheme(theme, { save }) {
  const root = document.documentElement;
  const update = () => {
    root.dataset.theme = theme;
    if (save) {
      try {
        localStorage.setItem("theme", theme);
      } catch {
        // Private mode or blocked storage: the choice lasts for this page only.
      }
    }
  };
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (!document.startViewTransition || reduce) return update();
  root.dataset.vt = "theme";
  document.startViewTransition(update).finished.finally(() => delete root.dataset.vt);
}

/**
 * Dark/light pill switch. The first theme comes from the system setting (set
 * before paint by the script in root.jsx); a click saves the choice. Until
 * then, the site follows system changes live.
 * @param {{ className?: string }} props
 */
export function ThemeToggle({ className }) {
  const theme = useSyncExternalStore(subscribe, currentTheme, () => null);
  const next = theme === "light" ? "dark" : "light";

  useEffect(() => {
    const query = matchMedia("(prefers-color-scheme: light)");
    const follow = () => {
      let saved = null;
      try {
        saved = localStorage.getItem("theme");
      } catch {
        // Storage blocked: keep following the system.
      }
      if (!saved) applyTheme(query.matches ? "light" : "dark", { save: false });
    };
    query.addEventListener("change", follow);
    return () => query.removeEventListener("change", follow);
  }, []);

  return (
    <button
      type="button"
      onClick={() => applyTheme(next, { save: true })}
      aria-pressed={theme ? theme === "dark" : undefined}
      aria-label={theme ? `Switch to ${next} theme` : "Switch theme"}
      className={cx("grid h-11 shrink-0 place-items-center px-1", className)}
    >
      <span
        className="relative flex h-7 w-13 items-center justify-between rounded-pill border border-line-strong px-1.5 text-ink-muted"
        style={{ "--knob-travel": "24px" }}
      >
        <Moon aria-hidden="true" size={12} strokeWidth={2} />
        <Sun aria-hidden="true" size={12} strokeWidth={2} />
        <span className="theme-knob absolute top-0.5 left-0.5 size-5.5 rounded-pill bg-ink" />
      </span>
    </button>
  );
}
