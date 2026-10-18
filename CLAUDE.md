# CLAUDE.md

Static, image-first travel photography portfolio. The full spec is
`PRD — Photographer Portfolio (React + Tailwind + Motion).md` in the repo root; it states
decisions, not options. Read the relevant PRD section before building a feature.

## Ground rules (PRD section 12)

1. JavaScript only (`.js`, `.jsx`, ES modules). Add JSDoc types to every exported function and component.
2. Before adding any dependency, state its gzip size and why the platform or an existing dependency cannot do the job.
3. Every image renders through `<Photo>`; every image URL comes from `photoUrl()`.
4. Every colour, radius, duration and easing comes from the tokens in `app/styles/app.css`. No hex values or magic numbers in components.
5. Hovers are CSS. Motion is used only in the components named in PRD section 7, and only on `transform`, `opacity` and the preview's `clip-path`.
6. Every content component ships a skeleton with identical dimensions.
7. Content is read only inside route loaders through `app/lib/content.server.js`. Never import content JSON into components.
8. Changing a content field means updating, together: the Zod schema, `templates/`, the JSON Schemas (`npm run schemas`), sample content and `PHOTOGRAPHER-GUIDE.md`.
9. Error messages written for the photographer use plain English, name the file, say what to change and suggest the fix.
10. One feature per commit, using conventional commit messages.

## Decisions that differ from the PRD text

- **React Router 7.18.x, not 8.x.** React Router 8 requires Node 22.22+, and the dev machine runs
  Node 22.17, so the PRD's fallback rule applies. The `ssr: false` + `prerender` API is the same.
  All `v8_*` future flags are enabled in `react-router.config.js`, so upgrading is a version bump
  once Node 24 is installed locally.
- **Motion 14.x** (the PRD names 12.x; 14 is the current stable line, same `motion/react` API).
- **Motion loads only on first use** (decided 2026-10-14 to meet the 120 KB first-load JS budget:
  React + React Router alone are about 97 KB brotli). Motion is used only inside lazily loaded
  chunks: the mobile menu, the lightbox and the cursor-follow hover preview, each wrapped in
  `<MotionProvider>`. The hero carousel and `<Reveal>` use CSS transitions plus a little plain
  JavaScript. There is no `LazyMotion` or `MotionConfig` in `root.jsx`.
