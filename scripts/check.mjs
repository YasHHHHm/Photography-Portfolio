#!/usr/bin/env node
/**
 * npm run check — validates all content and explains problems in plain English.
 * Exits with an error when something must be fixed before publishing.
 *
 * Flags: --dev   also check draft posts as if they were published
 */
import { buildContent } from "./lib/build-content.js";

const { report } = await buildContent({ write: false, dev: process.argv.includes("--dev") });
report.print();
process.exit(report.errorCount ? 1 : 0);
