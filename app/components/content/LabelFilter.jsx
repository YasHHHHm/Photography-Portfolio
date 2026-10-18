import { LabelChip } from "../ui/LabelChip.jsx";

/**
 * The blog's filter row: "All" plus a chip for every trip label that has
 * stories. Each chip is a link to its pre-rendered page.
 * @param {object} props
 * @param {{ label: string, title: string, count: number }[]} props.labels
 * @param {string | null} props.active  The current label, or null for "All"
 */
export function LabelFilter({ labels, active }) {
  if (!labels.length) return null;
  return (
    <nav aria-label="Filter stories by trip">
      <ul className="flex flex-wrap gap-2">
        <li>
          <LabelChip label="all" href="/blog" active={active === null}>
            All
          </LabelChip>
        </li>
        {labels.map((l) => (
          <li key={l.label}>
            <LabelChip
              label={l.label}
              href={`/blog/label/${l.label}`}
              active={l.label === active}
            />
          </li>
        ))}
      </ul>
    </nav>
  );
}