- **Fonts** (changed 2026-10-14 at the owner's request): headings (`--font-display`) are Inter Tight
  500; subheadings (`--font-subhead`: h2/h3 text, standfirsts, post-card titles, prose h2/h3, pull
  quotes) are Newsreader 400, 500 and 400 italic. Both are **static** files for exactly those
  weights (about half the bytes of the variable fonts): a new weight needs its own `@font-face` in
  `app.css`, or the browser fakes it. Geist and Geist Mono are unchanged (variable). Text tokens cannot carry a font family, so components add `font-subhead` next to
  `text-h2`/`text-h3`. The two preloads are Geist and Inter Tight; Newsreader is not preloaded. The
  monogram and favicon use Inter Tight; `npm run icons` reads the static `@fontsource/inter-tight`
  WOFF (dev only), because opentype.js cannot read WOFF2.
- **Logo is the avatar photo** (decided 2026-10-18 at the owner's request; the PRD's logo is the
  monogram): `Brand` shows `site.json` `avatar` as a 32 px circle beside the wordmark, so the
  generated `site.json` (root loader data) carries the avatar record. The avatar is
  `content/about/profile.jpg`, a square crop of the face so it reads at 32 px. The monogram is
  only the fallback when there is no avatar, and stays the favicon.
- **Radius token names:** the PRD's `--r-card`, `--r-inner`, `--r-chip`, `--r-pill` are
  `--radius-card`, `--radius-inner`, `--radius-chip`, `--radius-pill` (Tailwind namespace, so
  `rounded-card` etc. exist as utilities).
- **`_headers`:** Cache-Control is not set on `/*`, because Cloudflare joins the values of headers
  set by more than one matching rule. Pages' default is already `public, max-age=0, must-revalidate`.
- **Clean URLs:** `scripts/build-feeds.mjs` renames pre-rendered `x/index.html` to `x.html` so
  Cloudflare serves `/x` without a trailing slash, and turns the pre-rendered `/404` into `404.html`.
- **Priority image preload:** React Router's `links()` cannot see loader data, so `<Photo priority>`
  calls React 19's `preload()` itself; React puts the `<link rel=preload imagesrcset>` in the
  pre-rendered `<head>`. Routes never preload images by hand.
- **Dynamic routes are conditional.** With `ssr: false`, React Router refuses to start or build if
  a route with a loader has no pre-rendered page (e.g. `/blog/page/:n` with fewer than 10 posts).
  `app/routes.js` registers each dynamic route only when `.generated/routes.json` lists a page for
  it (`scripts/lib/route-shapes.js`). In dev, React Router only server-renders paths that existed at
  startup, so the content watcher restarts the dev server whenever the list of pages changes.
- **The stylesheet is a React resource** (`<link rel=stylesheet precedence>` in `root.jsx`, imported
  with `?url`), not a side-effect CSS import. React then lists it before the script preloads, so the
  one render-blocking file is fetched first. This took mobile LCP from 3.2 s to 1.5 s in Lighthouse.
- **Social icons** are copied from Simple Icons into the site data by the content build, so pages
  ship only the icons in use. LinkedIn is not in Simple Icons (removed at LinkedIn's request) and
  shows a neutral arrow.
- **Footer "Privacy"** links to `/privacy`, rendered from `content/privacy.md` (the route exists only
  while that file does). The Travel page's intro paragraph is `content/travel/intro.md`.
- **Shared code is one "ui" chunk** (`build.rolldownOptions.output.codeSplitting` in
  `vite.config.js`): six JS files per page instead of 22. The lazy parts (the Motion-based ones and
  VideoDialog) are excluded by name and must stay excluded, or they would load on every page.
- **Contact form** loads when the reader comes within 800 px of it (a same-size skeleton holds its
  place); hCaptcha's script loads on first focus. Without `VITE_WEB3FORMS_KEY` the form shows its
  error state with the email address.
- **Measured but not adopted:** inlining the CSS into every page gave no measurable gain here, so it
  was reverted. On this Windows machine Chrome's first layout costs ~90 ms of CPU even with no CSS,
  which Lighthouse's 4x slowdown turns into most of the remaining LCP; re-measure on the deployed
  site with PageSpeed Insights before tuning further.
- **SEO:** every route builds its tags with `seo()` from `app/lib/seo.js` (title, description,
  canonical, Open Graph/Twitter, JSON-LD). Absolute URLs use `site.json` "url"; while that is a
  placeholder, the Cloudflare deployment address (`CF_PAGES_URL`) is used. Builds of branches other
  than main get `noindex` and a disallowing robots.txt. sitemap.xml, robots.txt and rss.xml are
  written by `scripts/build-feeds.mjs`.
- **Below-the-fold blocks** use the `defer-render` utility (`content-visibility: auto`); `<Reveal>`
  and the footer apply it.
- **Carousel controls** sit bottom-right (the PRD centres the dots) so the trip notch never covers
  them; the dots are hidden on phones, where swipe, arrows and pause remain.
- **404 photo** comes from the root loader (`site.notFoundPhoto`), so the not-found route needs no
  loader and works for client-side navigation to unknown URLs too.
- **AVIF originals are accepted** alongside JPEG and PNG (decided 2026-10-18: the photographer
  exports AVIF). They are re-encoded like any photo, because the pipeline's outputs at the same
  width were 3 to 13 times smaller than the exported files, with no visible loss. Gitignored like JPEGs.
- **`site.json` has extra fields** the PRD example lacks: `url` (canonical links, sitemap) and
  `contact` (form subjects and reply time, which PRD section 8 says live in `site.json`).
- **Video is in v1** (decided 2026-10-14 at the owner's request; the photographer also films; the
  PRD lists it as a later phase). The PRD's `<Clip>` is `BackgroundVideo`.
  - **Where:** Book and Trip pages open with a full-bleed `MediaHero` (title over the clip, or
    over the cover when there is none), so trips no longer use PageHeader plus a rounded cover.
    Home shows `site.json` `home.reel` as a 16:9 `ReelCard` under the profile row, not inside the
    hero carousel: the carousel is the LCP and the photography, and one moving thing at a time
    reads calmer. The reel's optional YouTube/Vimeo `link` opens the full film with sound in the
    lazy `VideoDialog`; nothing from those sites loads before that click.
  - **Content:** `trip.json` `"video": "clip.mp4"` (a file in the trip's `videos/` folder);
    `book.json` `"video": "trip-label/clip.mp4"`; `site.json` `home.reel`.
  - **Pipeline:** `npm run photos` also encodes clips (`scripts/lib/videos.js`, ffmpeg-static, a
    dev dependency): H.264 and AV1 at 720p and 1080p, first 30 s, silent, no metadata,
    faststart. CRF H.264 24/23, AV1 32/30 (pipeline v2, 2026-10-18: v1's 28/26 and 38/36
    smeared fine texture in real 4K footage, SSIM 0.94 → 0.95). H.264 peaks at 4/6 Mbit/s and
    is pinned to High@3.1/4.0, the levels its codec strings declare (x264's `slow` preset made
    1080p level 5.0). Any file over 25 MiB (Cloudflare Pages' per-file limit) is an error. The
    first frame is encoded like a photo and becomes the poster. Outputs are in
    `public/videos/` and records in `media/manifests/videos/`.
  - **Loading:** the pre-rendered HTML has no video source, so the poster `<Photo>` is the LCP.
    After `load` plus idle, and once the box is on screen, it picks AV1 when `canPlayType` says
    "probably" (otherwise H.264). Size: 720 or 1080 from the box size × DPR (capped at 1.5),
    720 on 3G. The clip fades in on `playing`, plays only while half visible, and pauses in
    hidden tabs.
  - **No autoplay:** reduced motion, Save-Data, 2G, or an earlier pause (`localStorage`
    "background-video") leaves the still frame and a play button.
  - **LCP guard:** the `<video>` is 1 px shorter than the poster, so Chrome never reports its
    first frame as a later, larger LCP (it did on phones by 73 px²).

## Architecture in one paragraph

`content/` (folders, JSON, Markdown) is the database. `scripts/content-build.mjs` validates it and
writes an index to `.generated/`. `react-router.config.js` pre-renders every path listed in
`.generated/routes.json`; route loaders read their slice of `.generated/` at build time through
`app/lib/content.server.js`, so no content JSON is bundled into the client. `npm run photos`
(run on the photographer's machine) turns originals into hashed AVIF/JPEG files in
`public/photos/` and clips into MP4s in `public/videos/`, plus manifests in `media/manifests/`;
all are committed, originals are not.

Validation runs from manifests, not originals, because CI never has the originals. When an
originals folder is present, the validator also reports unprocessed or deleted photos.

| Path                            | Role                                                                                   |
| ------------------------------- | -------------------------------------------------------------------------------------- |
| `scripts/lib/content-schema.js` | Zod schemas, the single source of truth (→ `npm run schemas`)                          |
| `scripts/lib/build-content.js`  | Validation, friendly messages, Markdown, and the `.generated/` index                   |
| `scripts/lib/markdown.js`       | markdown-it with the photo rule (`![alt](label/file.jpg "wide")`)                      |
| `scripts/photos.mjs`            | The image pipeline (PRD section 6)                                                     |
| `app/lib/photo-url.js`          | `photoUrl()` and srcset helpers, shared by the app and the scripts                     |
| `app/lib/content.server.js`     | The only way loaders read content                                                      |
| `.generated/`                   | One small JSON file per page: `home.json`, `trips/<label>.json`, `blog/page-<n>.json`… |

## Commands

| Command                           | What it does                                                           |
| --------------------------------- | ---------------------------------------------------------------------- |
| `npm run dev`                     | Builds the content index (drafts included), then http://localhost:5173 |
| `npm run check`                   | Validates all content, plain-English messages                          |
| `npm run new`                     | Interactive: new book, trip or post from `templates/`                  |
| `npm run photos`                  | Processes new photos and clips, then runs the check                    |
| `npm run schemas`                 | Regenerates `schemas/*.json` after a schema change                     |
| `npm run icons`                   | Redraws the favicon set from the monogram (after changing the name)    |
| `npm run size`                    | First-load JS/CSS per page (brotli) and preloaded fonts vs the budgets |
| `npm run a11y`                    | axe, keyboard and reduced-motion checks on every page (after a build)  |
| `npm run placeholders`            | Creates gradient JPEGs for the sample content (dev only)               |
| `npm run build`                   | Production build into `build/client`                                   |
| `npm run preview`                 | Serves `build/client` like Cloudflare Pages (http://localhost:4173)    |
| `npm run lint` / `npm run format` | ESLint / Prettier                                                      |
| `npm run lhci`                    | Lighthouse CI with the PRD section 9 budgets (needs a build first)     |

CI (`.github/workflows/ci.yml`) runs lint, format check, content check, build, size, a11y and
Lighthouse CI on every pull request and on main.

## Conventions

- Components live in `app/components/`: `layout/` (Navbar, MobileMenu, Footer, ThemeToggle, Brand,
  SkipLink, NavProgress), `ui/` (AppLink, Button, GhostLink, IconButton, LabelChip, SectionHeader,
  Pagination, DotPagination, SequenceNav, Marquee, SocialIcon), `media/` (Photo, NotchCard),
  `motion/` (Reveal, MotionProvider), `skeletons/`, `content/` (PageHeader, Prose, RowList,
  PostCard/PostGrid/FeaturedPost, BookCard, ProfileCard/SocialCards, TripMeta, FromTripCard,
  AboutSection, LabelFilter, ContactSection + lazy ContactForm, MediaHero, ReelCard), and in
  `media/` also HeroCarousel, JustifiedGallery, lazy Lightbox, PreviewList + lazy HoverPreview,
  BackgroundVideo + lazy VideoDialog.
- Cards that contain chips use a stretched link (`after:absolute after:inset-0` on the title link,
  chips `relative z-10`), never nested links.
- Internal links use `AppLink`/`AppNavLink` (prefetch on intent + view transition).
- Shared component CSS (text roll, notch, skeleton, marquee, floating nav…) is in the
  `@layer components` block of `app/styles/app.css`.

- Tokens: `bg-bg`, `bg-surface`, `bg-surface-2`, `text-ink`, `text-ink-muted`, `border-line`,
  `bg-invert-bg`, `text-invert-ink`, `bg-scrim`, `text-on-photo`; `rounded-card|inner|chip|pill`;
  `font-display|subhead|sans|mono`; `text-display-xl|display-l|h2|h3|body|body-s|label`; `ease-out`,
  `ease-in-out`, `duration-(--dur-base)`; layout vars `--gutter`, `--section`, `--row-h`.
- `mono-label` utility = uppercase Geist Mono label style.
- Motion values for JS live in `app/lib/motion.js` and must match the CSS tokens.
- Use `<m.*>` components inside `<MotionProvider>` (LazyMotion strict mode), never `<motion.*>`,
  and only in lazily loaded components.
