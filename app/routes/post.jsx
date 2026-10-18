import { FromTripCard } from "../components/content/FromTripCard.jsx";
import { PostGrid } from "../components/content/PostCard.jsx";
import { Prose } from "../components/content/Prose.jsx";
import { Photo } from "../components/media/Photo.jsx";
import { LabelChip } from "../components/ui/LabelChip.jsx";
import { SectionHeader } from "../components/ui/SectionHeader.jsx";
import { SequenceNav } from "../components/ui/SequenceNav.jsx";
import { getPost } from "../lib/content.server.js";
import { formatDate } from "../lib/format.js";
import { breadcrumbLd, postingLd, seo, siteFrom } from "../lib/seo.js";

/** @param {{ params: { slug?: string } }} args */
export const loader = ({ params }) => getPost(params.slug);

/** @type {import("react-router").MetaFunction} */
export const meta = (args) => {
  const site = siteFrom(args.matches);
  const data = /** @type {any} */ (args.loaderData);
  if (!data) return seo(args, { title: "Journal", description: "" });
  const { post, ogImage } = data;
  return seo(args, {
    title: post.title,
    description: post.excerpt,
    image: ogImage,
    imageAlt: post.cover.alt,
    type: "article",
    jsonLd: [
      postingLd(site, post, ogImage),
      breadcrumbLd(site, [
        { name: "Journal", path: "/blog" },
        { name: post.title, path: post.href },
      ]),
    ],
    extra: [{ property: "article:published_time", content: post.date }],
  });
};

/** @param {any} p */
const sequenceItem = (p) =>
  p && { href: p.href, title: p.title, photo: p.cover, meta: formatDate(p.date) };

/**
 * A story: mono date line, title, label chips, cover with caption, the text
 * in a 720 px column ("wide" photos break out to the page width), then the
 * trips it belongs to, related stories and the previous and next story.
 * @param {{ loaderData: any }} props
 */
export default function Post({ loaderData }) {
  const { post, fromTrips, related, prev, next } = loaderData;
  return (
    <article className="breakout flex flex-col gap-12 pt-28 md:pt-36">
      <header className="mx-auto flex w-full max-w-reading flex-col gap-5 px-(--gutter)">
        <p className="mono-label text-ink-muted">
          Journal · <time dateTime={post.date}>{formatDate(post.date)}</time> · {post.readingTime}{" "}
          min read
          {post.draft && " · Draft"}
        </p>
        <h1 className="font-display text-display-l">{post.title}</h1>
        {post.labels.length > 0 && (
          <ul className="flex flex-wrap gap-2">
            {post.labels.map((/** @type {any} */ l) => (
              <li key={l.label}>
                <LabelChip label={l.label} href={`/blog/label/${l.label}`} />
              </li>
            ))}
          </ul>
        )}
      </header>

      <figure className="mx-auto flex w-full max-w-page flex-col gap-3 px-(--gutter)">
        <Photo
          photo={post.cover}
          sizes="(min-width: 1440px) 1408px, calc(100vw - 32px)"
          priority
          className="max-h-[80svh] w-full rounded-card object-cover"
        />
        {post.cover.caption && (
          <figcaption className="text-body-s text-ink-muted">{post.cover.caption}</figcaption>
        )}
      </figure>

      <Prose html={post.html} className="mx-auto w-full px-(--gutter)" />

      <footer className="mx-auto mt-(--section) flex w-full max-w-page flex-col gap-(--section) px-(--gutter)">
        {fromTrips.length > 0 && (
          <div className="grid gap-(--gutter) md:grid-cols-2">
            {fromTrips.map((/** @type {any} */ trip) => (
              <FromTripCard key={trip.label} trip={trip} />
            ))}
          </div>
        )}
        {related.length > 0 && (
          <section aria-labelledby="post-related" className="flex flex-col gap-6">
            <SectionHeader
              id="post-related"
              title="Related stories"
              href="/blog"
              linkLabel="All stories"
            />
            <PostGrid posts={related} />
          </section>
        )}
        <SequenceNav prev={sequenceItem(prev)} next={sequenceItem(next)} noun="story" />
      </footer>
    </article>
  );
}
