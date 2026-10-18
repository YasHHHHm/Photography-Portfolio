import { LabelFilter } from "../components/content/LabelFilter.jsx";
import { PageHeader } from "../components/content/PageHeader.jsx";
import { FeaturedPost, PostGrid } from "../components/content/PostCard.jsx";
import { Pagination } from "../components/ui/Pagination.jsx";
import { getBlogPage } from "../lib/content.server.js";
import { seo, siteFrom } from "../lib/seo.js";

/**
 * Serves /blog (page 1) and /blog/page/:n.
 * @param {{ params: { n?: string } }} args
 */
export const loader = ({ params }) => getBlogPage(params.n ? Number(params.n) : 1);

/** @type {import("react-router").MetaFunction} */
export const meta = (args) => {
  const page = /** @type {any} */ (args.loaderData)?.page ?? 1;
  const name = siteFrom(args.matches)?.name ?? "";
  return seo(args, {
    title: page > 1 ? `Journal, page ${page}` : "Journal",
    description: `Stories from the road by ${name}: the people, places and light behind the photographs.`,
  });
};

/** @param {number} n */
const pageHref = (n) => (n === 1 ? "/blog" : `/blog/page/${n}`);

/**
 * The journal: the featured story on page 1, the trip label filter, a card
 * grid that adapts to how many stories there are, and pagination.
 * @param {{ loaderData: any }} props
 */
export default function Blog({ loaderData }) {
  const { featured, posts, page, totalPages, labels } = loaderData;
  return (
    <div className="mx-auto flex max-w-page flex-col gap-(--section) px-(--gutter) pt-28 md:pt-36">
      <PageHeader title="Journal" label={page > 1 ? `Page ${page} of ${totalPages}` : undefined} />
      {featured && <FeaturedPost post={featured} />}
      {!featured && !posts.length && (
        <p className="max-w-prose text-ink-muted">No stories yet. The first one is on its way.</p>
      )}
      <div className="flex flex-col gap-10">
        <LabelFilter labels={labels} active={null} />
        <PostGrid posts={posts} />
      </div>
      <Pagination page={page} totalPages={totalPages} hrefFor={pageHref} className="self-center" />
    </div>
  );
}
