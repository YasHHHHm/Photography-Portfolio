import { PageHeader } from "../components/content/PageHeader.jsx";
import { Prose } from "../components/content/Prose.jsx";
import { RowList } from "../components/content/RowList.jsx";
import { getTravel } from "../lib/content.server.js";
import { plural } from "../lib/format.js";
import { plainText, seo, siteFrom } from "../lib/seo.js";

export const loader = () => getTravel();

/** @type {import("react-router").MetaFunction} */
export const meta = (args) => {
  const data = /** @type {any} */ (args.loaderData);
  const name = siteFrom(args.matches)?.name ?? "";
  return seo(args, {
    title: "Travel Books",
    description: plainText(data?.introHtml ?? "") || `Every trip by ${name}, grouped by country.`,
  });
};

/**
 * Travel Books: every book as a full-width row, with the cursor-follow
 * preview on desktop and thumbnails on touch screens.
 * @param {{ loaderData: any }} props
 */
export default function Travel({ loaderData }) {
  const { books, totals, introHtml } = loaderData;
  return (
    <div className="mx-auto flex max-w-page flex-col gap-(--section) px-(--gutter) pt-28 md:pt-36">
      <PageHeader
        title="Travel Books"
        meta={`${plural(totals.books, "book")} · ${plural(totals.trips, "trip")} · ${plural(totals.photos, "photo")}`}
      >
        <Prose html={introHtml} className="max-w-prose" />
      </PageHeader>

      <RowList
        label="Travel books"
        items={books.map((/** @type {any} */ book) => ({
          href: book.href,
          title: book.title,
          meta: `${plural(book.tripCount, "trip")} · ${
            book.years[0] === book.years[1] ? book.years[0] : `${book.years[0]}–${book.years[1]}`
          }`,
          photo: book.cover,
        }))}
      />
    </div>
  );
}
