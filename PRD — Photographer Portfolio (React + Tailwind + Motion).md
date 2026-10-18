# PRD — Photographer Portfolio (React + Tailwind + Motion)

Oct 14, 2026 · @hasnaat

## 1. Overview

Build a fast, static, image-first portfolio for a travel photographer in React + Vite + Tailwind + Motion, where all content lives as folders, JSON and Markdown inside the repo. The photographer publishes a new trip by dropping photos into a folder, filling one small JSON file, and running one command. There is no database, no login, and no paid service.

This document is written for Claude Code. Every section states decisions, not options. Where a value is a placeholder it is written as `{{LIKE_THIS}}` and lives in `content/site.json`.

### Goals

1. Feel premium and quiet: minimal chrome, photography first, soft motion, one custom display typeface.
2. Let a non-technical photographer add a trip, a blog post, or an About entry in under 15 minutes using only VS Code.
3. Hit green Core Web Vitals on mobile on every page, even with hundreds of photos.
4. Tag every photo and blog post with a universal trip label, so content can be filtered anywhere on the site.

### Non-goals (v1)

- Print store, client proofing galleries, password-protected albums.
- Comments, likes, user accounts, or an admin login.
- Server-side rendering frameworks (Next.js, Remix). This is a static Vite SPA with pre-rendered HTML for SEO (see section 4).

### Users

| User | Who | What they need |
| --- | --- | --- |
| Visitor | Prospective clients, followers, editors | Browse books, trips and stories quickly; contact the photographer |
| Photographer | Non-technical, travels monthly, uses VS Code | Add photos and text without touching code; see mistakes explained in plain English |
| Maintainer | You | Clear structure, typed schemas, one build pipeline |

### Vocabulary (used everywhere in code and copy)

| Term | Meaning | Example | URL |
| --- | --- | --- | --- |
| Book | A country or region; a collection of trips | India, Japan | `/travel/india` |
| Trip | One visit to one destination; the unit of upload | Kerala, Oct 2026 | `/travel/india/kerala-2026` |
| Label | The trip's folder name, attached to every photo and blog post from that trip | `kerala-2026` | `?label=kerala-2026` |
| Click | A single photograph | `kerala-2026/backwaters-01.jpg` | lightbox `#p=backwaters-01` |
| Post | A blog entry, optionally tied to a trip label | "Six days on the backwaters" | `/blog/six-days-on-the-backwaters` |

The user brief calls the trip view the "Destination page". In code it is `TripPage`; in the UI it is titled with the destination name.

### Success metrics

| Metric | Target |
| --- | --- |
| Lighthouse Performance (mobile, Home) | 90 or higher |
| Lighthouse Accessibility, Best Practices, SEO | 95 or higher |
| Largest Contentful Paint (mobile, 4G) | under 2.5 s |
| Cumulative Layout Shift | under 0.05 |
| Interaction to Next Paint | under 200 ms |
| JS shipped on first load (gzip) | under 120 KB |
| Time for photographer to publish a trip | under 15 min |

## 2. Design direction

