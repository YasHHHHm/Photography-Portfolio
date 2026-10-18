import { Fragment } from "react";

import { cx } from "../../lib/format.js";
import { BackgroundVideo } from "../media/BackgroundVideo.jsx";
import { Photo } from "../media/Photo.jsx";
import { AppLink } from "../ui/AppLink.jsx";

/** The hero's box (MediaHeroSkeleton repeats these heights). */
const MEDIA_HERO_BOX = "flex h-[55svh] min-h-96 flex-col justify-end md:h-[65svh]";

/**
 * The opening of a Book or Trip page: a full-bleed background clip (or the
 * cover photo when there is no clip) with the breadcrumb, the huge title and
 * a mono meta line over it, on a scrim.
 *
 * The clip's first frame (or the cover) is the page's priority image. With
 * `morph`, it is also where a trip card's photo lands during the page
 * transition.
 *
 * @param {object} props
 * @param {string} props.title
 * @param {import("../../lib/photo-url.js").VideoRecord | null} [props.video]
 * @param {import("../../lib/photo-url.js").PhotoRecord} props.photo  Shown when there is no clip
 * @param {import("./PageHeader.jsx").Crumb[]} [props.crumbs]
 * @param {import("react").ReactNode} [props.meta]
 * @param {boolean} [props.morph]
 */
export function MediaHero({ title, video, photo, crumbs = [], meta, morph = false }) {
  const morphStyle = morph ? { viewTransitionName: "trip-cover" } : undefined;
  // Text first, so the pause button comes after the title in tab order.
  const text = (
    <>
      <div className="pointer-events-none absolute inset-0 bg-linear-to-t from-scrim via-scrim/30 to-transparent" />
      <div className="relative mx-auto flex w-full max-w-page flex-col gap-4 ps-(--gutter) pe-20 pb-10 text-on-photo md:pb-14">
        {crumbs.length > 0 && (
          <nav aria-label="Breadcrumb">
            <ol className="mono-label flex flex-wrap items-center gap-2">
              {crumbs.map((crumb, i) => (
                <Fragment key={crumb.label}>
                  {i > 0 && (
                    <li aria-hidden="true" className="opacity-70">
                      /
                    </li>
                  )}
                  <li>
                    {crumb.href ? (
                      <AppLink to={crumb.href} className="ghost-link">
                        {crumb.label}
                      </AppLink>
                    ) : (
                      <span aria-current="page">{crumb.label}</span>
                    )}
                  </li>
                </Fragment>
              ))}
            </ol>
          </nav>
        )}
        <h1 className="font-display text-display-xl">{title}</h1>
        {meta && (
          <div className="mono-label flex flex-wrap items-center gap-x-3 gap-y-2">{meta}</div>
        )}
      </div>
    </>
  );

  return (
    <header>
      {video ? (
        <BackgroundVideo
          // A fresh player per clip: going from trip to trip, the last clip's
          // frame must not cover the next trip's poster.
          key={video.id}
          video={video}
          sizes="100vw"
          priority
          className={MEDIA_HERO_BOX}
          posterStyle={morphStyle}
          controlClassName="right-(--gutter) bottom-10 md:bottom-14"
        >
          {text}
        </BackgroundVideo>
      ) : (
        <div className={cx("relative", MEDIA_HERO_BOX)}>
          <Photo
            photo={photo}
            alt=""
            sizes="100vw"
            priority
            className="absolute inset-0 h-full w-full object-cover"
            style={morphStyle}
          />
          {text}
        </div>
      )}
    </header>
  );
}
