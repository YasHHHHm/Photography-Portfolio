import { useRouteLoaderData } from "react-router";

import { AboutSection } from "../components/content/AboutSection.jsx";
import { ContactSection } from "../components/content/ContactSection.jsx";
import { Prose } from "../components/content/Prose.jsx";
import { Photo } from "../components/media/Photo.jsx";
import { Reveal } from "../components/motion/Reveal.jsx";
import { Button } from "../components/ui/Button.jsx";
import { SectionHeader } from "../components/ui/SectionHeader.jsx";
import { SocialIcon } from "../components/ui/SocialIcon.jsx";
import { getAbout } from "../lib/content.server.js";
import { personLd, seo, siteFrom } from "../lib/seo.js";

export const loader = () => getAbout();

/** @type {import("react-router").MetaFunction} */
export const meta = (args) => {
  const site = siteFrom(args.matches);
  const data = /** @type {any} */ (args.loaderData);
  return seo(args, {
    title: "About",
    description: data?.headline ?? site?.bio ?? "",
    type: "profile",
    jsonLd: site ? [personLd(site, data?.portrait)] : [],
  });
};

/**
 * About and contact: portrait and bio, the free-form sections from
 * about.json (two per row on desktop), social links, and the contact form.
 * @param {{ loaderData: any }} props
 */
export default function About({ loaderData }) {
  const { site } = /** @type {any} */ (useRouteLoaderData("root"));
  const { headline, portrait, html, sections } = loaderData;

  return (
    <div className="mx-auto flex max-w-page flex-col gap-(--section) px-(--gutter) pt-28 md:pt-36">
      <section className="grid gap-10 md:grid-cols-12 md:items-start">
        {portrait && (
          <Photo
            photo={portrait}
            sizes="(min-width: 1440px) 560px, (min-width: 768px) 40vw, 100vw"
            priority
            className="aspect-4/5! w-full rounded-card object-cover md:col-span-5"
            pictureClassName="md:col-span-5"
          />
        )}
        <div className="flex flex-col gap-6 md:col-span-7">
          <h1 className="font-display text-display-xl">{site.name}</h1>
          <p className="max-w-reading font-subhead text-h2">{headline}</p>
          <Prose html={html} />
          <ul className="flex flex-wrap gap-2 pt-2">
            {site.socials.map((/** @type {any} */ s) => (
              <li key={s.url}>
                <Button
                  href={s.url}
                  variant="secondary"
                  rel="noopener"
                  icon={<SocialIcon icon={s.icon} path={s.iconPath} size={16} />}
                >
                  {s.label}
                </Button>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <div className="grid gap-x-12 gap-y-(--section) md:grid-cols-2">
        {sections.map((/** @type {any} */ section) => (
          <Reveal key={section.title}>
            <AboutSection section={section} />
          </Reveal>
        ))}
      </div>

      <section
        id="contact"
        aria-labelledby="contact-title"
        className="grid scroll-mt-28 gap-10 md:grid-cols-12"
      >
        <div className="flex flex-col gap-5 md:col-span-5">
          <SectionHeader title="Contact" as="h3" />
          <h2 id="contact-title" className="font-display text-display-l">
            Let&apos;s make something together
          </h2>
          <a
            target="_blank"
            rel="noopener noreferrer"
            href={`mailto:${site.email}`}
            className="ghost-link self-start text-h3"
          >
            {site.email}
          </a>
          <p className="text-ink-muted">{site.location}</p>
          <p className="mono-label text-ink-muted">{site.contact.replyTime}</p>
        </div>
        <div className="md:col-span-7">
          <ContactSection email={site.email} subjects={site.contact.subjects} />
        </div>
      </section>
    </div>
  );
}
