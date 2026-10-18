import geistUrl from "@fontsource-variable/geist/files/geist-latin-wght-normal.woff2?url";
import displayUrl from "@fontsource/inter-tight/files/inter-tight-latin-500-normal.woff2?url";
import {
  isRouteErrorResponse,
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  useMatches,
  useNavigation,
} from "react-router";

import { Footer } from "./components/layout/Footer.jsx";
import { Navbar } from "./components/layout/Navbar.jsx";
import { NavProgress, useSlowNavigation } from "./components/layout/NavProgress.jsx";
import { SkipLink } from "./components/layout/SkipLink.jsx";
import { RouteSkeleton } from "./components/skeletons/Skeletons.jsx";
import { Button } from "./components/ui/Button.jsx";
import { getProblems, getSite } from "./lib/content.server.js";
import appCss from "./styles/app.css?url";

/**
 * Sets data-theme before first paint, so a hard reload never flashes the
 * wrong theme. The visitor's saved choice wins; otherwise the system setting.
 * This is the only inline script on the site.
 */
const THEME_SCRIPT = `try{var t=localStorage.getItem("theme");
if(t!=="light"&&t!=="dark")t=matchMedia("(prefers-color-scheme: light)").matches?"light":"dark";
document.documentElement.dataset.theme=t}catch(e){}`;

/** Site-wide settings for every page; content problems too, in dev only. */
export async function loader() {
  const [site, problems] = await Promise.all([getSite(), import.meta.env.DEV ? getProblems() : []]);
  return { site, problems };
}

/** @type {import("react-router").LinksFunction} */
export const links = () => [
  // Exactly two font preloads: the body face and the display face. The
  // subheading serif is not preloaded: it is mostly below the fold.
  { rel: "preload", href: geistUrl, as: "font", type: "font/woff2", crossOrigin: "anonymous" },
  { rel: "preload", href: displayUrl, as: "font", type: "font/woff2", crossOrigin: "anonymous" },
  { rel: "icon", href: "/favicon.svg", type: "image/svg+xml" },
  { rel: "apple-touch-icon", href: "/apple-touch-icon.png" },
  { rel: "manifest", href: "/site.webmanifest" },
  { rel: "alternate", type: "application/rss+xml", title: "Journal", href: "/rss.xml" },
];

/**
 * The HTML document shared by every page, error and loading state.
 * @param {{ children: import("react").ReactNode }} props
 */
export function Layout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
        {/* With a precedence, React lists the stylesheet ahead of the script
            preloads, so the one render-blocking file is fetched first. */}
        <link rel="stylesheet" href={appCss} precedence="default" />
        <Meta />
        <Links />
      </head>
      <body id="top">
        {children}
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

/**
 * @typedef {object} RouteHandle
 * @property {"notch"} [nav]  The page draws its own navbar (Home's hero notch)
 */

/**
 * App shell: skip link, navigation, the page, and the footer. During a slow
 * page change, the next page's skeleton stands in for the current page.
 * @param {{ loaderData: Awaited<ReturnType<typeof loader>> }} props
 */
export default function App({ loaderData }) {
  const { site, problems } = loaderData;
  const matches = useMatches();
  const navigation = useNavigation();
  const slow = useSlowNavigation();
  const ownNav = matches.some(
    (m) => /** @type {RouteHandle | undefined} */ (m.handle)?.nav === "notch",
  );

  return (
    <>
      <SkipLink />
      <NavProgress />
      {!ownNav && <Navbar variant="floating" name={site.name} site={site} />}
      <main id="main" tabIndex={-1} className="outline-none">
        {slow && navigation.location ? (
          <RouteSkeleton pathname={navigation.location.pathname} />
        ) : (
          <Outlet />
        )}
      </main>
      <Footer site={site} />
      {import.meta.env.DEV && <ContentProblems problems={problems} />}
    </>
  );
}

/**
 * Dev only: content problems from the last content build, so mistakes show
 * up in the browser as well as in the terminal.
 * @param {{ problems: import("../scripts/lib/report.js").Problem[] }} props
 */
function ContentProblems({ problems }) {
  const errors = problems.filter((p) => p.level === "error");
  if (!errors.length) return null;
  return (
    <details className="fixed right-4 bottom-4 z-50 max-h-[60vh] max-w-md overflow-auto rounded-inner border border-line bg-surface p-4 text-body-s">
      <summary className="mono-label cursor-pointer">
        {errors.length} content problem{errors.length === 1 ? "" : "s"} · details in the terminal
      </summary>
      <ul className="mt-3 flex flex-col gap-3">
        {errors.map((p) => (
          <li key={p.file + p.message}>
            <p className="mono-label text-ink-muted">{p.file}</p>
            <p className="whitespace-pre-wrap">{p.message}</p>
          </li>
        ))}
      </ul>
    </details>
  );
}

/** Shown only by the SPA fallback page before the app takes over. */
export function HydrateFallback() {
  return <div className="min-h-dvh bg-bg" aria-busy="true" />;
}

/**
 * Last-resort error page for anything a route did not handle itself.
 * @param {{ error: unknown }} props
 */
export function ErrorBoundary({ error }) {
  let title = "Something went wrong";
  let detail = "Please try again in a moment.";

  if (isRouteErrorResponse(error)) {
    title = error.status === 404 ? "Lost in transit" : `Error ${error.status}`;
    detail = error.status === 404 ? "This page does not exist, or it has moved." : detail;
  } else if (import.meta.env.DEV && error instanceof Error) {
    detail = error.message;
  }

  return (
    <main
      id="main"
      className="mx-auto flex min-h-dvh max-w-page flex-col justify-center gap-6 px-(--gutter)"
    >
      <p className="mono-label text-ink-muted">Error</p>
      <h1 className="font-display text-display-xl">{title}</h1>
      <p className="max-w-prose text-ink-muted">{detail}</p>
      <div>
        <Button href="/" arrow>
          Back to home
        </Button>
      </div>
    </main>
  );
}
