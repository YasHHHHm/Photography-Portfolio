/**
 * Text that rolls up on hover while a copy rolls in from below. The parent
 * link or button needs the `roll-host` class. The copy is hidden from screen
 * readers, so the label is read once.
 * @param {object} props
 * @param {string} props.label
 * @param {string} [props.alt]  Text that rolls in (defaults to the label)
 * @param {boolean} [props.rolled]  Keep the alt text showing, e.g. "Sending…"
 */
export function Roll({ label, alt, rolled = false }) {
  return (
    <span className="roll" data-rolled={rolled ? "" : undefined}>
      <span>{label}</span>
      <span aria-hidden="true">{alt ?? label}</span>
    </span>
  );
}
