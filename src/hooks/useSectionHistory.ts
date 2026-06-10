import { useEffect, useRef } from 'react';

/**
 * Wires browser back/forward buttons to dashboard section navigation.
 *
 * Call this once inside a dashboard component that owns the `section` state.
 * - On mount: marks the initial section in history (replaceState, no new entry).
 * - When `section` changes via nav clicks: pushes a new history entry.
 * - When back is pressed: restores the previous section via `setSection`.
 */
export function useSectionHistory(
  section: string,
  setSection: (s: string) => void,
) {
  const restoringFromHistory = useRef(false);
  const prevSection = useRef(section);

  // Stamp the initial state so popstate always has a { section } to read
  useEffect(() => {
    window.history.replaceState({ section }, '');
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Push a new entry whenever the section changes (but not when we're
  // restoring from a popstate — that would double-push)
  useEffect(() => {
    if (section === prevSection.current) return;
    prevSection.current = section;
    if (restoringFromHistory.current) {
      restoringFromHistory.current = false;
      return;
    }
    window.history.pushState({ section }, '');
  }, [section]);

  // Handle back/forward button
  useEffect(() => {
    const handler = (e: PopStateEvent) => {
      const state = e.state as { section?: string; __modal?: boolean } | null;
      // Ignore popstate events that belong to modal history entries
      if (state?.__modal) return;
      if (state?.section && state.section !== section) {
        restoringFromHistory.current = true;
        setSection(state.section);
      }
    };
    window.addEventListener('popstate', handler);
    return () => window.removeEventListener('popstate', handler);
  }, [section, setSection]);
}
