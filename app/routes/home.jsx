import { useRouteLoaderData } from "react-router";

import { BookCard } from "../components/content/BookCard.jsx";
import { PostCard } from "../components/content/PostCard.jsx";
import { ProfileCard, SocialCards } from "../components/content/ProfileCard.jsx";
import { ReelCard } from "../components/content/ReelCard.jsx";
import { HeroCarousel } from "../components/media/HeroCarousel.jsx";
import { NotchCard } from "../components/media/NotchCard.jsx";
import { Reveal } from "../components/motion/Reveal.jsx";
import { GhostLink } from "../components/ui/GhostLink.jsx";
import { SectionHeader } from "../components/ui/SectionHeader.jsx";
import { getHome } from "../lib/content.server.js";
import { formatDateRange, plural } from "../lib/format.js";
import { personLd, seo, siteFrom } from "../lib/seo.js";

/** Home draws its own navbar inside the hero's notch. */
export const handle = { nav: "notch" };

export const loader = () => getHome();

/** @type {import("react-router").MetaFunction} */
export const meta = (args) => {
  const site = siteFrom(args.matches);
  const data = /** @type {any} */ (args.loaderData);
  return seo(args, {
    // "Photographer & Videographer based in New Delhi, India. I photograph and film…"
    description: site ? `${site.role} based in ${site.location}. ${site.bio}` : "",
    type: "profile",
    jsonLd: site ? [personLd(site, data?.profile?.avatar)] : [],
  });
};

/**
 * Home: the hero carousel stays pinned on the left while the bento column
 * scrolls past on the right (one column below 1024 px).
 * @param {{ loaderData: any }} props
 */
export default function Home({ loaderData }) {
  const { site } = /** @type {any} */ (useRouteLoaderData("root"));
  const { profile, hero, reel, latestTrips, books, latestPost } = loaderData;
  // The longest word of any book title: every card's title fits it, so the
  // row shares one size.
  const wordChars = Math.max(
    1,
    ...books.flatMap((/** @type {any} */ book) =>
      book.title.split(/\s+/).map((/** @type {string} */ word) => word.length),
    ),
  );

  return (
    <div className="mx-auto grid max-w-page gap-(--gutter) p-(--gutter) lg:grid-cols-2">
      <div className="h-[75svh] lg:sticky lg:top-(--gutter) lg:h-[calc(100dvh-2*var(--gutter))]">
        <HeroCarousel slides={hero} site={site} />
      </div>

      <div className="flex flex-col gap-16 pt-4 lg:pt-0">
        <div className="flex flex-col gap-(--gutter)">
          <div className="grid gap-(--gutter) lg:grid-cols-3">
            <ProfileCard profile={profile} className="lg:col-span-2" />
            <SocialCards socials={site.socials} />
          </div>
          {reel && <ReelCard reel={reel} />}
        </div>

        <Reveal as="section" aria-labelledby="home-trips" className="flex flex-col gap-6">
          <SectionHeader id="home-trips" title="Latest travel" href="/travel" />
          <ul className="grid gap-(--gutter) sm:grid-cols-2 xl:grid-cols-3">
            {latestTrips.map((/** @type {any} */ trip) => (
              <li key={trip.label}>
                <NotchCard
                  photo={trip.cover}
                  title={trip.title}
                  href={trip.href}
                  meta={`${formatDateRange(trip.from, trip.to)} · ${plural(trip.photoCount, "photo")}`}
                  sizes="(min-width: 1280px) 15vw, (min-width: 1024px) 24vw, (min-width: 640px) 50vw, 100vw"
                  morph
                />
              </li>
            ))}
          </ul>
        </Reveal>

        <Reveal as="section" aria-labelledby="home-books" className="flex flex-col gap-6">
          <SectionHeader id="home-books" title="Books" href="/travel" />
          <ul className="-mx-(--gutter) flex snap-x snap-mandatory scroll-px-(--gutter) gap-(--gutter) overflow-x-auto px-(--gutter) pb-2 lg:mx-0 lg:grid lg:grid-cols-2 lg:overflow-visible lg:px-0 lg:pb-0">
            {books.map((/** @type {any} */ book) => (
              <li key={book.slug} className="w-4/5 shrink-0 snap-start sm:w-2/5 lg:w-auto">
                <BookCard
                  book={book}
                  sizes="(min-width: 1024px) 24vw, (min-width: 640px) 40vw, 80vw"
                  wordChars={wordChars}
                />
              </li>
            ))}
          </ul>
        </Reveal>

        {latestPost && (
          <Reveal as="section" aria-labelledby="home-journal" className="flex flex-col gap-6">
            <SectionHeader id="home-journal" title="From the journal" />
            <PostCard post={latestPost} sizes="(min-width: 1024px) 48vw, 100vw" heading="h2" />
            <GhostLink href="/blog" className="mono-label self-start">
              Read the journal
            </GhostLink>
          </Reveal>
        )}
      </div>
    </div>
  );
}
