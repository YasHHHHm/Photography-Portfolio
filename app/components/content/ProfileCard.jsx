import { ArrowUpRight } from "lucide-react";

import { cx } from "../../lib/format.js";
import { Photo } from "../media/Photo.jsx";
import { AppLink } from "../ui/AppLink.jsx";
import { SocialIcon } from "../ui/SocialIcon.jsx";

/**
 * Home profile card: round avatar, name (the page's h1), role and bio.
 * @param {object} props
 * @param {{ name: string, role: string, bio: string, avatar: import("../../lib/photo-url.js").PhotoRecord | null }} props.profile
 * @param {string} [props.className]
 */
export function ProfileCard({ profile, className }) {
  return (
    <div
      className={cx("flex flex-col justify-between gap-8 rounded-card bg-surface p-6", className)}
    >
      {profile.avatar && (
        <Photo
          photo={profile.avatar}
          alt=""
          sizes="72px"
          eager
          className="aspect-square! size-18 rounded-pill object-cover"
        />
      )}
      <div className="@container flex flex-col gap-3">
        <h1
          className="name-fit font-display text-display-l"
          style={/** @type {any} */ ({ "--name-chars": profile.name.length })}
        >
          {profile.name}
        </h1>
        <p className="mono-label text-ink-muted">{profile.role}</p>
        <p className="max-w-prose text-ink-muted">{profile.bio}</p>
      </div>
    </div>
  );
}

/**
 * Social link cards, 72 px tall, with the inverted "Contact me" card last.
 * A column beside the profile card on desktop; a 2 × 2 grid on small screens.
 * @param {object} props
 * @param {{ label: string, url: string, icon: string, iconPath: string | null }[]} props.socials
 * @param {string} [props.className]
 */
export function SocialCards({ socials, className }) {
  const card =
    "flex h-18 items-center justify-between gap-3 rounded-inner px-5 text-body-s font-medium transition-colors duration-(--dur-fast) ease-out";
  return (
    <ul className={cx("grid grid-cols-2 gap-(--gutter) lg:grid-cols-1", className)}>
      {socials.map((s) => (
        <li key={s.url}>
          <a
            href={s.url}
            rel="noopener"
            className={cx(card, "bg-surface hover:bg-surface-2")}
            target="_blank"
          >
            {s.label}
            <SocialIcon icon={s.icon} path={s.iconPath} size={18} className="text-ink-muted" />
          </a>
        </li>
      ))}
      <li>
        <AppLink
          to="/about#contact"
          className={cx(card, "bg-invert-bg text-invert-ink hover:opacity-90")}
        >
          Contact me
          <ArrowUpRight aria-hidden="true" size={18} strokeWidth={1.75} />
        </AppLink>
      </li>
    </ul>
  );
}
