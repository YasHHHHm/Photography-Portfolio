import { MediaHero } from "../components/content/MediaHero.jsx";
import { PostGrid } from "../components/content/PostCard.jsx";
import { Prose } from "../components/content/Prose.jsx";
import { RowList } from "../components/content/RowList.jsx";
import { Reveal } from "../components/motion/Reveal.jsx";
import { SectionHeader } from "../components/ui/SectionHeader.jsx";
import { getBook } from "../lib/content.server.js";
import { formatDateRange, plural } from "../lib/format.js";
import { breadcrumbLd, seo, siteFrom } from "../lib/seo.js";

/** @param {{ params: { book?: string } }} args */
export const loader = ({ params }) => getBook(params.book);

/** @type {import("react-router").MetaFunction} */
export const meta = (args) => {
  const site = siteFrom(args.matches);
  const data = /** @type {any} */ (args.loaderData);
  if (!data) return seo(args, { title: "Travel", description: "" });
  return seo(args, {
    title: data.book.title,
    description: data.book.summary,
    image: data.ogImage,
    jsonLd: [
      breadcrumbLd(site, [
        { name: "Travel", path: "/travel" },
        { name: data.book.title, path: data.book.href },
      ]),
    ],
  });
};

/**
 * A book: a full-bleed clip (or cover) with the title over it, the description, its
 * trips as rows, and up to three stories from those trips.
 * @param {{ loaderData: any }} props
 */
export default function Book({ loaderData }) {
  const { book, trips, stories } = loaderData;
  const years =
    book.years[0] === book.years[1] ? book.years[0] : `${book.years[0]}–${book.years[1]}`;

  return (
    <>
      <MediaHero
        title={book.title}
        video={book.video}
        photo={book.cover}
        crumbs={[{ label: "Travel", href: "/travel" }]}
        meta={
          <span>
            {plural(book.tripCount, "trip")} · {plural(book.photoCount, "photo")} · {years}
          </span>
        }
      />

      <div className="mx-auto flex max-w-page flex-col gap-(--section) px-(--gutter) pt-(--section)">
        <section aria-label="About this book" className="flex max-w-reading flex-col gap-6">
          <p className="font-subhead text-h2">{book.summary}</p>
          <Prose html={book.storyHtml} />
        </section>

        <section aria-labelledby="book-trips" className="flex flex-col gap-6">
          <SectionHeader id="book-trips" title="Trips in this book" />
          <RowList
            items={trips.map((/** @type {any} */ trip) => ({
              href: trip.href,
              title: trip.title,
              sub: trip.place ?? undefined,
              meta: `${formatDateRange(trip.from, trip.to)} · ${plural(trip.photoCount, "photo")}`,
              photo: trip.cover,
            }))}
          />
        </section>

        {stories.length > 0 && (
          <Reveal as="section" aria-labelledby="book-stories" className="flex flex-col gap-6">
            <SectionHeader
              id="book-stories"
              title="Stories from this book"
              href="/blog"
              linkLabel="All stories"
            />
            <PostGrid posts={stories} />
          </Reveal>
        )}
      </div>
    </>
  );
}
