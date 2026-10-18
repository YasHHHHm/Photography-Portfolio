import { lazy, Suspense, useEffect, useRef, useState } from "react";

import { cx } from "../../lib/format.js";
import { AppLink, AppNavLink } from "../ui/AppLink.jsx";
import { Roll } from "../ui/Roll.jsx";
import { Brand } from "./Brand.jsx";
import { NAV_LINKS } from "./nav-links.js";
import { ThemeToggle } from "./ThemeToggle.jsx";

const loadMenu = () => import("./MobileMenu.jsx");
const MobileMenu = lazy(loadMenu);

const CHIP =
  "roll-host mono-label inline-flex h-9 items-center rounded-chip border px-3 transition-colors duration-(--dur-fast) ease-out";

/**
 * Main navigation. Never full width.
 *
 * - "notch": lives in the notch cut into the Home hero card.
 * - "floating": a pill fixed at the top-left of inner pages. It slides away
 *   while scrolling down, returns on scroll up, and turns frosted once the
 *   page has scrolled 24 px.
 *
 * Below 768 px it shows the brand and a "Menu" button that opens a full
 * screen sheet (loaded on first use).
 *
 * @param {object} props
 * @param {"notch" | "floating"} props.variant
 * @param {string} props.name  The photographer's name
 * @param {{ email: string, avatar: import("../../lib/photo-url.js").PhotoRecord | null, socials: { label: string, url: string }[] }} props.site
 */
export function Navbar({ variant, name, site }) {
  const headerRef = useFloatingBehaviour(variant === "floating");
  const [menu, setMenu] = useState({ mounted: false, open: false });

  const links = (
    <ul className="hidden items-center gap-1.5 md:flex">
      {NAV_LINKS.map(({ to, label }) => (
        <li key={to}>
          {to.includes("#") ? (
            <AppLink to={to} className={cx(CHIP, "border-line-strong hover:bg-surface-2")}>
              <Roll label={label} />
            </AppLink>
          ) : (
            <AppNavLink
              to={to}
              className={({ isActive }) =>
                cx(
                  CHIP,
                  isActive ? "border-ink bg-ink text-bg" : "border-line-strong hover:bg-surface-2",
                )
              }
            >
              <Roll label={label} />
            </AppNavLink>
          )}
        </li>
      ))}
    </ul>
  );

  const menuButton = (
    <button
      type="button"
      aria-haspopup="dialog"
      aria-expanded={menu.open}
      onPointerEnter={loadMenu}
      onFocus={loadMenu}
      onTouchStart={loadMenu}
      onClick={() => setMenu({ mounted: true, open: true })}
      className={cx(CHIP, "h-11 border-line-strong md:hidden")}
    >
      <Roll label="Menu" />
    </button>
  );

  const sheet = menu.mounted && (
    <Suspense fallback={null}>
      <MobileMenu
        open={menu.open}
        onClose={() => setMenu((m) => ({ ...m, open: false }))}
        name={name}
        site={site}
      />
    </Suspense>
  );

  if (variant === "notch") {
    return (
      <header
        className="notch notch-tl flex h-14 items-center gap-6 pr-4 pb-2 md:h-16"
        style={{ "--notch-r": "var(--radius-card)" }}
      >
        <nav aria-label="Main" className="flex items-center gap-6">
          <Brand name={name} avatar={site.avatar} />
          {links}
        </nav>
        <ThemeToggle className="hidden md:grid" />
        {menuButton}
        {sheet}
      </header>
    );
  }

  return (
    <header
      ref={headerRef}
      className="floating-nav pointer-events-none fixed inset-x-0 top-0 z-40 flex items-start justify-between gap-3 p-3 md:p-4"
      style={{ viewTransitionName: "site-nav" }}
    >
      <nav
        aria-label="Main"
        className="nav-pill pointer-events-auto flex h-12 items-center gap-6 rounded-pill pr-1.5 pl-2.5 md:h-14 md:pr-2 md:pl-3"
      >
        <Brand name={name} avatar={site.avatar} />
        {links}
        <ThemeToggle className="hidden md:grid" />
      </nav>
      <div className="nav-pill pointer-events-auto flex h-12 items-center rounded-pill px-0.5 md:hidden">
        {menuButton}
      </div>
      {sheet}
    </header>
  );
}

/**
 * Hide-on-scroll for the floating navbar. Writes data attributes straight
 * to the element, so scrolling never re-renders React.
 * @param {boolean} enabled
 */
function useFloatingBehaviour(enabled) {
  /** @type {import("react").RefObject<HTMLElement | null>} */
  const ref = useRef(null);

  useEffect(() => {
    const el = ref.current;
    if (!enabled || !el) return;
    let lastY = window.scrollY;
    let queued = false;

    const update = () => {
      queued = false;
      const y = window.scrollY;
      el.toggleAttribute("data-scrolled", y > 24);
      if (y > lastY + 4 && y > 96) el.setAttribute("data-hidden", "");
      else if (y < lastY - 4 || y <= 96) el.removeAttribute("data-hidden");
      lastY = y;
    };
    const onScroll = () => {
      if (!queued) {
        queued = true;
        requestAnimationFrame(update);
      }
    };

    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [enabled]);

  return ref;
}
