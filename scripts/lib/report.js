/**
 * Collects problems found in content and prints them in plain English,
 * grouped by file, the way the photographer sees them in the terminal.
 */
import { styleText } from "node:util";

/**
 * @typedef {object} Problem
 * @property {"error" | "warning"} level
 * @property {string} file     Repo-relative path, forward slashes
 * @property {string} message  May span several lines
 */

export function createReport() {
  /** @type {Problem[]} */
  const problems = [];
  const seen = new Set();
  /** @param {Problem} problem */
  const add = (problem) => {
    const key = `${problem.level}|${problem.file}|${problem.message}`;
    if (!seen.has(key)) problems.push(problem);
    seen.add(key);
  };

  return {
    problems,
    /** @param {string} file @param {string} message */
    error(file, message) {
      add({ level: "error", file, message });
    },
    /** @param {string} file @param {string} message */
    warn(file, message) {
      add({ level: "warning", file, message });
    },
    get errorCount() {
      return problems.filter((p) => p.level === "error").length;
    },
    get warningCount() {
      return problems.filter((p) => p.level === "warning").length;
    },
    /** Prints every problem, errors first, then a one-line summary. */
    print() {
      const sorted = [...problems].sort(
        (a, b) =>
          (a.level === b.level ? 0 : a.level === "error" ? -1 : 1) || a.file.localeCompare(b.file),
      );
      /** @type {Map<string, Problem[]>} */
      const groups = new Map();
      for (const p of sorted) {
        const key = `${p.level}\u0000${p.file}`;
        groups.set(key, [...(groups.get(key) ?? []), p]);
      }
      for (const items of groups.values()) {
        const { level, file } = items[0];
        const mark = level === "error" ? styleText("red", "✖") : styleText("yellow", "⚠");
        console.log(`${mark} ${styleText("bold", file)}`);
        for (const item of items) {
          console.log(item.message.replace(/^/gm, "  "));
        }
        console.log("");
      }

      const errors = this.errorCount;
      const warnings = this.warningCount;
      if (!errors && !warnings) {
        console.log(styleText("green", "✔ All content looks good."));
      } else if (!errors) {
        console.log(
          styleText("green", `✔ No problems that block publishing.`) +
            ` ${warnings} suggestion${warnings === 1 ? "" : "s"} above.`,
        );
      } else {
        console.log(
          styleText(
            "red",
            `✖ ${errors} problem${errors === 1 ? "" : "s"} must be fixed before publishing.`,
          ) + (warnings ? ` Also ${warnings} suggestion${warnings === 1 ? "" : "s"}.` : ""),
        );
      }
    },
  };
}

/** @typedef {ReturnType<typeof createReport>} Report */
