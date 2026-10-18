import { useRouteLoaderData } from "react-router";

import { Photo } from "../components/media/Photo.jsx";
import { Button } from "../components/ui/Button.jsx";
import { seo } from "../lib/seo.js";

/** @type {import("react-router").MetaFunction} */
export const meta = (args) =>
  seo(args, {
    title: "Lost in transit",
    description: "This page has moved, or it never existed.",
    noindex: true,
  });

/**
 * Unknown URLs. Pre-rendered at /404 and served as 404.html; the photo is
 * picked at build time and arrives with the root loader's data, so this
 * route needs no loader and also works for client-side navigation.
 */
export default function NotFound() {
  const { site } = /** @type {any} */ (useRouteLoaderData("root"));
  const photo = site.notFoundPhoto;

  return (
    <section className="relative flex min-h-svh items-end overflow-hidden">
      {photo && (
        <Photo
          photo={photo}
          alt=""
          sizes="100vw"
          priority
          className="absolute inset-0 h-full w-full object-cover"
        />
      )}
      <div className="absolute inset-0 bg-linear-to-t from-scrim via-scrim/40 to-transparent" />
      <div className="relative mx-auto flex w-full max-w-page flex-col gap-6 px-(--gutter) pb-(--section) text-on-photo">
        <p className="mono-label">404</p>
        <h1 className="font-display text-display-xl">Lost in transit</h1>
        <p className="max-w-prose">
          This page has moved, or it never existed. The photographs are still here.
        </p>
        <div className="flex flex-wrap gap-3">
          <Button href="/" arrow>
            Back home
          </Button>
          <Button href="/travel" variant="secondary">
            Browse travel
          </Button>
        </div>
      </div>
    </section>
  );
}
