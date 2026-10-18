import { LabelFilter } from "../components/content/LabelFilter.jsx";
import { PageHeader } from "../components/content/PageHeader.jsx";
import { PostGrid } from "../components/content/PostCard.jsx";
import { GhostLink } from "../components/ui/GhostLink.jsx";
import { getBlogLabel } from "../lib/content.server.js";
import { labelText, plural } from "../lib/format.js";
import { seo, siteFrom } from "../lib/seo.js";

/** @param {{ params: { label?: string } }} args */
export const loader = ({ params }) => getBlogLabel(params.label);

/** @type {import("react-router").MetaFunction} */
export const meta = (args) => {
  const label = /** @type {any} */ (args.loaderData)?.label;
  const name = siteFrom(args.matches)?.name ?? "";
  return seo(args, {
    title: `Stories from ${label?.title ?? ""}`,
    description: `Journal stories by ${name} from the ${label?.title ?? ""} trip.`,
  });
};

/**
 * Stories filtered by one trip label.
 * @param {{ loaderData: any }} props
 */
export default function BlogLabel({ loaderData }) {
  const { label, posts, labels } = loaderData;
  return (
    <div className="mx-auto flex max-w-page flex-col gap-(--section) px-(--gutter) pt-28 md:pt-36">
      <PageHeader
        crumbs={[{ label: "Journal", href: "/blog" }, { label: labelText(label.label) }]}
        title={label.title}
        meta={
          <>
            <span>{plural(label.count, "story")}</span>
            <GhostLink href={label.href} className="text-ink">
              See the trip →
            </GhostLink>
          </>
        }
      />
      <div className="flex flex-col gap-10">
        <LabelFilter labels={labels} active={label.label} />
        <PostGrid posts={posts} heading="h2" />
      </div>
    </div>
  );
}
