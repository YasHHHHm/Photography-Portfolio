import { cx, formatDate } from "../../lib/format.js";
import { Photo } from "../media/Photo.jsx";
import { AppLink } from "../ui/AppLink.jsx";
import { Button } from "../ui/Button.jsx";
import { LabelChip } from "../ui/LabelChip.jsx";

/**
 * @typedef {object} PostSummary
 * @property {string} slug
 * @property {string} title
 * @property {string} date
 * @property {string} excerpt
 * @property {string} href
 * @property {import("../../lib/photo-url.js").PhotoRecord} cover
 * @property {{ label: string, title: string }[]} labels
 * @property {number} readingTime
 * @property {boolean} [draft]
 */

/**
 * Date, label chips (linking to the blog filter) and a draft marker in dev.
 * @param {{ post: PostSummary }} props
 */
function PostMeta({ post }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <time dateTime={post.date} className="mono-label mr-1 text-ink-muted">
        {formatDate(post.date)}
      </time>
      {post.labels.map((l) => (
        <LabelChip
          key={l.label}
          label={l.label}
          href={`/blog/label/${l.label}`}
          className="relative z-10"
        />
      ))}
      {post.draft && (
        <span className="mono-label rounded-chip bg-ink px-2 py-1 text-bg">Draft</span>
      )}
    </div>
  );
}

/**
 * A blog card: 4:3 photo, date and label chips, title, a two-line excerpt
 * and the reading time. The title link stretches over the whole card, so
 * the chips stay separate links (no nested links).
 *
 * `wide` lays the card out horizontally (a page with a single post, or the
 * latest post on Home).
 *
 * @param {object} props
 * @param {PostSummary} props.post
 * @param {string} props.sizes
 * @param {boolean} [props.wide]
 * @param {"h2" | "h3"} [props.heading]
 * @param {string} [props.className]
 */
export function PostCard({ post, sizes, wide = false, heading: Heading = "h3", className }) {
  return (
    <article
      className={cx(
        "group relative grid content-start gap-5",
        wide && "md:grid-cols-2 md:items-center md:gap-8",
        className,
      )}
    >
      <div className="overflow-hidden rounded-card">
        <Photo
          photo={post.cover}
          alt=""
          sizes={sizes}
          className="aspect-4/3! w-full object-cover transition-transform duration-(--dur-slow) ease-out group-hover:scale-103 group-focus-within:scale-103"
        />
      </div>
      <div className="flex flex-col gap-3">
        <PostMeta post={post} />
        <Heading className={cx("font-subhead font-medium", wide ? "text-h2" : "text-h3")}>
          <AppLink to={post.href} className="after:absolute after:inset-0 after:rounded-card">
            {post.title}
          </AppLink>
        </Heading>
        <p className="line-clamp-2 text-ink-muted">{post.excerpt}</p>
        <p className="mono-label text-ink-muted">{post.readingTime} min read</p>
      </div>
    </article>
  );
}

/**
 * The blog's top story: a large photo (the page's priority image), the title
 * in display type, the excerpt, date, labels and a "Read story" button.
 * @param {{ post: PostSummary }} props
 */
export function FeaturedPost({ post }) {
  return (
    <article className="grid gap-8 lg:grid-cols-12 lg:items-end">
      <AppLink
        to={post.href}
        tabIndex={-1}
        aria-hidden="true"
        className="block overflow-hidden rounded-card lg:col-span-7"
      >
        <Photo
          photo={post.cover}
          alt=""
          sizes="(min-width: 1440px) 820px, (min-width: 1024px) 57vw, 100vw"
          priority
          className="aspect-4/3! w-full object-cover"
        />
      </AppLink>
      <div className="flex flex-col gap-5 lg:col-span-5">
        <p className="mono-label text-ink-muted">Featured story</p>
        <h2 className="font-display text-display-l">
          <AppLink to={post.href} className="hover:opacity-80">
            {post.title}
          </AppLink>
        </h2>
        <p className="max-w-prose text-ink-muted">{post.excerpt}</p>
        <PostMeta post={post} />
        <div>
          <Button href={post.href} arrow>
            Read story
          </Button>
        </div>
      </div>
    </article>
  );
}

/**
 * Blog cards, adapting to how many there are: one fills a wide horizontal
 * card, two sit side by side, three or more make three columns on desktop
 * (two on tablets, one on phones).
 * @param {object} props
 * @param {PostSummary[]} props.posts
 * @param {"h2" | "h3"} [props.heading]  Card title level: h2 when no section heading sits above
 * @param {string} [props.className]
 */
export function PostGrid({ posts, heading = "h3", className }) {
  if (!posts.length) return null;
  if (posts.length === 1) {
    return (
      <PostCard
        post={posts[0]}
        wide
        heading={heading}
        sizes="(min-width: 768px) 50vw, 100vw"
        className={className}
      />
    );
  }
  return (
    <div
      className={cx(
        "grid gap-x-(--gutter) gap-y-12 sm:grid-cols-2",
        posts.length >= 3 && "lg:grid-cols-3",
        className,
      )}
    >
      {posts.map((post) => (
        <PostCard
          key={post.slug}
          post={post}
          heading={heading}
          sizes={
            posts.length >= 3
              ? "(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
              : "(min-width: 640px) 50vw, 100vw"
          }
        />
      ))}
    </div>
  );
}
