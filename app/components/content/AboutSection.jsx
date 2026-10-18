import { ArrowUpRight } from "lucide-react";

import { SectionHeader } from "../ui/SectionHeader.jsx";

/**
 * @typedef {object} AboutItem
 * @property {string} title
 * @property {string | null} subtitle
 * @property {string | null} meta
 * @property {string | null} link
 */

/**
 * One free-form About section (Education, Cameras, Work…): a section header
 * and rows with the title, a muted subtitle beneath it, and mono meta on the
 * right, separated by thin rules.
 * @param {{ section: { title: string, items: AboutItem[] } }} props
 */
export function AboutSection({ section }) {
  const id = `about-${section.title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
  return (
    <section aria-labelledby={id} className="flex flex-col">
      <SectionHeader id={id} title={section.title} />
      <ul>
        {section.items.map((item) => (
          <li
            key={item.title}
            className="flex items-start justify-between gap-6 border-b border-line py-4"
          >
            <div className="flex flex-col gap-1">
              {item.link ? (
                <a
                  href={item.link}
                  rel="noopener"
                  className="ghost-link inline-flex items-center gap-1 self-start"
                >
                  {item.title}
                  <ArrowUpRight aria-hidden="true" size={14} strokeWidth={1.75} />
                </a>
              ) : (
                <span>{item.title}</span>
              )}
              {item.subtitle && <span className="text-body-s text-ink-muted">{item.subtitle}</span>}
            </div>
            {item.meta && (
              <span className="mono-label shrink-0 pt-1 text-ink-muted">{item.meta}</span>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
