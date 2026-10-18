import { MediaHero } from "../components/content/MediaHero.jsx";
import { PostGrid } from "../components/content/PostCard.jsx";
import { Prose } from "../components/content/Prose.jsx";
import { TripMeta } from "../components/content/TripMeta.jsx";
import { JustifiedGallery } from "../components/media/JustifiedGallery.jsx";
import { Reveal } from "../components/motion/Reveal.jsx";
import { LabelChip } from "../components/ui/LabelChip.jsx";
import { SectionHeader } from "../components/ui/SectionHeader.jsx";
import { SequenceNav } from "../components/ui/SequenceNav.jsx";
import { getTrip } from "../lib/content.server.js";
import { formatDateRange, plural } from "../lib/format.js";
import { breadcrumbLd, galleryLd, seo, siteFrom } from "../lib/seo.js";

/** @param {{ params: { book?: string, trip?: string } }} args */
export const loader = ({ params }) => getTrip(params.book, params.trip);

/** @type {import("react-router").MetaFunction} */
export const meta = (args) => {
  const site = siteFrom(args.matches);
  const data = /** @type {any} */ (args.loaderData);
  if (!data) return seo(args, { title: "Travel", description: "" });
  const { trip, photos } = data;
  return seo(args, {
    title: trip.title,
    description: trip.summary,
    image: data.ogImage,
    imageAlt: trip.cover.alt,
    jsonLd: [
      galleryLd(site, trip, photos),
      breadcrumbLd(site, [
        { name: "Travel", path: "/travel" },
        { name: trip.bookTitle, path: `/travel/${trip.book}` },
        { name: trip.title, path: trip.href },
      ]),
    ],
  });
};

/** @param {any} t */
const sequenceItem = (t) =>
  t && { href: t.href, title: t.title, photo: t.cover, meta: formatDateRange(t.from, t.to) };

/**
 * A trip (the "Destination page"): a full-bleed clip (or cover) with the
 * title over it, story with a facts card,
 * the justified gallery with its lightbox, stories with this trip's label,
 * and the previous and next trips.
 * @param {{ loaderData: any }} props
 */
export default function Trip({ loaderData }) {
  const { trip, photos, stories, prev, next } = loaderData;
  const labelHref = stories.length ? `/blog/label/${trip.label}` : "#gallery";

  return (
    <>
      <MediaHero
        title={trip.title}
        video={trip.video}
        photo={trip.cover}
        morph
        crumbs={[
          { label: "Travel", href: "/travel" },
          { label: trip.bookTitle, href: `/travel/${trip.book}` },
          { label: trip.title },
        ]}
        meta={
          <>
            <span>{formatDateRange(trip.from, trip.to)}</span>
            {trip.place && <span>· {trip.place}</span>}
            <span>· {plural(trip.photoCount, "photo")}</span>
            <LabelChip label={trip.label} href={labelHref} tone="photo" className="ml-1" />
          </>
        }
      />

      <div className="mx-auto flex max-w-page flex-col gap-(--section) px-(--gutter) pt-(--section)">
        <section aria-labelledby="trip-about" className="grid gap-10 lg:grid-cols-12">
          <div className="flex flex-col gap-6 lg:col-span-8">
            <SectionHeader id="trip-about" title="About this trip" />
            <p className="max-w-reading font-subhead text-h2">{trip.summary}</p>
            <Prose html={trip.storyHtml} />
          </div>
          <TripMeta trip={trip} className="self-start lg:col-span-4 lg:mt-12" />
        </section>

        <section
          id="gallery"
          aria-labelledby="trip-gallery"
          className="flex scroll-mt-28 flex-col gap-6"
        >
          <SectionHeader id="trip-gallery" title={plural(photos.length, "photo")} />
          <JustifiedGallery
            photos={photos}
            trip={{ title: trip.title, label: trip.label, href: trip.href }}
          />
        </section>

        {stories.length > 0 && (
          <Reveal as="section" aria-labelledby="trip-stories" className="flex flex-col gap-6">
            <SectionHeader id="trip-stories" title="Stories from this trip" />
            <PostGrid posts={stories} />
          </Reveal>
        )}

        <SequenceNav prev={sequenceItem(prev)} next={sequenceItem(next)} noun="trip" />
      </div>
    </>
  );
}
