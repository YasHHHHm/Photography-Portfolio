#!/usr/bin/env node
/**
 * npm run schemas — writes JSON Schemas from the Zod schemas, so VS Code gives
 * autocomplete, hover help and red underlines in content files.
 * The mapping from files to schemas lives in .vscode/settings.json.
 */
import { mkdir, writeFile } from "node:fs/promises";

import { z } from "zod";

import { SCHEMAS } from "./lib/content-schema.js";

await mkdir("schemas", { recursive: true });
for (const [name, schema] of Object.entries(SCHEMAS)) {
  const json = z.toJSONSchema(schema, { target: "draft-7", io: "input", unrepresentable: "any" });
  await writeFile(`schemas/${name}.schema.json`, `${JSON.stringify(json, null, 2)}\n`);
  console.log(`✔ schemas/${name}.schema.json`);
}
