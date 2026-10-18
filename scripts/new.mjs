#!/usr/bin/env node
/**
 * npm run new — creates a book, trip or post folder from templates/ after a
 * few questions, then says what to do next.
 *
 * Answers can also be passed up front, which skips the questions:
 *   npm run new -- trip india "Kerala" 2026
 *   npm run new -- post "Six days on the backwaters" kerala-2026
 *   npm run new -- book "Sri Lanka"
 */
import { existsSync } from "node:fs";
import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import { stdin, stdout } from "node:process";
import { createInterface } from "node:readline/promises";
import { styleText } from "node:util";

import { slugify } from "./lib/suggest.js";

const args = process.argv.slice(2);
const rl = createInterface({ input: stdin, output: stdout });
rl.on("SIGINT", () => {
  console.log("\nNothing was created.");
  process.exit(0);
});

/**
 * Asks a question, unless the answer was passed on the command line.
 * @param {string} question
 * @param {{ preset?: string, fallback?: string }} [options]
 */
async function ask(question, { preset, fallback } = {}) {
  if (preset !== undefined) return preset.trim();
  const hint = fallback ? styleText("dim", ` [${fallback}]`) : "";
  const answer = (await rl.question(`${question}${hint} `)).trim();
  return answer || fallback || "";
}

/**
 * Lets the photographer pick from a numbered list.
 * @param {string} question
 * @param {string[]} options
 * @param {string} [preset]  A value matching one option, or its number
 * @returns {Promise<number>} the chosen index
 */
async function choose(question, options, preset) {
  if (preset !== undefined) {
    const byValue = options.findIndex((o) => o.toLowerCase().startsWith(preset.toLowerCase()));
    if (byValue >= 0) return byValue;
  }
  console.log(`\n${question}`);
  options.forEach((o, i) => console.log(`  ${styleText("bold", String(i + 1))}  ${o}`));
  for (;;) {
    const answer = await rl.question(`Type a number from 1 to ${options.length}: `);
    const n = Number(answer.trim());
    if (Number.isInteger(n) && n >= 1 && n <= options.length) return n - 1;
    console.log("That is not one of the numbers above.");
  }
}

/** @param {string} file */
const template = async (file) => JSON.parse(await readFile(`templates/${file}`, "utf8"));

/** @param {string} file @param {unknown} data */
const writeJson = (file, data) => writeFile(file, `${JSON.stringify(data, null, 2)}\n`);

/** @param {string} dir */
async function folders(dir) {
  try {
    return (await readdir(dir, { withFileTypes: true }))
      .filter((e) => e.isDirectory() && !e.name.startsWith("."))
      .map((e) => e.name)
      .sort();
  } catch {
    return [];
  }
}

/** Every book as { slug, title, order }. */
async function books() {
  const list = [];
  for (const slug of await folders("content/travel")) {
    try {
      const book = JSON.parse(await readFile(`content/travel/${slug}/book.json`, "utf8"));
      list.push({ slug, title: String(book.title || slug), order: Number(book.order ?? 99) });
    } catch {
      list.push({ slug, title: slug, order: 99 });
    }
  }
  return list.sort((a, b) => a.order - b.order);
}

/** Every trip folder name across all books. */
async function tripLabels() {
  const labels = [];
  for (const book of await folders("content/travel"))
    labels.push(...(await folders(`content/travel/${book}`)));
  return labels.sort();
}

/** @param {string} line */
const done = (line) => console.log(`${styleText("green", "✔")} ${line}`);

// ── Book ─────────────────────────────────────────────────────────────────

/** @param {string} [presetName] */
async function newBook(presetName) {
  const name = await ask("Country or region name (e.g. Sri Lanka):", { preset: presetName });
  const slug = slugify(name);
  if (!slug) throw new Error("A book needs a name.");
  const dir = `content/travel/${slug}`;
  if (existsSync(dir)) {
    console.log(`There is already a book folder called "${slug}". Using it.`);
    return slug;
  }
  const existing = await books();
  const book = await template("book.json");
  book.title = name;
  book.order = Math.max(0, ...existing.map((b) => b.order).filter((o) => o < 99)) + 1;
  await mkdir(dir, { recursive: true });
  await writeJson(`${dir}/book.json`, book);
  done(`Created ${dir}/book.json`);
  console.log(`  Open it and write a one or two sentence "summary".`);
  return slug;
}

