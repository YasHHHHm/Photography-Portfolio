/** The first focusable element on every page: jumps past the navigation. */
export function SkipLink() {
  return (
    <a href="#main" className="skip-link mono-label">
      Skip to content
    </a>
  );
}
