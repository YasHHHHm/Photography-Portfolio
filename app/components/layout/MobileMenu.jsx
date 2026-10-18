import { X } from "lucide-react";
import { AnimatePresence, m } from "motion/react";
import { useEffect, useRef } from "react";

import { dur, ease } from "../../lib/motion.js";
import { MotionProvider } from "../motion/MotionProvider.jsx";
import { AppLink } from "../ui/AppLink.jsx";
import { IconButton } from "../ui/IconButton.jsx";
import { Brand } from "./Brand.jsx";
import { NAV_LINKS } from "./nav-links.js";
import { ThemeToggle } from "./ThemeToggle.jsx";

const LINKS = [{ to: "/", label: "Home" }, ...NAV_LINKS];

/**
 * Full-screen menu for small screens, loaded the first time it is opened.
 * Built on a modal <dialog>, so focus stays inside and the page behind is
 * inert. Escape closes it, the page does not scroll behind it, and focus
 * returns to the Menu button afterwards. Links stagger in at 40 ms steps.
 *
 * @param {object} props
 * @param {boolean} props.open
 * @param {() => void} props.onClose
 * @param {string} props.name
 * @param {{ email: string, avatar: import("../../lib/photo-url.js").PhotoRecord | null, socials: { label: string, url: string }[] }} props.site
 */
export default function MobileMenu({ open, onClose, name, site }) {
  /** @type {import("react").RefObject<HTMLDialogElement | null>} */
  const dialogRef = useRef(null);
  /** @type {import("react").RefObject<HTMLElement | null>} */
  const returnFocus = useRef(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!open || !dialog || dialog.open) return;
    returnFocus.current = /** @type {HTMLElement | null} */ (document.activeElement);
    document.documentElement.style.overflow = "hidden";
    dialog.showModal();
  }, [open]);

  // If the page changes while the menu is open (a link was followed), the
  // menu may unmount mid-animation: never leave the page unscrollable.
  useEffect(() => () => void (document.documentElement.style.overflow = ""), []);

  const finishClosing = () => {
    dialogRef.current?.close();
    document.documentElement.style.overflow = "";
    if (returnFocus.current?.isConnected) returnFocus.current.focus();
  };

  return (
    <MotionProvider>
      <dialog
        ref={dialogRef}
        aria-label="Menu"
        className="sheet"
        onCancel={(event) => {
          event.preventDefault();
          onClose();
        }}
      >
        <AnimatePresence onExitComplete={finishClosing}>
          {open && (
            <m.div
              key="menu"
              className="flex min-h-full flex-col bg-bg px-(--gutter) pt-3 pb-8"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: dur.base, ease: ease.out }}
            >
              <div className="flex items-center justify-between">
                <Brand name={name} avatar={site.avatar} onClick={onClose} />
                <IconButton label="Close menu" tone="surface" onClick={onClose}>
                  <X aria-hidden="true" size={20} strokeWidth={1.75} />
                </IconButton>
              </div>

              <nav aria-label="Main" className="mt-12 flex-1">
                <ul className="flex flex-col gap-1">
                  {LINKS.map(({ to, label }, i) => (
                    <m.li
                      key={to}
                      initial={{ opacity: 0, y: 16 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: dur.base, ease: ease.out, delay: 0.08 + i * 0.04 }}
                    >
                      <AppLink
                        to={to}
                        onClick={onClose}
                        className="block py-1 font-display text-display-l"
                      >
                        {label}
                      </AppLink>
                    </m.li>
                  ))}
                </ul>
              </nav>

              <div className="flex items-end justify-between gap-4 border-t border-line pt-5">
                <div className="flex flex-col gap-2">
                  <a
                    target="_blank"
                    rel="noopener"
                    href={`mailto:${site.email}`}
                    className="ghost-link self-start text-body-s"
                  >
                    {site.email}
                  </a>
                  <ul className="mono-label flex flex-wrap gap-x-4 gap-y-2 text-ink-muted">
                    {site.socials.map((s) => (
                      <li key={s.url}>
                        <a href={s.url} rel="noopener" className="ghost-link">
                          {s.label}
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
                <ThemeToggle />
              </div>
            </m.div>
          )}
        </AnimatePresence>
      </dialog>
    </MotionProvider>
  );
}
