/**
 * Helpers for friendly messages: "Did you mean …?" and folder-name fixes.
 */

/**
 * Edit distance between two strings (case-insensitive).
 * @param {string} a
 * @param {string} b
 * @returns {number}
 */
function distance(a, b) {
  a = a.toLowerCase();
  b = b.toLowerCase();
  /** @type {number[]} */
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const row = [i];
    for (let j = 1; j <= b.length; j++) {
      row[j] = Math.min(prev[j] + 1, row[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
    prev = row;
  }
  return prev[b.length];
}

/**
 * The closest candidate to `input`, if it is close enough to be a likely typo.
 * @param {string} input
 * @param {Iterable<string>} candidates
 * @returns {string | undefined}
 */
export function closest(input, candidates) {
  let best;
  let bestScore = Infinity;
  for (const candidate of candidates) {
    const score = distance(input, candidate);
    if (score < bestScore) {
      best = candidate;
      bestScore = score;
    }
  }
  const allowed = Math.max(2, Math.floor(input.length / 3));
  return bestScore <= allowed ? best : undefined;
}

/**
 * "Sri Lanka" → "sri-lanka"; "Café Days!" → "cafe-days".
 * @param {string} value
 * @returns {string}
 */
export function slugify(value) {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
