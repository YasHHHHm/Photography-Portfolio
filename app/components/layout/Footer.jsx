import { ArrowUp } from "lucide-react";

import { Button } from "../ui/Button.jsx";
import { GhostLink } from "../ui/GhostLink.jsx";
import { Marquee } from "../ui/Marquee.jsx";
import { SocialIcon } from "../ui/SocialIcon.jsx";
import { NAV_LINKS } from "./nav-links.js";

/**
 * @typedef {object} FooterSite
 * @property {string} name
 * @property {string} email
 * @property {string} location
 * @property {number} year
 * @property {{ marquee: string }} footer
 * @property {{ label: string, url: string, icon: string, iconPath: string | null }[]} socials
 */

/**
 * Universal footer: a slow marquee line, four columns (Navigate, Follow,
 * Get in touch, Legal) and a bottom row. Stacks on small screens.
 * @param {{ site: FooterSite }} props
 */
export function Footer({ site }) {
  return (
    <footer className="defer-render mt-(--section) border-t border-line">
      <Marquee text={site.footer.marquee} />

      <div className="mx-auto grid max-w-page grid-cols-2 gap-x-6 gap-y-10 border-t border-line px-(--gutter) py-8 md:grid-cols-4">
        <Column title="Navigate">
          {[{ to: "/", label: "Home" }, ...NAV_LINKS.filter((l) => !l.to.includes("#"))].map(
            (l) => (
              <li key={l.to}>
                <GhostLink href={l.to}>{l.label}</GhostLink>
              </li>
            ),
          )}
        </Column>

        <Column title="Follow">
          {site.socials.map((s) => (
            <li key={s.url}>
              <a
                href={s.url}
                target="_blank"
                rel="noopener"
                className="group inline-flex items-center gap-2"
              >
                <SocialIcon icon={s.icon} path={s.iconPath} size={16} className="text-ink-muted" />
                <span className="ghost-link">{s.label}</span>
              </a>
            </li>
          ))}
        </Column>

        <Column title="Get in touch">
          <li>
            <GhostLink
              href={`mailto:${site.email}`}
              className="break-all"
              target="_blank"
              rel="noopener"
            >
              {site.email}
            </GhostLink>
          </li>
          <li className="text-ink-muted">{site.location}</li>
          <li className="pt-2">
            <Button variant="secondary" href="/about#contact" arrow>
              Start a project
            </Button>
          </li>
        </Column>

        <Column title="Legal">
          <li>
            <GhostLink href="/privacy">Privacy</GhostLink>
          </li>
        </Column>
      </div>

      <div className="mono-label mx-auto flex max-w-page flex-wrap items-center justify-between gap-4 border-t border-line px-(--gutter) py-4 text-ink-muted">
        <p>
          © {site.year} {site.name}
        </p>
        <a href="#top" className="ghost-link inline-flex items-center gap-1.5">
          Back to top
          <ArrowUp aria-hidden="true" size={14} strokeWidth={1.75} />
        </a>
      </div>
    </footer>
  );
}

/**
 * @param {{ title: string, children: import("react").ReactNode }} props
 */
function Column({ title, children }) {
  return (
    <div className="flex flex-col gap-4">
      <h2 className="mono-label text-ink-muted">{title}</h2>
      <ul className="flex flex-col gap-2 text-body-s">{children}</ul>
    </div>
  );
}