// ── Trip ─────────────────────────────────────────────────────────────────

async function newTrip() {
  const list = await books();
  const options = [...list.map((b) => b.title), "A new country or region…"];
  const pick = await choose("Which book (country or region) is this trip in?", options, args[1]);
  const book = pick < list.length ? list[pick].slug : await newBook(args[1]);

  const name = await ask("Destination (e.g. Kerala):", { preset: args[2] });
  if (!slugify(name)) throw new Error("A trip needs a destination name.");
  const year = await ask("Year of the trip:", {
    preset: args[3],
    fallback: String(new Date().getFullYear()),
  });
  if (!/^\d{4}$/.test(year))
    throw new Error(`"${year}" is not a year. Use four digits, e.g. 2026.`);

  const label = `${slugify(name)}-${year}`;
  if ((await tripLabels()).includes(label)) {
    throw new Error(
      `There is already a trip called "${label}". For a second visit in the same year, add a word, e.g. "${slugify(name)}-north".`,
    );
  }

  const dir = `content/travel/${book}/${label}`;
  const trip = await template("trip.json");
  trip.title = name;
  trip.dates = { from: `${year}-`, to: "" };
  await mkdir(`${dir}/photos`, { recursive: true });
  await writeJson(`${dir}/trip.json`, trip);

  done(`Created ${dir}/`);
  console.log(`
  Next:
  1. Drag your exported JPEGs into ${styleText("bold", `${dir}/photos/`)}
  2. Run ${styleText("bold", "npm run photos")}
  3. Fill in ${styleText("bold", "trip.json")}: dates, summary, cover, and alt text for the cover
  4. Run ${styleText("bold", "npm run dev")} to preview, then ${styleText("bold", "npm run publish")}`);
}

// ── Post ─────────────────────────────────────────────────────────────────

async function newPost() {
  const title = await ask("Post title:", { preset: args[1] });
  const slug = slugify(title);
  if (!slug) throw new Error("A post needs a title.");
  const date = new Date().toISOString().slice(0, 10);
  const dir = `content/blog/${date}-${slug}`;
  if (existsSync(dir)) throw new Error(`${dir} already exists.`);

  const known = await tripLabels();
  let labels = args.slice(2);
  if (!args[1] && known.length) {
    console.log(
      `\nWhich trips is this post about? Type their numbers separated by commas, or press Enter to skip.`,
    );
    known.forEach((l, i) => console.log(`  ${styleText("bold", String(i + 1))}  ${l}`));
    const answer = await rl.question("Trips: ");
    labels = answer
      .split(",")
      .map((n) => known[Number(n.trim()) - 1])
      .filter(Boolean);
  }
  const unknown = labels.filter((l) => !known.includes(l));
  if (unknown.length)
    throw new Error(`There is no trip called ${unknown.map((l) => `"${l}"`).join(", ")}.`);

  const post = await template("post.json");
  Object.assign(post, { title, date, labels, draft: true });
  await mkdir(dir, { recursive: true });
  await writeJson(`${dir}/post.json`, post);
  await writeFile(`${dir}/post.md`, await readFile("templates/post.md", "utf8"));

  done(`Created ${dir}/`);
  console.log(`
  Next:
  1. Write the story in ${styleText("bold", "post.md")}
  2. In ${styleText("bold", "post.json")}, add the excerpt and the cover (e.g. "${labels[0] ?? "kerala-2026"}/photo-name.jpg")
  3. Preview with ${styleText("bold", "npm run dev")}. Drafts only show there.
  4. When it is ready, set "draft" to false and run ${styleText("bold", "npm run publish")}`);
}

// ── Main ─────────────────────────────────────────────────────────────────

try {
  const kind = await choose(
    "What would you like to add?",
    [
      "Trip — a new visit, with a folder for its photos",
      "Post — a blog post",
      "Book — a new country or region",
    ],
    args[0],
  );
  if (kind === 0) await newTrip();
  else if (kind === 1) await newPost();
  else await newBook(args[1]);
} catch (error) {
  console.error(
    `${styleText("red", "✖")} ${/** @type {Error} */ (error).message}\nNothing was created.`,
  );
  process.exitCode = 1;
} finally {
  rl.close();
}
