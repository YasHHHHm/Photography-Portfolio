/**
 * Zod schemas for every content file: the single source of truth.
 *
 * They drive `npm run check` (validation with plain-English messages) and
 * `npm run schemas` (JSON Schemas that give VS Code autocomplete, hover help
 * and red underlines). Descriptions are written for the photographer.
 *
 * Changing a field means updating, together: this file, templates/, the JSON
 * Schemas (`npm run schemas`), sample content and PHOTOGRAPHER-GUIDE.md.
 */
import { z } from "zod";

/** `{{LIKE_THIS}}` marks a value still waiting for real content. */
export const PLACEHOLDER = /\{\{[A-Z0-9_]+\}\}/;

/** Lowercase letters, numbers and single hyphens. */
export const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/** A trip folder: a slug ending in a four-digit year, e.g. kerala-2026. */
export const TRIP_LABEL = /^[a-z0-9]+(?:-[a-z0-9]+)*-\d{4}$/;

/** A blog folder: date, then slug, e.g. 2026-10-12-six-days-on-the-backwaters. */
export const POST_FOLDER = /^(\d{4}-\d{2}-\d{2})-([a-z0-9]+(?:-[a-z0-9]+)*)$/;

/** Photo file name inside a photos/ or images/ folder (JPEG, PNG or AVIF). */
const PHOTO_FILE = /^[^/\\]+\.(jpe?g|png|avif)$/i;

/** A photo from a trip (`kerala-2026/backwaters-01.jpg`) or a post's own `images/` folder. */
const PHOTO_REF = /^(?:[a-z0-9]+(?:-[a-z0-9]+)*-\d{4}|images)\/[^/\\]+\.(jpe?g|png|avif)$/i;

/** The home-page avatar: the About portrait or any trip photo. */
const AVATAR_REF = /^(?:about|[a-z0-9]+(?:-[a-z0-9]+)*-\d{4})\/[^/\\]+\.(jpe?g|png|avif)$/i;

const ISO_DATE_HINT = "Write the date as YYYY-MM-DD, for example 2026-10-02.";

const isoDate = z.iso
  .date({ error: ISO_DATE_HINT })
  .meta({ patternErrorMessage: ISO_DATE_HINT, examples: ["2026-10-02"] });

const photoFile = z
  .string()
  .regex(PHOTO_FILE, {
    error:
      "Use the photo's file name exactly as it is in the photos/ folder, e.g. backwaters-01.jpg.",
  })
  .meta({
    patternErrorMessage: "A photo file name such as backwaters-01.jpg",
    examples: ["backwaters-01.jpg"],
  });

const photoRef = z
  .string()
  .regex(PHOTO_REF, {
    error:
      'Write the photo as "trip-folder/file-name.jpg" (e.g. "kerala-2026/backwaters-01.jpg"), or "images/file-name.jpg" for a photo in this post\'s images/ folder.',
  })
  .meta({
    patternErrorMessage: 'Write it as "kerala-2026/backwaters-01.jpg" or "images/map.jpg"',
    examples: ["kerala-2026/backwaters-01.jpg"],
  });

/** A clip in a trip's videos/ folder. */
export const VIDEO_FILE = /^[^/\\]+\.(mp4|mov|m4v)$/i;

const videoFile = z
  .string()
  .regex(VIDEO_FILE, {
    error:
      "Use the clip's file name exactly as it is in the videos/ folder, e.g. backwaters-loop.mp4 (MP4 or MOV).",
  })
  .meta({
    patternErrorMessage: "A clip file name such as backwaters-loop.mp4",
    examples: ["backwaters-loop.mp4"],
  });

/** A clip from any trip: "kerala-2026/backwaters-loop.mp4". */
const videoRef = z
  .string()
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*-\d{4}\/[^/\\]+\.(mp4|mov|m4v)$/i, {
    error: 'Write the clip as "trip-folder/file-name.mp4", e.g. "kerala-2026/backwaters-loop.mp4".',
  })
  .meta({
    patternErrorMessage: 'Write it as "kerala-2026/backwaters-loop.mp4"',
    examples: ["kerala-2026/backwaters-loop.mp4"],
  });

/**
 * Text with a length limit and a friendly message when it is too long.
 * @param {number} max
 * @param {string} what
 */
const text = (max, what) =>
  z
    .string()
    .trim()
    .min(1, { error: `${what} is empty. Write something here.` })
    .max(max, {
      error: (iss) =>
        `${what} is too long (${String(iss.input).length} characters). Keep it to ${max} or fewer.`,
    });

/** Optional free text; an empty string counts as "not filled in". */
const optionalText = z.string().trim().optional();

const url = z
  .string()
  .refine((v) => PLACEHOLDER.test(v) || /^https?:\/\/[^\s]+\.[^\s]+$/.test(v), {
    error: "This should be a full web address starting with https://",
  })
  .meta({ examples: ["https://instagram.com/yourname"] });

