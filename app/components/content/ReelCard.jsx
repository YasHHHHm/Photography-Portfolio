import { ArrowUpRight, Play } from "lucide-react";
import { lazy, Suspense, useState } from "react";

import { embedUrl } from "../../lib/embed.js";
import { BackgroundVideo } from "../media/BackgroundVideo.jsx";
import { Button } from "../ui/Button.jsx";

const loadDialog = () => import("../media/VideoDialog.jsx");
const VideoDialog = lazy(loadDialog);

/**
 * @typedef {object} Reel
 * @property {import("../../lib/photo-url.js").VideoRecord} video
 * @property {string | null} title
 * @property {string | null} link  The full reel on YouTube or Vimeo
 */

/**
 * The Home showreel: a silent loop in a 16:9 card in the bento column. It
 * starts only once the page has loaded and the card is on screen. With a
 * YouTube or Vimeo link, "Watch the reel" opens the full film with sound in
 * a player that loads only then; any other link opens in a new tab.
 *
 * @param {{ reel: Reel, className?: string }} props
 */
export function ReelCard({ reel, className }) {
  const [open, setOpen] = useState(false);
  const title = reel.title ?? "Showreel";
  const player = reel.link ? embedUrl(reel.link) : null;

  return (
    <section aria-labelledby="home-reel" className={className}>
      <BackgroundVideo
        video={reel.video}
        sizes="(min-width: 1024px) 48vw, 100vw"
        className="aspect-video rounded-card"
        controlClassName="right-3 top-3"
        suspended={open}
      >
        <div className="pointer-events-none absolute inset-0 bg-linear-to-t from-scrim via-transparent to-transparent" />
        <div className="absolute inset-x-0 bottom-0 flex flex-wrap items-end justify-between gap-4 p-5 text-on-photo">
          <div className="flex flex-col gap-2">
            <p className="mono-label">Moving pictures</p>
            <h2 id="home-reel" className="font-subhead text-h2">
              {title}
            </h2>
          </div>
          {player && (
            <Button
              onClick={() => setOpen(true)}
              icon={<Play aria-hidden="true" size={14} strokeWidth={2} />}
              onPointerEnter={loadDialog}
              onFocus={loadDialog}
            >
              Watch the reel
            </Button>
          )}
          {reel.link && !player && (
            <Button
              href={reel.link}
              rel="noopener noreferrer"
              target="_blank"
              icon={<ArrowUpRight aria-hidden="true" size={14} strokeWidth={2} />}
            >
              Watch the reel
            </Button>
          )}
        </div>
      </BackgroundVideo>
      {open && player && (
        <Suspense fallback={null}>
          <VideoDialog src={player} title={title} onClose={() => setOpen(false)} />
        </Suspense>
      )}
    </section>
  );
}