The site combines the bento layout and notch-cutout cards of [Sera Photography](https://p.isera.dev/) with the editorial type, monospace labels and boxed nav of [Structure Engineering](https://structureengineering.com.au/). Photos carry all the colour; the interface stays neutral, quiet and exact.

### What we take from each reference

| Element | Source | How we use it |
| --- | --- | --- |
| Split home: sticky hero carousel left, scrolling bento column right | Sera | Home layout on screens 1024 px and wider |
| Navbar living inside a notch cut into the hero card | Sera | Home navbar; inner pages use a floating pill version |
| Destination name sitting in a tab cut out of the photo's top-left corner | Sera | `NotchCard` for every trip card (the "aesthetic shape cutout") |
| Profile card with avatar, role and one-paragraph bio | Sera | Home profile card |
| Stacked social link cards, with Contact as the one inverted (white-on-dark) card | Sera | Home socials column |
| Square translucent prev/next buttons and a dot pill on the carousel | Sera | Hero carousel controls |
| Grey "Loading…" card shells before images arrive | Sera | Skeleton shells, but with blur placeholders instead of empty grey |
| Uppercase monospace nav items in boxed chips | Structure | Nav links, label chips, pagination numerals |
| Huge tight-tracked headline over a full-bleed photo | Structure | Page titles on Travel, Book and Trip pages |
| Mono section label over a thin rule ("LATEST WORK") | Structure | `SectionHeader` everywhere |
| Outlined filter chips (Public art, Residential, Commercial) | Structure | Universal trip label chips |
| Card with thumbnail left, mono category top, title bottom | Structure | Compact blog and trip list cards |
| Duplicated button text ("Find out more Find out more") that rolls on hover | Structure | Text-roll hover on every button |
| Repeating marquee line above a 4-column footer (Navigate, Follow, Get in touch, Legal) | Structure | Universal footer |

### Design principles

1. **Photos are the only colour.** UI is grayscale; no brand accent hue. A hover can tint with the photo's dominant colour, extracted at build time.
2. **One radius family, one grid.** 24 px cards, 16 px inner elements, pills for toggles, 6 px chips. A 12-column grid with 16 px gutters.
3. **Type is the branding.** A display serif for names and titles, a clean grotesk for reading, a mono for every label, date and number.
4. **Motion confirms, it never performs.** 160–600 ms, ease-out, transform and opacity only. Nothing loops except the hero and the footer marquee, and both stop for reduced-motion users.
5. **Nothing jumps.** Every image reserves its box from its known aspect ratio and shows a blurred preview in its own colours. No black or empty frames.
6. **Mobile is a first-class layout, not a squeeze.** Hover-only effects always have a tap or keyboard equivalent.

## 3. Design system

All tokens live once, in `app/styles/app.css`, inside Tailwind's CSS-first `@theme` block and two `[data-theme]` blocks. Components never use raw hex values, pixel radii or ad-hoc easing curves.

### Colour tokens

Dark is the default look (matching the references); the initial theme follows the visitor's system setting until they toggle.

| Token | Dark | Light | Used for |
| --- | --- | --- | --- |
| `--bg` | `#0B0B0C` | `#F4F3EF` (warm paper) | Page background, notch cutouts |
| `--surface` | `#161618` | `#FFFFFF` | Cards |
| `--surface-2` | `#1F1F22` | `#EAE8E2` | Hover states, skeletons, inputs |
| `--ink` | `#EDEDEC` | `#141414` | Primary text |
| `--ink-muted` | `#9A9A97` | `#5E5E5A` | Meta text (both pass 4.5:1 on `--surface`) |
| `--line` | `rgb(255 255 255 / 0.08)` | `rgb(0 0 0 / 0.08)` | Rules, card borders |
| `--invert-bg` / `--invert-ink` | `#FFFFFF` / `#0B0B0C` | `#141414` / `#FFFFFF` | The one primary CTA per view (Contact) |
| `--scrim` | `rgb(0 0 0 / 0.45)` | `rgb(0 0 0 / 0.35)` | Text over photos, lightbox backdrop |

Set `color-scheme: dark` or `light` on `<html>` so native form controls and scrollbars match.

### Typography — the custom aesthetic font stack

| Role | Font | Licence | Where |
| --- | --- | --- | --- |
| Display | Instrument Serif, Regular + Italic | SIL OFL (free, commercial OK) | Page titles, trip and book names, pull quotes |
| Text and UI | Geist (variable) | SIL OFL | Body, buttons, cards |
| Labels | Geist Mono (variable) | SIL OFL | Nav, chips, dates, EXIF, pagination numerals, section labels |

Why this pairing: the serif gives the luxury-editorial voice, Geist matches the clean grotesk of the Structure headline, and Geist Mono reproduces its boxed mono labels. All three are free for commercial use.

**Custom font slot.** The display role is a single CSS variable, `--font-display`. To use a licensed signature typeface later (for example a Pangram Pangram or Klim face), drop its `.woff2` into `app/assets/fonts/`, add one `@font-face`, and change that variable. Check the web licence first.

**Loading rules (zero layout shift):**

- Self-host via Fontsource packages (`@fontsource/instrument-serif`, `@fontsource-variable/geist`, `@fontsource-variable/geist-mono`). If a package name has changed, download the `.woff2` files and self-host them manually. Never load from Google's CDN.
- Latin subset only, `font-display: swap`.
- Preload exactly two files in the root `links()`: Geist variable and Instrument Serif Regular.
- Generate metric-matched fallback faces (size-adjust, ascent and descent overrides) with the `fontaine` Vite plugin so the swap does not move text.

**Type scale (fluid):**

| Token | Size | Line height | Tracking | Font |
| --- | --- | --- | --- | --- |
| `display-xl` | `clamp(3rem, 8vw, 7.5rem)` | 0.95 | -0.02em | Display |
| `display-l` | `clamp(2.25rem, 5vw, 4.5rem)` | 1.0 | -0.015em | Display |
| `h2` | `clamp(1.5rem, 2.5vw, 2rem)` | 1.15 | -0.01em | Geist 500 |
| `h3` | 1.25rem | 1.3 | 0 | Geist 500 |
| `body` | 1rem (16 px minimum) | 1.6 | 0 | Geist 400 |
| `body-s` | 0.875rem | 1.5 | 0 | Geist 400 |
| `label` | 0.75rem, uppercase | 1.2 | 0.08em | Geist Mono 400 |

Blog body copy is capped at 68 characters per line.

### Space, radius and layout

- 4 px base unit. Gutters 16 px (12 px under 640 px). Section spacing 96 px desktop, 64 px mobile.
- Radii: `--r-card` 24 px, `--r-inner` 16 px, `--r-chip` 6 px, `--r-pill` 9999 px.
- Max content width 1440 px; reading column 720 px.
- Breakpoints: Tailwind defaults (`sm` 640, `md` 768, `lg` 1024, `xl` 1280, `2xl` 1536).

### The notch cutout (signature shape)

The destination name sits in a tab that looks cut out of the photo's top-left corner, with concave (inverted) corners where the tab meets the photo. Build it without SVG masks so it is cheap and theme-safe:

- The label is an absolutely positioned element with `background: var(--bg)` and a bottom-right radius of `--r-inner`.
- Two pseudo-elements sit just outside the tab's right and bottom edges. Each is a 16 px square filled with `radial-gradient(circle at 100% 100%, transparent 16px, var(--bg) 16.5px)` (rotated per corner) to form the concave curve.
- Because it paints with `var(--bg)`, it re-colours instantly with the theme and needs no re-render.
- The same component, at larger size, cuts the notch in the Home hero that holds the navbar.

### Motion tokens

| Token | Value | Use |
| --- | --- | --- |
| `--ease-out` | `cubic-bezier(0.22, 1, 0.36, 1)` | Default for everything entering or hovering |
| `--ease-in-out` | `cubic-bezier(0.65, 0, 0.35, 1)` | Hero crossfades, theme change |
| `--dur-fast` | 160 ms | Colour and border hovers |
| `--dur-base` | 280 ms | Button text roll, chip states, nav hide and show |
| `--dur-slow` | 600 ms | Image reveal, hover preview reveal |
| `--dur-hero` | 1200 ms | Hero slide crossfade |
| Spring (Motion) | `{ stiffness: 300, damping: 30, mass: 0.6 }` | Cursor-follow hover preview only |

Export the same values from `app/lib/motion.js` for Motion components so CSS and JS animations feel identical.

## 4. Tech stack and architecture

The site is a React app built by Vite, pre-rendered to static HTML at build time by React Router's framework mode, and served free from Cloudflare Pages. There is no runtime server, so the only moving parts at request time are static files and the contact-form endpoint.

### Stack

Pin exact versions in `package.json` when scaffolding. Versions below are the latest stable lines as of October 2026; take the newest patch.

| Layer | Choice | Version line | Why |
| --- | --- | --- | --- |
| Language | JavaScript (JSX), ES modules | — | Brief requires JS. Use JSDoc types and Zod schemas instead of TypeScript |
| Runtime | Node.js LTS | 24.x (22.22 minimum) | Required by React Router v8 and `sharp` |
| UI | React | 19.2+ | Required by React Router v8 |
| Build | Vite | 8.x ([8.1 announced June 2026](https://dev.to/aloisseckar/new-in-vue-june-2026-28p)) | Fast dev server, Rolldown builds |
| Routing and pre-rendering | React Router, framework mode, `ssr: false` + `prerender` | 8.x ([v8.0 shipped June 2026](https://scrimba.com/articles/react-router-complete-guide-2026/)) | Static HTML for every route = fast LCP and real SEO, while keeping SPA navigation. [Pre-rendering docs](https://reactrouter.com/7.9.4/how-to/pre-rendering) |
| Styling | Tailwind CSS + `@tailwindcss/vite` + `@tailwindcss/typography` | 4.3.x ([releases](https://releases.sh/tailwind-css/tailwind-css.md)) | CSS-first `@theme` tokens; Lightning CSS minification built in |
| Motion | `motion` (import from `motion/react`) | 12.x ([install docs](https://motion.dev/docs/react-installation)) | Carousel, hover preview, staggered reveals. Use `LazyMotion` + `m` components |
| Content validation | Zod | 4.x | One schema produces runtime validation and the VS Code JSON schemas |
| Markdown | `markdown-it` with a custom image rule | latest | Blog and trip stories; photo references resolve to responsive `<picture>` |
| Images (build-time) | `sharp` + `exifr` | latest | Variants, placeholders, EXIF. See section 6 |
| Icons | `lucide-react` for UI glyphs; inline SVG paths from Simple Icons for social brands | latest | Tree-shaken; no icon fonts |
| Contact form | Web3Forms, free plan | — | [250 submissions a month, unlimited domains, hCaptcha, no account needed](https://web3forms.com/pricing) |
| Hosting | Cloudflare Pages, free plan | — | See hosting decision below |
| Analytics (optional) | Cloudflare Web Analytics | — | Free and cookieless, so no consent banner |
| Quality | ESLint, Prettier, Lighthouse CI (`@lhci/cli`) | latest | Budgets enforced on every pull request |

Fallback rule for Claude Code: if any React Router v8 requirement blocks a dependency, drop to React Router 7.18.x framework mode. The `ssr: false` + `prerender` API is the same.

### Hosting decision: Cloudflare Pages

- **Free and allowed for business use.** Vercel's Hobby plan [is restricted to non-commercial personal use](https://vercel.com/docs/limits/fair-use-guidelines), and a working photographer's portfolio is commercial.
- **Limits that matter here** ([Cloudflare Pages limits](https://developers.cloudflare.com/pages/platform/limits)): 500 builds a month, 20-minute build timeout, 20,000 files per site, 25 MiB per file. The image plan in section 6 is sized to stay under the file cap for years.
- Git integration: every push to `main` builds and deploys; every other branch gets a preview URL.
- `public/_headers` sets caching (section 6) and security headers; `public/_redirects` handles legacy URLs.

### Rendering model

1. `npm run build` first runs `content:build`, which validates all content and writes a compact index to `.generated/` (section 5).
2. React Router's `prerender()` in `react-router.config.js` reads that index and returns every URL: books, trips, posts, blog pages, label pages.
3. Each route's `loader` reads only its own slice of `.generated/` at build time. React Router writes it as static HTML plus a small `.data` file for client-side navigation.
4. Result: no content JSON in the JavaScript bundle, real HTML for crawlers, and instant in-app navigation after the first load.
5. Unknown URLs fall back to the SPA shell, which renders the 404 route.

### Routes

| Path | Route module | Content |
| --- | --- | --- |
| `/` | `routes/home.jsx` | Hero, profile, socials, latest trips, books, featured post |
| `/travel` | `routes/travel.jsx` | All books, with hover preview |
| `/travel/:book` | `routes/book.jsx` | Book description and its trips |
| `/travel/:book/:trip` | `routes/trip.jsx` | The "Destination page": photos, story, labelled posts |
| `/blog` and `/blog/page/:n` | `routes/blog.jsx` | Featured post on top, adaptive card grid, pagination |
| `/blog/label/:label` | `routes/blog-label.jsx` | Posts filtered by one trip label |
| `/blog/:slug` | `routes/post.jsx` | Single post |
| `/about` | `routes/about.jsx` | Bio, portrait, qualifications, gear, socials, contact form |
| `*` | `routes/not-found.jsx` | 404 |

Build-time extras: `/sitemap.xml`, `/robots.txt` and `/rss.xml` are generated by `scripts/build-feeds.mjs` after pre-rendering.

## 5. Content and data architecture

**Decision: the repository is the database.** Trips are folders, metadata is small JSON files, long text is Markdown, and the folder a photo sits in is its label. A local script turns photos into optimised web files. No database, no storage bucket, no admin panel, no monthly bill.

### Options considered

| Option | Cost | Photographer's workflow | Page speed | Verdict |
| --- | --- | --- | --- | --- |
| A. Folders + JSON/Markdown in the repo, local image script | Free | Drag photos into a folder in VS Code, fill one JSON, run one command | Best: everything is static and pre-rendered | **Chosen** |
| B. Option A plus a browser editor (Pages CMS) | Free, open source | Edit text in a web form; photos still go through the local script | Same as A | Optional later phase (section 12) |
| C. Hosted database + storage (Supabase, Firebase, etc.) | Free tier with quotas | Needs an admin UI and login we would have to build | Worse: data is fetched at runtime before images can start | Rejected |

Why A wins for a non-technical photographer: every change is a visible file, every mistake is caught by the validator with a plain-English message, and Git keeps a full undo history. Nothing can silently break in a dashboard he cannot see.

&#91;embedded content: content pipeline · 3 stages, 9 steps\]

Only `npm run photos` does heavy work, once per new photo, on the photographer's machine. Cloudflare's build only validates, indexes and pre-renders, so it stays fast as the library grows.

### Folder conventions

```text
content/
  site.json                     ← name, socials, email, home-page settings
  about/
    about.json                  ← free-form sections: education, cameras, work, hobbies…
    about.md                    ← long bio
    portrait.jpg                ← processed by the photo script
  travel/
    india/                      ← a BOOK (country or region); folder name = URL
      book.json
      kerala-2026/              ← a TRIP; folder name = the universal LABEL
        trip.json
        story.md                ← optional longer description
        photos/                 ← drop exported JPEGs here
        videos/                 ← optional short clips
      delhi-2026/
    japan/
      book.json
      kyoto-2027/
  blog/
    2026-10-12-six-days-on-the-backwaters/   ← date + slug
      post.json
      post.md
      images/                   ← optional images not taken from a trip
templates/                      ← copy-paste starters for every file above
media/manifests/                ← WRITTEN BY THE PHOTO SCRIPT. Commit, never edit
public/photos/                  ← WRITTEN BY THE PHOTO SCRIPT. Commit, never edit
.generated/                     ← build-time content index (gitignored)
```

Naming rules, enforced by the validator: lowercase letters, numbers and hyphens only; trip folders end with the year (`kerala-2026`) so a second visit gets its own label (`kerala-2028`). Labels must be unique across all books.

Git rules: original photos and videos inside `content/` are gitignored (they stay on the photographer's machine and in his archive). Only the optimised outputs in `public/photos/` and the manifests in `media/manifests/` are committed. This keeps the repository small enough for years (sizing in section 6).

### `book.json`

```json
{
  "title": "India",
  "summary": "Home ground. Monsoon coasts, desert forts and the cities in between.",
  "cover": "kerala-2026/backwaters-01.jpg",
  "order": 1
}
```

`cover` is optional (defaults to the newest trip's cover). `order` controls position on the Travel page; lower comes first.

### `trip.json`

```json
{
  "title": "Kerala",
  "place": "Alleppey and Fort Kochi",
  "dates": { "from": "2026-10-02", "to": "2026-10-09" },
  "summary": "Six slow days on the backwaters at the tail end of the monsoon.",
  "cover": "backwaters-01.jpg",
  "featured": ["backwaters-01.jpg", "fort-kochi-03.jpg"],
  "tags": ["monsoon", "boats"],
  "photos": {
    "backwaters-01.jpg": {
      "caption": "First light on Vembanad Lake",
      "alt": "A wooden houseboat on still water at sunrise, palms on the far bank"
    }
  },
  "pinned": ["fort-kochi-03.jpg"],
  "hidden": []
}
```

| Field | Required | Rule |
| --- | --- | --- |
| `title` | Yes | Shown on cards and in the notch tab; 40 characters max |
| `place` | No | Sub-locations, shown under the title |
| `dates.from`, `dates.to` | Yes, `to` optional | `YYYY-MM-DD`; drives "latest" ordering everywhere |
| `summary` | Yes | 1–2 sentences, 200 characters max; used on cards and as meta description |
| `cover` | Yes | A filename in `photos/`; the validator suggests the closest match on typos |
| `featured` | No | Photos that may appear in the Home hero carousel |
| `tags` | No | Free theme words; displayed in v1, not yet filterable |
| `photos` | No | Per-photo `caption` and `alt`. Alt text is required for `cover` and `featured` photos |
| `pinned` | No | Photos shown first; everything else is ordered by capture time from EXIF |
| `hidden` | No | Photos processed but not shown (kept for later) |

### Blog post: `post.json` + `post.md`

Metadata is JSON (same tooling as trips); the body is plain Markdown, so the photographer never escapes quotes or line breaks inside JSON.

```json
{
  "title": "Six days on the backwaters",
  "date": "2026-10-12",
  "excerpt": "What the monsoon leaves behind when it finally moves north.",
  "cover": "kerala-2026/backwaters-01.jpg",
  "labels": ["kerala-2026"],
  "featured": false,
  "draft": false
}
```

In `post.md`, any photo from any trip is placed with `![Alt text](kerala-2026/fort-kochi-03.jpg)` and an image from the post's own folder with `![Alt text](images/map.jpg)`. The build swaps both for the responsive `<Photo>` component. The URL slug is the folder name without its date prefix. `draft: true` posts render in `npm run dev` only.

### `about.json` — free-form, for anything

Every section is a title plus a list of items, so the photographer can add a degree, a camera, a job or a hobby without new code.

```json
{
  "headline": "Travel and documentary photographer based in New Delhi.",
  "portrait": "portrait.jpg",
  "sections": [
    {
      "title": "Education",
      "items": [
        { "title": "M.A. Photography", "subtitle": "{{GRAD_UNIVERSITY}}", "meta": "2022 – 2024" },
        { "title": "B.A. Visual Communication", "subtitle": "{{UNDERGRAD_COLLEGE}}", "meta": "2018 – 2021" }
      ]
    },
    {
      "title": "Cameras",
      "items": [
        { "title": "Sony A7 IV", "subtitle": "Main body", "meta": "Since 2023" },
        { "title": "Fujifilm X100V", "subtitle": "Street and travel" }
      ]
    },
    { "title": "Work", "items": [{ "title": "{{STUDIO_OR_CLIENT}}", "subtitle": "Staff photographer", "meta": "2024 – now" }] },
    { "title": "Hobbies", "items": [{ "title": "Film developing", "subtitle": "Ilford HP5 in the kitchen sink" }] }
  ]
}
```

Per item: `title` is required; `subtitle`, `meta` and `link` are optional. Section order on the page follows the array order.

### `site.json`

```json
{
  "name": "KRISH BHATIA",
  "role": "Photographer",
  "bio": "I photograph slow travel and the people who make places feel like home.",
  "location": "New Delhi, India",
  "email": "krish0710bhatia@gmail.com",
  "avatar": "about/portrait.jpg",
  "socials": [
    { "label": "Instagram", "url": "https://instagram.com/krish.lenss", "icon": "instagram" },
    { "label": "Behance", "url": "https://behance.net/cd739fb8", "icon": "behance" }
  ],
  "home": { "heroCount": 6, "latestTrips": 6, "books": 4 },
  "footer": { "marquee": "Let's make something beautiful" }
}
```

The Web3Forms access key is not stored here; it is an environment variable (`VITE_WEB3FORMS_KEY`) set in Cloudflare Pages.

### The universal label

- **Photos are labelled automatically.** A photo in `content/travel/india/kerala-2026/photos/` gets label `kerala-2026` and book `india`. The photographer never types a label for a photo.
- **Posts opt in** with `"labels": ["kerala-2026"]`; the validator rejects labels that do not exist.
- **One chip everywhere.** The label renders as a mono chip (`KERALA 2026`) on trip cards, in the lightbox, on blog cards and on posts. It links to the trip page; on the blog it links to `/blog/label/kerala-2026`.
- **One index.** `content:build` writes `.generated/labels.json`: label → trip, book, photo ids, post slugs. Every page reads from it.

### Validation the photographer can understand

`npm run check` validates everything with Zod and also runs inside `npm run photos`, `npm run dev` and `npm run build`. A failed check blocks publishing and prints messages like:

```text
✖ content/travel/india/kerala-2026/trip.json
  "cover" is "backwater-01.jpg", but there is no photo with that name in photos/.
  Did you mean "backwaters-01.jpg"?

⚠ content/travel/india/kerala-2026/trip.json
  12 photos have no alt text. They will use "Kerala — photo 4". Add "alt" under "photos" for better accessibility.
```

VS Code helps before he even saves: `.vscode/settings.json` maps each content file type to a JSON Schema generated from the Zod schemas (`npm run schemas`), giving autocomplete, hover explanations and red underlines on mistakes.

## 6. Image and media pipeline

**Decision: optimise once on the photographer's machine, commit the small outputs, serve them as immutable static files.** `npm run photos` (built on `sharp`) creates AVIF files at four widths, one JPEG fallback, a tiny blurred placeholder and an EXIF summary for every photo. The browser then picks the smallest file that fits, and nothing is ever resized at request time.

Why local and not in CI: Cloudflare Pages builds time out after 20 minutes, and AVIF encoding of a growing library would eventually exceed that. Locally, the script only processes new photos, so a monthly trip takes a minute or two.

### What the photographer exports

JPEG, sRGB, long edge about 3000 px, quality 90. One export preset in Lightroom or Photos covers it. HEIC files are rejected with a message asking for JPEG, because `sharp`'s standard build does not decode them.

### What `npm run photos` does, per photo

1. Finds sources in every `photos/`, blog `images/` and `content/about/` folder.
2. Skips anything unchanged since the last run (cache in `.cache/photos.json`, keyed by file hash and pipeline version).
3. Auto-rotates from EXIF orientation and converts to sRGB.
4. Reads EXIF with `exifr`: camera, lens, focal length, aperture, shutter, ISO, capture time. **GPS is never read or written.** All metadata is stripped from outputs.
5. Writes AVIF at widths 480, 960, 1600 and 2400 (quality 50, effort 4), never upscaling past the source width.
6. Writes one progressive JPEG at 1600 px (mozjpeg, quality 78) for browsers without AVIF.
7. Makes a 16 px-wide blurred WebP placeholder as a base64 data URI (roughly 200–400 bytes) and extracts the dominant colour.
8. For trip covers and post covers, writes a 1200 × 630 Open Graph JPEG using `sharp`'s attention-based crop.
9. Names outputs with an 8-character content hash, e.g. `public/photos/kerala-2026/backwaters-01-3f9a2c1b-960.avif`, so they can be cached forever.
10. Writes or updates `media/manifests/kerala-2026.json`.
11. Removes outputs for photos deleted from a source folder, but only when that source folder exists on this machine. It never deletes what it cannot regenerate.
12. Runs 2–4 photos in parallel (based on CPU count) and shows a progress bar.

### Manifest record (one per photo)

```json
{
  "id": "kerala-2026/backwaters-01",
  "label": "kerala-2026",
  "book": "india",
  "width": 3000,
  "height": 2000,
  "aspect": 1.5,
  "hash": "3f9a2c1b",
  "widths": [480, 960, 1600, 2400],
  "fallback": "/photos/kerala-2026/backwaters-01-3f9a2c1b-1600.jpg",
  "lqip": "data:image/webp;base64,UklGR…",
  "color": "#3b5560",
  "exif": { "camera": "Sony ILCE-7M4", "lens": "FE 35mm F1.8", "focal": 35, "aperture": 2.8, "shutter": "1/500", "iso": 100, "takenAt": "2026-10-03T06:12:00" }
}
```

Captions and alt text are not in the manifest; they are merged in from `trip.json` at build time, so editing a caption never requires re-processing photos.

### Storage sizing

| Item | Estimate |
| --- | --- |
| Files per photo | 5 (4 AVIF + 1 JPEG) |
| Bytes per photo | about 0.9 MB total (verify on the first real trip) |
| One year at 25 photos a month | about 300 photos, 270 MB, 1,500 files |
| Cloudflare Pages file cap | 20,000 files, so roughly 3,900 photos after app files |

Escape hatch, built in from day one: every image URL goes through one helper, `photoUrl(record, width, format)`, which prefixes `PHOTO_BASE_URL` (empty by default). When the repo nears 1 GB or the file cap, copy `public/photos/` to Cloudflare R2 (its [free tier includes 10 GB with zero egress fees](https://eastondev.com/blog/en/posts/dev/20260526-cloudflare-free-limits/)) and set that one variable. No component changes.

### Delivery in the browser: the `<Photo>` component

Every image on the site renders through `<Photo>`. It outputs:

```html
<picture>
  <source type="image/avif" srcset="…-480.avif 480w, …-960.avif 960w, …-1600.avif 1600w, …-2400.avif 2400w" sizes="(min-width: 1024px) 33vw, 100vw">
  <img src="…-1600.jpg" width="3000" height="2000" alt="…" loading="lazy" decoding="async"
       style="aspect-ratio: 1.5; background: #3b5560 url(data:image/webp…) center/cover">
</picture>
```

Rules:

- `sizes` is a required prop. Each layout passes the exact value, for example trip grid `(min-width: 1280px) 33vw, (min-width: 768px) 50vw, 100vw`, hero `(min-width: 1024px) 50vw, 100vw`.
- `width` and `height` are always set from the manifest, so the box is reserved before any byte arrives (no layout shift).
- The blurred placeholder and dominant colour sit underneath as a CSS background. No frame is ever black or empty.
- Lazy images fade in over `--dur-slow` once decoded. The `priority` image does not fade, because an invisible image delays Largest Contentful Paint.
- `priority` adds `loading="eager"` and `fetchpriority="high"`. Exactly one image per page is priority: the first hero slide, or the trip or post cover.
- That same image is also preloaded from the route's `links()` export (`rel=preload`, `as=image`, `imagesrcset`, `imagesizes`, `type=image/avif`), so it starts downloading from the pre-rendered HTML head.

Special cases:

- **Hero carousel:** slide 1 is priority; slide 2 is fetched in an idle callback after load; later slides load when they are next in line.
- **Hover previews** (Travel and Book pages): on pointer enter, the 960 px AVIF is fetched and `decode()`d before the reveal starts, so the preview never paints half-loaded.
- **Lightbox:** loads the 2400 px file only when opened, and preloads one neighbour on each side.

### Caching (`public/_headers`)

```text
/photos/*
  Cache-Control: public, max-age=31536000, immutable
/assets/*
  Cache-Control: public, max-age=31536000, immutable
/og/*
  Cache-Control: public, max-age=86400
/*
  Cache-Control: public, max-age=0, must-revalidate
  X-Content-Type-Options: nosniff
  Referrer-Policy: strict-origin-when-cross-origin
```

### Video (later phase, specified now)

- Short clips go in a trip's `videos/` folder. The script uses `ffmpeg-static` to make a 1080p H.264 MP4 (CRF 26, 30 seconds max, under 25 MiB) and a poster frame, which is processed like a photo.
- The `<Clip>` component uses `preload="none"`, `muted`, `loop` and `playsinline`. It autoplays only while at least half visible and only when reduced motion is off; otherwise it shows the poster with a play button.

## 7. Universal components

Every hover effect below is plain CSS (zero JavaScript). Motion is reserved for the carousel, the cursor-follow preview, mobile menu, lightbox and in-view reveals.

### Navbar

- **Size:** 48 px tall on mobile, 56 px on desktop. It never spans the full width.
- **Home:** sits inside the notch cut into the top-left of the hero card (the Sera pattern): brand mark, wordmark, four links (Travel, Blog, About, Contact) and the theme toggle.
- **Inner pages:** the same contents in a floating pill fixed at the top-left. It slides up out of view when scrolling down and returns when scrolling up (`translateY`, `--dur-base`). It gains a `--surface` background with `backdrop-filter: blur(12px)` only after 24 px of scroll.
- **Links:** Geist Mono uppercase labels in boxed chips (the Structure pattern). The active route has a filled chip; hover rolls the text (see Buttons).
- **Mobile:** brand on the left, a "Menu" text button on the right. The menu opens a full-screen sheet with large serif links that stagger in at 40 ms intervals. Focus is trapped, Escape closes it, and body scroll is locked.
- **Accessibility:** a "Skip to content" link is the first focusable element; the nav is a `<nav aria-label="Main">`.

### Theme toggle (dark and light)

- A pill switch like the reference. Initial theme comes from `prefers-color-scheme`; the visitor's choice is saved in `localStorage`.
- A 6-line inline script in the root `<head>` sets `data-theme` before first paint, so there is never a flash of the wrong theme. The script is the only inline script on the site.
- Switching uses `document.startViewTransition()` for a 400 ms crossfade where supported, and switches instantly elsewhere or under reduced motion.
- Exposed as a `button` with `aria-pressed` and a label that says which theme it will switch to.

### Brand and logo

- A monogram (initials in Instrument Serif inside a thin circle) plus the wordmark from `site.json`. Delivered as an inline SVG component using `currentColor`, so it follows the theme.
- Favicon set (`favicon.svg` with a `prefers-color-scheme` media query inside, plus 180 px Apple touch icon and 512 px PWA icon) generated once by `npm run icons` from the same SVG.

### Footer

- **Top:** a slow marquee of `site.footer.marquee` in display serif (CSS `@keyframes` on `transform`). It pauses when off-screen and stops under reduced motion.
- **Body:** four columns — Navigate, Follow (socials), Get in touch (email, location, "Start a project" button), Legal (privacy). They stack on mobile.
- **Bottom row:** © year and name, "Back to top" link, and an optional credit line.
- Total footer height on desktop: no more than 360 px.

### Buttons and links (the "effortless luxury" feel)

| Variant | Look | Hover | Press |
| --- | --- | --- | --- |
| Primary | `--invert-bg` fill, `--invert-ink` text, pill or 16 px radius | Text rolls up and a duplicate rolls in from below (two stacked spans, `translateY(-100%)`, `--dur-base`, `--ease-out`); arrow icon nudges 3 px right | `scale(0.98)` |
| Secondary | `--surface` fill, 1 px `--line` border | Same text roll; background shifts to `--surface-2` | `scale(0.98)` |
| Ghost link | Text only | Underline draws left to right (`background-size` from 0% to 100%) | — |
| Icon button | 44 × 44 px square, translucent over photos | Background opacity rises | `scale(0.96)` |

- The duplicated label is `aria-hidden`, so screen readers hear the text once.
- Every interactive element has a visible `:focus-visible` ring: 2 px `--ink` outline with a 2 px offset.
- Under `prefers-reduced-motion`, the roll becomes a simple colour change.

### Label chip

Geist Mono uppercase in a 1 px outlined box with a 6 px radius (`KERALA 2026`). Hover fills it with `--surface-2`; the active filter is filled with `--ink`. It is always a link, with a minimum tap target of 32 px tall.

### Section header

A mono label on the left, an optional "View all" ghost link on the right, and a 1 px `--line` rule under both — used for "Latest travel", "Books", "From the journal" and every About section.

### Pagination (one style everywhere)

- **Page pagination** (blog lists): `← 01 02 03 … 12 →`. Numerals are zero-padded Geist Mono inside 40 px square chips. The current page is filled with `--ink`; disabled arrows drop to 30% opacity. Links use `prefetch="intent"`, so the next page's data loads on hover. The block is a `<nav aria-label="Pagination">` and the current page has `aria-current="page"`.
- **Slide pagination** (carousel, lightbox): a dot pill like the reference. The active dot stretches into a 20 px bar (`scaleX`). The lightbox also shows a mono counter `04 / 36`.
- **Sequence pagination** (trip and post pages): "Previous trip" and "Next trip" cards with thumbnail, mono label and title.

### Loading shells (no black screens, ever)

- Pages are pre-rendered, so first loads arrive as complete HTML. Shells cover the other two cases: client-side navigation and lazily loaded components.
- Each content component ships a matching skeleton with identical dimensions: `HeroSkeleton`, `TripCardSkeleton`, `BookRowSkeleton`, `PostCardSkeleton`, `GallerySkeleton`, `ProseSkeleton`, `FormSkeleton`.
- Skeleton surface is `--surface-2` with a soft shimmer (a gradient on a pseudo-element moving via `transform`, 1.6 s). Reduced motion shows a static block.
- During navigation, `useNavigation().state === "loading"` shows a 2 px progress bar at the top after a 150 ms delay (so fast navigations show nothing), and the next route's skeleton.
- Lazy chunks (lightbox, contact form, hCaptcha) render their skeleton as the `Suspense` fallback.
- Image-level loading is handled by `<Photo>` placeholders, so a skeleton never sits on top of an image.

### Other shared pieces

- **`NotchCard`:** photo card with the cutout name tab (section 3). Props: photo, title, href, sizes.
- **`Lightbox`:** lazy chunk built on native `<dialog>`. Arrow keys, swipe, Escape, focus return to the opening thumbnail, URL hash sync (`#p=backwaters-01`), and an "Info" toggle that shows caption, label chip and EXIF in mono.
- **Page transitions:** React Router `<Link viewTransition>` plus CSS `::view-transition` rules: 240 ms fade with an 8 px rise. A trip card's image morphs into the trip page cover via a shared `view-transition-name`. Browsers without support navigate instantly.
- **`Reveal`:** wraps sections to fade and rise 12 px when 15% in view, once only (`whileInView`, `viewport={{ once: true }}`).
- **`Seo`:** handled by each route's `meta()` export (section 9).

## 8. Page specs

Each page lists its layout, behaviour, data and a "done when" line that Claude Code must verify before moving on.

### Home (Dashboard) — `/`

**Desktop, 1024 px and wider:** two equal columns, 16 px gap and padding.

&#91;embedded content: Home wireframe · desktop\]

The hero stays pinned while the bento column scrolls past it; the inverted Contact card is the only high-contrast element besides the photos.

- **Left: hero carousel card**, `position: sticky`, `top: 16px`, height `calc(100dvh - 32px)`, 24 px radius, navbar in its top-left notch.
  - Slides are `featured` photos from the newest trips, up to `home.heroCount` (default 6).
  - Each slide crossfades over 1200 ms while easing from `scale(1.04)` to `scale(1)` across its 6-second display (transform and opacity only).
  - Auto-advance pauses on hover, on keyboard focus inside, when the tab is hidden and when the hero is off-screen. It is fully off under reduced motion.
  - Controls: 44 px translucent prev/next squares at mid-height, the dot pill at bottom centre, swipe on touch, arrow keys when focused.
  - Bottom-left notch tab shows the slide's trip title and label chip, linking to that trip.
  - Markup: `aria-roledescription="carousel"`; each slide is labelled "3 of 6".
- **Right: scrolling bento column**, top to bottom:
  1. Profile card (two-thirds width): 72 px round avatar, name in display serif, role in mono, bio paragraph. Beside it, a stack of social cards (label left, brand icon right, 72 px tall). The last card, "Contact me", is inverted and links to `/about#contact`.
  2. "Latest travel" section header with "View all" (to `/travel`).
  3. Trip grid: three columns of `NotchCard`s at 3:4, the newest `home.latestTrips` trips. Hover: image scales to 1.03 over 600 ms; a scrim reveals mono meta (dates, photo count).
  4. "Books": two-column cards with cover, scrim, book title in display serif, mono meta (`4 TRIPS · 128 PHOTOS`).
  5. "From the journal": the latest post as a large card (image, date, label chips, title, excerpt) plus a "Read the journal" ghost link.
- **Footer** runs full width below both columns.

**Below 1024 px:** single column. Hero is full width at 75svh with the nav notch kept. Social cards become a 2 × 2 grid. Trips are two columns from 640 px, one column below. Books become a horizontal scroll-snap row.

**Data:** one loader returns hero photos, latest trips, book summaries and the latest post, about 10 KB.

**Done when:** the first hero slide is the Largest Contentful Paint element and is preloaded from the HTML head; layout shift is 0 on load; the carousel pauses in every case listed above.

### Travel Books — `/travel`

- **Header:** "Travel Books" in `display-xl`, a mono totals line (`6 BOOKS · 24 TRIPS · 812 PHOTOS`) and a one-paragraph intro.
- **Book list:** full-width rows separated by 1 px rules. Each row shows a mono index (`01`), the book title in `display-l`, mono meta (trip count and year range), and an arrow. The whole row is one link.
- **Hover preview (mouse and trackpad only, `pointer: fine`):**
  - The book's first photo (its `cover`, or else the newest trip's cover) appears as a 320 × 400 card near the cursor and follows it with the spring from section 3, using `transform` only.
  - It reveals with `clip-path: inset(100% 0 0 0)` → `inset(0)` over 600 ms, after the image has decoded.
  - Moving to another row crossfades the image (280 ms); the other rows dim to 40% opacity.
  - The preview is `aria-hidden` and `pointer-events: none`.
- **Keyboard:** focusing a row shows the same preview pinned at the row's right edge.
- **Touch (`pointer: coarse`):** each row shows a 72 px square thumbnail on its left instead of the hover preview.

**Done when:** hovering quickly across all rows never shows a half-loaded image, and Interaction to Next Paint stays under 200 ms.

### Book page — `/travel/:book`

- **Hero:** full-bleed cover (priority image, 60svh on desktop) with the book title over it in `display-xl`, Structure-style, plus mono meta.
- **Description:** `summary` and optional `story.md` in the reading column.
- **Trips in this book:** the same row list and hover preview as the Travel page, each row showing trip title, place, mono dates and photo count, linking to the trip page.
- **Stories from this book:** up to three posts labelled with any of this book's trips. Hidden if there are none.

### Trip page (the "Destination page") — `/travel/:book/:trip`

- **Header:** mono breadcrumb (`TRAVEL / INDIA / KERALA`), title in `display-xl`, a mono line with dates, place, photo count and the label chip.
- **About this trip:** the summary and `story.md` in the left reading column. On the right, a meta card with dates, place and the cameras and lenses used (collected from EXIF across the trip's photos).
- **Gallery:** justified rows built with pure CSS, so it works in pre-rendered HTML with zero layout shift:
  - Each item gets `aspect-ratio` from the manifest and `flex: <aspect> 1 calc(<aspect> * var(--row-h))`, with `--row-h` 280 px on desktop and 180 px on mobile, and an 8 px gap.
  - An invisible final filler with a very large `flex-grow` stops the last row stretching.
  - Each item is a button that opens the lightbox at that photo.
  - Trips with more than 36 photos render the first 36, then a "Show all 84 photos" button.
- **Stories from this trip:** posts with this label, as cards. Hidden if there are none.
- **Previous and next trip** cards, in date order across all books.

**Done when:** the cover is the only priority image, no gallery image above the fold is lazy-loaded, and `#p=<photo>` deep links open the lightbox on load.

### Blog — `/blog`, `/blog/page/:n`, `/blog/label/:label`

- **Top (page 1 only):** the featured post (newest with `featured: true`, otherwise the newest post): large image (priority), title in `display-l`, its excerpt as the short description, date, label chips and a "Read story" button.
- **Label filter row:** "All" plus a chip for every label that has posts. Each chip links to its pre-rendered `/blog/label/:label` page.
- **Card grid, adaptive to the number of posts on the page:** 1 post fills one wide horizontal card; 2 posts sit two per row; 3 or more sit three per row on desktop. Tablet maxes at two per row, mobile at one.
- **Card:** 4:3 image, mono date and label chip, title, two-line excerpt, reading time.
- **Pagination:** 9 cards per page, using the shared pagination component.

### Post — `/blog/:slug`

- **Header:** mono line (`JOURNAL · 12 OCT 2026 · 6 MIN READ`), title in `display-l`, label chips, cover image (priority) with caption.
- **Body:** Markdown rendered in a 720 px column with Tailwind Typography restyled to our tokens. Blockquotes use the display serif in italic. An image written as `![Alt](kerala-2026/fort-kochi-03.jpg "wide")` breaks out to full width.
- **End:** a "From the trip" card for each label (trip title plus four thumbnails), up to three related posts with a shared label, and previous and next post.

### About and contact — `/about`

- **Intro:** portrait (4:5, priority) on the left; name in `display-xl`, the headline, and the `about.md` bio on the right. Stacked on mobile.
- **Sections from `about.json`:** each one is a section header plus rows with title on the left, subtitle muted beneath it, and `meta` in mono on the right, separated by 1 px rules (Structure style). Two sections per row on desktop, for example Education beside Cameras.
- **Socials:** a row of secondary buttons with brand icons.
- **Contact (`#contact`):**
  - Fields: name, email, subject (Commission, Collaboration, Prints, Other; editable in `site.json`), message (20 characters minimum), and a hidden `botcheck` honeypot.
  - hCaptcha's script loads only on first focus of any field.
  - Submits with `fetch` POST to `https://api.web3forms.com/submit` using `VITE_WEB3FORMS_KEY`.
  - States: idle, sending (button text rolls to "Sending…"), success (inline thank-you and form reset), error (message plus a mailto fallback). Status is announced through an `aria-live="polite"` region.
  - Beside the form: email, location and "Usually replies within 2 days".

**Done when:** a test submission arrives in the photographer's inbox from the production domain, and the form works with keyboard only.

### 404

A full-bleed featured photo (picked at build time so it is pre-rendered), "Lost in transit" in `display-xl`, and buttons to Home and Travel.

## 9. Performance, accessibility and SEO

Performance is a release gate, not a polish step: Lighthouse CI runs on every pull request against the pre-rendered build and fails it when a budget below is exceeded.

### Budgets (mobile, simulated slow 4G, measured on Home, a Trip page and a Post)

| Budget | Limit |
| --- | --- |
| Lighthouse Performance | 90 or higher (target 95+ on desktop) |
| Lighthouse Accessibility, Best Practices, SEO | 95 or higher |
| Largest Contentful Paint | under 2.5 s |
| Cumulative Layout Shift | under 0.05 (target 0) |
| Total Blocking Time (lab proxy for INP) | under 150 ms |
| JavaScript on first load, gzip | under 120 KB |
| CSS, gzip | under 25 KB |
| Fonts preloaded | 2 files, under 120 KB together |
| LCP image on a mobile viewport | under 200 KB |
| Home first-load page weight | under 1.2 MB |

### Code and loading rules

- Route-level code splitting comes free from React Router; also lazy-load the lightbox, the contact form and hCaptcha.
- Motion loads through `LazyMotion` with `domAnimation` features and `m` components. Load the larger `domMax` feature set only on a route that needs layout animations.
- Links use `prefetch="intent"` so route data and code start loading on hover or focus.
- No smooth-scroll or scroll-jacking libraries; native scrolling only.
- No runtime CSS-in-JS. No icon fonts. No third-party scripts on first load (Cloudflare Analytics loads with `defer`).
- Long lists and galleries use `content-visibility: auto` with a `contain-intrinsic-size` so off-screen sections cost nothing to render.

### Animation rules (so motion never costs speed)

1. Animate only `transform` and `opacity` (plus `clip-path` for the hover-preview reveal). Never animate `width`, `height`, `top`, `left`, `margin`, `box-shadow` or `filter: blur()` on large elements.
2. Hovers are CSS transitions. JavaScript animation is limited to the carousel, cursor-follow preview, mobile menu, lightbox and `Reveal`.
3. `will-change` is set only while an animation runs, never in static CSS.
4. Wrap the app in `<MotionConfig reducedMotion="user">`, and add a global `@media (prefers-reduced-motion: reduce)` block that disables CSS keyframes, the marquee, the Ken Burns zoom and carousel autoplay.
5. Anything that loops (hero, marquee, video) pauses when off-screen or when the tab is hidden.
6. In-view reveals run once, last 400 ms at most, and never apply to above-the-fold content, so they cannot delay Largest Contentful Paint.

### Accessibility (WCAG 2.2 AA)

- Semantic landmarks (`header`, `nav`, `main`, `footer`), one `h1` per page, logical heading order.
- Text contrast at least 4.5:1, verified for both themes; text over photos always sits on `--scrim`.
- Every hover interaction has a keyboard and touch equivalent (see Travel page and Buttons).
- Tap targets at least 44 × 44 px, except inline chips (at least 32 px tall with spacing).
- Lightbox and mobile menu trap focus, close on Escape and return focus to their trigger.
- Carousel: pause control, no autoplay under reduced motion, slide changes announced politely only when the visitor triggers them.
- Alt text required for covers and featured photos; others fall back to a descriptive default and raise a validator warning.
- Forms: visible labels, inline error text tied with `aria-describedby`, status via `aria-live`.

### SEO

- Every route is pre-rendered HTML with its own `meta()` export: title (`Kerala — KRISH BHATIA`), description from `summary` or `excerpt`, canonical URL, Open Graph and Twitter tags using the 1200 × 630 images from the photo pipeline.
- JSON-LD: `Person` on Home and About, `ImageGallery` on Trip pages, `BlogPosting` on posts, `BreadcrumbList` on Book, Trip and Post pages.
- `sitemap.xml`, `robots.txt` and `rss.xml` generated at build time.
- Clean URLs with no trailing slash, enforced in `_redirects`.
- Image `alt` text and captions double as image-search descriptions.

## 10. Repository structure and scripts

One repository holds the app, the content and the tools. The photographer only ever touches `content/` and runs the commands marked "Photographer" below.

```text
portfolio/
  CLAUDE.md                   ← ground rules for Claude Code (section 12)
  README.md                   ← developer setup
  PHOTOGRAPHER-GUIDE.md       ← section 11, written to be printed
  package.json
  react-router.config.js      ← ssr: false, prerender() from .generated/routes.json
  vite.config.js              ← reactRouter(), tailwindcss(), fontaine
  .vscode/
    settings.json             ← JSON schema mapping, format on save
    extensions.json           ← recommends Prettier and Code Spell Checker
  content/                    ← section 5 (the only folder the photographer edits)
  templates/                  ← starters used by `npm run new`
  schemas/                    ← generated JSON Schemas for VS Code autocomplete
  media/manifests/            ← generated by `npm run photos`, committed
  public/
    photos/                   ← generated, committed
    og/                       ← generated social images, committed
    _headers  _redirects  favicon.svg  robots.txt (generated)
  scripts/
    lib/content-schema.js     ← Zod schemas: single source of truth
    check.mjs                 ← validate, friendly messages
    content-build.mjs         ← validate + write .generated/ index, labels, routes
    photos.mjs                ← image pipeline (section 6)
    new.mjs                   ← interactive: new book, trip or post
    publish.mjs               ← check → photos → git add, commit, push
    build-feeds.mjs           ← sitemap.xml, rss.xml
    schemas.mjs               ← Zod → JSON Schema
  app/
    root.jsx                  ← HTML shell, theme script, font preloads, LazyMotion, MotionConfig
    routes.js                 ← route table from section 4
    routes/                   ← home, travel, book, trip, blog, blog-label, post, about, not-found
    components/
      layout/                 ← Navbar, MobileMenu, Footer, ThemeToggle, Brand, SkipLink, NavProgress
      ui/                     ← Button, GhostLink, IconButton, LabelChip, SectionHeader, Pagination, DotPagination, Marquee
      media/                  ← Photo, NotchCard, HeroCarousel, HoverPreview, JustifiedGallery, Lightbox (lazy), Clip
      content/                ← BookRow, TripRow, TripCard, BookCard, PostCard, FeaturedPost, Prose, AboutSection, ContactForm (lazy)
      skeletons/              ← one skeleton per content component
      motion/                 ← Reveal
    lib/
      content.server.js       ← reads .generated/ inside loaders (never shipped to the browser)
      photo-url.js            ← photoUrl(), srcset builders, PHOTO_BASE_URL
      motion.js               ← easing, durations, spring presets
      seo.js  format.js
    styles/app.css            ← Tailwind import, @theme tokens, theme blocks, base styles
```

### Commands

| Command | Who | What it does |
| --- | --- | --- |
| `npm run new` | Photographer | Asks a few questions, then creates a book, trip or post folder from `templates/` |
| `npm run photos` | Photographer | Processes new photos into `public/photos/` and `media/manifests/` |
| `npm run dev` | Both | Runs `check`, then starts the local preview at `http://localhost:5173` |
| `npm run check` | Both | Validates all content; plain-English errors and warnings |
| `npm run publish` | Photographer | `check` → `photos` → asks for a short note → commits and pushes; the site updates in about 2 minutes |
| `npm run build` | Cloudflare | `content-build` → `react-router build` → `build-feeds` |
| `npm run preview` | Developer | Serves the production build locally |
| `npm run schemas` | Developer | Regenerates VS Code JSON Schemas after a schema change |
| `npm run icons` | Developer | Generates the favicon set from the brand SVG |
| `npm run lhci` | Developer, CI | Lighthouse CI against the preview build, with section 9 budgets |

### Cloudflare Pages settings

- Build command `npm run build`; output directory `build/client`.
- Environment variables: `NODE_VERSION=24`, `VITE_WEB3FORMS_KEY`, optional `PHOTO_BASE_URL`.
- Production branch `main`; every other branch gets a preview URL.

## 11. Photographer's handbook

Adding a month's trip takes four commands and one small file: `npm run new`, drop photos, `npm run photos`, fill `trip.json`, `npm run publish`. Claude Code must ship this section as `PHOTOGRAPHER-GUIDE.md` in the repo, with screenshots added after the first walkthrough.

### One-time setup (do this together, about 30 minutes)

1. Install VS Code, Node.js LTS and Git. In VS Code, sign in to GitHub from the Accounts icon (bottom left).
2. In VS Code choose **Clone Git Repository**, pick the portfolio repo and a folder on your computer.
3. Open **Terminal → New Terminal** and run `npm install`.
4. Accept the recommended extensions when VS Code offers them.
5. In Lightroom (or your editor), create an export preset: JPEG, sRGB, long edge 3000 px, quality 90, metadata "All except Camera Raw info", and tick **Remove location info**.

### Every trip (about 15 minutes)

1. In the VS Code terminal, run `npm run new`, choose **Trip**, pick the book (or create a new country), and type the destination and year. This creates, for example, `content/travel/india/kerala-2026/` with `trip.json` and an empty `photos/` folder.
2. Export your selects with the preset and drag them into that `photos/` folder. Meaningful names help (`backwaters-01.jpg`), but any name works.
3. Run `npm run photos`. About 30 photos take a minute or two. Only new photos are processed next time.
4. Open `trip.json` and fill in title, dates, summary and cover. Add a caption and alt text for the cover and for any photo listed in `featured`. Red underlines mean something needs fixing; hover to see why.
5. Run `npm run dev` and open `http://localhost:5173` to see the trip exactly as visitors will.
6. Run `npm run publish`, type a short note such as `Added Kerala`, and press Enter. The live site updates in about 2 minutes.

### Writing a blog post

1. Run `npm run new`, choose **Post**, and type the title. This creates a dated folder with `post.json` and `post.md`.
2. Write the story in `post.md` using the cheat sheet below.
3. In `post.json`, set the excerpt, the cover (any trip photo, written as `kerala-2026/backwaters-01.jpg`) and the labels of the trips it belongs to. Leave `"draft": true` until it is ready.
4. Preview with `npm run dev`, set `"draft": false`, then `npm run publish`.

| To get | Type in `post.md` |
| --- | --- |
| A heading | `## The second morning` |
| Bold or italic | `**bold**` or `*italic*` |
| A link | `[my Instagram](https://instagram.com/...)` |
| A trip photo | `![Fishermen pulling nets at dawn](kerala-2026/fort-kochi-03.jpg)` |
| A full-width photo | `![Alt text](kerala-2026/fort-kochi-03.jpg "wide")` |
| A quote | `> The lake was so still the boats looked painted on.` |
| A new paragraph | Leave one empty line |

### Updating the About page

Open `content/about/about.json`, copy an existing item (from `{` to `}`), paste it under the original, put a comma between the two, and change the words. For example, to add a new camera:

```json
{ "title": "Sony A7 IV", "subtitle": "Main body", "meta": "Since 2023" },
{ "title": "Ricoh GR IIIx", "subtitle": "Pocket camera", "meta": "Since 2026" }
```

To start a whole new section (for example "Awards"), copy a section block the same way.

### When something goes wrong

| You see | What to do |
| --- | --- |
| A red underline in a `.json` file | Usually a missing comma or quote mark. Hover over it; compare with the matching file in `templates/` |
| "There is no photo with that name" | Check the spelling; the message suggests the closest match |
| "HEIC files are not supported" | Re-export that photo as JPEG |
| A photo appears rotated | Re-export it; the script reads rotation from the photo itself |
| `publish` says the push was rejected | Run `git pull`, then `npm run publish` again. If it still fails, message the developer |
| The live site has not changed after 5 minutes | Message the developer with the time you published |
| You want to undo something | Nothing is ever lost. Message the developer, or use VS Code's **Timeline** view on the file |

### Five golden rules

1. Only edit files inside `content/`.
2. Never touch `public/photos/` or `media/`; the scripts own them.
3. Folder names: lowercase, hyphens instead of spaces, year at the end (`kerala-2026`).
4. Keep your originals in your own archive. The website keeps only web versions.
5. Write alt text as if describing the photo to a friend over the phone.

## 12. Build plan for Claude Code

Build in seven phases, in order. Do not start a phase until the previous phase's checklist passes, including `npm run check`, `npm run build` and `npm run lhci`.

### Ground rules (copy into `CLAUDE.md`)

1. JavaScript only (`.js`, `.jsx`, ES modules). Add JSDoc types to every exported function and component.
2. Before adding any dependency, state its gzip size and why the platform or an existing dependency cannot do the job.
3. Every image renders through `<Photo>`; every image URL comes from `photoUrl()`.
4. Every colour, radius, duration and easing comes from the tokens in `app/styles/app.css`. No hex values or magic numbers in components.
5. Hovers are CSS. Motion is used only in the components named in section 7, and only on `transform`, `opacity` and the preview's `clip-path`.
6. Every content component ships a skeleton with identical dimensions.
7. Content is read only inside route loaders through `app/lib/content.server.js`. Never import content JSON into components.
8. Changing a content field means updating, together: the Zod schema, `templates/`, the JSON Schemas (`npm run schemas`), sample content and `PHOTOGRAPHER-GUIDE.md`.
9. Error messages written for the photographer use plain English, name the file, say what to change and suggest the fix.
10. One feature per commit, using conventional commit messages.

### Phases and acceptance checklists

**Phase 0 — Foundations**

- [ ] React Router framework-mode app in JavaScript with `ssr: false` and `prerender`, Vite 8, Tailwind 4 via `@tailwindcss/vite`
- [ ] Tokens, both themes, fonts self-hosted with `fontaine` fallbacks, inline theme script (no flash on hard reload)
- [ ] ESLint, Prettier, `CLAUDE.md`, `.vscode/` settings
- [ ] Empty shell deployed to Cloudflare Pages from `main`; preview URLs work for branches

**Phase 1 — Content system**

- [ ] Zod schemas for site, about, book, trip and post; JSON Schemas generated and mapped in VS Code
- [ ] `templates/`, `npm run new`, `npm run check` with the friendly messages from section 5
- [ ] `content-build` writes the `.generated/` index, label index and route list
- [ ] Sample content: 2 books, 4 trips, 5 posts, a full `about.json`. Until real photos arrive, generate labelled gradient placeholder JPEGs with `sharp`

**Phase 2 — Image pipeline**

- [ ] `npm run photos` produces AVIF at 4 widths, JPEG fallback, placeholder, colour, EXIF and Open Graph crops, with hashed filenames
- [ ] A second run processes 0 photos; deleting a source removes only its outputs
- [ ] Outputs contain no GPS or other metadata (verify with `exifr`)
- [ ] `<Photo>`, `photoUrl()`, `_headers` caching in place

**Phase 3 — Universal components**

- [ ] Navbar (notch and floating variants), mobile menu, theme toggle, brand, footer with marquee
- [ ] Buttons with text roll, ghost links, icon buttons, label chips, section header
- [ ] All three pagination styles; all skeletons; navigation progress bar
- [ ] `NotchCard`, `Reveal`, view transitions between trip card and trip page

**Phase 4 — Pages**

- [ ] Home, Travel, Book, Trip (with justified gallery and lightbox), Blog (featured, adaptive grid, labels, pagination), Post, About with contact form, 404
- [ ] Every "done when" line in section 8 verified

**Phase 5 — Hardening**

- [ ] `meta()` per route, JSON-LD, sitemap, robots, RSS
- [ ] Lighthouse CI with section 9 budgets running on pull requests
- [ ] Accessibility pass with axe and keyboard-only; reduced-motion pass
- [ ] Real-device checks: iPhone Safari, Android Chrome, desktop Safari, Chrome and Firefox

**Phase 6 — Handover**

- [ ] `PHOTOGRAPHER-GUIDE.md` and `npm run publish`
- [ ] Photographer adds one real trip and one post end to end, unaided, while you watch; fix every point of confusion in the guide

**Later (not v1):** video clips (section 6), Pages CMS as an optional browser editor, tag pages, moving photos to R2 when the repo nears 1 GB.

### Open questions

- [ ] Photographer's name, preferred monogram and domain name
- [ ] Which social platforms to show (Instagram, Behance, X, YouTube, LinkedIn)
- [ ] Contact subjects, and whether prints or workshops need their own page
- [ ] English only, or Hindi as well
- [ ] Does he already own a licensed display font to use in the custom font slot
- [ ] A real sample set (about 30 photos across 2–3 trips) to tune AVIF quality before launch

### Sources

As of 14 October 2026.

- [Sera Photography](https://p.isera.dev/) and [Structure Engineering](https://structureengineering.com.au/) — design references
- [Cloudflare Pages limits](https://developers.cloudflare.com/pages/platform/limits)
- [Vercel fair use guidelines](https://vercel.com/docs/limits/fair-use-guidelines)
- [Web3Forms pricing](https://web3forms.com/pricing)
- [React Router pre-rendering](https://reactrouter.com/7.9.4/how-to/pre-rendering) and [React Router 2026 guide (v8 status)](https://scrimba.com/articles/react-router-complete-guide-2026/)
- [Motion for React installation](https://motion.dev/docs/react-installation)
- [Tailwind CSS releases](https://releases.sh/tailwind-css/tailwind-css.md)
- [Vite 8.1 announcement recap](https://dev.to/aloisseckar/new-in-vue-june-2026-28p)
- [Cloudflare free-tier limits overview (R2)](https://eastondev.com/blog/en/posts/dev/20260526-cloudflare-free-limits/)
