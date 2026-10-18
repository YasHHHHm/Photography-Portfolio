#!/usr/bin/env node
/**
 * Validates content and writes the .generated/ index that pages read.
 * Runs before `react-router build` and `react-router dev`.
 *
 * Flags: --dev   include draft posts and keep going when content has errors
 */
import { buildContent } from "./lib/build-content.js";

const dev = process.argv.includes("--dev");
const { report, written } = await buildContent({ dev });
report.print();

if (!written) {
  console.error(
    "\nThe site cannot be built until content/site.json and content/about/about.json are fixed.",
  );
  process.exit(1);
}
if (report.errorCount && !dev) process.exit(1);
