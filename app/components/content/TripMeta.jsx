import { cx, formatDateRange, plural } from "../../lib/format.js";

/**
 * The facts card beside a trip's story: dates, places, photo count and the
 * cameras and lenses used (gathered from the photos' EXIF at build time).
 * @param {object} props
 * @param {{ from: string, to: string | null, place: string | null, photoCount: number, cameras: string[], lenses: string[] }} props.trip
 * @param {string} [props.className]
 */
export function TripMeta({ trip, className }) {
  const rows = [
    ["Dates", formatDateRange(trip.from, trip.to)],
    ["Places", trip.place],
    ["Photos", plural(trip.photoCount, "photo")],
    ["Cameras", trip.cameras.join(", ")],
    ["Lenses", trip.lenses.join(", ")],
  ].filter(([, value]) => value);

  return (
    <dl className={cx("flex flex-col rounded-card bg-surface p-6", className)}>
      {rows.map(([term, value]) => (
        <div
          key={term}
          className="flex flex-col gap-1 border-b border-line py-3 first:pt-0 last:border-0 last:pb-0"
        >
          <dt className="mono-label text-ink-muted">{term}</dt>
          <dd className="text-body-s">{value}</dd>
        </div>
      ))}
    </dl>
  );
}
