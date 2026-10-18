# Photography portfolio

A fast, static portfolio for a travel photographer, built with React Router (framework mode,
pre-rendered), Vite, Tailwind CSS and Motion. All content lives in `content/` as folders, JSON
and Markdown. There is no database and no server.

- Spec: `PRD — Photographer Portfolio (React + Tailwind + Motion).md`
- Rules for AI-assisted work: `CLAUDE.md`
- For the photographer: `PHOTOGRAPHER-GUIDE.md` (added in Phase 6)

## Requirements

- Node.js 24 LTS recommended (22.12 minimum). `.nvmrc` pins 24 for Cloudflare Pages.
- Git, and Google Chrome for Lighthouse CI.

## Setup

```sh
npm install
npm run dev        # http://localhost:5173
```

## Production build

```sh
npm run build      # → build/client
npm run preview    # serves build/client like Cloudflare Pages, http://localhost:4173
npm run size       # first-load JS/CSS and font budgets
npm run a11y       # axe (WCAG 2.2 AA), keyboard and reduced-motion checks
npm run lhci       # Lighthouse CI against the preview, with the PRD budgets
```

## Deploying (Cloudflare Pages)

1. Push this repository to GitHub.
2. In Cloudflare: **Workers & Pages → Create → Pages → Connect to Git**, pick the repository.
3. Build command `npm run build`, output directory `build/client`.
4. Environment variables: `NODE_VERSION=24`, `VITE_WEB3FORMS_KEY` (contact form), optional
   `PHOTO_BASE_URL` (only when photos move to R2).
5. Production branch `main`. Every other branch gets a preview URL. Preview builds tell search
   engines to stay out (`noindex` and robots.txt); only `main` is indexable.
6. Set `"url"` in `content/site.json` to the real domain. Until then, canonical links, social
   cards, the sitemap and RSS use the Cloudflare address of each deployment.

## Quality checks

`.github/workflows/ci.yml` runs on every pull request and on `main`: lint, formatting, content
check, build, JS/CSS/font budgets, the accessibility pass and Lighthouse CI (reports are kept as
a workflow artifact). Cloudflare builds and deploys separately.

## Project layout

```text
app/                 React app (routes, components, styles, lib)
content/             The photographer's content (the only folder they edit)
scripts/             Content build, validation, photo pipeline, post-build steps
public/              Static files copied as-is (_headers, _redirects, favicon, photos, videos)
```
