import { index, route } from "@react-router/dev/routes";

import { activeRoutes, readRoutePaths } from "../scripts/lib/route-shapes.js";

/**
 * Route table (PRD section 4). Every path is pre-rendered at build time.
 * Dynamic routes are registered only once the content has a page for them;
 * see scripts/lib/route-shapes.js for why.
 */
const active = activeRoutes(readRoutePaths());

/**
 * @param {keyof import("../scripts/lib/route-shapes.js").DYNAMIC_ROUTES} path
 * @param {string} file
 * @param {{ id?: string }} [options]
 */
const dynamic = (path, file, options) => (active.has(path) ? [route(path, file, options)] : []);

export default [
  index("routes/home.jsx"),
  route("travel", "routes/travel.jsx"),
  ...dynamic("travel/:book", "routes/book.jsx"),
  ...dynamic("travel/:book/:trip", "routes/trip.jsx"),
  route("blog", "routes/blog.jsx", { id: "routes/blog" }),
  ...dynamic("blog/page/:n", "routes/blog.jsx", { id: "routes/blog-page" }),
  ...dynamic("blog/label/:label", "routes/blog-label.jsx"),
  ...dynamic("blog/:slug", "routes/post.jsx"),
  route("about", "routes/about.jsx"),
  ...dynamic("privacy", "routes/privacy.jsx"),
  route("*", "routes/not-found.jsx"),
];