const email = z
  .string()
  .refine((v) => PLACEHOLDER.test(v) || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v), {
    error: "This should be an email address, like name@example.com.",
  });

/** Brand icons available for social links (inline SVGs from Simple Icons). */
export const SOCIAL_ICONS = /** @type {const} */ ([
  "instagram",
  "behance",
  "x",
  "youtube",
  "linkedin",
  "vimeo",
  "flickr",
  "tiktok",
  "threads",
  "facebook",
  "pinterest",
  "unsplash",
  "website",
]);

// ── site.json ────────────────────────────────────────────────────────────

export const siteSchema = z
  .strictObject({
    $schema: z.string().optional(),
    name: text(60, "Your name").describe("Your name, shown in the navbar, footer and page titles."),
    role: text(60, "Your role").describe('A few words under your name, e.g. "Photographer".'),
    bio: text(400, "The bio")
      .describe("One short paragraph for the profile card on the home page.")
      .meta({
        examples: ["I photograph slow travel and the people who make places feel like home."],
      }),
    location: text(60, "The location").describe('Where you are based, e.g. "New Delhi, India".'),
    email: email.describe("Where contact messages and enquiries should go."),
    url: url.describe(
      "The website's full address, e.g. https://example.com. Used for links shared on social media.",
    ),
    avatar: z
      .string()
      .regex(AVATAR_REF, {
        error:
          'Write it as "about/portrait.jpg", or as a trip photo like "kerala-2026/backwaters-01.jpg".',
      })
      .describe(
        'The round photo on the home page and beside your name in the header, e.g. "about/profile.jpg". Use a square crop of your face.',
      ),
    socials: z
      .array(
        z.strictObject({
          label: text(30, "The link label").describe('Shown on the card, e.g. "Instagram".'),
          url: url.describe("The full address of your profile."),
          icon: z
            .enum(SOCIAL_ICONS, {
              error: `Choose one of these icons: ${SOCIAL_ICONS.join(", ")}.`,
            })
            .describe("Which brand icon to show."),
        }),
      )
      .max(8, { error: "Show at most 8 social links." })
      .describe("Social profiles, in the order they appear."),
    home: z
      .strictObject({
        heroCount: z
          .int()
          .min(1)
          .max(12)
          .default(6)
          .describe("How many photos rotate in the big home-page carousel."),
        latestTrips: z
          .int()
          .min(1)
          .max(12)
          .default(6)
          .describe('How many trips the "Latest travel" section shows.'),
        books: z
          .int()
          .min(1)
          .max(12)
          .default(4)
          .describe('How many books the "Books" section shows.'),
        reel: z
          .strictObject({
            video: videoRef.describe(
              'The clip that loops silently in the showreel card, e.g. "delhi-2026/kites-loop.mp4".',
            ),
            title: optionalText.describe('Shown on the card, e.g. "Showreel 2026". Optional.'),
            link: url
              .optional()
              .describe(
                "The full reel on YouTube or Vimeo. Optional: adds a “Watch the reel” button that plays it with sound.",
              ),
          })
          .optional()
          .describe("A showreel card on the home page. Optional: remove it to hide the card."),
      })
      .describe("Home page settings."),
    footer: z
      .strictObject({
        marquee: text(80, "The footer line").describe(
          "The slow moving line of text above the footer.",
        ),
      })
      .describe("Footer settings."),
    contact: z
      .strictObject({
        subjects: z
          .array(text(40, "A subject"))
          .min(1, { error: 'Add at least one subject, for example "Commission".' })
          .describe("Choices in the contact form's subject menu."),
        replyTime: text(60, "The reply time").describe(
          'Shown beside the form, e.g. "Usually replies within 2 days".',
        ),
      })
      .describe("Contact form settings."),
  })
  .describe("Your name, links and site-wide settings.");

// ── about/about.json ─────────────────────────────────────────────────────

export const aboutSchema = z
  .strictObject({
    $schema: z.string().optional(),
    headline: text(160, "The headline").describe("One sentence under your name on the About page."),
    portrait: photoFile.describe(
      "Your portrait's file name inside content/about/, e.g. portrait.jpg.",
    ),
    sections: z
      .array(
        z.strictObject({
          title: text(40, "The section title").describe('e.g. "Education", "Cameras", "Awards".'),
          items: z
            .array(
              z.strictObject({
                title: text(80, "The item title").describe(
                  "The main line, e.g. a degree, camera or job.",
                ),
                subtitle: optionalText.describe("A muted line under the title. Optional."),
                meta: optionalText.describe(
                  'A short note on the right, e.g. "2022 – 2024". Optional.',
                ),
                link: url.optional().describe("A web address the item links to. Optional."),
              }),
            )
            .min(1, { error: "A section needs at least one item." }),
        }),
      )
      .describe("Sections shown on the About page, in this order."),
  })
  .describe("The About page.");

