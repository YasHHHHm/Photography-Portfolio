import { useEffect, useState } from "react";
import { useNavigation } from "react-router";

/** Navigations faster than this show nothing at all. */
export const LOADING_DELAY_MS = 150;

/**
 * Whether the current navigation has been loading for longer than
 * LOADING_DELAY_MS, so quick page changes never flash a loading state.
 * @returns {boolean}
 */
export function useSlowNavigation() {
  const navigation = useNavigation();
  const key = navigation.state === "loading" ? navigation.location.key : null;
  const [slowKey, setSlowKey] = useState(/** @type {string | null} */ (null));

  useEffect(() => {
    if (!key) return;
    const timer = setTimeout(() => setSlowKey(key), LOADING_DELAY_MS);
    return () => clearTimeout(timer);
  }, [key]);

  return key !== null && slowKey === key;
}

/** A 2 px bar across the top while a slow page change loads. */
export function NavProgress() {
  const slow = useSlowNavigation();
  const [wasShown, setWasShown] = useState(false);

  if (slow && !wasShown) setWasShown(true);

  useEffect(() => {
    if (slow || !wasShown) return;
    const timer = setTimeout(() => setWasShown(false), 600);
    return () => clearTimeout(timer);
  }, [slow, wasShown]);

  const state = slow ? "loading" : wasShown ? "done" : "idle";
  return <div aria-hidden="true" className="nav-progress" data-state={state} />;
}
