/**
 * Search and social metadata for each route's `meta()` export: title,
 * description, canonical URL, Open Graph and Twitter cards, and JSON-LD
 * structured data (PRD section 9).
 */
import { fallbackUrl } from "./photo-url.js";

/**
 * @typedef {object} SiteMeta
 * @property {string} name
 * @property {string} role
 * @property {string} bio
 * @property {string} location
 * @property {string} origin  e.g. "https://example.com" (no trailing slash)
 * @property {boolean} indexable  False on preview deployments
 * @property {string | null} ogImage  The site's social image (the photographer's portrait)
 * @property {string | null} ogImageAlt
 * @property {{ url: string }[]} socials
 */

/** Placeholder values such as {{HANDLE}} must never reach search engines. */
const PLACEHOLDER = /\{\{[A-Z0-9_]+\}\}/;

/**
 * The site settings from the root loader, as seen by a route's meta().
 * @param {import("react-router").MetaArgs["matches"]} matches
 * @returns {SiteMeta}
 */
export function siteFrom(matches) {
  const root = /** @type {any} */ (matches.find((m) => m?.id === "root"));
  return (root?.loaderData ?? root?.data)?.site;
}

/**
 * "Kerala — Krish Bhatia", or "Krish Bhatia — Photographer & Videographer" for Home.
 * @param {import("react-router").MetaArgs["matches"]} matches
 * @param {string} [title]
 */
export function pageTitle(matches, title) {
  const site = siteFrom(matches);
  return title ? `${title} — ${site?.name ?? ""}` : `${site?.name ?? ""} — ${site?.role ?? ""}`;
}

/**
 * An absolute URL on this site.
 * @param {SiteMeta} site
 * @param {string} path  "/travel" or an absolute URL
 */
export function absoluteUrl(site, path) {
  return /^https?:\/\//.test(path) ? path : `${site.origin}${path}`;
}

/**
 * Plain text from rendered Markdown, cut at a word near `max` characters.
 * @param {string} text
 * @param {number} [max]
 */
export function plainText(text, max = 160) {
  const plain = text
    .replace(/<[^>]+>/g, " ")
    .replace(/&[a-z#0-9]+;/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (plain.length <= max) return plain;
  return `${plain.slice(0, plain.lastIndexOf(" ", max - 1))}…`;
}

/**
 * @typedef {object} SeoInput
 * @property {string} [title]  Omit on Home
 * @property {string} description
 * @property {string | null} [image]  A 1200 × 630 social image path; defaults to the site's
 * @property {string} [imageAlt]
 * @property {"website" | "article" | "profile"} [type]
 * @property {Record<string, unknown>[]} [jsonLd]
 * @property {boolean} [noindex]
 * @property {import("react-router").MetaDescriptor[]} [extra]
 */

/**
 * Every meta tag a page needs.
 * @param {Pick<import("react-router").MetaArgs, "matches" | "location">} args
 * @param {SeoInput} input
 * @returns {import("react-router").MetaDescriptor[]}
 */
export function seo({ matches, location }, input) {
  const site = siteFrom(matches);
  if (!site) return [{ title: input.title ?? "" }];

  const title = pageTitle(matches, input.title);
  const path = location.pathname === "/" ? "/" : location.pathname.replace(/\/+$/, "");
  const url = absoluteUrl(site, path);
  // A page without its own social image shares the site's, with that image's alt text.
  const image = input.image || site.ogImage;
  const imageAlt = input.image ? input.imageAlt : site.ogImageAlt;
  const description = plainText(input.description);

  /** @type {import("react-router").MetaDescriptor[]} */
  const tags = [
    { title },
    { name: "description", content: description },
    { tagName: "link", rel: "canonical", href: url },
    { property: "og:type", content: input.type ?? "website" },
    { property: "og:site_name", content: site.name },
    { property: "og:title", content: title },
    { property: "og:description", content: description },
    { property: "og:url", content: url },
    { property: "og:locale", content: "en" },
    { name: "twitter:card", content: image ? "summary_large_image" : "summary" },
    { name: "twitter:title", content: title },
    { name: "twitter:description", content: description },
  ];
  if (image) {
    const src = absoluteUrl(site, image);
    tags.push(
      { property: "og:image", content: src },
      { property: "og:image:width", content: "1200" },
      { property: "og:image:height", content: "630" },
      { property: "og:image:alt", content: imageAlt || title },
      { name: "twitter:image", content: src },
    );
  }
  if (input.noindex || !site.indexable) tags.push({ name: "robots", content: "noindex" });
  for (const data of input.jsonLd ?? []) tags.push({ "script:ld+json": data });
  return [...tags, ...(input.extra ?? [])];
}

// ── JSON-LD ──────────────────────────────────────────────────────────────

/**
 * The photographer, for Home and About.
 * @param {SiteMeta} site
 * @param {import("./photo-url.js").PhotoRecord | null} [photo]
 */
export function personLd(site, photo) {
  return {
    "@context": "https://schema.org",
    "@type": "Person",
    name: site.name,
    jobTitle: site.role,
    description: site.bio,
    url: `${site.origin}/`,
    homeLocation: { "@type": "Place", name: site.location },
    ...(photo && { image: absoluteUrl(site, fallbackUrl(photo)) }),
    sameAs: site.socials.map((s) => s.url).filter((u) => !PLACEHOLDER.test(u)),
  };
}

/**
 * Travel › India › Kerala.
 * @param {SiteMeta} site
 * @param {{ name: string, path: string }[]} crumbs
 */
export function breadcrumbLd(site, crumbs) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: crumbs.map((crumb, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: crumb.name,
      item: absoluteUrl(site, crumb.path),
    })),
  };
}

/**
 * A trip's photographs.
 * @param {SiteMeta} site
 * @param {{ title: string, summary: string, href: string, from: string }} trip
 * @param {import("./photo-url.js").PhotoRecord[]} photos
 */
export function galleryLd(site, trip, photos) {
  return {
    "@context": "https://schema.org",
    "@type": "ImageGallery",
    name: trip.title,
    description: trip.summary,
    url: absoluteUrl(site, trip.href),
    dateCreated: trip.from,
    author: { "@type": "Person", name: site.name },
    image: photos.map((photo) => ({
      "@type": "ImageObject",
      contentUrl: absoluteUrl(site, fallbackUrl(photo)),
      width: photo.width,
      height: photo.height,
      description: photo.alt,
      ...(photo.caption && { caption: photo.caption }),
      creator: { "@type": "Person", name: site.name },
      copyrightNotice: `© ${site.name}`,
    })),
  };
}

/**
 * A journal story.
 * @param {SiteMeta} site
 * @param {{ title: string, excerpt: string, date: string, href: string, labels: { title: string }[] }} post
 * @param {string | null} image  Its social image path
 */
export function postingLd(site, post, image) {
  return {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.title,
    description: post.excerpt,
    datePublished: post.date,
    dateModified: post.date,
    url: absoluteUrl(site, post.href),
    mainEntityOfPage: absoluteUrl(site, post.href),
    author: { "@type": "Person", name: site.name, url: `${site.origin}/about` },
    ...(image && { image: absoluteUrl(site, image) }),
    ...(post.labels.length && { keywords: post.labels.map((l) => l.title).join(", ") }),
  };
}