// ── travel/<book>/book.json ──────────────────────────────────────────────

export const bookSchema = z
  .strictObject({
    $schema: z.string().optional(),
    title: text(40, "The book title").describe('The country or region, e.g. "India".'),
    summary: text(200, "The summary").describe("One or two sentences about this place."),
    cover: photoRef
      .optional()
      .describe(
        'Optional cover photo, written as "trip-folder/file.jpg". Defaults to the newest trip\'s cover.',
      ),
    video: videoRef
      .or(z.literal(""))
      .optional()
      .describe(
        'A clip that plays silently behind the book title, written as "trip-folder/clip.mp4". Optional.',
      ),
    order: z
      .int()
      .min(0)
      .default(99)
      .describe("Position on the Travel page. Lower numbers come first."),
  })
  .describe("A book: a country or region that collects trips.");

// ── travel/<book>/<trip>/trip.json ───────────────────────────────────────

const photoNotes = z.strictObject({
  caption: optionalText.describe("Shown under the photo in the lightbox. Optional."),
  alt: optionalText.describe(
    "Describe the photo for people who cannot see it, as if telling a friend over the phone.",
  ),
});

export const tripSchema = z
  .strictObject({
    $schema: z.string().optional(),
    title: text(40, "The trip title").describe(
      'The destination, e.g. "Kerala". Shown on cards, and in the home carousel\'s corner tab when "place" is empty.',
    ),
    place: optionalText.describe(
      'The town or places the trip was based in, e.g. "Alleppey and Fort Kochi". Shown in the home carousel\'s corner tab instead of the title. Optional.',
    ),
    dates: z
      .strictObject({
        from: isoDate.describe("First day of the trip (YYYY-MM-DD)."),
        to: isoDate
          .or(z.literal(""))
          .optional()
          .describe(
            "Last day of the trip (YYYY-MM-DD). Optional: leave it empty for a one-day trip.",
          ),
      })
      .refine((d) => !d.to || d.to >= d.from, {
        error: 'The "to" date is before the "from" date. Check the order of the two dates.',
      })
      .describe("When the trip happened. Newer trips appear first everywhere."),
    summary: text(200, "The summary").describe(
      "One or two sentences. Used on cards and in search results.",
    ),
    cover: photoFile.describe("The photo used on cards and at the top of the trip page."),
    video: videoFile
      .or(z.literal(""))
      .optional()
      .describe(
        "A clip from videos/ that plays silently behind the trip title, e.g. backwaters-loop.mp4. Optional; 8 to 15 seconds works best.",
      ),
    featured: z
      .array(photoFile)
      .default([])
      .describe("Photos that may appear in the home-page carousel."),
    tags: z
      .array(z.string().trim().min(1))
      .default([])
      .describe('Theme words, e.g. "monsoon", "boats".'),
    photos: z
      .record(photoFile, photoNotes)
      .default({})
      .describe(
        "Captions and alt text, keyed by file name. Alt text is required for the cover and featured photos.",
      ),
    pinned: z
      .array(photoFile)
      .default([])
      .describe("Photos shown first, in this order. The rest follow by capture time."),
    hidden: z.array(photoFile).default([]).describe("Photos kept but not shown on the site."),
  })
  .describe("A trip: one visit to one destination.");

// ── blog/<date-slug>/post.json ───────────────────────────────────────────

export const postSchema = z
  .strictObject({
    $schema: z.string().optional(),
    title: text(100, "The post title").describe("The headline of the post."),
    date: isoDate.describe("Publication date (YYYY-MM-DD). Newer posts appear first."),
    excerpt: text(200, "The excerpt").describe(
      "One or two sentences shown on cards and in search results.",
    ),
    cover: photoRef.describe('The cover photo: "trip-folder/file.jpg" or "images/file.jpg".'),
    labels: z
      .array(
        z
          .string()
          .regex(TRIP_LABEL, { error: 'A label is a trip folder name, e.g. "kerala-2026".' }),
      )
      .default([])
      .describe('Trips this post belongs to, by folder name, e.g. ["kerala-2026"].'),
    featured: z.boolean().default(false).describe("Show this post at the top of the blog."),
    draft: z
      .boolean()
      .default(false)
      .describe("Drafts appear in npm run dev only, never on the live site."),
  })
  .describe("A blog post. The text goes in post.md beside this file.");

/** Every content file type, keyed by the name used for its JSON Schema. */
export const SCHEMAS = {
  site: siteSchema,
  about: aboutSchema,
  book: bookSchema,
  trip: tripSchema,
  post: postSchema,
};
