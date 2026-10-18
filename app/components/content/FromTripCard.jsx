import { ArrowRight } from "lucide-react";

import { formatDateRange, plural } from "../../lib/format.js";
import { Photo } from "../media/Photo.jsx";
import { AppLink } from "../ui/AppLink.jsx";

/**
 * "From the trip" at the end of a post: the trip's title with four of its
 * photos, linking to the trip.
 * @param {object} props
 * @param {{ title: string, href: string, from: string, to: string | null, photoCount: number, thumbs: import("../../lib/photo-url.js").PhotoRecord[] }} props.trip
 */
export function FromTripCard({ trip }) {
  return (
    <AppLink
      to={trip.href}
      className="group flex flex-col gap-5 rounded-card bg-surface p-5 transition-colors duration-(--dur-fast) ease-out hover:bg-surface-2"
    >
      <div className="flex items-end justify-between gap-4">
        <div className="flex flex-col gap-2">
          <span className="mono-label text-ink-muted">From the trip</span>
          <span className="font-display text-display-l">{trip.title}</span>
          <span className="mono-label text-ink-muted">
            {formatDateRange(trip.from, trip.to)} · {plural(trip.photoCount, "photo")}
          </span>
        </div>
        <ArrowRight
          aria-hidden="true"
          size={20}
          strokeWidth={1.5}
          className="shrink-0 transition-transform duration-(--dur-base) ease-out group-hover:translate-x-1"
        />
      </div>
      <div className="grid grid-cols-4 gap-2">
        {trip.thumbs.map((photo) => (
          <Photo
            key={photo.id}
            photo={photo}
            alt=""
            sizes="(min-width: 768px) 160px, 25vw"
            className="aspect-square! w-full rounded-inner object-cover"
          />
        ))}
      </div>
    </AppLink>
  );
}
