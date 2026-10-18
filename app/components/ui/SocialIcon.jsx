import { ArrowUpRight, Globe } from "lucide-react";

/**
 * A social brand icon. The SVG path comes with the site data (copied from
 * Simple Icons at build time), so pages ship only the icons they use.
 * Brands Simple Icons does not carry fall back to a plain arrow.
 * @param {object} props
 * @param {string} props.icon  e.g. "instagram"
 * @param {string | null} [props.path]  The brand's SVG path
 * @param {number} [props.size]
 * @param {string} [props.className]
 */
export function SocialIcon({ icon, path, size = 20, className }) {
  if (path) {
    return (
      <svg
        viewBox="0 0 24 24"
        width={size}
        height={size}
        fill="currentColor"
        aria-hidden="true"
        className={className}
      >
        <path d={path} />
      </svg>
    );
  }
  const Fallback = icon === "website" ? Globe : ArrowUpRight;
  return <Fallback aria-hidden="true" size={size} strokeWidth={1.75} className={className} />;
}
