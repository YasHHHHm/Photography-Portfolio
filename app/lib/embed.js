/**
 * Turns a YouTube or Vimeo address into its embeddable player, with privacy
 * settings (no cookies before play, no tracking) and autoplay with sound,
 * since it only ever loads after the visitor presses play.
 * @param {string} link  e.g. https://www.youtube.com/watch?v=abc or https://vimeo.com/123
 * @returns {string | null}  null when the address is not a YouTube or Vimeo video
 */
export function embedUrl(link) {
  let url;
  try {
    url = new URL(link);
  } catch {
    return null;
  }
  const host = url.hostname.replace(/^www\.|^m\./, "");

  let youtube = null;
  if (host === "youtu.be") youtube = url.pathname.slice(1);
  if (host === "youtube.com" || host === "youtube-nocookie.com") {
    youtube =
      url.searchParams.get("v") ??
      /^\/(?:embed|shorts|live)\/([\w-]+)/.exec(url.pathname)?.[1] ??
      null;
  }
  if (youtube && /^[\w-]{6,}$/.test(youtube)) {
    return `https://www.youtube-nocookie.com/embed/${youtube}?autoplay=1&rel=0&playsinline=1`;
  }

  if (host === "vimeo.com" || host === "player.vimeo.com") {
    const [, id, hash] = /\/(\d{5,})(?:\/([\da-f]+))?/.exec(url.pathname) ?? [];
    // Unlisted videos carry a privacy hash: vimeo.com/123/abc or ?h=abc.
    const h = hash ?? url.searchParams.get("h");
    if (id) {
      return `https://player.vimeo.com/video/${id}?${h ? `h=${encodeURIComponent(h)}&` : ""}autoplay=1&dnt=1&title=0&byline=0&portrait=0`;
    }
  }
  return null;
}
