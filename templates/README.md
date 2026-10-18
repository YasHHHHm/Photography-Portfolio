# Templates

Starter files. `npm run new` copies these when you create a book, trip or post,
so you rarely need to copy them by hand.

If a file in `content/` shows a red underline you cannot fix, compare it with
the matching file here: every comma, quote mark and bracket is in the right place.

| File                   | Becomes                                                    |
| ---------------------- | ---------------------------------------------------------- |
| `book.json`            | `content/travel/<country>/book.json`                       |
| `trip.json`            | `content/travel/<country>/<trip-year>/trip.json`           |
| `story.md`             | `content/travel/<country>/<trip-year>/story.md` (optional) |
| `post.json`, `post.md` | `content/blog/<date-title>/`                               |
| `about-item.json`      | one line inside a section of `content/about/about.json`    |
| `about-section.json`   | a whole new section of `content/about/about.json`          |
