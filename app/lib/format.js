/**
 * Formatting for dates, labels and counts. Pure string work (no Intl, no
 * Date parsing), so pre-rendered HTML and the browser always agree.
 */

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/**
 * @param {string} iso
 * @returns {[number, number, number]} year, month (1–12), day
 */
function parts(iso) {
  const [y, m, d] = iso.split("-").map(Number);
  return [y, m, d];
}

/**
 * "2026-10-12" → "12 Oct 2026".
 * @param {string} iso
 */
export function formatDate(iso) {
  const [y, m, d] = parts(iso);
  return `${d} ${MONTHS[m - 1]} ${y}`;
}

/**
 * "2026-10" → "Oct 2026".
 * @param {string} iso
 */
export function formatMonth(iso) {
  const [y, m] = parts(iso);
  return `${MONTHS[m - 1]} ${y}`;
}

/**
 * A trip's dates, as short as they can be:
 * "2–9 Oct 2026", "28 Sep – 3 Oct 2026", "30 Dec 2025 – 2 Jan 2026".
 * @param {string} from
 * @param {string | null} [to]
 */
export function formatDateRange(from, to) {
  if (!to || to === from) return formatDate(from);
  const [y1, m1, d1] = parts(from);
  const [y2, m2, d2] = parts(to);
  if (y1 !== y2) return `${formatDate(from)} – ${formatDate(to)}`;
  if (m1 !== m2) return `${d1} ${MONTHS[m1 - 1]} – ${d2} ${MONTHS[m2 - 1]} ${y2}`;
  return `${d1}–${d2} ${MONTHS[m2 - 1]} ${y2}`;
}

/**
 * "kerala-2026" → "kerala 2026" (shown uppercase by the mono label style).
 * @param {string} label
 */
export function labelText(label) {
  return label.replace(/-/g, " ");
}

/**
 * 4 → "04".
 * @param {number} n
 */
export function pad2(n) {
  return String(n).padStart(2, "0");
}

/**
 * plural(1, "photo") → "1 photo"; plural(12, "photo") → "12 photos".
 * @param {number} n
 * @param {string} word
 */
export function plural(n, word) {
  return `${n} ${word}${n === 1 ? "" : "s"}`;
}

/**
 * "Asha Rao" → "AR". Placeholder braces and underscores are ignored.
 * @param {string} name
 */
export function initials(name) {
  const words = name
    .replace(/[{}]/g, "")
    .split(/[\s_-]+/)
    .filter(Boolean);
  return words
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join("");
}

/**
 * Joins class names, skipping empty ones.
 * @param {...(string | false | null | undefined)} names
 */
export function cx(...names) {
  return names.filter(Boolean).join(" ");
}
