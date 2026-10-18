import { cx } from "../../lib/format.js";

/**
 * Loading shells. Pages arrive pre-rendered, so these only show during a
 * slow page change (after 150 ms) and while lazy parts load. Each matches
 * the size of the component it stands in for, so nothing jumps when the
 * real content arrives. The sheen stops for reduced-motion visitors.
 */

/** @param {{ className?: string, style?: import("react").CSSProperties }} props */
export function Bone({ className, style }) {
  return <div aria-hidden="true" className={cx("skeleton", className)} style={style} />;
}

/** Mono label line plus a display-size title. */
export function PageHeaderSkeleton() {
  return (
    <div className="flex flex-col gap-5">
      <Bone className="h-3 w-40 rounded-chip" />
      <Bone className="h-[clamp(3rem,8vw,7.5rem)] w-2/3 rounded-inner" />
    </div>
  );
}

/** The full-bleed Book or Trip hero (MediaHero's heights). */
export function MediaHeroSkeleton() {
  return <Bone className="h-[55svh] min-h-96 md:h-[65svh]" />;
}

/** The Home showreel card. */
export function ReelSkeleton() {
  return <Bone className="aspect-video rounded-card" />;
}

/** The Home hero card. */
export function HeroSkeleton() {
  return <Bone className="h-[75svh] rounded-card lg:h-[calc(100dvh-32px)]" />;
}

/** A 3:4 trip card. */
export function TripCardSkeleton() {
  return <Bone className="aspect-3/4 rounded-card" />;
}

/** One row of the Travel or Book list. */
export function BookRowSkeleton() {
  return (
    <div className="flex items-center gap-6 border-b border-line py-6">
      <Bone className="h-3 w-6 rounded-chip" />
      <Bone className="h-[clamp(2.25rem,5vw,4.5rem)] w-1/2 rounded-inner" />
      <Bone className="ml-auto hidden h-3 w-28 rounded-chip sm:block" />
    </div>
  );
}

/** A blog card: 4:3 image, meta, title, excerpt. */
export function PostCardSkeleton() {
  return (
    <div className="flex flex-col gap-4">
      <Bone className="aspect-4/3 rounded-card" />
      <Bone className="h-3 w-32 rounded-chip" />
      <Bone className="h-6 w-3/4 rounded-chip" />
      <Bone className="h-4 w-full rounded-chip" />
    </div>
  );
}

const GALLERY_ROWS = [
  [1.5, 0.67, 1.33],
  [0.8, 1.78, 1],
  [1.5, 1.5],
];

/** Justified gallery rows, using the same row height as the real gallery. */
export function GallerySkeleton() {
  return (
    <div className="flex flex-col gap-2">
      {GALLERY_ROWS.map((row, r) => (
        <div key={r} className="flex gap-2">
          {row.map((aspect, i) => (
            <Bone
              key={i}
              className="rounded-inner"
              style={{ flex: `${aspect} 1 calc(${aspect} * var(--row-h))`, height: "var(--row-h)" }}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

const LINE_WIDTHS = ["w-full", "w-11/12", "w-full", "w-4/5", "w-full", "w-10/12", "w-2/3"];

/** Paragraph lines in the reading column. */
export function ProseSkeleton() {
  return (
    <div className="flex max-w-reading flex-col gap-3">
      {LINE_WIDTHS.map((w, i) => (
        <Bone key={i} className={cx("h-4 rounded-chip", w)} />
      ))}
    </div>
  );
}

/** The contact form's fields and button. */
export function FormSkeleton() {
  return (
    <div className="flex flex-col gap-5">
      {[0, 1, 2].map((i) => (
        <div key={i} className="flex flex-col gap-2">
          <Bone className="h-3 w-20 rounded-chip" />
          <Bone className="h-12 rounded-inner" />
        </div>
      ))}
      <Bone className="h-32 rounded-inner" />
      <Bone className="h-11 w-40 rounded-pill" />
    </div>
  );
}

/**
 * The next page's shell, chosen from its URL.
 * @param {{ pathname: string }} props
 */
export function RouteSkeleton({ pathname }) {
  const segments = pathname.split("/").filter(Boolean);
  const [section] = segments;

  let body;
  let hero = false;
  if (!section) {
    body = (
      <div className="grid gap-4 lg:grid-cols-2">
        <HeroSkeleton />
        <div className="grid grid-cols-2 content-start gap-4 xl:grid-cols-3">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <TripCardSkeleton key={i} />
          ))}
        </div>
      </div>
    );
  } else if (section === "travel" && segments.length >= 2) {
    // Book and Trip pages open with a full-bleed hero, outside the column.
    hero = true;
    body = (
      <>
        <ProseSkeleton />
        {segments.length === 3 ? (
          <GallerySkeleton />
        ) : (
          [0, 1, 2].map((i) => <BookRowSkeleton key={i} />)
        )}
      </>
    );
  } else if (section === "travel") {
    body = (
      <>
        <PageHeaderSkeleton />
        {[0, 1, 2, 3].map((i) => (
          <BookRowSkeleton key={i} />
        ))}
      </>
    );
  } else if (section === "blog" && segments.length === 2) {
    body = (
      <>
        <PageHeaderSkeleton />
        <Bone className="aspect-video rounded-card" />
        <ProseSkeleton />
      </>
    );
  } else if (section === "blog") {
    body = (
      <>
        <Bone className="aspect-video rounded-card" />
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <PostCardSkeleton key={i} />
          ))}
        </div>
      </>
    );
  } else if (section === "about") {
    body = (
      <>
        <PageHeaderSkeleton />
        <ProseSkeleton />
        <FormSkeleton />
      </>
    );
  } else {
    body = (
      <>
        <PageHeaderSkeleton />
        <ProseSkeleton />
      </>
    );
  }

  return (
    <div aria-busy="true" className="flex flex-col gap-10 pb-(--section)">
      <p className="sr-only" role="status">
        Loading
      </p>
      {hero && <MediaHeroSkeleton />}
      <div
        className={cx(
          "mx-auto flex w-full max-w-page flex-col gap-10 px-(--gutter)",
          hero ? "pt-(--section)" : "pt-28",
        )}
      >
        {body}
      </div>
    </div>
  );
}
